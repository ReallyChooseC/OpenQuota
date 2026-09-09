mod client;
mod database;
mod mapper;
mod paths;
mod record;
mod scanner;

use std::sync::Arc;

use chrono::{DateTime, Utc};
use thiserror::Error;

use crate::{
    models::{
        MetricDefinition, MetricSection, ProviderDefinition, ProviderErrorKind, ProviderLink,
        ProviderSnapshot, UsageHistory, UsagePeriodSelection,
    },
    pricing::PricingStore,
};

use self::{
    client::OpenCodeClient,
    mapper::map_go_usage,
    paths::OpenCodePaths,
    scanner::{OpenCodeUsageScanner, USAGE_SOURCE_NOTE},
};

use super::{ProviderError, UsageProvider};

pub(crate) fn definition() -> ProviderDefinition {
    ProviderDefinition {
        id: "opencode".into(),
        display_name: "OpenCode".into(),
        short_name: "OC".into(),
        fallback_enabled: false,
        local_usage_source_note: Some(USAGE_SOURCE_NOTE.into()),
        links: vec![ProviderLink::new("网页面板", "https://opencode.ai/auth")],
        metrics: vec![
            MetricDefinition::quota(
                "opencode.session",
                "当前周期",
                "session",
                true,
                true,
                MetricSection::AlwaysVisible,
                false,
                "S",
            ),
            MetricDefinition::quota(
                "opencode.weekly",
                "本周额度",
                "weekly",
                false,
                true,
                MetricSection::AlwaysVisible,
                false,
                "W",
            ),
            MetricDefinition::quota(
                "opencode.monthly",
                "本月额度",
                "monthly",
                false,
                true,
                MetricSection::AlwaysVisible,
                false,
                "M",
            ),
            MetricDefinition::trend("opencode.trend"),
            MetricDefinition::usage(
                "opencode.today",
                "今天",
                UsagePeriodSelection::Today,
                MetricSection::OnDemand,
                "T",
            ),
            MetricDefinition::usage(
                "opencode.yesterday",
                "昨天",
                UsagePeriodSelection::Yesterday,
                MetricSection::OnDemand,
                "Y",
            ),
            MetricDefinition::usage(
                "opencode.last30",
                "最近 30 天",
                UsagePeriodSelection::Last30Days,
                MetricSection::OnDemand,
                "30",
            ),
        ],
    }
}

#[derive(Debug, Error, Clone, Copy, PartialEq, Eq)]
pub(crate) enum OpenCodeError {
    #[error("未检测到 OpenCode。请先登录 OpenCode Go，或在本机使用 OpenCode。")]
    NotDetected,
    #[error("无法读取 OpenCode 登录数据，请重新登录 OpenCode Go。")]
    CredentialsUnreadable,
    #[error("无法读取 OpenCode 数据目录。")]
    DataDirectoryUnreadable,
    #[error("OpenCode 本地用量数据暂时不可用。")]
    DatabaseUnreadable,
    #[error("OpenCode Go 登录数据无效或已过期，请重新登录。")]
    InvalidAuth,
    #[error("需要 OpenCode Go 订阅。")]
    GoSubscriptionRequired,
    #[error("无法连接 OpenCode Go，请检查网络连接。")]
    ConnectionFailed,
    #[error("OpenCode Go 返回的用量数据无效。")]
    InvalidResponse,
    #[error("OpenCode Go 用量请求失败（HTTP {0}）。")]
    RequestFailed(u16),
}

impl From<OpenCodeError> for ProviderError {
    fn from(error: OpenCodeError) -> Self {
        let kind = match error {
            OpenCodeError::NotDetected | OpenCodeError::InvalidAuth => {
                ProviderErrorKind::Authentication
            }
            OpenCodeError::GoSubscriptionRequired => ProviderErrorKind::Permission,
            OpenCodeError::CredentialsUnreadable => ProviderErrorKind::CredentialStorage,
            OpenCodeError::DataDirectoryUnreadable | OpenCodeError::DatabaseUnreadable => {
                ProviderErrorKind::LocalData
            }
            OpenCodeError::ConnectionFailed => ProviderErrorKind::Network,
            OpenCodeError::RequestFailed(429) => ProviderErrorKind::RateLimited,
            OpenCodeError::RequestFailed(500..=599) => ProviderErrorKind::Network,
            OpenCodeError::InvalidResponse | OpenCodeError::RequestFailed(_) => {
                ProviderErrorKind::InvalidResponse
            }
        };
        ProviderError::new(kind, error.to_string())
    }
}

