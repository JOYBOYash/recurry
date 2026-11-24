import { useState } from 'react';
import { EyeOff, Loader2 } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';
import { useFocusMode } from '../context/FocusModeContext';
import { countCompletedCurricula } from '../engines/leaderboardEngine';
import {
  computeDailyGoalProgress,
  computeLearningStats,
} from '../utils/curriculumLogic';
import { isDiagnosticAdminEmail } from '../utils/adminDiagnostics';
import { resolveProgressRank } from '../utils/rankSystem';
import { AppNavigation } from './AppNavigation';
import { GlobalLeaderboard } from './GlobalLeaderboard';
import { LanguageIcon } from './LanguageIcon';
import { RankBadge } from './RankIcon';

const SIDEBAR_COLLAPSED_KEY = 'recurry:sidebar-collapsed:v1';

function readInitialSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function AppShell() {
  const location = useLocation();
  const { focusMode, setFocusMode } = useFocusMode();
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
    getIdToken,
  } = useAppAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    readInitialSidebarCollapsed,
  );

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage quota or private mode restrictions.
      }
      return next;
    });
  };

  if (!authReady || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] dark:bg-[#121212]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-neutral-300">
          <Loader2
            className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
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
  const completedCurriculaCount = countCompletedCurricula(
    tracks,
    profile.completedModuleIds,
    certificates.length,
  );
  const preferredLanguage = activeTrack?.language ?? profile.preferredLanguage;

  return (
    <div
      data-focus-mode={focusMode ? 'true' : 'false'}
      className="min-h-screen bg-[#F7F8FA] text-[#0F172A] dark:bg-[#121212] dark:text-neutral-100"
    >
      {!focusMode && (
        <AppNavigation
          activeTrack={activeTrack}
          rankProgress={rankProgress}
          stats={stats}
          dailyGoal={dailyGoal}
          quota={quota}
          programmeLock={programmeLock}
          certificatesCount={certificates.length}
          isAdmin={isDiagnosticAdminEmail(user.email)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          mobileLeaderboardSlot={
            <GlobalLeaderboard
              currentUid={user.uid}
              username={profile.username}
              preferredLanguage={preferredLanguage}
              rank={rankProgress.rank}
              activityCounts={activityCounts}
              completedModuleIds={profile.completedModuleIds}
              completedCurriculaCount={completedCurriculaCount}
              getIdToken={getIdToken}
              compactTrigger
            />
          }
        />
      )}

      {/* Whisper-quiet Focus Mode exit control */}
      {focusMode && (
        <div className="fixed top-3 right-3 z-40">
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            data-testid="exit-focus-mode-button"
            aria-label="Exit Focus Mode"
            title="Exit Focus Mode"
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-2.5 text-xs font-medium text-slate-600 shadow-xs backdrop-blur-sm transition-colors hover:text-slate-950 dark:border-neutral-800 dark:bg-[#181818]/90 dark:text-neutral-300 dark:hover:text-white"
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Exit Focus</span>
          </button>
        </div>
      )}

      <div
        className={`transition-[padding] duration-200 ${
          focusMode
            ? 'pl-0'
            : sidebarCollapsed
              ? 'lg:pl-[72px]'
              : 'lg:pl-60'
        }`}
      >
        {!focusMode && (
          <header
            aria-label="Workspace header"
            className="hidden lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-12 lg:items-center lg:justify-between lg:border-b lg:border-slate-200/75 lg:bg-[#F7F8FA]/90 lg:px-8 lg:backdrop-blur-sm dark:lg:border-neutral-800/75 dark:lg:bg-[#121212]/90"
          >
            <div className="flex min-w-0 items-center gap-2">
              {activeTrack ? (
                <Link
                  to={`/app/learn/${encodeURIComponent(activeTrack.id)}`}
                  className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  <LanguageIcon
                    language={activeTrack.language}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="truncate font-medium text-slate-900 dark:text-neutral-100">
                    {activeTrack.title}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400 tabular-nums dark:text-neutral-500">
                    {rankProgress.progressPercent}%
                  </span>
                </Link>
              ) : (
                <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                  Workspace
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <GlobalLeaderboard
                currentUid={user.uid}
                username={profile.username}
                preferredLanguage={preferredLanguage}
                rank={rankProgress.rank}
                activityCounts={activityCounts}
                completedModuleIds={profile.completedModuleIds}
                completedCurriculaCount={completedCurriculaCount}
                getIdToken={getIdToken}
              />
              <Link
                to="/app/profile"
                className="inline-flex items-center rounded-lg px-2 py-1 transition-colors hover:bg-slate-200/60 dark:hover:bg-[#222222]"
              >
                <RankBadge
                  rank={rankProgress.rank}
                  progressPercent={rankProgress.progressPercent}
                  hasActiveTrack={rankProgress.hasActiveTrack}
                  size="sm"
                />
              </Link>
            </div>
          </header>
        )}

        <main className={focusMode ? 'py-6' : 'pb-24 lg:pb-12'}>
          <div key={location.pathname} className="animate-view-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
