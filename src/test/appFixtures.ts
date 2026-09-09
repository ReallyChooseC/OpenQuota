import { ProviderCatalogIndex } from '../lib/metrics';
import type {
  MetricDefinition,
  ProviderCatalog,
  ProviderViewState,
  SettingsViewState,
  UsageViewState,
} from '../lib/types';

function quota(
  id: string,
  label: string,
  sourceId: string,
  sessionWindow = false,
): MetricDefinition {
  return {
    id,
    label,
    source: { kind: 'quota', sourceId, sessionWindow },
    pinnable: true,
    defaultEnabled: true,
    defaultSection: 'onDemand',
    defaultPinned: false,
    tray: { shortLabel: label.slice(0, 1), suffix: null },
  };
}

function usage(
  id: string,
  label: string,
  period: 'today' | 'yesterday' | 'last30Days',
): MetricDefinition {
  return {
    id,
    label,
    source: { kind: 'usage', period },
    pinnable: true,
    defaultEnabled: true,
    defaultSection: 'onDemand',
    defaultPinned: false,
    tray: { shortLabel: label.slice(0, 1), suffix: null },
  };
}

function trend(id: string): MetricDefinition {
  return {
    id,
    label: '用量趋势',
    source: { kind: 'trend' },
    pinnable: false,
    defaultEnabled: true,
    defaultSection: 'alwaysVisible',
    defaultPinned: false,
    tray: null,
  };
}

function value(id: string, label: string, sourceId: string): MetricDefinition {
  return {
    id,
    label,
    source: { kind: 'value', sourceId },
    pinnable: true,
    defaultEnabled: true,
    defaultSection: 'onDemand',
    defaultPinned: false,
    tray: { shortLabel: label.slice(0, 1), suffix: null },
  };
}

export const providerCatalog: ProviderCatalog = {
  apiKeyProviderIds: ['openrouter'],
  providers: [
    {
      id: 'claude',
      displayName: 'Claude',
      shortName: 'Cl',
      fallbackEnabled: false,
      localUsageSourceNote: '根据本地 Claude 用量历史估算',
      links: [
        { label: '服务状态', url: 'https://status.anthropic.com/' },
        { label: '网页面板', url: 'https://claude.ai/settings/usage' },
      ],
      metrics: [
        quota('claude.session', '当前周期', 'session', true),
        quota('claude.weekly', '本周额度', 'weekly'),
        quota('claude.sonnet', 'Sonnet', 'sonnet'),
        quota('claude.fable', 'Fable', 'fable'),
        {
          ...quota('claude.extra', '额外用量', 'extra'),
          source: { kind: 'quotaOrValue', sourceId: 'extra', sessionWindow: false },
        },
        trend('claude.trend'),
        usage('claude.today', '今天', 'today'),
        usage('claude.yesterday', '昨天', 'yesterday'),
        usage('claude.last30', '最近 30 天', 'last30Days'),
      ],
    },
    {
      id: 'codex',
      displayName: 'Codex',
      shortName: 'Cx',
      fallbackEnabled: true,
      localUsageSourceNote: '根据本地 Codex 日志估算',
      links: [
        { label: '服务状态', url: 'https://status.openai.com/' },
        { label: '网页面板', url: 'https://chatgpt.com/codex/settings/usage' },
      ],
      metrics: [
        quota('codex.session', '当前周期', 'session'),
        quota('codex.weekly', '本周额度', 'weekly'),
        quota('codex.spark', 'Spark', 'spark'),
        quota('codex.sparkWeekly', 'Spark 本周额度', 'sparkWeekly'),
        trend('codex.trend'),
        {
          ...quota('codex.credits', '额外用量', 'credits'),
          source: { kind: 'value', sourceId: 'credits' },
        },
        {
          ...quota('codex.rateLimitResets', '额度重置次数', 'rateLimitResets'),
          source: { kind: 'value', sourceId: 'rateLimitResets' },
          tray: { shortLabel: 'R', suffix: 'resets' },
        },
        usage('codex.today', '今天', 'today'),
        usage('codex.yesterday', '昨天', 'yesterday'),
        usage('codex.last30', '最近 30 天', 'last30Days'),
      ],
    },
    {
      id: 'antigravity',
      displayName: 'Antigravity',
      shortName: 'A',
      fallbackEnabled: false,
      localUsageSourceNote: null,
      links: [],
      metrics: [
        quota('antigravity.geminiPro', '当前周期', 'geminiPro', true),
        quota('antigravity.geminiWeekly', '本周额度', 'geminiWeekly'),
        quota('antigravity.claude', 'Claude', 'claude', true),
        quota('antigravity.claudeWeekly', 'Claude 本周额度', 'claudeWeekly'),
      ],
    },
    {
      id: 'openrouter',
      displayName: 'OpenRouter',
      shortName: 'OR',
      fallbackEnabled: false,
      localUsageSourceNote: null,
      links: [
        { label: '活动记录', url: 'https://openrouter.ai/activity' },
        { label: '点数', url: 'https://openrouter.ai/settings/credits' },
      ],
      metrics: [
        quota('openrouter.credits', '点数', 'credits'),
        value('openrouter.balance', '余额', 'balance'),
        value('openrouter.today', '今天', 'today'),
        value('openrouter.week', '本周', 'week'),
        value('openrouter.month', '本月', 'month'),
        quota('openrouter.keyLimit', '密钥额度', 'keyLimit'),
      ],
    },
  ],
};

