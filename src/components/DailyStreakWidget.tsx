import { ArrowRight, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDailyStreakMotivation } from '../utils/rankSystem';

interface DailyStreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
}

export function DailyStreakWidget({
  currentStreak,
  longestStreak,
  activeToday,
}: DailyStreakWidgetProps) {
  const hasStreak = currentStreak > 0;
  const dayLabel = currentStreak === 1 ? 'day' : 'days';
  const motivation = getDailyStreakMotivation(currentStreak, activeToday);

  return (
    <section
      aria-label="Daily Streak"
      data-testid="daily-streak-widget"
      className="mx-auto max-w-4xl px-4 pt-5 sm:px-6 lg:px-8"
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-colors sm:px-5 ${
          hasStreak
            ? 'border-amber-200 bg-white dark:border-amber-600/50 dark:bg-[#181818]'
            : 'border-slate-200 bg-white dark:border-neutral-800 dark:bg-[#181818]'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <Flame
            className={`h-6 w-6 shrink-0 ${
              hasStreak
                ? 'fill-amber-500 text-amber-500 dark:text-amber-400'
                : 'text-slate-400 dark:text-neutral-500'
            }`}
            aria-hidden="true"
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                Daily Streak
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
                  hasStreak
                    ? 'bg-amber-50 text-amber-800 dark:bg-[#202020] dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-[#202020] dark:text-neutral-300'
                }`}
              >
                <span>
                  {currentStreak} {dayLabel}
                </span>
              </span>
              {longestStreak > 0 && (
                <span className="font-mono text-[11px] font-medium text-slate-500 tabular-nums dark:text-neutral-400">
                  Best: {longestStreak}d
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-neutral-400">
              {motivation}
            </p>
          </div>
        </div>

        <Link
          to="/app/streaks"
          className="btn-juice inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:bg-amber-50/70 hover:text-amber-900 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-amber-500/70 dark:hover:bg-[#262626] dark:hover:text-amber-200"
        >
          <span>Streak Calendar</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
