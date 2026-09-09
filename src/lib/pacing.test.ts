import { describe, expect, it } from 'vitest';
import { formatLimit, formatReset, paceTooltip, projectPace } from './pacing';
import type { QuotaWindow } from './types';

const now = new Date('2026-07-10T12:00:00Z').getTime();
function quota(
  usedPercent: number,
  elapsedFraction: number,
  overrides: Partial<QuotaWindow> = {},
): QuotaWindow {
  const periodSeconds = 10_000;
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
    ...overrides,
  };
}

describe('quota pacing', () => {
  it('distinguishes healthy, close, and running-out projections', () => {
    const healthy = projectPace(quota(30, 0.5), now);
    const close = projectPace(quota(46, 0.5), now);
    const runningOut = projectPace(quota(60, 0.5), now);
    expect(healthy.severity).toBe('healthy');
    expect(close.severity).toBe('close');
    expect(runningOut.severity).toBe('runningOut');
    expect(paceTooltip(healthy)).toBe('重置时预计剩余约 40%');
    expect(paceTooltip(close)).toBe('重置时预计已用约 92%');
    expect(paceTooltip(runningOut)).toBe('重置时预计超额约 20%');
    expect(runningOut.runOutAt).toBeGreaterThan(now);
  });

  it('starts pacing after one percent of the period with a one-minute floor', () => {
    const ready = projectPace(quota(1, 0.015), now);
    expect(ready.severity).toBe('healthy');
    expect(ready.projectedUsedPercent).toBeCloseTo(66.666, 2);
    expect(projectPace(quota(1, 0.009), now).projectedUsedPercent).toBeNull();
  });

  it('rejects alarming projections while less than five percent is used', () => {
    const projection = projectPace(quota(4, 0.02), now);
    expect(projection.severity).toBe('level');
    expect(projection.projectedUsedPercent).toBeNull();
    expect(projection.runOutAt).toBeNull();
  });

  it('keeps exact and clamped zero usage untracked', () => {
    const untracked = {
      severity: 'level',
      projectedUsedPercent: null,
      evenPacePercent: null,
      runOutAt: null,
    };
    expect(projectPace(quota(0, 0.5), now)).toEqual(untracked);
    expect(projectPace(quota(-0.1, 0.5), now)).toEqual(untracked);
  });

  it('shows only the flame when the projection lands at the limit or rounds to no spare', () => {
    const exact = projectPace(quota(50, 0.5), now);
    const roundedToZero = projectPace(quota(49.8, 0.5), now);
    expect(exact).toMatchObject({ severity: 'runningOut', runOutAt: null });
    expect(roundedToZero).toMatchObject({ severity: 'runningOut', runOutAt: null });
    expect(paceTooltip(exact)).toBe('重置时预计用尽额度');
    expect(paceTooltip(roundedToZero)).toBe('重置时预计用尽额度');
  });

  it('uses the displayed precision to decide when the limit is reached', () => {
    expect(projectPace(quota(99.5, 0.5, { resetsAt: null }), now).severity).toBe('level');
    expect(projectPace(quota(99.51, 0.5, { resetsAt: null }), now).severity).toBe('spent');
    expect(
      projectPace(
        quota(99, 0.5, {
          format: 'dollars',
          usedValue: 9.996,
          limitValue: 10,
          resetsAt: null,
        }),
        now,
      ).severity,
    ).toBe('spent');
  });

  it('supports countdown and exact reset modes', () => {
    const reset = new Date(now + 90 * 60_000).toISOString();
    expect(formatReset(reset, now, 'countdown')).toBe('1小时 30分钟后重置');
    const laterToday = new Date(now);
    laterToday.setHours(23, 59, 0, 0);
    expect(formatReset(laterToday.toISOString(), now, 'exact')).toContain('今天 ');
    expect(formatLimit(now + 39 * 60_000, now, 'countdown')).toBe('39分钟后用尽');
    expect(formatLimit(now + 5 * 60_000, now, 'countdown')).toBe('即将用尽');
    expect(formatReset(new Date(now + 60 * 60_000).toISOString(), now, 'countdown')).toBe(
      '1小时后重置',
    );
    expect(formatReset(new Date(now - 1).toISOString(), now, 'exact')).toBe('即将重置');
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    expect(formatReset(tomorrow.toISOString(), now, 'exact')).toContain('明天 ');
    expect(formatReset(new Date(now + 72 * 60 * 60_000).toISOString(), now, 'exact')).toMatch(
      /.+重置$/,
    );
  });

  it('honors explicit 12-hour and 24-hour clock preferences', () => {
    const reset = new Date('2026-07-10T18:30:00Z').toISOString();
    const twelveHour = formatReset(reset, now, 'exact', 'twelveHour');
    const twentyFourHour = formatReset(reset, now, 'exact', 'twentyFourHour');
    const dayPeriod = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', hour12: true })
      .formatToParts(new Date(reset))
      .find((part) => part.type === 'dayPeriod')?.value;
    expect(dayPeriod).toBeTruthy();
    expect(twelveHour).toContain(dayPeriod);
    expect(twentyFourHour).not.toContain(dayPeriod);
  });
});
