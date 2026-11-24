import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, RefreshCw, Trophy, X } from 'lucide-react';
import {
  computeWeeklyLearnerMetrics,
  sortLeaderboardEntries,
  type LeaderboardEntry,
} from '../engines/leaderboardEngine';
import type { LanguageId, SkillLevel } from '../types/curriculum';
import { parseApiJson } from '../utils/apiResponse';
import { getRankMeta } from '../utils/rankSystem';
import { LanguageIcon } from './LanguageIcon';
import { RankIcon } from './RankIcon';
import { FlamingIcon } from './FlamingIcon';

export interface GlobalLeaderboardProps {
  currentUid: string;
  username: string;
  preferredLanguage: LanguageId;
  rank: SkillLevel;
  activityCounts: Record<string, number>;
  completedModuleIds: string[];
  completedCurriculaCount: number;
  getIdToken: () => Promise<string>;
  compactTrigger?: boolean;
}

type GlobalMetric = 'daily_streak' | 'completed_curricula';

export function GlobalLeaderboard({
  currentUid,
  username,
  preferredLanguage,
  rank,
  activityCounts,
  completedModuleIds,
  completedCurriculaCount,
  getIdToken,
  compactTrigger = false,
}: GlobalLeaderboardProps) {
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<GlobalMetric>('daily_streak');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localMetrics = useMemo(
    () => computeWeeklyLearnerMetrics(activityCounts, completedModuleIds),
    [activityCounts, completedModuleIds],
  );

  const syncLeaderboard = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      }
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
          'Could not load global leaderboard.',
        );
        if (!parsed.ok) {
          throw new Error(parsed.error ?? 'Could not load global leaderboard.');
        }
        if (Array.isArray(parsed.data?.entries)) {
          setEntries(parsed.data.entries);
          setError(null);
        }
      } catch {
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
                  completedCurriculaCount,
                  updatedAt: new Date().toISOString(),
                },
              ],
        );
        setError('Showing local rank · offline');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
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
    ],
  );

  useEffect(() => {
    void syncLeaderboard(false);
  }, [syncLeaderboard]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const ranked = useMemo(
    () => sortLeaderboardEntries(entries, metric, currentUid),
    [entries, metric, currentUid],
  );

  const currentRow = useMemo(
    () => ranked.find((row) => row.isCurrentUser) ?? null,
    [ranked],
  );
  const topRows = ranked.slice(0, 15);
  const currentInTop = topRows.some((row) => row.isCurrentUser);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="global-leaderboard-trigger"
        aria-label={
          currentRow
            ? `Open Global Leaderboard, your rank #${currentRow.position}`
            : 'Open Global Leaderboard'
        }
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg font-medium text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-[#222222] dark:hover:text-white ${
          compactTrigger ? 'h-8 px-2 text-xs' : 'h-8 px-2.5 text-xs'
        }`}
      >
        <Trophy
          className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400"
          aria-hidden="true"
        />
        {!compactTrigger && <span>Leaderboard</span>}
        {currentRow && (
          <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums dark:text-neutral-400">
            #{currentRow.position}
          </span>
        )}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Global Leaderboard"
            data-testid="global-leaderboard-dialog"
            className="fixed inset-0 z-50 flex h-dvh w-screen justify-end bg-black/45 backdrop-blur-xs dark:bg-black/75"
            onClick={() => setOpen(false)}
          >
            <div
              className="animate-drawer-enter flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-[#F7F8FA] shadow-2xl dark:border-neutral-800 dark:bg-[#121212]"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-[#181818]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Trophy
                    className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  <h2 className="font-display text-base font-bold text-slate-950 dark:text-white">
                    Global Leaderboard
                  </h2>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums dark:text-neutral-400">
                  {currentRow
                    ? `You are #${currentRow.position} of ${ranked.length} learners`
                    : `${ranked.length} ranked learners`}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() => void syncLeaderboard(true)}
                  aria-label="Refresh global leaderboard"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-300 dark:hover:text-white"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Global Leaderboard"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-300 dark:hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Sort controls */}
            <div className="border-b border-slate-200 bg-white/80 px-5 py-3 dark:border-neutral-800 dark:bg-[#181818]/80">
              <div
                role="group"
                aria-label="Rank global leaderboard by"
                className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-neutral-800 dark:bg-[#141414]"
              >
                <button
                  type="button"
                  onClick={() => setMetric('daily_streak')}
                  aria-pressed={metric === 'daily_streak'}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    metric === 'daily_streak'
                      ? 'bg-white text-slate-950 shadow-2xs dark:bg-[#242424] dark:text-white'
                      : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  <FlamingIcon active className="h-4 w-4" />
                  <span>Daily Streak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('completed_curricula')}
                  aria-pressed={metric === 'completed_curricula'}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    metric === 'completed_curricula'
                      ? 'bg-white text-slate-950 shadow-2xs dark:bg-[#242424] dark:text-white'
                      : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  <Award
                    className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                    aria-hidden="true"
                  />
                  <span>Curricula Done</span>
                </button>
              </div>
            </div>

            {/* Ranked List */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading && topRows.length === 0 ? (
                <div className="space-y-2.5">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-[#181818]"
                    />
                  ))}
                </div>
              ) : topRows.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-neutral-800 dark:bg-[#181818] dark:text-neutral-400">
                  Complete a module or keep your daily streak active to appear here.
                </div>
              ) : (
                <div
                  role="list"
                  aria-label="Top global learners"
                  className="space-y-2"
                >
                  {topRows.map((row) => {
                    const rankMeta = getRankMeta(row.rank);
                    const curriculaDone = row.completedCurriculaCount ?? 0;
                    return (
                      <div
                        key={row.uid}
                        role="listitem"
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                          row.isCurrentUser
                            ? 'border-blue-600 bg-white dark:border-blue-500 dark:bg-[#202020]'
                            : 'border-slate-200 bg-white dark:border-neutral-800 dark:bg-[#181818]'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`w-6 shrink-0 font-mono text-xs font-bold tabular-nums ${
                              row.position === 1
                                ? 'text-amber-600 dark:text-amber-400'
                                : row.position === 2
                                  ? 'text-slate-600 dark:text-neutral-300'
                                  : row.position === 3
                                    ? 'text-amber-700 dark:text-amber-500'
                                    : row.isCurrentUser
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-slate-400 dark:text-neutral-500'
                            }`}
                          >
                            #{row.position}
                          </span>
                          <LanguageIcon
                            language={row.preferredLanguage}
                            className="h-4 w-4 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-display text-sm font-bold text-slate-950 dark:text-white">
                              @{row.username}
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                              <RankIcon
                                rank={row.rank}
                                useRankColor
                                className="h-3 w-3 shrink-0"
                              />
                              <span>{rankMeta.label}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 font-mono text-xs tabular-nums">
                          <span
                            title="Daily streak"
                            className={`inline-flex items-center gap-1 font-semibold ${
                              metric === 'daily_streak'
                                ? 'text-slate-950 dark:text-white'
                                : 'text-slate-500 dark:text-neutral-400'
                            }`}
                          >
                            <FlamingIcon
                              active={row.currentStreak > 0}
                              className="h-4 w-4"
                            />
                            <span>{row.currentStreak}d</span>
                          </span>

                          <span
                            title="Completed curricula"
                            className={`inline-flex items-center gap-1 font-semibold ${
                              metric === 'completed_curricula'
                                ? 'text-slate-950 dark:text-white'
                                : 'text-slate-500 dark:text-neutral-400'
                            }`}
                          >
                            <Award
                              className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                              aria-hidden="true"
                            />
                            <span>{curriculaDone}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {error && (
                <p className="mt-3 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                  {error}
                </p>
              )}
            </div>

            {/* Pinned Current User Footer if outside top 15 */}
            {!currentInTop && currentRow && (
              <div className="border-t border-slate-200 bg-white px-5 py-3 dark:border-neutral-800 dark:bg-[#181818]">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-600 bg-white px-3.5 py-2.5 text-xs dark:border-blue-500 dark:bg-[#202020]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-6 shrink-0 font-mono text-xs font-bold text-blue-600 tabular-nums dark:text-blue-400">
                      #{currentRow.position}
                    </span>
                    <LanguageIcon
                      language={currentRow.preferredLanguage}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="truncate font-display text-sm font-bold text-slate-950 dark:text-white">
                      @{currentRow.username}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-white">
                    <span>{currentRow.currentStreak}d</span>
                    <span>{currentRow.completedCurriculaCount ?? 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
