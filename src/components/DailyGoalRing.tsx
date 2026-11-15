import { Check } from 'lucide-react';
import type { DailyGoalProgress } from '../utils/curriculumLogic';

interface DailyGoalRingProps {
  goal: DailyGoalProgress;
  size?: number;
  strokeWidth?: number;
}

export function DailyGoalRing({
  goal,
  size = 44,
  strokeWidth = 4,
}: DailyGoalRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - goal.percentage / 100);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`Daily goal: ${goal.completedToday} of ${goal.dailyGoal} modules`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-neutral-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={goal.isGoalMet ? '#10B981' : '#2563EB'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
        />
      </svg>

      <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold tabular-nums">
        {goal.isGoalMet ? (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <span className="text-slate-900 dark:text-white">
            {goal.completedToday}/{goal.dailyGoal}
          </span>
        )}
      </span>
    </div>
  );
}
