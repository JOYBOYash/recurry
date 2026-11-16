import { Loader2 } from 'lucide-react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';
import {
  computeDailyGoalProgress,
  computeLearningStats,
} from '../utils/curriculumLogic';
import { resolveProgressRank } from '../utils/rankSystem';
import { AppNavigation } from './AppNavigation';
import { LanguageIcon } from './LanguageIcon';
import { RankBadge } from './RankIcon';

export function AppShell() {
  const {
    user,
    authReady,
    dataLoading,
    profile,
    tracks,
    certificates,
    quota,
    programmeLock,
    activityCounts,
    activeTrack,
    signOutUser,
  } = useAppAuth();

  if (!authReady || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] dark:bg-[#121212]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-neutral-300">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || !profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  const practicedDates = Object.values(profile.moduleAccuracy ?? {})
    .map((entry) => entry.lastPracticedDate)
    .filter((d): d is string => Boolean(d));

  const stats = computeLearningStats(
    tracks,
    profile.completedModuleIds,
    profile.moduleCompletedAt,
    new Date(),
    practicedDates,
  );
  const dailyGoal = computeDailyGoalProgress(
    profile.moduleCompletedAt,
    profile.dailyModuleGoal,
  );
  const rankProgress = resolveProgressRank(
    activeTrack,
    profile.completedModuleIds,
    profile.skillLevel,
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A] dark:bg-[#121212] dark:text-neutral-100">
      <AppNavigation
        activeTrack={activeTrack}
        rankProgress={rankProgress}
        stats={stats}
        dailyGoal={dailyGoal}
        quota={quota}
        programmeLock={programmeLock}
        activityCounts={activityCounts}
        certificatesCount={certificates.length}
        onSignOut={signOutUser}
      />

      <div className="lg:pl-64">
        <header
          aria-label="Workspace header"
          className="hidden lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-14 lg:items-center lg:justify-between lg:border-b lg:border-slate-200 lg:bg-white/95 lg:px-8 lg:backdrop-blur-sm dark:lg:border-neutral-800 dark:lg:bg-[#181818]/95"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {activeTrack ? (
              <Link
                to={`/app/learn/${encodeURIComponent(activeTrack.id)}`}
                className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700 transition-colors hover:text-blue-700 dark:text-neutral-300 dark:hover:text-blue-400"
              >
                <LanguageIcon language={activeTrack.language} className="h-4 w-4 shrink-0" />
                <span className="truncate font-display text-sm font-bold text-slate-900 dark:text-white">
                  {activeTrack.title}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums dark:text-neutral-400">
                  {rankProgress.progressPercent}%
                </span>
              </Link>
            ) : (
              <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Dashboard
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <RankBadge
              rank={rankProgress.rank}
              progressPercent={rankProgress.progressPercent}
              hasActiveTrack={rankProgress.hasActiveTrack}
              showProgress
            />
          </div>
        </header>

        <main className="pb-24 lg:pb-12">
          <div className="animate-view-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
