import { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Target,
  Trophy,
} from 'lucide-react';
import {
  buildMiniWeekStrip,
  buildStreakCalendarMonth,
  computeStreakMetrics,
} from '../engines/streaksEngine';
import { FlamingIcon } from './FlamingIcon';

interface StreakCalendarProps {
  activityCounts: Record<string, number>;
  dailyGoal: number;
  referenceDate?: Date;
}

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MiniStreakStrip({
  activityCounts,
  dailyGoal,
  onOpenCalendar,
}: {
  activityCounts: Record<string, number>;
  dailyGoal: number;
  onOpenCalendar?: () => void;
}) {
  const days = useMemo(
    () => buildMiniWeekStrip(activityCounts, dailyGoal),
    [activityCounts, dailyGoal],
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-[#202020]">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
          7-Day Streak Map
        </span>
        {onOpenCalendar && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-[#262626]"
          >
            <Calendar className="h-3 w-3" aria-hidden="true" />
            <span>Calendar</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1" role="list" aria-label="Last 7 days activity">
        {days.map((day) => {
          const cellStyle = day.isGoalMet
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : day.isActive
              ? 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-[#262626] dark:text-amber-300'
              : day.isToday
                ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-[#262626] dark:text-blue-400'
                : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-500';

          return (
            <div
              key={day.dateKey}
              role="listitem"
              title={`${day.dateKey}: ${day.completedCount} module${day.completedCount === 1 ? '' : 's'}`}
              className="flex flex-col items-center gap-1"
            >
              <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-neutral-500">
                {day.shortLabel}
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg border font-mono text-[11px] font-bold tabular-nums ${cellStyle}`}
              >
                {day.dayNumber}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StreakCalendar({
  activityCounts,
  dailyGoal,
  referenceDate,
}: StreakCalendarProps) {
  const now = useMemo(() => referenceDate ?? new Date(), [referenceDate]);
  const [cursor, setCursor] = useState<{ year: number; monthIndex: number }>({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });

  const metrics = useMemo(
    () => computeStreakMetrics(activityCounts, now),
    [activityCounts, now],
  );

  const calendarMonth = useMemo(
    () =>
      buildStreakCalendarMonth(
        cursor.year,
        cursor.monthIndex,
        activityCounts,
        dailyGoal,
        now,
      ),
    [cursor.year, cursor.monthIndex, activityCounts, dailyGoal, now],
  );

  function goPrevMonth() {
    setCursor((prev) => {
      if (prev.monthIndex === 0) {
        return { year: prev.year - 1, monthIndex: 11 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex - 1 };
    });
  }

  function goNextMonth() {
    setCursor((prev) => {
      if (prev.monthIndex === 11) {
        return { year: prev.year + 1, monthIndex: 0 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex + 1 };
    });
  }

  function goToToday() {
    setCursor({ year: now.getFullYear(), monthIndex: now.getMonth() });
  }

  const isViewingCurrentMonth =
    cursor.year === now.getFullYear() && cursor.monthIndex === now.getMonth();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 divide-x divide-slate-200/75 rounded-xl border border-slate-200/80 bg-white dark:divide-neutral-800/80 dark:border-neutral-800 dark:bg-[#181818]">
        <div className="px-4 py-3.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
            Current Streak
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-base font-bold text-slate-950 tabular-nums dark:text-white">
            <FlamingIcon active={metrics.currentStreak > 0} className="h-4.5 w-4.5" />
            <span>
              {metrics.currentStreak} {metrics.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
            Longest Streak
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-base font-bold text-slate-950 tabular-nums dark:text-white">
            <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>
              {metrics.longestStreak} {metrics.longestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
            Active Days
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-base font-bold text-slate-950 tabular-nums dark:text-white">
            <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>{metrics.totalActiveDays}</span>
          </div>
        </div>
      </div>

      <section
        aria-label={`Streak calendar for ${calendarMonth.monthLabel}`}
        className="rounded-xl border border-slate-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-[#181818] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-neutral-800/80">
          <div>
            <h2 className="font-display text-base font-bold text-slate-950 dark:text-white">
              {calendarMonth.monthLabel}
            </h2>
            <p className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
              {calendarMonth.activeDaysInMonth} active day
              {calendarMonth.activeDaysInMonth === 1 ? '' : 's'} ·{' '}
              {calendarMonth.modulesCompletedInMonth} module
              {calendarMonth.modulesCompletedInMonth === 1 ? '' : 's'} logged
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {!isViewingCurrentMonth && (
              <button
                type="button"
                onClick={goToToday}
                className="btn-juice mr-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="btn-juice flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-[#262626]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="btn-juice flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-[#262626]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
          {WEEKDAY_HEADERS.map((weekday) => (
            <div
              key={weekday}
              className="py-1 font-mono text-[11px] font-semibold text-slate-400 dark:text-neutral-500"
            >
              {weekday}
            </div>
          ))}

          {calendarMonth.cells.map((cell) => {
            const baseTone = !cell.isCurrentMonth
              ? 'border-transparent bg-slate-50/50 text-slate-300 dark:bg-[#141414] dark:text-neutral-600'
              : cell.intensity === 3
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : cell.intensity === 2
                  ? 'border-emerald-400 bg-emerald-100 text-emerald-950 dark:border-emerald-600 dark:bg-[#202020] dark:text-emerald-300'
                  : cell.intensity === 1
                    ? 'border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-[#202020] dark:text-amber-300'
                    : cell.isToday
                      ? 'border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-[#202020] dark:text-blue-400'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-300';

            const ringClass = cell.isToday
              ? 'ring-2 ring-blue-600 ring-offset-1 dark:ring-blue-500 dark:ring-offset-[#181818]'
              : cell.isInCurrentStreak && cell.isCurrentMonth
                ? 'ring-1 ring-amber-400 dark:ring-amber-500/70'
                : '';

            return (
              <div
                key={cell.dateKey}
                title={
                  cell.completedCount > 0
                    ? `${cell.dateKey}: ${cell.completedCount} completed${cell.isGoalMet ? ' (Daily goal met)' : ''}`
                    : `${cell.dateKey}: No activity`
                }
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border font-mono text-xs font-bold tabular-nums transition-colors ${baseTone} ${ringClass}`}
              >
                <span>{cell.dayNumber}</span>
                {cell.isCurrentMonth && cell.completedCount > 0 && (
                  <span
                    className={`mt-0.5 text-[9px] font-semibold ${
                      cell.intensity === 3 ? 'text-emerald-100' : 'text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    {cell.completedCount}x
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600 dark:border-neutral-800 dark:text-neutral-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-slate-200 bg-white dark:border-neutral-700 dark:bg-[#141414]" />
              <span>Rest</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-amber-400 bg-amber-100 dark:border-amber-600 dark:bg-[#202020]" />
              <span>Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100 dark:border-emerald-600 dark:bg-[#202020]" />
              <span>Goal Met ({dailyGoal}/day)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-emerald-600 bg-emerald-600" />
              <span>2x+ Goal</span>
            </span>
          </div>

          <span className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">
            {metrics.activeToday
              ? 'Today logged · Streak protected'
              : 'Complete 1 drill or module today to keep your streak'}
          </span>
        </div>
      </section>
    </div>
  );
}
