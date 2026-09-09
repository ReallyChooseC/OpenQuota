import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProviderIcon from './ProviderIcon.svelte';
import UsageTrend from './UsageTrend.svelte';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('native visual contract', () => {
  it.each([
    'claude',
    'codex',
    'cursor',
    'antigravity',
    'copilot',
    'devin',
    'grok',
    'opencode',
    'openrouter',
    'zai',
  ])('packages the exact %s provider icon', (providerId) => {
    const { container } = render(ProviderIcon, { providerId });
    const icon = container.querySelector('.provider-icon');
    expect(icon).not.toBeNull();
    const path = icon?.querySelector('path')?.getAttribute('d');
    expect(path?.length).toBeGreaterThan(10);
  });

  it('renders provider marks with their intended brand treatment', () => {
    const claude = render(ProviderIcon, { providerId: 'claude' });
    expect(claude.container.querySelector('path')).toHaveAttribute('fill', '#DE7356');
    cleanup();
    const codex = render(ProviderIcon, { providerId: 'codex' });
    expect(codex.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
    cleanup();
    const copilot = render(ProviderIcon, { providerId: 'copilot' });
    expect(copilot.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
    cleanup();
    const cursor = render(ProviderIcon, { providerId: 'cursor' });
    expect(cursor.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
    cleanup();
    const devin = render(ProviderIcon, { providerId: 'devin' });
    expect(devin.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
    cleanup();
    const antigravity = render(ProviderIcon, { providerId: 'antigravity' });
    expect(antigravity.container.querySelector('path')).toHaveAttribute('fill', '#4285F4');
    cleanup();
    const grok = render(ProviderIcon, { providerId: 'grok' });
    expect(grok.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
    cleanup();
    const opencode = render(ProviderIcon, { providerId: 'opencode' });
    expect(opencode.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
    cleanup();
    const openrouter = render(ProviderIcon, { providerId: 'openrouter' });
    expect(openrouter.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
    cleanup();
    const zai = render(ProviderIcon, { providerId: 'zai' });
    expect(zai.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
  });

  it('reuses the Claude mark for Claude account cards', () => {
    const claude = render(ProviderIcon, { providerId: 'claude' });
    const account = render(ProviderIcon, { providerId: 'claude@1234abcd' });

    expect(account.container.innerHTML).toBe(claude.container.innerHTML);
  });

  it('uses the shared hover dwell and grace timing for 用量趋势 details', async () => {
    vi.useFakeTimers();
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    render(UsageTrend, {
      daily: [{ date, tokens: 42_000, estimatedCostUsd: 0.21, estimateComplete: true }],
      sourceNote: '根据本地 Codex 日志估算',
    });
    const chart = screen.getByRole('group', { name: '用量趋势图详情' });

    await fireEvent.mouseEnter(chart);
    await vi.advanceTimersByTimeAsync(399);
    expect(screen.queryByText('峰值 42K Token')).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(1);
    expect(screen.getByText('峰值 42K Token')).toBeInTheDocument();
    expect(screen.getByText('根据本地 Codex 日志估算')).toBeInTheDocument();

    await fireEvent.mouseLeave(chart);
    await vi.advanceTimersByTimeAsync(179);
    expect(screen.getByText('峰值 42K Token')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(1);
    expect(screen.queryByText('峰值 42K Token')).not.toBeInTheDocument();
  });

  it('reveals an exact day value when a detail bar is hovered', async () => {
    vi.useFakeTimers();
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const { container } = render(UsageTrend, {
      daily: [{ date, tokens: 42_000, estimatedCostUsd: 0.21, estimateComplete: true }],
      sourceNote: '根据本地 Codex 日志估算',
    });
    await fireEvent.mouseEnter(screen.getByRole('group', { name: '用量趋势图详情' }));
    await vi.advanceTimersByTimeAsync(400);
    const bars = container.querySelectorAll<HTMLElement>('.trend-detail__bars i');
    await fireEvent.mouseEnter(bars[bars.length - 1]);
    expect(screen.getByText(/· 42K Token$/)).toBeInTheDocument();
    expect(container.querySelectorAll('.trend-detail__bars i.muted')).toHaveLength(30);
  });
});
