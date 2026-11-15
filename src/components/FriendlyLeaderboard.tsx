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

interface FriendlyLeaderboardProps {
  currentUid: string;
  username: string;
  preferredLanguage: LanguageId;
  rank: SkillLevel;
  activityCounts: Record<string, number>;
  completedModuleIds: string[];
  getIdToken: () => Promise<string>;
}

export function FriendlyLeaderboard({
  currentUid,
  username,
  preferredLanguage,
  rank,
  activityCounts,
  completedModuleIds,
  getIdToken,
}: FriendlyLeaderboardProps) {
  const [metric, setMetric] = useState<LeaderboardSortMetric>('weekly_streak');
  const [expanded, setExpanded] = useState(true);
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
          }),
        });

        if (!res.ok) {
          throw new Error('Could not load leaderboard.');
        }

        const data = (await res.json()) as { entries?: LeaderboardEntry[] };
        if (!cancelled && Array.isArray(data.entries)) {
          setEntries(data.entries);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          // Keep current user visible locally even when offline
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
          setError('Live peer sync pauses while offline.');
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

  const visibleRows = expanded ? ranked.slice(0, 8) : ranked.slice(0, 3);
  const currentInVisible = visibleRows.some((row) => row.isCurrentUser);
  const currentRow = ranked.find((row) => row.isCurrentUser) ?? null;

  return (
    <section
      aria-label="Friendly Leaderboard"
      data-testid="friendly-leaderboard"
      className="mx-auto max-w-4xl px-4 pt-3 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors dark:border-neutral-800 dark:bg-[#181818] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Trophy
              className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                  Friendly Leaderboard
                </h2>
                {summary.currentUserPosition !== null && (
                  <span className="font-mono text-xs font-semibold text-blue-600 tabular-nums dark:text-blue-400">
                    #{summary.currentUserPosition} of {summary.totalLearners}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {summary.totalLearners <= 1
                  ? 'Weekly streak days and module completions update live as learners join.'
                  : metric === 'weekly_streak'
                    ? summary.weeklyStreakLeaderGap === 0
                      ? summary.currentUserPosition === 1
                        ? `Leading this week with ${localMetrics.weeklyActiveDays}/7 active days (peer avg ${summary.averageWeeklyActiveDays}d).`
                        : `Tied with @${summary.leaderUsername} at ${localMetrics.weeklyActiveDays}/7 active days (peer avg ${summary.averageWeeklyActiveDays}d).`
                      : `${summary.weeklyStreakLeaderGap} active day${summary.weeklyStreakLeaderGap === 1 ? '' : 's'} behind @${summary.leaderUsername} (peer avg ${summary.averageWeeklyActiveDays}d).`
                    : summary.weeklyModulesLeaderGap === 0
                      ? summary.currentUserPosition === 1
                        ? `Leading weekly volume with ${localMetrics.weeklyModulesCompleted} modules (peer avg ${summary.averageWeeklyModules}).`
                        : `Tied with @${summary.leaderUsername} at ${localMetrics.weeklyModulesCompleted} modules (peer avg ${summary.averageWeeklyModules}).`
                      : `${summary.weeklyModulesLeaderGap} module${summary.weeklyModulesLeaderGap === 1 ? '' : 's'} behind @${summary.leaderUsername} this week (peer avg ${summary.averageWeeklyModules}).`}
              </p>
            </div>
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
                <span>Weekly Streak</span>
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
                <span>Module Volume</span>
              </button>
            </div>

            {ranked.length > 3 && (
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
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-500 dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-400">
            Syncing weekly leaderboard...
          </div>
        ) : (
          <div className="mt-3 space-y-1.5" role="list" aria-label="Learner rankings">
            {visibleRows.map((row) => {
              const rankMeta = getRankMeta(row.rank);
              return (
                <div
                  key={row.uid}
                  role="listitem"
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs transition-colors ${
                    row.isCurrentUser
                      ? 'border-blue-600 bg-white dark:border-blue-500 dark:bg-[#202020]'
                      : 'border-slate-200 bg-white dark:border-neutral-800 dark:bg-[#141414]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`w-6 shrink-0 text-center font-mono text-xs font-bold tabular-nums ${
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
                    {row.isCurrentUser && (
                      <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        You
                      </span>
                    )}
                    <span className="hidden items-center gap-1 font-mono text-[11px] font-semibold text-slate-500 dark:text-neutral-400 sm:inline-flex">
                      <RankIcon rank={row.rank} useRankColor className="h-3.5 w-3.5" />
                      <span>{rankMeta.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        metric === 'weekly_streak'
                          ? 'text-slate-950 dark:text-white'
                          : 'text-slate-500 dark:text-neutral-400'
                      }`}
                      title={`${row.weeklyActiveDays} active days this week · ${row.currentStreak}d current streak`}
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
                      <span className="text-slate-400 dark:text-neutral-500">
                        ({row.currentStreak}d)
                      </span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        metric === 'module_volume'
                          ? 'text-slate-950 dark:text-white'
                          : 'text-slate-500 dark:text-neutral-400'
                      }`}
                      title={`${row.weeklyModulesCompleted} modules this week · ${row.totalModulesCompleted} lifetime`}
                    >
                      <Layers
                        className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                        aria-hidden="true"
                      />
                      <span>{row.weeklyModulesCompleted} wk</span>
                      <span className="text-slate-400 dark:text-neutral-500">
                        ({row.totalModulesCompleted} total)
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}

            {!currentInVisible && currentRow && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-600 bg-white px-3.5 py-2.5 text-xs dark:border-blue-500 dark:bg-[#202020]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 shrink-0 text-center font-mono text-xs font-bold text-blue-600 tabular-nums dark:text-blue-400">
                    #{currentRow.position}
                  </span>
                  <LanguageIcon
                    language={currentRow.preferredLanguage}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                    @{currentRow.username}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    You
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs tabular-nums text-slate-900 dark:text-white">
                  <span>
                    {currentRow.weeklyActiveDays}/7d ({currentRow.currentStreak}d)
                  </span>
                  <span>
                    {currentRow.weeklyModulesCompleted} wk ({currentRow.totalModulesCompleted} total)
                  </span>
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
      </div>
    </section>
  );
}
