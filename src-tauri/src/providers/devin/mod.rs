mod auth;
mod client;
mod mapper;

use chrono::{DateTime, Utc};
use reqwest::StatusCode;
use thiserror::Error;

use crate::models::{
    MetricDefinition, MetricSection, ProviderDefinition, ProviderErrorKind, ProviderLink,
    ProviderSnapshot, UsageHistory,
};

use self::{
    auth::{deduplicate_candidates, DevinAuth, DevinAuthStore},
    client::{DevinClient, DevinResponse},
    mapper::map_user_status_response,
};

use super::{ProviderError, UsageProvider};

pub(crate) fn definition() -> ProviderDefinition {
    ProviderDefinition {
        id: "devin".into(),
        display_name: "Devin".into(),
        short_name: "D".into(),
        fallback_enabled: false,
        local_usage_source_note: None,
        links: vec![ProviderLink::new(
            "网页面板",
            "https://app.devin.ai/settings/plans",
        )],
        metrics: vec![
            MetricDefinition::quota(
                "devin.daily",
                "每日额度",
                "daily",
                false,
                true,
                MetricSection::AlwaysVisible,
                false,
                "D",
            ),
            MetricDefinition::quota(
                "devin.weekly",
                "本周额度",
                "weekly",
                false,
                true,
                MetricSection::AlwaysVisible,
                false,
                "W",
            ),
            MetricDefinition::value(
                "devin.extra",
                "额外余额",
                "extraUsageBalance",
                true,
                MetricSection::OnDemand,
                false,
                "E",
                None,
            ),
        ],
    }
}

#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum DevinError {
    #[error("尚未登录 Devin。请运行 `devin auth login` 或在 Devin 应用中登录。")]
    NotLoggedIn,
    #[error("Devin 登录已过期。请运行 `devin auth login` 或在 Devin 应用中登录。")]
    AuthenticationFailed,
    #[error("无法连接 Devin，请检查网络连接。")]
    ConnectionFailed,
    #[error("Devin 返回的用量数据无效。")]
    InvalidResponse,
    #[error("Devin 用量请求失败（HTTP {0}）。")]
    RequestFailed(u16),
    #[error("此账号的 Devin 额度数据不可用。")]
    QuotaUnavailable,
}

impl From<DevinError> for ProviderError {
    fn from(error: DevinError) -> Self {
        let kind = match error {
            DevinError::NotLoggedIn | DevinError::AuthenticationFailed => {
                ProviderErrorKind::Authentication
            }
            DevinError::RequestFailed(429) => ProviderErrorKind::RateLimited,
            DevinError::ConnectionFailed => ProviderErrorKind::Network,
            DevinError::InvalidResponse
            | DevinError::RequestFailed(_)
            | DevinError::QuotaUnavailable => ProviderErrorKind::InvalidResponse,
        };
        ProviderError::from_display(kind, error)
    }
}

pub struct DevinProvider {
    auth: DevinAuthStore,
    client: DevinClient,
    now: Box<dyn Fn() -> DateTime<Utc> + Send + Sync>,
}

impl DevinProvider {
    pub fn new() -> Result<Self, ProviderError> {
        Ok(Self {
            auth: DevinAuthStore::new(),
            client: DevinClient::new().map_err(ProviderError::from)?,
            now: Box::new(Utc::now),
        })
    }

    #[cfg(test)]
    fn with_dependencies(auth: DevinAuthStore, client: DevinClient, now: DateTime<Utc>) -> Self {
        Self {
            auth,
            client,
            now: Box::new(move || now),
        }
    }

    fn refresh_inner(&self) -> Result<ProviderSnapshot, DevinError> {
        self.refresh_auth_candidates(self.auth.load_candidates())
    }

    #[cfg(test)]
    fn refresh_candidates(
        &self,
        credentials: Option<DevinAuth>,
        app_auth: Option<DevinAuth>,
    ) -> Result<ProviderSnapshot, DevinError> {
        self.refresh_auth_candidates(credentials.into_iter().chain(app_auth))
    }

    fn refresh_auth_candidates(
        &self,
        candidates: impl IntoIterator<Item = DevinAuth>,
    ) -> Result<ProviderSnapshot, DevinError> {
        let candidates = deduplicate_candidates(candidates);
        if candidates.is_empty() {
            return Err(DevinError::NotLoggedIn);
        }

        let mut failures = Vec::new();
        for auth in candidates {
            match self.refresh_candidate(&auth) {
                Ok(snapshot) => return Ok(snapshot),
                Err(error) => failures.push(error),
            }
        }
        Err(select_failure(failures))
    }

    fn refresh_candidate(&self, auth: &DevinAuth) -> Result<ProviderSnapshot, DevinError> {
        let response = self.client.fetch_user_status(auth)?;
        require_success(&response)?;
        let mapped = map_user_status_response(&response.body)?;
        Ok(ProviderSnapshot {
            provider_id: "devin".into(),
            plan: mapped.plan,
            quotas: mapped.quotas,
            value_metrics: mapped.value_metrics,
            status_metrics: Vec::new(),
            notices: Vec::new(),
            usage: UsageHistory::default(),
            warnings: Vec::new(),
            refreshed_at: (self.now)(),
        })
    }
}

impl UsageProvider for DevinProvider {
    fn definition(&self) -> ProviderDefinition {
        definition()
    }

    fn has_local_credentials(&self) -> bool {
        self.auth.has_local_credentials()
    }

    fn refresh(&self) -> Result<ProviderSnapshot, ProviderError> {
        self.refresh_inner().map_err(ProviderError::from)
    }
}

fn require_success(response: &DevinResponse) -> Result<(), DevinError> {
    if response.status.is_success() {
        Ok(())
    } else if matches!(
        response.status,
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN
    ) {
        Err(DevinError::AuthenticationFailed)
    } else {
        Err(DevinError::RequestFailed(response.status.as_u16()))
    }
}

fn select_failure(failures: Vec<DevinError>) -> DevinError {
    let mut saw_auth_failure = false;
    for error in failures {
        if matches!(error, DevinError::AuthenticationFailed) {
            saw_auth_failure = true;
        } else {
            return error;
        }
    }
    if saw_auth_failure {
        DevinError::AuthenticationFailed
    } else {
        DevinError::NotLoggedIn
    }
}

#[cfg(test)]
mod tests;