export const providerCatalogIndex = new ProviderCatalogIndex(providerCatalog);

export const codexState: ProviderViewState = {
  source: 'live',
  refreshing: false,
  stale: false,
  error: null,
  errorKind: null,
  lastAttemptAt: null,
  snapshot: {
    providerId: 'codex',
    plan: 'Plus',
    refreshedAt: '2026-07-10T10:00:00Z',
    warnings: [],
    quotas: [
      {
        id: 'session',
        label: '当前周期',
        usedPercent: 32,
        resetsAt: '2099-01-01T00:00:00Z',
        periodSeconds: 18000,
        format: 'percent',
        usedValue: null,
        limitValue: null,
        estimated: false,
      },
      {
        id: 'weekly',
        label: '本周额度',
        usedPercent: 59,
        resetsAt: '2099-01-07T00:00:00Z',
        periodSeconds: 604800,
        format: 'percent',
        usedValue: null,
        limitValue: null,
        estimated: false,
      },
    ],
    valueMetrics: [
      {
        id: 'rateLimitResets',
        label: '额度重置次数',
        values: [{ number: 2, kind: 'count', label: '可用', estimated: false }],
        expiriesAt: ['2099-01-02T00:00:00Z', '2099-01-03T00:00:00Z'],
      },
      {
        id: 'credits',
        label: '额外用量',
        values: [
          { number: 32.84, kind: 'dollars', estimated: true },
          { number: 821, kind: 'count', label: '点数', estimated: false },
        ],
        expiriesAt: [],
      },
    ],
    statusMetrics: [],
    notices: [],
    usage: {
      today: {
        tokens: 2100000,
        estimatedCostUsd: 3.84,
        costEstimated: true,
        estimateComplete: true,
      },
      yesterday: {
        tokens: 684000,
        estimatedCostUsd: 1.27,
        costEstimated: true,
        estimateComplete: true,
      },
      last30Days: {
        tokens: 3000000,
        estimatedCostUsd: 5.11,
        costEstimated: true,
        estimateComplete: true,
      },
      daily: [
        { date: '2026-07-10', tokens: 2100000, estimatedCostUsd: 3.84, estimateComplete: true },
      ],
      unknownModels: [],
    },
  },
};

export const liveState: UsageViewState = { providers: { codex: codexState } };

