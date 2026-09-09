import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsageMetric from './UsageMetric.svelte';

describe('UsageMetric model detail', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('reveals the ranked real model names after the reference hover dwell', async () => {
    vi.useFakeTimers();
    render(UsageMetric, {
      label: '今天',
      period: {
        tokens: 2_000,
        estimatedCostUsd: 0.04,
        costEstimated: true,
        estimateComplete: true,
        unknownModels: [],
        modelBreakdown: {
          sourceNote: '根据本地 Codex 日志估算',
          models: [
            { model: 'gpt-5.4', totalTokens: 1_100, costUsd: 0.03 },
            { model: 'gpt-5.3-codex', totalTokens: 900, costUsd: 0.01 },
          ],
        },
      },
    });

    const reading = screen.getByRole('button', { name: '$0.04 · 2K Token' });
    await fireEvent.mouseEnter(reading);
    expect(screen.queryByRole('tooltip', { name: '今天 模型用量' })).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(400);

    const detail = screen.getByRole('tooltip', { name: '今天 模型用量' });
    expect(detail).toHaveTextContent('gpt-5.4');
    expect(detail).toHaveTextContent('gpt-5.3-codex');
    expect(detail).toHaveTextContent('75%');
    expect(detail).toHaveTextContent('25%');
  });

  it('shows the unknown model warning without inventing a model breakdown', () => {
    render(UsageMetric, {
      label: '今天',
      period: {
        tokens: 0,
        estimatedCostUsd: null,
        costEstimated: true,
        estimateComplete: false,
        unknownModels: ['future-unpriced-model'],
        modelBreakdown: null,
      },
    });

    expect(screen.getByLabelText('此时段使用了价格未知的模型')).toHaveAttribute(
      'data-tooltip',
      '发现价格未知的模型\n- future-unpriced-model',
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('keeps incomplete cost text ordinary and reports local estimation separately', () => {
    render(UsageMetric, {
      label: '今天',
      period: {
        tokens: 500,
        estimatedCostUsd: 0.03,
        costEstimated: true,
        estimateComplete: false,
        unknownModels: ['future-unpriced-model'],
        modelBreakdown: null,
      },
    });

    const reading = screen.getByRole('button', { name: '$0.03 · 500 Token' });
    expect(reading).toHaveAttribute('data-tooltip', '$0.03\n500 Token\n本地估算，可能存在偏差');
    expect(reading).not.toHaveTextContent('~');
    expect(screen.getByLabelText('此时段使用了价格未知的模型')).toBeVisible();
  });

  it('compacts large row values while keeping exact tooltip figures', () => {
    render(UsageMetric, {
      label: '最近 30 天',
      period: {
        tokens: 1_506_025_363,
        estimatedCostUsd: 2_059.07,
        costEstimated: true,
        estimateComplete: true,
        unknownModels: [],
        modelBreakdown: null,
      },
    });

    expect(screen.getByRole('button', { name: '$2.1K · 1.5B Token' })).toHaveAttribute(
      'data-tooltip',
      '$2,059.07\n1,506,025,363 Token\n本地估算，可能存在偏差',
    );
  });

  it('lets the model detail replace the generic estimate tooltip', () => {
    render(UsageMetric, {
      label: '今天',
      period: {
        tokens: 500,
        estimatedCostUsd: 0.03,
        costEstimated: true,
        estimateComplete: true,
        unknownModels: [],
        modelBreakdown: {
          sourceNote: 'From local logs (estimated)',
          models: [{ model: 'gpt-5.4', totalTokens: 500, costUsd: 0.03 }],
        },
      },
    });

    expect(screen.getByRole('button', { name: '$0.03 · 500 Token' })).not.toHaveAttribute(
      'data-tooltip',
    );
  });
});
