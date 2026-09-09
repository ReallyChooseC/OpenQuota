mod auth;
mod client;
mod local_usage;
mod mapper;

use std::sync::Arc;

use chrono::{DateTime, Utc};
use reqwest::StatusCode;
use thiserror::Error;

use crate::{
    models::{
        MetricDefinition, MetricSection, ProviderDefinition, ProviderErrorKind, ProviderLink,
        ProviderSnapshot, UsagePeriodSelection,
    },
    pricing::PricingStore,
    providers::log_usage::scan_or_cached_usage,
    storage::Storage,
};

use self::{
    auth::{GrokAuthState, GrokAuthStore},
    client::GrokClient,
    local_usage::GrokLogUsageScanner,
    mapper::{map_credits, plan_name},
};

use super::{ProviderError, UsageProvider};

pub(crate) fn definition() -> ProviderDefinition {
    ProviderDefinition {
        id: "grok".into(),
        display_name: "Grok".into(),
        short_name: "G".into(),
        fallback_enabled: false,
        local_usage_source_note: Some("根据本地 Grok 日志估算".into()),
        links: vec![ProviderLink::new("用量", "https://grok.com/?_s=usage")],
        metrics: vec![
            MetricDefinition::quota(
                "grok.weekly",
                "本周额度",
                "weekly",
                false,
                true,
                MetricSection::AlwaysVisible,
                false,
                "W",
            ),
            MetricDefinition::status(
                "grok.payAsYouGo",
                "额外用量",
                "payAsYouGo",
                true,
                MetricSection::OnDemand,
                false,
                "E",
            ),
            MetricDefinition::trend("grok.trend"),
            MetricDefinition::usage(
                "grok.today",
                "今天",
                UsagePeriodSelection::Today,
                MetricSection::OnDemand,
                "T",
            ),
            MetricDefinition::usage(
                "grok.yesterday",
                "昨天",
                UsagePeriodSelection::Yesterday,
                MetricSection::OnDemand,
                "Y",
            ),
            MetricDefinition::usage(
                "grok.last30",
                "最近 30 天",
                UsagePeriodSelection::Last30Days,
                MetricSection::OnDemand,
                "M",
            ),
        ],
    }
}

#[derive(Debug, Error)]
pub(crate) enum GrokError {
    #[error("尚未登录 Grok。请运行 `grok login`。")]
    NotLoggedIn,
    #[error("Grok 登录数据无效。请重新运行 `grok login`。")]
    InvalidAuth,
    #[error("Grok 登录已过期。请重新运行 `grok login`。")]
    Expired,
    #[error("无法保存刷新后的 Grok 凭据。")]
    AuthWrite,
    #[error("无法连接 Grok，请检查网络连接。")]
    ConnectionFailed,
    #[error("Grok 返回的账单数据无效。")]
    InvalidResponse,
    #[error("Grok 账单请求失败（HTTP {0}）。")]
    RequestFailed(u16),
    #[error("无法处理本地 Grok 用量日志。")]
    LocalUsage,
    #[error("OpenQuota 缓存不可用。")]
    Storage,
}

impl From<crate::storage::StorageError> for GrokError {
    fn from(_: crate::storage::StorageError) -> Self {
        Self::Storage
    }
}

pub struct GrokProvider {
    storage: Arc<Storage>,
    pricing: Arc<PricingStore>,
    auth: GrokAuthStore,
    client: GrokClient,
    log_usage: GrokLogUsageScanner,
    now: Arc<dyn Fn() -> DateTime<Utc> + Send + Sync>,
}

impl GrokProvider {
    pub fn new(storage: Arc<Storage>, pricing: Arc<PricingStore>) -> Result<Self, GrokError> {
        Ok(Self {
            storage,
            pricing,
            auth: GrokAuthStore::new(),
            client: GrokClient::new()?,
            log_usage: GrokLogUsageScanner::new(),
            now: Arc::new(Utc::now),
        })
    }

    #[cfg(test)]
    fn with_dependencies(
        storage: Arc<Storage>,
        pricing: Arc<PricingStore>,
        auth: GrokAuthStore,
        client: GrokClient,
        log_usage: GrokLogUsageScanner,
        now: DateTime<Utc>,
    ) -> Self {
        Self {
            storage,
            pricing,
            auth,
            client,
            log_usage,
            now: Arc::new(move || now),
        }
    }

