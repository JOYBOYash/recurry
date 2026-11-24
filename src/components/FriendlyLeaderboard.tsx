import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Layers, Trophy } from 'lucide-react';
import {
  computeWeeklyLearnerMetrics,
  sortLeaderboardEntries,
  summarizeLeaderboardComparison,
  type LeaderboardEntry,
  type LeaderboardSortMetric,
} from '../engines/leaderboardEngine';
import type { LanguageId, SkillLevel } from '../types/curriculum';
import { getRankMeta } from '../utils/rankSystem';
import { LanguageIcon } from './LanguageIcon';
import { RankIcon } from './RankIcon';
import { parseApiJson } from '../utils/apiResponse';

interface FriendlyLeaderboardProps {
  currentUid: string;
  username: string;
  preferredLanguage: LanguageId;
  rank: SkillLevel;
  activityCounts: Record<string, number>;
  completedModuleIds: string[];
  completedCurriculaCount?: number;
  getIdToken: () => Promise<string>;
}

export function FriendlyLeaderboard({
  currentUid,
  username,
  preferredLanguage,
  rank,
  activityCounts,
  completedModuleIds,
  completedCurriculaCount = 0,
  getIdToken,
}: FriendlyLeaderboardProps) {
  const [metric, setMetric] = useState<LeaderboardSortMetric>('weekly_streak');
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localMetrics = useMemo(
    () => computeWeeklyLearnerMetrics(activityCounts, completedModuleIds),
    [activityCounts, completedModuleIds],
  );

  useEffect(() => {
    let cancelled = false;

    async function syncAndFetch() {
      try {
        const token = await getIdToken();
        const res = await fetch('/api/leaderboard/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username,
            preferredLanguage,
            rank,
            weeklyActiveDays: localMetrics.weeklyActiveDays,
            currentStreak: localMetrics.currentStreak,
            weeklyModulesCompleted: localMetrics.weeklyModulesCompleted,
            totalModulesCompleted: localMetrics.totalModulesCompleted,
            completedCurriculaCount,
          }),
        });

        const parsed = await parseApiJson<{ entries?: LeaderboardEntry[] }>(
          res,
          'Could not load leaderboard.',
        );
        if (!parsed.ok) {
          throw new Error(parsed.error ?? 'Could not load leaderboard.');
        }
        if (!cancelled && Array.isArray(parsed.data?.entries)) {
          setEntries(parsed.data.entries);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setEntries((prev) =>
            prev.length > 0
              ? prev
              : [
                  {
                    uid: currentUid,
                    username,
                    preferredLanguage,
                    rank,
                    weeklyActiveDays: localMetrics.weeklyActiveDays,
                    currentStreak: localMetrics.currentStreak,
                    weeklyModulesCompleted: localMetrics.weeklyModulesCompleted,
                    totalModulesCompleted: localMetrics.totalModulesCompleted,
                    updatedAt: new Date().toISOString(),
                  },
                ],
          );
          setError('Offline');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void syncAndFetch();
    return () => {
      cancelled = true;
    };
  }, [
    currentUid,
    username,
    preferredLanguage,
    rank,
    localMetrics.weeklyActiveDays,
    localMetrics.currentStreak,
    localMetrics.weeklyModulesCompleted,
    localMetrics.totalModulesCompleted,
    completedCurriculaCount,
    getIdToken,
  ]);

  const ranked = useMemo(
    () => sortLeaderboardEntries(entries, metric, currentUid),
    [entries, metric, currentUid],
  );

  const summary = useMemo(
    () => summarizeLeaderboardComparison(ranked, currentUid),
    [ranked, currentUid],
  );

  const visibleRows = expanded ? ranked.slice(0, 8) : ranked.slice(0, 4);
  const currentInVisible = visibleRows.some((row) => row.isCurrentUser);
  const currentRow = ranked.find((row) => row.isCurrentUser) ?? null;

  return (
    <section
      aria-label="Friendly Leaderboard"
      data-testid="friendly-leaderboard"
      className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors sm:p-6 dark:border-neutral-800 dark:bg-[#181818]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Trophy
            className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400"
            aria-hidden="true"
          />
          <h2 className="font-display text-base font-bold text-slate-950 dark:text-white">
            Leaderboard
          </h2>
          {summary.currentUserPosition !== null && (
            <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums dark:text-blue-400">
              #{summary.currentUserPosition}/{summary.totalLearners}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Compare leaderboard by metric"
            className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-neutral-800 dark:bg-[#202020]"
          >
            <button
              type="button"
              onClick={() => setMetric('weekly_streak')}
              aria-pressed={metric === 'weekly_streak'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                metric === 'weekly_streak'
                  ? 'bg-white text-slate-950 shadow-2xs dark:bg-[#181818] dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span>Streak</span>
            </button>
            <button
              type="button"
              onClick={() => setMetric('module_volume')}
              aria-pressed={metric === 'module_volume'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                metric === 'module_volume'
                  ? 'bg-white text-slate-950 shadow-2xs dark:bg-[#181818] dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>Modules</span>
            </button>
          </div>

          {ranked.length > 4 && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse leaderboard' : 'Expand leaderboard'}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-300 dark:hover:text-white"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {loading && ranked.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-400">
          Loading...
        </div>
      ) : (
        <div
          className="mt-4 grid gap-2.5 sm:grid-cols-2"
          role="list"
          aria-label="Learner rankings"
        >
          {visibleRows.map((row) => {
            const rankMeta = getRankMeta(row.rank);
            return (
              <div
                key={row.uid}
                role="listitem"
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs transition-colors ${
                  row.isCurrentUser
                    ? 'border-blue-600 bg-white dark:border-blue-500 dark:bg-[#202020]'
                    : 'border-slate-200 bg-white dark:border-neutral-800 dark:bg-[#141414]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`w-5 shrink-0 font-mono text-xs font-bold tabular-nums ${
                      row.position === 1
                        ? 'text-amber-600 dark:text-amber-400'
                        : row.isCurrentUser
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-neutral-400'
                    }`}
                  >
                    #{row.position}
                  </span>
                  <LanguageIcon
                    language={row.preferredLanguage}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="truncate font-display text-sm font-bold text-slate-950 dark:text-white">
                    @{row.username}
                  </span>
                  <span className="hidden items-center gap-1 font-mono text-[11px] text-slate-500 sm:inline-flex dark:text-neutral-400">
                    <RankIcon rank={row.rank} useRankColor className="h-3.5 w-3.5" />
                    <span>{rankMeta.label}</span>
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3 font-mono text-xs tabular-nums">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      metric === 'weekly_streak'
                        ? 'text-slate-950 dark:text-white'
                        : 'text-slate-500 dark:text-neutral-400'
                    }`}
                  >
                    <Flame
                      className={`h-3.5 w-3.5 ${
                        row.weeklyActiveDays > 0
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-slate-400 dark:text-neutral-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{row.weeklyActiveDays}/7d</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      metric === 'module_volume'
                        ? 'text-slate-950 dark:text-white'
                        : 'text-slate-500 dark:text-neutral-400'
                    }`}
                  >
                    <Layers
                      className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                      aria-hidden="true"
                    />
                    <span>{row.weeklyModulesCompleted}w</span>
                  </span>
                </div>
              </div>
            );
          })}

          {!currentInVisible && currentRow && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-600 bg-white px-3.5 py-2.5 text-xs sm:col-span-2 dark:border-blue-500 dark:bg-[#202020]">
              <div className="flex items-center gap-2.5">
                <span className="w-5 shrink-0 font-mono text-xs font-bold text-blue-600 tabular-nums dark:text-blue-400">
                  #{currentRow.position}
                </span>
                <LanguageIcon
                  language={currentRow.preferredLanguage}
                  className="h-4 w-4 shrink-0"
                />
                <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                  @{currentRow.username}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-slate-900 dark:text-white">
                <span>{currentRow.weeklyActiveDays}/7d</span>
                <span>{currentRow.weeklyModulesCompleted}w</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
          {error}
        </p>
      )}
    </section>
  );
}
