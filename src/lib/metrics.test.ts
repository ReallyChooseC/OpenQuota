import { describe, expect, it } from 'vitest';
import { codexState, providerCatalog } from '../test/appFixtures';
import { ProviderCatalogIndex, usageSourceNote } from './metrics';

describe('provider catalog index', () => {
  it('indexes provider identity and metric metadata from bootstrap data', () => {
    const catalog = new ProviderCatalogIndex(providerCatalog);

    expect(catalog.displayName('codex')).toBe('Codex');
    expect(catalog.displayName('codex', { codex: '  Work Account  ' })).toBe('Work Account');
    expect(catalog.metric('claude.session')).toMatchObject({
      label: '当前周期',
      source: { kind: 'quota', sourceId: 'session', sessionWindow: true },
    });
    expect(catalog.supportsSpend('claude')).toBe(true);
    expect(catalog.supportsSpend('antigravity')).toBe(false);
    expect(catalog.supportsApiKeyConfiguration('openrouter')).toBe(true);
    expect(catalog.supportsApiKeyConfiguration('codex')).toBe(false);
    expect(catalog.metric('openrouter.balance')).toMatchObject({
      label: '余额',
      source: { kind: 'value', sourceId: 'balance' },
    });
    expect(catalog.localUsageSourceNote('codex')).toBe('根据本地 Codex 日志估算');
    expect(catalog.provider('codex')?.links).toEqual([
      { label: '服务状态', url: 'https://status.openai.com/' },
      { label: '网页面板', url: 'https://chatgpt.com/codex/settings/usage' },
    ]);
  });

  it('uses safe unknown-provider fallbacks without borrowing another provider identity', () => {
    const catalog = new ProviderCatalogIndex(providerCatalog);

    expect(catalog.displayName('future-provider')).toBe('future-provider');
    expect(catalog.metric('future-provider.session')).toBeUndefined();
    expect(catalog.localUsageSourceNote('future-provider')).toBe(
      '来自你的 future-provider 用量历史',
    );
  });

  it('prefers the snapshot usage source when an additional local source contributed', () => {
    const catalog = new ProviderCatalogIndex(providerCatalog);
    const snapshot = structuredClone(codexState.snapshot!);
    snapshot.usage.last30Days!.modelBreakdown = {
      models: [],
      sourceNote: '根据本地 Codex 和 pi 日志估算',
    };

    expect(usageSourceNote(catalog, snapshot)).toBe('根据本地 Codex 和 pi 日志估算');
    snapshot.usage.last30Days!.modelBreakdown = null;
    snapshot.usage.today!.modelBreakdown = null;
    snapshot.usage.yesterday!.modelBreakdown = null;
    expect(usageSourceNote(catalog, snapshot)).toBe('根据本地 Codex 日志估算');
  });

  it('rejects duplicate provider and metric ids at the frontend boundary', () => {
    const provider = structuredClone(providerCatalog.providers[1]);
    expect(
      () => new ProviderCatalogIndex({ providers: [provider, structuredClone(provider)] }),
    ).toThrow('服务商定义重复：codex');

    const duplicateMetric = structuredClone(provider);
    duplicateMetric.metrics.push(structuredClone(duplicateMetric.metrics[0]));
    expect(() => new ProviderCatalogIndex({ providers: [duplicateMetric] })).toThrow(
      '指标定义重复：codex.session',
    );
  });
});
