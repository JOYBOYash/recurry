import {
  Activity,
  BookOpen,
  Layers,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  SlidersHorizontal,
  User,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { ProgrammeLockSummary } from '../engines/programmesEngine';
import type {
  DailyGoalProgress,
  LearningOverviewStats,
} from '../engines/streaksEngine';
import type { CurriculumTrack } from '../types/curriculum';
import type { DailyQuotaStatus } from '../utils/curriculumLogic';
import type { ActiveRankProgress } from '../utils/rankSystem';
import { BrandLogo } from './BrandLogo';
import { DailyGoalHearts } from './DailyGoalHearts';
import { FlamingIcon } from './FlamingIcon';
import { PWAInstallButton } from './PWAInstallButton';

interface AppNavigationProps {
  activeTrack: CurriculumTrack | null;
  rankProgress: ActiveRankProgress;
  stats: LearningOverviewStats;
  dailyGoal: DailyGoalProgress;
  quota: DailyQuotaStatus;
  programmeLock: ProgrammeLockSummary;
  certificatesCount: number;
  isAdmin?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileLeaderboardSlot?: ReactNode;
}

const PRIMARY_NAV_ITEMS: Array<{
  to: string;
  label: string;
  mobileLabel: string;
  icon: typeof Layers;
}> = [
  { to: '/app/curriculums', label: 'Curriculums', mobileLabel: 'Tracks', icon: Layers },
  { to: '/app/algo', label: 'Algo Mode', mobileLabel: 'Algo', icon: Workflow },
  { to: '/app/reference', label: 'Reference', mobileLabel: 'Ref', icon: BookOpen },
  { to: '/app/profile', label: 'Profile', mobileLabel: 'Profile', icon: User },
];

const MOBILE_NAV_ITEMS = [
  ...PRIMARY_NAV_ITEMS,
  {
    to: '/app/settings',
    label: 'Settings',
    mobileLabel: 'Settings',
    icon: SlidersHorizontal,
  },
];

export function AppNavigation({
  stats,
  dailyGoal,
  quota,
  programmeLock,
  isAdmin = false,
  collapsed = false,
  onToggleCollapse,
  mobileLeaderboardSlot,
}: AppNavigationProps) {
  const hasStreak = stats.currentStreak > 0;
  const streakLabel = `${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`;
  const isNewProgrammeLocked = !programmeLock.canGenerateNewProgramme;

  return (
    <>
      <aside
        aria-label="Primary desktop navigation"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={`hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex-col lg:justify-between lg:overflow-y-auto lg:overflow-x-hidden lg:border-r lg:border-slate-200/80 lg:bg-white lg:transition-[width,padding] lg:duration-200 dark:lg:border-neutral-800/80 dark:lg:bg-[#161616] ${
          collapsed ? 'lg:w-[72px] lg:px-2.5 lg:py-4' : 'lg:w-60 lg:px-4 lg:py-5'
        }`}
      >
        <div className="space-y-5">
          <div
            className={`flex items-center ${
              collapsed ? 'flex-col gap-3' : 'justify-between gap-2 px-1'
            }`}
          >
            <Link
              to="/"
              className="inline-flex items-center transition-opacity hover:opacity-80"
              aria-label="recurry home"
              title="recurry"
            >
              <BrandLogo size="sm" showText={!collapsed} />
            </Link>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                data-testid="sidebar-collapse-toggle"
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-neutral-500 dark:hover:bg-[#222222] dark:hover:text-neutral-200"
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
                ) : (
                  <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          <nav aria-label="Main sections" className="space-y-1">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex h-10 w-full items-center rounded-xl text-[13px] font-medium transition-colors ${
                      collapsed
                        ? 'justify-center px-0'
                        : 'justify-between gap-3 px-3'
                    } ${
                      isActive
                        ? 'bg-slate-100 font-semibold text-slate-950 dark:bg-[#242424] dark:text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#1E1E1E] dark:hover:text-neutral-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon
                        className={`shrink-0 ${
                          collapsed ? 'h-[22px] w-[22px]' : 'h-5 w-5'
                        } ${
                          isActive
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-neutral-200'
                        }`}
                        aria-hidden="true"
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </span>
                  )}
                </NavLink>
              );
            })}
            {isAdmin && (
              <NavLink
                to="/app/diagnostics"
                title={collapsed ? 'API Diagnostics' : undefined}
                aria-label={collapsed ? 'API Diagnostics' : undefined}
                className={({ isActive }) =>
                  `group flex h-10 w-full items-center rounded-xl text-[13px] font-medium transition-colors ${
                    collapsed
                      ? 'justify-center px-0'
                      : 'justify-between gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-slate-100 font-semibold text-slate-950 dark:bg-[#242424] dark:text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#1E1E1E] dark:hover:text-neutral-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <span className="flex min-w-0 items-center gap-3">
                    <Activity
                      className={`shrink-0 ${
                        collapsed ? 'h-[22px] w-[22px]' : 'h-5 w-5'
                      } ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-neutral-200'
                      }`}
                      aria-hidden="true"
                    />
                    {!collapsed && <span className="truncate">Diagnostics</span>}
                  </span>
                )}
              </NavLink>
            )}
          </nav>

          <Link
            to="/generate"
            aria-label={
              isNewProgrammeLocked
                ? 'Finish Active Track'
                : quota.allowed
                  ? 'New Curriculum'
                  : 'Daily Limit Used (1/1)'
            }
            title={
              isNewProgrammeLocked
                ? programmeLock.lockMessage ?? 'Finish your active curriculum first.'
                : quota.allowed
                  ? 'New Curriculum'
                  : 'Daily Limit Used (1/1)'
            }
            className={`btn-juice flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-colors ${
              collapsed ? 'px-0' : 'px-3'
            } ${
              isNewProgrammeLocked
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-[#222222] dark:text-neutral-200 dark:hover:bg-[#2A2A2A]'
                : quota.allowed
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200/80 dark:bg-[#222222] dark:text-neutral-400'
            }`}
          >
            {isNewProgrammeLocked ? (
              <>
                <Lock className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                {!collapsed && <span>Finish Active Track</span>}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed && (
                  <span>{quota.allowed ? 'New Curriculum' : 'Limit Used'}</span>
                )}
              </>
            )}
          </Link>
        </div>

        {/* Bottom Utility Zone: Stylized Hearts + Flaming Streak + Settings */}
        <div className="mt-6 space-y-2 border-t border-slate-200/80 pt-3.5 dark:border-neutral-800/80">
          {collapsed ? (
            <Link
              to="/app/profile?tab=streaks"
              aria-label={`Streak: ${streakLabel}, Daily hearts: ${dailyGoal.completedToday} of ${dailyGoal.dailyGoal}`}
              title={`${streakLabel} streak · ${dailyGoal.completedToday}/${dailyGoal.dailyGoal} hearts today`}
              className="flex flex-col items-center gap-2 rounded-xl py-2 transition-colors hover:bg-slate-100 dark:hover:bg-[#222222]"
            >
              <div className="flex items-center gap-0.5 font-mono text-xs font-bold text-slate-800 tabular-nums dark:text-neutral-100">
                <FlamingIcon active={hasStreak} className="h-5 w-5" />
                <span>{stats.currentStreak}</span>
              </div>
              <DailyGoalHearts
                completedToday={dailyGoal.completedToday}
                dailyGoal={dailyGoal.dailyGoal}
                size="sm"
                className="flex-wrap justify-center"
              />
            </Link>
          ) : (
            <Link
              to="/app/profile?tab=streaks"
              aria-label={`View streaks in Profile (${streakLabel}, ${dailyGoal.completedToday} of ${dailyGoal.dailyGoal} hearts today)`}
              className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-[#222222]"
            >
              <DailyGoalHearts
                completedToday={dailyGoal.completedToday}
                dailyGoal={dailyGoal.dailyGoal}
                size="md"
              />
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-800 tabular-nums dark:text-neutral-100">
                <FlamingIcon active={hasStreak} className="h-5 w-5" />
                <span>{stats.currentStreak}d</span>
              </span>
            </Link>
          )}

          {!collapsed && <PWAInstallButton variant="sidebar" />}

          <NavLink
            to="/app/settings"
            title={collapsed ? 'Settings' : undefined}
            aria-label={collapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              `group flex h-10 w-full items-center rounded-xl text-[13px] font-medium transition-colors ${
                collapsed
                  ? 'justify-center px-0'
                  : 'gap-3 px-3'
              } ${
                isActive
                  ? 'bg-slate-100 font-semibold text-slate-950 dark:bg-[#242424] dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#1E1E1E] dark:hover:text-neutral-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <SlidersHorizontal
                  className={`shrink-0 ${
                    collapsed ? 'h-[22px] w-[22px]' : 'h-5 w-5'
                  } ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-neutral-200'
                  }`}
                  aria-hidden="true"
                />
                {!collapsed && <span>Settings</span>}
              </>
            )}
          </NavLink>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-sm sm:px-4 dark:border-neutral-800/80 dark:bg-[#161616]/95 lg:hidden">
        <Link
          to="/"
          className="inline-flex shrink-0 items-center whitespace-nowrap transition-opacity hover:opacity-80"
          aria-label="recurry home"
        >
          <BrandLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          {mobileLeaderboardSlot}
          {isAdmin && (
            <NavLink
              to="/app/diagnostics"
              aria-label="API Diagnostics"
              className={({ isActive }) =>
                `inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive
                    ? 'bg-slate-100 text-blue-600 dark:bg-[#242424] dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-[#222222]'
                }`
              }
            >
              <Activity className="h-4.5 w-4.5" aria-hidden="true" />
            </NavLink>
          )}
          <Link
            to="/app/profile?tab=streaks"
            aria-label={`Streaks & daily hearts (${streakLabel})`}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-[#222222]"
          >
            <DailyGoalHearts
              completedToday={dailyGoal.completedToday}
              dailyGoal={dailyGoal.dailyGoal}
              size="sm"
            />
            <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold text-slate-800 tabular-nums dark:text-neutral-100">
              <FlamingIcon active={hasStreak} className="h-4 w-4" />
              <span>{stats.currentStreak}d</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-sm dark:border-neutral-800 dark:bg-[#181818]/95 lg:hidden"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-5 w-5 ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-neutral-500'
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
    </>
  );
}