pub struct OpenCodeProvider {
    paths: OpenCodePaths,
    scanner: OpenCodeUsageScanner,
    client: Result<OpenCodeClient, OpenCodeError>,
    pricing: Arc<PricingStore>,
    now: Arc<dyn Fn() -> DateTime<Utc> + Send + Sync>,
}

impl OpenCodeProvider {
    pub fn new(pricing: Arc<PricingStore>) -> Self {
        let paths = OpenCodePaths::new();
        Self {
            scanner: OpenCodeUsageScanner::new(paths.clone()),
            paths,
            client: OpenCodeClient::new(),
            pricing,
            now: Arc::new(Utc::now),
        }
    }

    #[cfg(test)]
    fn with_dependencies(
        paths: OpenCodePaths,
        client: OpenCodeClient,
        pricing: Arc<PricingStore>,
        now: DateTime<Utc>,
    ) -> Self {
        Self {
            scanner: OpenCodeUsageScanner::new(paths.clone()),
            paths,
            client: Ok(client),
            pricing,
            now: Arc::new(move || now),
        }
    }

    fn refresh_snapshot(&self) -> Result<ProviderSnapshot, OpenCodeError> {
        let now = (self.now)();
        let (go_api_key, go_key_error) = match self.paths.go_api_key() {
            Ok(key) => (key, None),
            Err(error) => (None, Some(error)),
        };
        let go_usage = go_api_key
            .as_deref()
            .map(|key| {
                self.client
                    .as_ref()
                    .map_err(|error| *error)
                    .and_then(|client| client.fetch_go_usage(key))
                    .and_then(map_go_usage)
            })
            .transpose();
        let pricing = self.pricing.current();
        let scan = self.scanner.scan(now, &pricing);

        let scan = match scan {
            Ok(scan) => scan,
            Err(error) => match go_usage {
                Ok(Some(quotas)) => {
                    return Ok(snapshot(
                        Some("Go".into()),
                        quotas,
                        UsageHistory::default(),
                        vec!["OpenCode 本地用量数据暂时不可用。".into()],
                        now,
                    ));
                }
                _ => return Err(error),
            },
        };

        let Some(scan) = scan else {
            return match go_usage {
                Ok(Some(quotas)) => Ok(snapshot(
                    Some("Go".into()),
                    quotas,
                    UsageHistory::default(),
                    Vec::new(),
                    now,
                )),
                Ok(None) => Err(go_key_error.unwrap_or(OpenCodeError::NotDetected)),
                Err(error) => Err(error),
            };
        };
        let mut warnings = scan.warnings;
        if go_key_error.is_some() {
            warnings.push("无法读取 OpenCode Go 登录数据；仍会显示本地数据库用量。".into());
        }
        let (plan, quotas) = match go_usage {
            Ok(Some(quotas)) => (Some("Go".into()), quotas),
            Ok(None) => (None, Vec::new()),
            Err(OpenCodeError::GoSubscriptionRequired) if scan.usage.last_30_days.is_some() => {
                warnings.push(
                    "需要 OpenCode Go 订阅。云端额度不可用时，仍会显示本地用量。".to_string(),
                );
                (None, Vec::new())
            }
            Err(error) => return Err(error),
        };
        Ok(snapshot(plan, quotas, scan.usage, warnings, now))
    }
}

impl UsageProvider for OpenCodeProvider {
    fn definition(&self) -> ProviderDefinition {
        definition()
    }

    fn has_local_credentials(&self) -> bool {
        match self.paths.go_api_key() {
            Ok(Some(_)) | Err(OpenCodeError::CredentialsUnreadable) => true,
            Ok(None) | Err(_) => self.scanner.has_hosted_usage(),
        }
    }

    fn refresh(&self) -> Result<ProviderSnapshot, ProviderError> {
        self.refresh_snapshot().map_err(ProviderError::from)
    }
}

fn snapshot(
    plan: Option<String>,
    quotas: Vec<crate::models::QuotaWindow>,
    usage: UsageHistory,
    warnings: Vec<String>,
    refreshed_at: DateTime<Utc>,
) -> ProviderSnapshot {
    ProviderSnapshot {
        provider_id: "opencode".into(),
        plan,
        quotas,
        value_metrics: Vec::new(),
        status_metrics: Vec::new(),
        notices: Vec::new(),
        usage,
        warnings,
        refreshed_at,
    }
}

#[cfg(test)]
mod tests;
