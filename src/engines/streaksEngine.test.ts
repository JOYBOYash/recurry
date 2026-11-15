import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMiniWeekStrip,
  buildRollingConsistencyWindow,
  buildStreakCalendarMonth,
  collectDailyActivityCounts,
  computeDailyGoalProgress,
  computeStreakMetrics,
  DAILY_GOAL_OPTIONS,
  normalizeDailyGoalTarget,
} from './streaksEngine';

test('collectDailyActivityCounts merges moduleCompletedAt and activeStudyDates', () => {
  const counts = collectDailyActivityCounts(
    {
      m1: '2026-11-12T10:00:00.000Z',
      m2: '2026-11-12',
      m3: '2026-11-14',
    },
    ['2026-11-13', '2026-11-12'],
  );
  assert.equal(counts['2026-11-12'], 2);
  assert.equal(counts['2026-11-13'], 1);
  assert.equal(counts['2026-11-14'], 1);
});

test('computeStreakMetrics computes currentStreak, longestStreak, and totalActiveDays', () => {
  const refDate = new Date(2026, 10, 15, 12, 0, 0);
  const metrics = computeStreakMetrics(
    {
      '2026-11-01': 1,
      '2026-11-02': 2,
      '2026-11-03': 1,
      '2026-11-04': 1,
      '2026-11-14': 2,
      '2026-11-15': 1,
    },
    refDate,
  );
  assert.equal(metrics.currentStreak, 2);
  assert.equal(metrics.longestStreak, 4);
  assert.equal(metrics.totalActiveDays, 6);
  assert.equal(metrics.activeToday, true);
});

test('buildStreakCalendarMonth generates complete calendar grid with intensity and streak chain flags', () => {
  const refDate = new Date(2026, 10, 15, 12, 0, 0); // Nov 15 2026
  const calendar = buildStreakCalendarMonth(
    2026,
    10, // November (0-indexed)
    {
      '2026-11-10': 1,
      '2026-11-14': 2,
      '2026-11-15': 3,
    },
    2,
    refDate,
  );
  assert.equal(calendar.monthLabel, 'November 2026');
  assert.equal(calendar.cells.length % 7, 0);
  assert.equal(calendar.activeDaysInMonth, 3);
  assert.equal(calendar.modulesCompletedInMonth, 6);

  const nov15 = calendar.cells.find((c) => c.dateKey === '2026-11-15');
  assert.ok(nov15);
  assert.equal(nov15.isToday, true);
  assert.equal(nov15.isGoalMet, true);
  assert.equal(nov15.intensity, 3);
  assert.equal(nov15.isInCurrentStreak, true);

  const nov10 = calendar.cells.find((c) => c.dateKey === '2026-11-10');
  assert.ok(nov10);
  assert.equal(nov10.intensity, 1);
  assert.equal(nov10.isGoalMet, false);
  assert.equal(nov10.isInCurrentStreak, false);
});

test('buildMiniWeekStrip returns 7 rolling days ending on referenceDate', () => {
  const refDate = new Date(2026, 10, 15, 12, 0, 0);
  const strip = buildMiniWeekStrip({ '2026-11-15': 2, '2026-11-13': 1 }, 2, refDate);
  assert.equal(strip.length, 7);
  assert.equal(strip[0].dateKey, '2026-11-09');
  assert.equal(strip[6].dateKey, '2026-11-15');
  assert.equal(strip[6].isToday, true);
  assert.equal(strip[6].isGoalMet, true);
  assert.equal(strip[4].isActive, true);
  assert.equal(strip[4].isGoalMet, false);
});

test('buildRollingConsistencyWindow produces 30-day rolling series and consistency percentage', () => {
  const refDate = new Date(2026, 10, 15, 12, 0, 0); // Nov 15, 2026
  const window30 = buildRollingConsistencyWindow(
    {
      '2026-10-17': 1, // First day in 30-day window (Oct 17 - Nov 15)
      '2026-11-14': 2,
      '2026-11-15': 4,
      '2026-10-01': 5, // Outside 30-day window
    },
    2,
    30,
    refDate,
  );

  assert.equal(window30.windowDays, 30);
  assert.equal(window30.days.length, 30);
  assert.equal(window30.days[0].dateKey, '2026-10-17');
  assert.equal(window30.days[29].dateKey, '2026-11-15');
  assert.equal(window30.days[29].isToday, true);
  assert.equal(window30.activeDaysCount, 3);
  assert.equal(window30.goalMetDaysCount, 2);
  assert.equal(window30.totalModulesCompleted, 7);
  assert.equal(window30.consistencyPercent, 10);
  assert.equal(window30.peakDayCount, 4);
});

test('computeDailyGoalProgress clamps goal bounds cleanly', () => {
  const refDate = new Date(2026, 10, 15, 12, 0, 0);
  const res = computeDailyGoalProgress({ a: '2026-11-15' }, 2, refDate);
  assert.equal(res.completedToday, 1);
  assert.equal(res.percentage, 50);
  assert.equal(res.isGoalMet, false);
});

test('normalizeDailyGoalTarget clamps values to 1..5 and DAILY_GOAL_OPTIONS covers 1..5', () => {
  assert.deepEqual(
    DAILY_GOAL_OPTIONS.map((o) => o.modules),
    [1, 2, 3, 4, 5],
  );
  assert.equal(normalizeDailyGoalTarget(0), 1);
  assert.equal(normalizeDailyGoalTarget(-3), 1);
  assert.equal(normalizeDailyGoalTarget(3), 3);
  assert.equal(normalizeDailyGoalTarget(3.6), 4);
  assert.equal(normalizeDailyGoalTarget(9), 5);
  assert.equal(normalizeDailyGoalTarget(Number.NaN), 2);
});
