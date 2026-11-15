import {
  Award,
  BookOpen,
  Calendar,
  Flame,
  Layers,
  Lock,
  LogOut,
  PlusCircle,
  SlidersHorizontal,
  Terminal,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LANGUAGE_MAP } from '../data/languages';
import type { ProgrammeLockSummary } from '../engines/programmesEngine';
import type {
  DailyGoalProgress,
  LearningOverviewStats,
} from '../engines/streaksEngine';
import type { CurriculumTrack } from '../types/curriculum';
import type { DailyQuotaStatus } from '../utils/curriculumLogic';
import { BrandLogo } from './BrandLogo';
import { DailyGoalRing } from './DailyGoalRing';
import { PWAInstallButton } from './PWAInstallButton';
import { RankBadge } from './RankIcon';
import { SetDailyGoalModal } from './SetDailyGoalModal';
import { MiniStreakStrip, StreakCalendar } from './StreakCalendar';
import type { ActiveRankProgress } from '../utils/rankSystem';

interface AppNavigationProps {
  activeTrack: CurriculumTrack | null;
  rankProgress: ActiveRankProgress;
  stats: LearningOverviewStats;
  dailyGoal: DailyGoalProgress;
  quota: DailyQuotaStatus;
  programmeLock: ProgrammeLockSummary;
  activityCounts: Record<string, number>;
  certificatesCount: number;
  onSignOut: () => Promise<void>;
}

const NAV_ITEMS: Array<{
  to: string;
  label: string;
  mobileLabel: string;
  icon: typeof Layers;
}> = [
  { to: '/app/curriculums', label: 'My Curriculums', mobileLabel: 'Tracks', icon: Layers },
  { to: '/app/learn', label: 'Learn', mobileLabel: 'Learn', icon: Terminal },
  { to: '/app/streaks', label: 'Streak Calendar', mobileLabel: 'Streaks', icon: Calendar },
  { to: '/app/certificates', label: 'Certificates', mobileLabel: 'Awards', icon: Award },
  { to: '/app/reference', label: 'Reference', mobileLabel: 'Ref', icon: BookOpen },
  { to: '/app/settings', label: 'Daily Goal', mobileLabel: 'Goal', icon: SlidersHorizontal },
];

