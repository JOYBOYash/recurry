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
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={goal.isGoalMet ? '#059669' : '#2563EB'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
        />
      </svg>

      <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold tabular-nums">
        {goal.isGoalMet ? (
          <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <span className="text-slate-900">
            {goal.completedToday}/{goal.dailyGoal}
          </span>
        )}
      </span>
    </div>
  );
}
