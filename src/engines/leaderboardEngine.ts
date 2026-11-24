import type { LanguageId, SkillLevel } from '../types/curriculum';
import { computeStreakMetrics, toLocalDateKey } from './streaksEngine';

export type LeaderboardSortMetric =
  | 'weekly_streak'
  | 'module_volume'
  | 'daily_streak'
  | 'completed_curricula';

export interface LeaderboardEntry {
  uid: string;
  username: string;
  preferredLanguage: LanguageId;
  rank: SkillLevel;
  weeklyActiveDays: number; // 0..7 active days in rolling 7-day window
  currentStreak: number;
  weeklyModulesCompleted: number; // modules/drills logged in rolling 7-day window
  totalModulesCompleted: number;
  completedCurriculaCount?: number;
  updatedAt: string;
}

export interface RankedLeaderboardRow extends LeaderboardEntry {
  position: number;
  isCurrentUser: boolean;
}

export interface WeeklyLearnerMetrics {
  weeklyActiveDays: number;
  currentStreak: number;
  weeklyModulesCompleted: number;
  totalModulesCompleted: number;
}

export interface LeaderboardComparisonSummary {
  currentUserPosition: number | null;
  totalLearners: number;
  leaderUsername: string | null;
  weeklyStreakLeaderGap: number;
  weeklyModulesLeaderGap: number;
  averageWeeklyActiveDays: number;
  averageWeeklyModules: number;
}

export function countCompletedCurricula(
  tracks: Array<{ modules: Array<{ id: string }> }>,
  completedModuleIds: string[],
  certificatesCount: number = 0,
): number {
  const completedSet = new Set(completedModuleIds);
  let completedTracks = 0;
  for (const track of tracks) {
    if (
      track.modules.length > 0 &&
      track.modules.every((mod) => completedSet.has(mod.id))
    ) {
      completedTracks += 1;
    }
  }
  return Math.max(completedTracks, Math.max(0, Math.round(certificatesCount)));
}

export function computeWeeklyLearnerMetrics(
  activityCounts: Record<string, number>,
  totalCompletedModuleIds: string[],
  referenceDate: Date = new Date(),
): WeeklyLearnerMetrics {
  const streak = computeStreakMetrics(activityCounts, referenceDate);

  let weeklyActiveDays = 0;
  let weeklyModulesCompleted = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - offset,
      12,
      0,
      0,
      0,
    );
    const key = toLocalDateKey(day);
    const count = Math.max(0, Math.round(Number(activityCounts[key]) || 0));
    if (count > 0) {
      weeklyActiveDays += 1;
      weeklyModulesCompleted += count;
    }
  }

  return {
    weeklyActiveDays,
    currentStreak: streak.currentStreak,
    weeklyModulesCompleted,
    totalModulesCompleted: Array.from(new Set(totalCompletedModuleIds)).length,
  };
}

export function sortLeaderboardEntries(
  entries: LeaderboardEntry[],
  metric: LeaderboardSortMetric,
  currentUid?: string | null,
): RankedLeaderboardRow[] {
  const sorted = [...entries].sort((a, b) => {
    const aCurricula = Math.max(0, Math.round(Number(a.completedCurriculaCount) || 0));
    const bCurricula = Math.max(0, Math.round(Number(b.completedCurriculaCount) || 0));

    if (metric === 'daily_streak') {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      if (bCurricula !== aCurricula) {
        return bCurricula - aCurricula;
      }
      if (b.totalModulesCompleted !== a.totalModulesCompleted) {
        return b.totalModulesCompleted - a.totalModulesCompleted;
      }
    } else if (metric === 'completed_curricula') {
      if (bCurricula !== aCurricula) {
        return bCurricula - aCurricula;
      }
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      if (b.totalModulesCompleted !== a.totalModulesCompleted) {
        return b.totalModulesCompleted - a.totalModulesCompleted;
      }
    } else if (metric === 'weekly_streak') {
      if (b.weeklyActiveDays !== a.weeklyActiveDays) {
        return b.weeklyActiveDays - a.weeklyActiveDays;
      }
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      if (b.weeklyModulesCompleted !== a.weeklyModulesCompleted) {
        return b.weeklyModulesCompleted - a.weeklyModulesCompleted;
      }
    } else {
      if (b.weeklyModulesCompleted !== a.weeklyModulesCompleted) {
        return b.weeklyModulesCompleted - a.weeklyModulesCompleted;
      }
      if (b.totalModulesCompleted !== a.totalModulesCompleted) {
        return b.totalModulesCompleted - a.totalModulesCompleted;
      }
      if (b.weeklyActiveDays !== a.weeklyActiveDays) {
        return b.weeklyActiveDays - a.weeklyActiveDays;
      }
    }

    if (b.totalModulesCompleted !== a.totalModulesCompleted) {
      return b.totalModulesCompleted - a.totalModulesCompleted;
    }

    return a.username.localeCompare(b.username);
  });

  return sorted.map((entry, index) => ({
    ...entry,
    completedCurriculaCount: Math.max(
      0,
      Math.round(Number(entry.completedCurriculaCount) || 0),
    ),
    position: index + 1,
    isCurrentUser: Boolean(currentUid && entry.uid === currentUid),
  }));
}

export function summarizeLeaderboardComparison(
  ranked: RankedLeaderboardRow[],
  currentUid?: string | null,
): LeaderboardComparisonSummary {
  if (ranked.length === 0) {
    return {
      currentUserPosition: null,
      totalLearners: 0,
      leaderUsername: null,
      weeklyStreakLeaderGap: 0,
      weeklyModulesLeaderGap: 0,
      averageWeeklyActiveDays: 0,
      averageWeeklyModules: 0,
    };
  }

  const currentRow = currentUid
    ? ranked.find((row) => row.uid === currentUid) ?? null
    : null;
  const topStreak = Math.max(...ranked.map((r) => r.weeklyActiveDays));
  const topModules = Math.max(...ranked.map((r) => r.weeklyModulesCompleted));
  const totalDays = ranked.reduce((sum, r) => sum + r.weeklyActiveDays, 0);
  const totalMods = ranked.reduce((sum, r) => sum + r.weeklyModulesCompleted, 0);

  return {
    currentUserPosition: currentRow?.position ?? null,
    totalLearners: ranked.length,
    leaderUsername: ranked[0]?.username ?? null,
    weeklyStreakLeaderGap: currentRow
      ? Math.max(0, topStreak - currentRow.weeklyActiveDays)
      : 0,
    weeklyModulesLeaderGap: currentRow
      ? Math.max(0, topModules - currentRow.weeklyModulesCompleted)
      : 0,
    averageWeeklyActiveDays: Number((totalDays / ranked.length).toFixed(1)),
    averageWeeklyModules: Number((totalMods / ranked.length).toFixed(1)),
  };
}
