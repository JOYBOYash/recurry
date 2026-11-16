import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DailyStreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  activeToday?: boolean;
}

export function DailyStreakWidget({
  currentStreak,
  longestStreak,
  activeToday = false,
}: DailyStreakWidgetProps) {
  const hasStreak = currentStreak > 0;
  const dayLabel = currentStreak === 1 ? 'day' : 'days';

  return (
    <Link
      to="/app/streaks"
      aria-label="Daily Streak"
      data-testid="daily-streak-widget"
      className={`btn-juice relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border bg-white p-5 transition-colors dark:bg-[#181818] ${
        hasStreak
          ? 'border-amber-200 hover:border-amber-400 dark:border-amber-600/50 dark:hover:border-amber-500'
          : 'border-slate-200 hover:border-amber-400 dark:border-neutral-800 dark:hover:border-amber-500'
      }`}
    >
      <div className="relative z-10 min-w-0 space-y-1">
        <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
          Daily Streak
        </div>
        <div className="font-mono text-lg font-bold text-slate-950 tabular-nums dark:text-white">
          {currentStreak} {dayLabel}
        </div>
        <div className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-neutral-400">
          {longestStreak > 0
            ? `Best ${longestStreak}d`
            : activeToday
              ? 'Active today'
              : 'Practice today'}
        </div>
      </div>

      <Flame
        aria-hidden="true"
        className={`relative z-10 h-7 w-7 shrink-0 ${
          hasStreak
            ? 'fill-amber-500 text-amber-500 dark:text-amber-400'
            : 'text-slate-400 dark:text-neutral-600'
        }`}
      />
    </Link>
  );
}