export const claudeState: ProviderViewState = {
  source: 'live',
  refreshing: false,
  stale: false,
  error: null,
  errorKind: null,
  lastAttemptAt: null,
  snapshot: {
    providerId: 'claude',
    plan: 'Max',
    refreshedAt: '2026-07-11T10:00:00Z',
    warnings: [],
    quotas: [
      {
        id: 'session',
        label: '当前周期',
        usedPercent: 20,
        resetsAt: '2099-01-01T00:00:00Z',
        periodSeconds: 18000,
        format: 'percent',
        usedValue: null,
        limitValue: null,
        estimated: false,
      },
      {
        id: 'extra',
        label: '额外用量',
        usedPercent: 25,
        resetsAt: null,
        periodSeconds: 0,
        format: 'dollars',
        usedValue: 12.5,
        limitValue: 50,
        estimated: false,
      },
    ],
    valueMetrics: [],
    statusMetrics: [],
    notices: [],
    usage: { today: null, yesterday: null, last30Days: null, daily: [], unknownModels: [] },
  },
};

export const antigravityState: ProviderViewState = {
  source: 'live',
  refreshing: false,
  stale: false,
  error: null,
  errorKind: null,
  lastAttemptAt: null,
  snapshot: {
    providerId: 'antigravity',
    plan: 'Pro',
    refreshedAt: '2026-07-11T10:00:00Z',
    warnings: [],
    quotas: [
      {
        id: 'geminiPro',
        label: '当前周期',
        usedPercent: 0,
        resetsAt: '2099-01-01T00:00:00Z',
        periodSeconds: 18000,
        format: 'percent',
        usedValue: null,
        limitValue: null,
        estimated: false,
      },
      {
        id: 'geminiWeekly',
        label: '本周额度',
        usedPercent: 13,
        resetsAt: '2099-01-07T00:00:00Z',
        periodSeconds: 604800,
        format: 'percent',
        usedValue: null,
        limitValue: null,
        estimated: false,
      },
    ],
    valueMetrics: [],
    statusMetrics: [],
    notices: [],
    usage: { today: null, yesterday: null, last30Days: null, daily: [], unknownModels: [] },
  },
};

export const settingsState: SettingsViewState = {
  settingsRevision: 0,
  accountRevision: 0,
  renamableProviderIds: ['claude', 'codex'],
  notificationPermission: 'prompt',
  integrationError: null,
  trayAvailable: true,
  platformSummary: null,
  settings: {
    schemaVersion: 7,
    providerNames: {},
    knownProviderIds: ['claude', 'codex', 'antigravity'],
    showTotalSpend: true,
    theme: 'system',
    density: 'default',
    reduceAnimations: false,
    windowMode: 'popup',
    menuBarStyle: 'text',
    usageDisplay: 'left',
    resetDisplay: 'countdown',
    timeFormat: 'system',
    alwaysShowPacing: false,
    launchAtLogin: false,
    autoCheckUpdates: true,
    dismissedUpdateVersion: null,
    lastUpdateCheckAt: null,
    globalShortcut: null,
    logLevel: 'info',
    notifications: { almostOut: false, cuttingItClose: false, willRunOut: false },
    totalSpendMetric: 'cost',
    totalSpendPeriod: 'today',
    detectionNoticeDismissed: true,
    providers: [
      {
        id: 'codex',
        enabled: true,
        detected: true,
        expanded: false,
        metrics: [
          { id: 'codex.session', enabled: true, section: 'alwaysVisible', pinned: true },
          { id: 'codex.weekly', enabled: true, section: 'alwaysVisible', pinned: true },
          { id: 'codex.spark', enabled: true, section: 'onDemand', pinned: false },
          { id: 'codex.sparkWeekly', enabled: true, section: 'onDemand', pinned: false },
          { id: 'codex.trend', enabled: true, section: 'alwaysVisible', pinned: false },
          { id: 'codex.credits', enabled: true, section: 'onDemand', pinned: false },
          { id: 'codex.rateLimitResets', enabled: true, section: 'onDemand', pinned: false },
          { id: 'codex.today', enabled: true, section: 'onDemand', pinned: false },
          { id: 'codex.yesterday', enabled: true, section: 'onDemand', pinned: false },
          { id: 'codex.last30', enabled: true, section: 'onDemand', pinned: false },
        ],
      },
    ],
  },
};