export function AppNavigation({
  activeTrack,
  rankProgress,
  stats,
  dailyGoal,
  quota,
  programmeLock,
  activityCounts,
  certificatesCount,
  onSignOut,
}: AppNavigationProps) {
  const navigate = useNavigate();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  const activeLangName = activeTrack
    ? LANGUAGE_MAP[activeTrack.language].name
    : null;
  const hasStreak = stats.currentStreak > 0;
  const streakLabel = `${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`;
  const isNewProgrammeLocked = !programmeLock.canGenerateNewProgramme;

  return (
    <>
      <aside
        aria-label="Primary desktop navigation"
        className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:justify-between lg:overflow-y-auto lg:border-r lg:border-slate-200 lg:bg-white lg:p-6 dark:lg:border-neutral-800 dark:lg:bg-[#181818]"
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <Link
              to="/"
              className="inline-flex items-center transition-opacity hover:opacity-85"
              aria-label="recurry home"
            >
              <BrandLogo size="sm" />
            </Link>
          </div>

          <div
            className={`rounded-2xl border bg-white p-3 transition-colors dark:bg-[#202020] ${
              dailyGoal.isGoalMet
                ? 'border-emerald-500 dark:border-emerald-500/80'
                : 'border-slate-200 dark:border-neutral-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGoalModalOpen(true)}
                aria-label="Open Set Daily Goal modal"
                className="btn-juice flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-opacity hover:opacity-85"
              >
                <DailyGoalRing goal={dailyGoal} size={44} strokeWidth={4} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <span>{dailyGoal.isGoalMet ? 'Goal Complete' : 'Daily Goal'}</span>
                    <span className="font-mono text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                      Edit
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 tabular-nums dark:text-neutral-400">
                    {dailyGoal.completedToday}/{dailyGoal.dailyGoal} today
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                aria-label={`Open visual streak calendar, current streak: ${streakLabel}`}
                className={`btn-juice flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-1.5 font-mono text-xs font-bold tabular-nums hover:border-amber-300 dark:border-neutral-700 dark:bg-[#181818] dark:hover:border-amber-500/70 ${
                  hasStreak
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-neutral-400'
                }`}
                title={`Current streak: ${streakLabel}`}
              >
                <Flame
                  className={`h-4 w-4 ${
                    hasStreak ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-neutral-500'
                  }`}
                  aria-hidden="true"
                />
                <span>{stats.currentStreak}</span>
              </button>
            </div>
          </div>

          <MiniStreakStrip
            activityCounts={activityCounts}
            dailyGoal={dailyGoal.dailyGoal}
            onOpenCalendar={() => setCalendarOpen(true)}
          />

          <nav aria-label="Main sections" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'border-blue-600 bg-white text-blue-700 dark:border-blue-500 dark:bg-[#202020] dark:text-blue-400'
                        : 'border-transparent text-slate-700 hover:translate-x-0.5 hover:border-slate-200 hover:text-slate-950 dark:text-neutral-300 dark:hover:border-neutral-800 dark:hover:bg-[#202020] dark:hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                            isActive
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-500 dark:text-neutral-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.to === '/app/certificates' && certificatesCount > 0 && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 tabular-nums dark:bg-[#262626] dark:text-neutral-200">
                          {certificatesCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <Link
            to="/generate"
            title={
              isNewProgrammeLocked
                ? programmeLock.lockMessage ?? 'Finish your active curriculum first.'
                : undefined
            }
            className={`btn-juice flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
              isNewProgrammeLocked
                ? 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700/70 dark:bg-[#202020] dark:text-amber-300 dark:hover:bg-[#262626]'
                : quota.allowed
                  ? 'border-b-2 border-blue-800 bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-400 dark:hover:bg-[#262626]'
            }`}
          >
            {isNewProgrammeLocked ? (
              <>
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Finish Active Track</span>
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{quota.allowed ? 'New Curriculum' : 'Daily Limit Used (1/1)'}</span>
              </>
            )}
          </Link>
        </div>

        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-neutral-800">
          {activeLangName && (
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-neutral-400">Active</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {activeLangName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-neutral-400">Rank</span>
                <RankBadge
                  rank={rankProgress.rank}
                  progressPercent={rankProgress.progressPercent}
                  hasActiveTrack={rankProgress.hasActiveTrack}
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-neutral-400">Modules</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-white">
                  {stats.completedModules}/{stats.totalModules}
                </span>
              </div>
            </div>
          )}

          <PWAInstallButton variant="sidebar" />

          <button
            type="button"
            onClick={async () => {
              await onSignOut();
              navigate('/');
            }}
            className="btn-juice flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-[#262626] dark:hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-sm sm:px-4 dark:border-neutral-800 dark:bg-[#181818]/95 lg:hidden">
        <Link
          to="/"
          className="inline-flex shrink-0 items-center whitespace-nowrap transition-opacity hover:opacity-85"
          aria-label="recurry home"
        >
          <BrandLogo size="sm" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <RankBadge
            rank={rankProgress.rank}
            progressPercent={rankProgress.progressPercent}
            hasActiveTrack={rankProgress.hasActiveTrack}
            size="sm"
          />
          <PWAInstallButton variant="compact" />
          <button
            type="button"
            onClick={() => setGoalModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1 hover:border-blue-400 dark:border-neutral-700 dark:bg-[#202020] dark:hover:border-blue-500"
            aria-label="Open Set Daily Goal modal"
          >
            <DailyGoalRing goal={dailyGoal} size={28} strokeWidth={3} />
            <span className="font-mono text-[11px] font-bold text-slate-700 tabular-nums dark:text-neutral-200">
              {dailyGoal.completedToday}/{dailyGoal.dailyGoal}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            aria-label={`Open streak calendar, current streak: ${streakLabel}`}
            className={`inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums dark:border-neutral-700 dark:bg-[#202020] ${
              hasStreak
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-600 dark:text-neutral-300'
            }`}
          >
            <Flame
              className={`h-3.5 w-3.5 ${
                hasStreak ? 'fill-amber-500 text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-neutral-500'
              }`}
              aria-hidden="true"
            />
            <span>{stats.currentStreak}d</span>
          </button>
        </div>
      </header>

      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-sm dark:border-neutral-800 dark:bg-[#181818]/95 lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-5 w-5 ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-neutral-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="whitespace-nowrap">{item.mobileLabel}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {calendarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visual streak calendar"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs dark:bg-black/75"
          onClick={() => setCalendarOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-[#F7F8FA] p-5 shadow-xl dark:border-neutral-800 dark:bg-[#121212] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-950 dark:text-white">
                  Learning Streak Calendar
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Every active drill or completed module marks the day on your streak grid.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCalendarOpen(false)}
                aria-label="Close streak calendar"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-300 dark:hover:bg-[#262626] dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <StreakCalendar
              activityCounts={activityCounts}
              dailyGoal={dailyGoal.dailyGoal}
            />
          </div>
        </div>
      )}
      <SetDailyGoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
      />
    </>
  );
}
