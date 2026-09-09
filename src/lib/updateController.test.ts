import { describe, expect, it } from 'vitest';
import { nextUpdateLabel, updateFailure } from './updateController.svelte';

describe('update controller helpers', () => {
  it('normalizes structured and unknown update failures', () => {
    expect(
      updateFailure(
        { code: 'download_forbidden', message: 'Download refused.', retryable: false },
        'fallback',
      ),
    ).toEqual({
      code: 'download_forbidden',
      message: 'Download refused.',
      action: '请稍后重试。',
      retryable: false,
    });
    expect(updateFailure(new Error('Update service unavailable.'), 'Safe fallback').message).toBe(
      'Update service unavailable.',
    );
  });

  it('formats refresh timing without constructing mutable date state', () => {
    const now = Date.parse('2026-07-13T12:00:00Z');
    expect(nextUpdateLabel('2026-07-13T11:56:00Z', now)).toBe('Next update in 1m');
    expect(nextUpdateLabel('invalid', now)).toBe('无法获取下次刷新时间');
  });

  it('never shows more than the five-minute refresh interval when the UI clock lags', () => {
    const staleUiClock = Date.parse('2026-07-13T12:00:00Z');
    expect(nextUpdateLabel('2026-07-13T12:00:20Z', staleUiClock)).toBe('Next update in 5m');
  });
});
