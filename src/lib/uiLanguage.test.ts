import { describe, expect, it } from 'vitest';
import layoutCss from '../styles/layout.css?raw';
import sharedComponentCss from '../styles/components.css?raw';
import tokensCss from '../styles/tokens.css?raw';
import customizeDetail from './CustomizeProviderDetail.svelte?raw';
import customizeList from './CustomizeProviderList.svelte?raw';
import dashboard from './Dashboard.svelte?raw';
import providerNameSection from './ProviderNameSection.svelte?raw';
import settings from './SettingsScreen.svelte?raw';
import { coLocatedComponentCss } from './uiStyleSources';

const css = `${tokensCss}\n${layoutCss}\n${sharedComponentCss}\n${coLocatedComponentCss}`;

describe('native UI language contract', () => {
  it('uses the platform system font and reference type sizes', () => {
    expect(css).toMatch(/font-family:\s*system-ui,/);
    expect(css).not.toMatch(/font-family:\s*Inter/);
    expect(css).toMatch(/\.provider-header h1\s*{[^}]*font-size: 14px;[^}]*font-weight: 600;/s);
    expect(css).toMatch(/\.provider-list-main b\s*{[^}]*font-size: 14px;[^}]*font-weight: 600;/s);
    expect(css).toMatch(/\.setting-row\s*{[^}]*font-size: 13px;/s);
  });

  it('keeps the critical flame colored while its warning copy stays secondary', () => {
    expect(css).not.toMatch(/\.metric__heading span\s*{/);
    expect(css).toMatch(
      /\.metric__heading \.pace-warning__icon\s*{[^}]*color: var\(--meter-critical\);/s,
    );
    expect(css).toMatch(/\.metric__heading \.pace-warning\s*{[^}]*color: var\(--secondary\);/s);
  });

  it('keeps spend providers visually distinct in both appearances', () => {
    for (const provider of ['claude', 'codex', 'cursor', 'grok', 'opencode', 'openrouter']) {
      expect(tokensCss).toContain(`--provider-${provider}:`);
    }
    expect(tokensCss).toMatch(
      /@media \(prefers-color-scheme: dark\)[\s\S]*--provider-cursor: #f5f5f7;[\s\S]*--provider-opencode: #aeaeb2;/,
    );
    expect(tokensCss).toMatch(
      /:root\[data-theme='dark'\][\s\S]*--provider-cursor: #f5f5f7;[\s\S]*--provider-opencode: #aeaeb2;/,
    );
  });

  it('keeps Customize concise and free of duplicate status and count copy', () => {
    expect(customizeList).toContain('通知、外观及其他设置');
    expect(customizeList).toContain('{provider.metrics.length} 项指标');
    expect(customizeList).not.toContain('Detected locally');
    expect(customizeList).not.toContain('screen-intro');
    expect(customizeList).not.toContain('pinned\n');
    expect(customizeDetail).toContain('将指标拖到这里');
    expect(customizeDetail).toContain('已置顶到托盘栏');
    expect(customizeDetail).toContain('已从托盘栏移除');
    expect(customizeDetail).toContain('每个服务商最多置顶 2 项');
    expect(customizeDetail).not.toContain('provider-toggle-row');
    expect(customizeDetail).not.toContain('section-divider');
    expect(customizeDetail).not.toContain('of 2 pinned');
  });

  it('uses the shared Settings labels and single-line control rows', () => {
    for (const label of [
      '常规',
      '显示总用量',
      '开机启动',
      '全局快捷键',
      '图标样式',
      '外观',
      '窗口模式',
      '用量显示',
      '通知',
      '高级',
      '更新',
      '自动检查更新',
      '检查更新…',
    ]) {
      expect(settings).toContain(label);
    }
    expect(settings).toContain("{ value: 'system', label: '自动' }");
    expect(settings).toContain("{ value: 'twelveHour', label: '12 小时制' }");
    expect(settings).toContain("{ value: 'twentyFourHour', label: '24 小时制' }");
    expect(settings).not.toContain('<h2>Startup</h2>');
    expect(settings).not.toContain('Automatic Checks');
    expect(settings).not.toContain('Combined cost and token summary.');
    expect(settings).not.toContain('Show projections even when usage is healthy.');
    expect(settings).not.toContain('>×</button');
  });

  it('keeps dashboard onboarding, empty state, and menus on the shared wording', () => {
    expect(dashboard).toContain('欢迎使用 OpenQuota');
    expect(dashboard).toContain('打开自定义');
    expect(dashboard).toContain('请在自定义中选择要显示的内容。');
    expect(dashboard).toContain('自定义…');
    expect(dashboard).toContain('刷新 {providerDisplayName(menuProvider.id)}');
    expect(dashboard).not.toContain('Providers Detected');
    expect(dashboard).not.toContain('Starter Provider');
    expect(dashboard).not.toContain("Expand'} 按需显示");
    expect(dashboard).not.toContain('>×</button');
  });

  it('keeps interactive highlights in the component layer that owns their base style', () => {
    expect(providerNameSection).toMatch(
      /\.provider-name-card:focus-within\s*{[^}]*box-shadow: inset 0 0 0 2px/s,
    );
    expect(providerNameSection).toMatch(/input\s*{[^}]*display: block;/s);
    expect(dashboard).toMatch(
      /\.context-menu button:not\(:disabled\):hover,[\s\S]*background: var\(--button-hover\);/,
    );
    expect(sharedComponentCss).not.toContain('.context-menu button:hover');
  });
});
