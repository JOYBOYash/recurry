import { computeDailyHeartStates } from '../utils/uxFlowLogic';

interface DailyGoalHeartsProps {
  completedToday: number;
  dailyGoal: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * Stylized edgy/faceted geometric heart progress indicator.
 * Earned hearts are filled crimson; pending daily targets blink gently as hollow outlines.
 */
export function DailyGoalHearts({
  completedToday,
  dailyGoal,
  size = 'md',
  className = '',
}: DailyGoalHeartsProps) {
  const states = computeDailyHeartStates(completedToday, dailyGoal);
  const completedCount = states.filter((s) => s === 'filled').length;

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`Daily goal: ${completedCount} of ${states.length} hearts completed today`}
      title={`${completedCount} of ${states.length} modules completed today`}
    >
      {states.map((state, idx) => {
        const isFilled = state === 'filled';
        return (
          <svg
            key={idx}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`${SIZE_CLASSES[size]} shrink-0 ${
              isFilled
                ? 'animate-heart-pop text-rose-500 dark:text-rose-500'
                : 'animate-heart-blink text-rose-500/80 dark:text-rose-400/80'
            }`}
            style={
              !isFilled
                ? { animationDelay: `${idx * 220}ms` }
                : undefined
            }
          >
            {/* Sharp faceted/edgy geometric heart */}
            <polygon
              points="12,21.5 2.5,11.2 4.8,4.6 9.5,3.5 12,7.2 14.5,3.5 19.2,4.6 21.5,11.2"
              fill={isFilled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={isFilled ? '1.4' : '1.9'}
              strokeLinejoin="miter"
              strokeMiterlimit="3"
            />
            {isFilled && (
              <polygon
                points="12,7.2 14.5,3.5 19.2,4.6 17.4,9.8 12,13.5"
                fill="#FFFFFF"
                fillOpacity="0.18"
              />
            )}
          </svg>
        );
      })}
    </span>
  );
}
