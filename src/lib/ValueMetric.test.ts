import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ValueMetric from './ValueMetric.svelte';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));

describe('ValueMetric', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });
  afterEach(cleanup);
  it('renders combined credit values with an exact tooltip for large balances', () => {
    render(ValueMetric, {
      label: '额外用量',
      metric: {
        id: 'credits',
        label: '额外用量',
        values: [
          { number: 1200, kind: 'dollars', estimated: false },
          { number: 30000, kind: 'count', label: 'credits', estimated: false },
        ],
        expiriesAt: [],
      },
      now: Date.parse('2026-02-20T16:00:00Z'),
      resetDisplay: 'countdown',
      timeFormat: 'twentyFourHour',
    });

    expect(screen.getByText('$1.2K · 30K credits')).toHaveAttribute(
      'data-tooltip',
      '$1,200.00 · 30,000 credits',
    );
  });

  it('marks only value rows that contain an estimated value', () => {
    render(ValueMetric, {
      label: '额外用量',
      metric: {
        id: 'credits',
        label: '额外用量',
        values: [
          { number: 4, kind: 'dollars', estimated: true },
          { number: 100, kind: 'count', label: 'credits', estimated: false },
        ],
        expiriesAt: [],
      },
      now: Date.parse('2026-02-20T16:00:00Z'),
      resetDisplay: 'countdown',
      timeFormat: 'twentyFourHour',
    });

    expect(screen.getByLabelText('估算值')).toHaveAttribute(
      'data-tooltip',
      '本地估算，可能与实际计费用量不同。',
    );
  });

  it('opens a sorted reset-expiry timeline and distinguishes count-only fallback', async () => {
    const { rerender } = render(ValueMetric, {
      label: '额度重置次数',
      metric: {
        id: 'rateLimitResets',
        label: '额度重置次数',
        values: [{ number: 2, kind: 'count', label: 'available', estimated: false }],
        expiriesAt: ['2026-02-20T19:00:00Z', '2026-02-20T17:30:00Z'],
      },
      now: Date.parse('2026-02-20T16:00:00Z'),
      resetDisplay: 'countdown',
      timeFormat: 'twentyFourHour',
    });

    const trigger = screen.getByRole('button', { name: '额度重置次数: 2 available' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: '额度重置次数 details' })).toBeVisible();
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
    expect(screen.getByText('3h')).toBeInTheDocument();

    rerender({
      label: '额度重置次数',
      metric: {
        id: 'rateLimitResets',
        label: '额度重置次数',
        values: [{ number: 3, kind: 'count', label: 'available', estimated: false }],
        expiriesAt: [],
      },
      now: Date.parse('2026-02-20T16:00:00Z'),
      resetDisplay: 'countdown',
      timeFormat: 'twentyFourHour',
    });
    expect(screen.getAllByText('3 available')).toHaveLength(2);
    expect(screen.getByText('无法获取到期时间')).toBeInTheDocument();
  });

  it('requires confirmation and claims one explicitly selected reset credit', async () => {
    mocks.invoke.mockResolvedValue('success');
    render(ValueMetric, {
      label: '额度重置次数',
      metric: {
        id: 'rateLimitResets',
        label: '额度重置次数',
        values: [{ number: 1, kind: 'count', label: 'available', estimated: false }],
        expiriesAt: ['2026-02-20T19:00:00Z'],
      },
      now: Date.parse('2026-02-20T16:00:00Z'),
      resetDisplay: 'countdown',
      timeFormat: 'twentyFourHour',
    });

    await fireEvent.click(screen.getByRole('button', { name: '额度重置次数: 1 available' }));
    await fireEvent.click(screen.getByRole('button', { name: /重置额度 expiring/ }));
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: '使用这次额度重置？' })).toHaveAccessibleDescription(
      '立即重置用量限制。此操作无法撤销。',
    );
    expect(screen.getByText('立即重置用量限制。此操作无法撤销。')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '取消' })).toHaveFocus());
    await fireEvent.click(screen.getByRole('button', { name: '重置额度' }));

    await waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith('claim_codex_reset_credit', {
        expiresAt: '2026-02-20T19:00:00Z',
        redeemRequestId: expect.any(String),
      }),
    );
    expect(await screen.findByText('已重置额度。')).toBeInTheDocument();
  });

  it('keeps reset confirmation open when focus moves into the detail panel', async () => {
    vi.useFakeTimers();
    try {
      render(ValueMetric, {
        label: '额度重置次数',
        metric: {
          id: 'rateLimitResets',
          label: '额度重置次数',
          values: [{ number: 1, kind: 'count', label: 'available', estimated: false }],
          expiriesAt: ['2026-02-20T19:00:00Z'],
        },
        now: Date.parse('2026-02-20T16:00:00Z'),
        resetDisplay: 'countdown',
        timeFormat: 'twentyFourHour',
      });

      const trigger = screen.getByRole('button', { name: '额度重置次数: 1 available' });
      trigger.focus();
      await fireEvent.click(trigger);

      const use = screen.getByRole('button', { name: /重置额度 expiring/ });
      use.focus();
      await fireEvent.click(use);
      await vi.advanceTimersByTimeAsync(181);

      expect(screen.getByText('使用这次额度重置？')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
      expect(screen.getByRole('dialog', { name: '额度重置次数 details' })).toBeVisible();
      expect(mocks.invoke).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('behaves as an anchored popover and closes with Escape', async () => {
    vi.useFakeTimers();
    try {
      render(ValueMetric, {
        label: '额度重置次数',
        metric: {
          id: 'rateLimitResets',
          label: '额度重置次数',
          values: [{ number: 1, kind: 'count', label: 'available', estimated: false }],
          expiriesAt: ['2026-02-20T19:00:00Z'],
        },
        now: Date.parse('2026-02-20T16:00:00Z'),
        resetDisplay: 'countdown',
        timeFormat: 'twentyFourHour',
      });

      await fireEvent.click(screen.getByRole('button', { name: '额度重置次数: 1 available' }));
      expect(screen.queryByLabelText('Drag 额度重置次数 panel')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Close 额度重置次数' })).not.toBeInTheDocument();

      const use = screen.getByRole('button', { name: /重置额度 expiring/ });
      await fireEvent.click(use);
      let cancel = screen.getByRole('button', { name: '取消' });
      await vi.waitFor(() => expect(cancel).toHaveFocus());
      await fireEvent.click(cancel);
      expect(screen.queryByText('使用这次额度重置？')).not.toBeInTheDocument();
      let restoredUse = screen.getByRole('button', { name: /重置额度 expiring/ });
      await vi.waitFor(() => expect(restoredUse).toHaveFocus());

      await fireEvent.click(restoredUse);
      cancel = screen.getByRole('button', { name: '取消' });
      await vi.waitFor(() => expect(cancel).toHaveFocus());
      await fireEvent.keyDown(cancel, { key: 'Escape' });
      expect(screen.queryByText('使用这次额度重置？')).not.toBeInTheDocument();
      const dialog = screen.getByRole('dialog', { name: '额度重置次数 details' });
      expect(dialog).toBeVisible();
      restoredUse = screen.getByRole('button', { name: /重置额度 expiring/ });
      await vi.waitFor(() => expect(restoredUse).toHaveFocus());
      await fireEvent.mouseLeave(dialog);
      await vi.advanceTimersByTimeAsync(181);
      expect(dialog).toBeVisible();

      await fireEvent.keyDown(restoredUse, { key: 'Escape' });
      expect(
        screen.queryByRole('dialog', { name: '额度重置次数 details' }),
      ).not.toBeInTheDocument();
      await vi.waitFor(() =>
        expect(screen.getByRole('button', { name: '额度重置次数: 1 available' })).toHaveFocus(),
      );
      await vi.advanceTimersByTimeAsync(351);
      expect(
        screen.queryByRole('dialog', { name: '额度重置次数 details' }),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
