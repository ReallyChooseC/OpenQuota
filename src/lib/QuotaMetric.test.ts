import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuotaMetric from './QuotaMetric.svelte';
import type { QuotaWindow } from './types';

const now = Date.parse('2026-07-10T12:00:00Z');
const periodSeconds = 10_000;

afterEach(cleanup);

function quota(usedPercent: number, elapsedFraction = 0.5): QuotaWindow {
  return {
    id: 'weekly',
    label: '本周额度',
    usedPercent,
    format: 'percent',
    usedValue: null,
    limitValue: null,
    estimated: false,
    periodSeconds,
    resetsAt: new Date(now + (1 - elapsedFraction) * periodSeconds * 1000).toISOString(),
  };
}

function show(value: QuotaWindow, onToggleReset = vi.fn(), isSessionWindow = false) {
  return {
    onToggleReset,
    ...render(QuotaMetric, {
      quota: value,
      now,
      usageDisplay: 'left',
      resetDisplay: 'countdown',
      timeFormat: 'system',
      alwaysShowPacing: false,
      isSessionWindow,
      onToggleUsage: vi.fn(),
      onToggleReset,
    }),
  };
}

function showAlways(value: QuotaWindow) {
  return render(QuotaMetric, {
    quota: value,
    now,
    usageDisplay: 'left',
    resetDisplay: 'countdown',
    timeFormat: 'system',
    alwaysShowPacing: true,
    isSessionWindow: false,
    onToggleUsage: vi.fn(),
    onToggleReset: vi.fn(),
  });
}

describe('quota pacing presentation', () => {
  it('shows the flame, run-out time, and projection tooltip', async () => {
    const onToggleReset = vi.fn();
    const { container } = show(quota(60), onToggleReset);
    const warning = screen.getByRole('button', { name: '56分钟后用尽' });
    expect(container.querySelector('.pace-warning__icon')).toBeInTheDocument();
    expect(warning).toHaveAttribute('data-tooltip', '重置时预计超额约 20%');
    expect(container.querySelector('.meter-shell')).toHaveAttribute(
      'data-tooltip',
      '重置时预计超额约 20%',
    );
    expect(container.querySelector('.meter__fill')).toHaveStyle('--fill-percent: 40%');
    expect(screen.getByRole('button', { name: '剩余 40%' })).toHaveAttribute(
      'data-tooltip',
      '已用 60%',
    );
    expect(screen.getByRole('button', { name: /后重置/ })).toHaveAttribute(
      'data-tooltip',
      expect.stringContaining('今天 '),
    );
    await fireEvent.click(warning);
    expect(onToggleReset).toHaveBeenCalledOnce();
  });

  it('shows a flame without a misleading time at the exact-limit edge', () => {
    const { container } = show(quota(50));
    expect(screen.getByLabelText('预计将用尽额度')).toBeInTheDocument();
    expect(screen.queryByText(/后用尽/)).not.toBeInTheDocument();
    expect(container.querySelector('.pace-warning')).toHaveAttribute(
      'data-tooltip',
      '重置时预计用尽额度',
    );
  });

  it('shows the rounded spare copy and projected-use tooltip when close', () => {
    show(quota(46));
    expect(screen.getByText('预计剩余约 8%')).toHaveAttribute(
      'data-tooltip',
      '重置时预计已用约 92%',
    );
  });

  it('frames the even-pace tick in the selected remaining mode', () => {
    const { container } = show(quota(30, 0.25));
    expect(container.querySelector('.meter__pace')).toHaveStyle('--pace-percent: 75%');
  });

  it('shows an unused rolling session as not started without pacing decoration', () => {
    const { container } = show(quota(0), vi.fn(), true);
    expect(screen.getByText('尚未开始')).toHaveAttribute(
      'data-tooltip',
      '发送第一条消息后开始计算当前周期。',
    );
    expect(container.querySelector('.pace-warning')).not.toBeInTheDocument();
    expect(container.querySelector('.meter-shell')).not.toHaveAttribute('data-tooltip');
  });

  it('does not decorate unused non-session quotas as healthy pacing', () => {
    const { container } = showAlways(quota(0));
    expect(screen.queryByText(/重置时预计剩余/)).not.toBeInTheDocument();
    expect(container.querySelector('.meter__pace')).not.toBeInTheDocument();
    expect(container.querySelector('.meter-shell')).not.toHaveAttribute('data-tooltip');
  });

  it('renders provider-supplied count units instead of a hardcoded request label', () => {
    show({
      ...quota(24),
      id: 'requests',
      label: '请求数',
      format: 'count',
      usedValue: 120,
      limitValue: 500,
      unit: 'searches',
    });
    expect(screen.getByRole('button', { name: '剩余 380 searches' })).toHaveAttribute(
      'data-tooltip',
      '已用 120 searches',
    );
  });

  it('marks inferred quotas with their source note', () => {
    show({
      ...quota(24),
      estimated: true,
      sourceNote: 'Estimated from local records.',
    });

    expect(screen.getByLabelText('估算额度')).toHaveAttribute(
      'data-tooltip',
      'Estimated from local records.',
    );
  });
});