    fn refresh_inner(&self) -> Result<ProviderSnapshot, GrokError> {
        let now = (self.now)();
        let candidates = self.auth.load_candidates()?;
        crate::app_debug!(
            "auth:grok",
            "credential candidates loaded ({})",
            candidates.len()
        );
        let mut last_auth_error = None;
        for mut state in candidates {
            match self.refresh_candidate(&mut state, now) {
                Ok(snapshot) => return Ok(snapshot),
                Err(error @ (GrokError::Expired | GrokError::InvalidAuth)) => {
                    last_auth_error = Some(error);
                }
                Err(error) => return Err(error),
            }
        }
        Err(last_auth_error.unwrap_or(GrokError::InvalidAuth))
    }

    fn refresh_candidate(
        &self,
        state: &mut GrokAuthState,
        now: DateTime<Utc>,
    ) -> Result<ProviderSnapshot, GrokError> {
        let mut warnings = Vec::new();
        if self.auth.needs_refresh(state, now) {
            if let Err(error) = self.refresh_access_token(state, now, &mut warnings) {
                if self.auth.is_expired(state, now) {
                    return Err(GrokError::Expired);
                }
                crate::app_warn!(
                    "auth:grok",
                    "proactive token refresh failed; trying the current access token ({error})"
                );
            }
        }

        let mut credits = self.client.fetch_credits(&state.token)?;
        if matches!(
            credits.status,
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN
        ) {
            self.refresh_access_token(state, now, &mut warnings)?;
            credits = self.client.fetch_credits(&state.token)?;
        }
        let mapped = map_credits(&credits)?;
        let plan = self
            .client
            .fetch_settings(&state.token)
            .ok()
            .as_ref()
            .and_then(plan_name);
        let pricing = self.pricing.current();
        let usage = scan_or_cached_usage(
            &self.storage,
            "grok",
            crate::providers::CacheIdentity::Unscoped,
            "Grok",
            || self.log_usage.scan(&self.storage, now, &pricing),
            &mut warnings,
        );
        Ok(ProviderSnapshot {
            provider_id: "grok".into(),
            plan,
            quotas: mapped.quotas,
            value_metrics: Vec::new(),
            status_metrics: mapped.status_metrics,
            notices: Vec::new(),
            usage,
            warnings,
            refreshed_at: now,
        })
    }

    fn refresh_access_token(
        &self,
        state: &mut GrokAuthState,
        now: DateTime<Utc>,
        warnings: &mut Vec<String>,
    ) -> Result<(), GrokError> {
        let refresh_token = self
            .auth
            .refresh_token(state)
            .ok_or(GrokError::Expired)?
            .to_owned();
        let client_id = self.auth.client_id(state);
        let refreshed = self.client.refresh_token(&refresh_token, &client_id)?;
        self.auth.update_from_refresh(
            state,
            refreshed.access_token,
            refreshed.refresh_token,
            refreshed.id_token,
            refreshed.expires_in,
            now,
        );
        if self.auth.save(state).is_err() {
            crate::app_error!(
                "auth:grok",
                "failed to persist rotated credentials; using them for this session only"
            );
            warnings.push("刷新后的 Grok 登录状态在本次运行中有效，但无法保存。".into());
        }
        Ok(())
    }
}

impl UsageProvider for GrokProvider {
    fn definition(&self) -> ProviderDefinition {
        definition()
    }

    fn has_local_credentials(&self) -> bool {
        self.auth.has_local_credentials()
    }

    fn refresh(&self) -> Result<ProviderSnapshot, ProviderError> {
        self.refresh_inner().map_err(|error| {
            let kind = match error {
                GrokError::NotLoggedIn | GrokError::InvalidAuth | GrokError::Expired => {
                    ProviderErrorKind::Authentication
                }
                GrokError::AuthWrite => ProviderErrorKind::CredentialStorage,
                GrokError::RequestFailed(429) => ProviderErrorKind::RateLimited,
                GrokError::RequestFailed(_) | GrokError::ConnectionFailed => {
                    ProviderErrorKind::Network
                }
                GrokError::InvalidResponse => ProviderErrorKind::InvalidResponse,
                GrokError::LocalUsage => ProviderErrorKind::LocalData,
                GrokError::Storage => ProviderErrorKind::Storage,
            };
            ProviderError::from_display(kind, error)
        })
    }
}

#[cfg(test)]
mod tests;
