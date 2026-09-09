import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import StatusMetric from './StatusMetric.svelte';

afterEach(cleanup);

describe('StatusMetric', () => {
  it('renders semantic status text and its provider subtitle', () => {
    render(StatusMetric, {
      label: '额外用量',
      metric: {
        id: 'payAsYouGo',
        label: '额外用量',
        text: '2500 cap',
        tone: 'positive',
        subtitle: '按量付费 is enabled.',
      },
    });

    expect(screen.getByText('2500 cap')).toHaveClass('status-badge--positive');
    expect(screen.getByText('2500 cap')).toHaveAttribute('data-tooltip', '按量付费 is enabled.');
  });

  it('shows an honest placeholder when the status is absent', () => {
    render(StatusMetric, { label: '额外用量', metric: null });
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });
});
