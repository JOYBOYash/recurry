import {
  Award,
  BookOpen,
  Flame,
  Layers,
  LogOut,
  PlusCircle,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LANGUAGE_MAP } from '../data/languages';
import type { CurriculumTrack } from '../types/curriculum';
import type {
  DailyGoalProgress,
  DailyQuotaStatus,
  LearningOverviewStats,
} from '../utils/curriculumLogic';
import { BrandLogo } from './BrandLogo';
import { DailyGoalRing } from './DailyGoalRing';

interface AppNavigationProps {
  username: string;
  activeTrack: CurriculumTrack | null;
  stats: LearningOverviewStats;
  dailyGoal: DailyGoalProgress;
  quota: DailyQuotaStatus;
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
  { to: '/app/certificates', label: 'Certificates', mobileLabel: 'Awards', icon: Award },
  { to: '/app/reference', label: 'Reference', mobileLabel: 'Ref', icon: BookOpen },
  { to: '/app/settings', label: 'Daily Goal', mobileLabel: 'Goal', icon: SlidersHorizontal },
];

export function AppNavigation({
  username,
  activeTrack,
  stats,
  dailyGoal,
  quota,
  certificatesCount,
  onSignOut,
}: AppNavigationProps) {
  const navigate = useNavigate();
  const activeLangName = activeTrack
    ? LANGUAGE_MAP[activeTrack.language].name
    : null;
  const hasStreak = stats.currentStreak > 0;
  const streakLabel = `${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`;

  return (
    <>
      <aside
        aria-label="Primary desktop navigation"
        className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:justify-between lg:border-r lg:border-slate-200 lg:bg-white lg:p-6"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center transition-opacity hover:opacity-85"
              aria-label="recurry home"
            >
              <BrandLogo size="sm" />
            </Link>
            <span className="max-w-[100px] truncate rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
              @{username}
            </span>
          </div>

          <Link
            to="/app/settings"
            className={`btn-juice flex items-center gap-3 rounded-2xl border bg-white p-3 transition-colors ${
              dailyGoal.isGoalMet
                ? 'border-emerald-500'
                : 'border-slate-200 hover:border-blue-400'
            }`}
          >
            <DailyGoalRing goal={dailyGoal} size={44} strokeWidth={4} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900">
                {dailyGoal.isGoalMet ? 'Goal Complete' : 'Daily Goal'}
              </div>
              <div className="font-mono text-[11px] text-slate-600 tabular-nums">
                {dailyGoal.completedToday}/{dailyGoal.dailyGoal} today
              </div>
            </div>
            <div
              className={`flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${
                hasStreak ? 'text-amber-600' : 'text-slate-400'
              }`}
              title={`Current streak: ${streakLabel}`}
            >
              <Flame
                className={`h-4 w-4 ${
                  hasStreak ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span>{stats.currentStreak}</span>
            </div>
          </Link>

          <nav aria-label="Main sections" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'border-blue-600 bg-white text-blue-700'
                        : 'border-transparent text-slate-700 hover:translate-x-0.5 hover:border-slate-200 hover:text-slate-950'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                            isActive ? 'text-blue-600' : 'text-slate-500'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.to === '/app/certificates' && certificatesCount > 0 && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 tabular-nums">
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
            className={`btn-juice flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
              quota.allowed
                ? 'border-b-2 border-blue-800 bg-blue-600 text-white hover:bg-blue-700'
                : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>{quota.allowed ? 'New Curriculum' : 'Daily Limit Used (1/1)'}</span>
          </Link>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          {activeLangName && (
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Active</span>
                <span className="font-mono font-semibold text-slate-900">
                  {activeLangName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Modules</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {stats.completedModules}/{stats.totalModules}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              await onSignOut();
              navigate('/');
            }}
            className="btn-juice flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm lg:hidden">
        <Link
          to="/"
          className="inline-flex items-center whitespace-nowrap transition-opacity hover:opacity-85"
          aria-label="recurry home"
        >
          <BrandLogo size="sm" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/app/settings"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1"
            aria-label="Open daily goal settings"
          >
            <DailyGoalRing goal={dailyGoal} size={28} strokeWidth={3} />
            <span className="font-mono text-[11px] font-bold text-slate-700 tabular-nums">
              {dailyGoal.completedToday}/{dailyGoal.dailyGoal}
            </span>
          </Link>
          <span
            aria-label={`Current streak: ${streakLabel}`}
            className={`inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums ${
              hasStreak ? 'text-amber-700' : 'text-slate-500'
            }`}
          >
            <Flame
              className={`h-3.5 w-3.5 ${
                hasStreak ? 'fill-amber-500 text-amber-600' : 'text-slate-400'
              }`}
              aria-hidden="true"
            />
            <span>{stats.currentStreak}d</span>
          </span>
        </div>
      </header>

      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors active:scale-95 ${
                  isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-950'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
                    aria-hidden="true"
                  />
                  <span className="whitespace-nowrap">{item.mobileLabel}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
