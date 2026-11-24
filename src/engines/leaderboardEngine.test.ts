import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeWeeklyLearnerMetrics,
  countCompletedCurricula,
  sortLeaderboardEntries,
  summarizeLeaderboardComparison,
  type LeaderboardEntry,
} from './leaderboardEngine';

test('countCompletedCurricula counts fully finished tracks and respects certificate floor', () => {
  const tracks = [
    { modules: [{ id: 'm1' }, { id: 'm2' }] },
    { modules: [{ id: 'm3' }, { id: 'm4' }] },
    { modules: [] },
  ];

  assert.equal(countCompletedCurricula(tracks, ['m1', 'm2', 'm3']), 1);
  assert.equal(countCompletedCurricula(tracks, ['m1', 'm2', 'm3', 'm4']), 2);
  assert.equal(countCompletedCurricula(tracks, ['m1'], 3), 3);
  assert.equal(countCompletedCurricula(tracks, [], -2), 0);
});

test('computeWeeklyLearnerMetrics counts rolling 7-day active days, modules, and consecutive streak', () => {
  const ref = new Date(2026, 10, 15, 12, 0, 0); // 2026-11-15
  const activityCounts = {
    '2026-11-15': 3,
    '2026-11-14': 2,
    '2026-11-13': 1,
    '2026-11-01': 4, // outside rolling 7-day window
  };

  const metrics = computeWeeklyLearnerMetrics(
    activityCounts,
    ['m1', 'm2', 'm3', 'm4', 'm4'],
    ref,
  );

  assert.equal(metrics.weeklyActiveDays, 3);
  assert.equal(metrics.weeklyModulesCompleted, 6);
  assert.equal(metrics.currentStreak, 3);
  assert.equal(metrics.totalModulesCompleted, 4);
});

test('sortLeaderboardEntries ranks by weekly_streak, module_volume, daily_streak, and completed_curricula independently', () => {
  const entries: LeaderboardEntry[] = [
    {
      uid: 'u1',
      username: 'ada',
      preferredLanguage: 'python',
      rank: 'expert',
      weeklyActiveDays: 6,
      currentStreak: 9,
      weeklyModulesCompleted: 7,
      totalModulesCompleted: 14,
      completedCurriculaCount: 1,
      updatedAt: '2026-11-15T10:00:00Z',
    },
    {
      uid: 'u2',
      username: 'linus',
      preferredLanguage: 'cpp',
      rank: 'master',
      weeklyActiveDays: 4,
      currentStreak: 4,
      weeklyModulesCompleted: 12,
      totalModulesCompleted: 18,
      completedCurriculaCount: 4,
      updatedAt: '2026-11-15T11:00:00Z',
    },
    {
      uid: 'u3',
      username: 'grace',
      preferredLanguage: 'sql',
      rank: 'legend',
      weeklyActiveDays: 5,
      currentStreak: 14,
      weeklyModulesCompleted: 5,
      totalModulesCompleted: 20,
      completedCurriculaCount: 2,
      updatedAt: '2026-11-15T12:00:00Z',
    },
  ];

  const byStreak = sortLeaderboardEntries(entries, 'weekly_streak', 'u2');
  assert.equal(byStreak[0]?.username, 'ada');
  assert.equal(byStreak[2]?.isCurrentUser, true);
  assert.equal(byStreak[2]?.position, 3);

  const byVolume = sortLeaderboardEntries(entries, 'module_volume', 'u2');
  assert.equal(byVolume[0]?.username, 'linus');
  assert.equal(byVolume[0]?.isCurrentUser, true);
  assert.equal(byVolume[0]?.position, 1);

  const byDailyStreak = sortLeaderboardEntries(entries, 'daily_streak', 'u1');
  assert.deepEqual(
    byDailyStreak.map((r) => r.username),
    ['grace', 'ada', 'linus'],
  );
  assert.equal(byDailyStreak[1]?.isCurrentUser, true);

  const byCurricula = sortLeaderboardEntries(entries, 'completed_curricula', 'u3');
  assert.deepEqual(
    byCurricula.map((r) => r.username),
    ['linus', 'grace', 'ada'],
  );
  assert.equal(byCurricula[0]?.completedCurriculaCount, 4);
  assert.equal(byCurricula[1]?.isCurrentUser, true);
});

test('summarizeLeaderboardComparison calculates accurate peer gaps and averages', () => {
  const ranked = sortLeaderboardEntries(
    [
      {
        uid: 'u1',
        username: 'ada',
        preferredLanguage: 'python',
        rank: 'expert',
        weeklyActiveDays: 6,
        currentStreak: 6,
        weeklyModulesCompleted: 10,
        totalModulesCompleted: 15,
        updatedAt: '2026-11-15T10:00:00Z',
      },
      {
        uid: 'u2',
        username: 'grace',
        preferredLanguage: 'sql',
        rank: 'intern',
        weeklyActiveDays: 4,
        currentStreak: 2,
        weeklyModulesCompleted: 6,
        totalModulesCompleted: 8,
        updatedAt: '2026-11-15T10:00:00Z',
      },
    ],
    'weekly_streak',
    'u2',
  );

  const summary = summarizeLeaderboardComparison(ranked, 'u2');
  assert.equal(summary.currentUserPosition, 2);
  assert.equal(summary.totalLearners, 2);
  assert.equal(summary.leaderUsername, 'ada');
  assert.equal(summary.weeklyStreakLeaderGap, 2);
  assert.equal(summary.weeklyModulesLeaderGap, 4);
  assert.equal(summary.averageWeeklyActiveDays, 5);
  assert.equal(summary.averageWeeklyModules, 8);
});
