import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { computeProgressRingGeometry } from '../utils/progressRing';

export interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  status?: 'active' | 'completed' | 'locked';
  showLabel?: boolean;
  label?: string;
  ariaLabel?: string;
}

export function ProgressRing({
  percent,
  size = 52,
  strokeWidth = 4,
  status = 'active',
  showLabel = true,
  label,
  ariaLabel,
}: ProgressRingProps) {
  const clampedTarget = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const [animatedPercent, setAnimatedPercent] = useState<number>(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return clampedTarget;
    }
    return 0;
  });

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setAnimatedPercent(clampedTarget);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setAnimatedPercent(clampedTarget);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [clampedTarget]);

  const geometry = computeProgressRingGeometry({
    percent: animatedPercent,
    size,
    strokeWidth,
  });

  const isComplete = status === 'completed' || clampedTarget >= 100;
  const isLocked = status === 'locked';

  const progressStrokeClass = isComplete
    ? 'stroke-emerald-600 dark:stroke-emerald-500'
    : isLocked
      ? 'stroke-slate-300 dark:stroke-neutral-600'
      : 'stroke-blue-600 dark:stroke-blue-500';

  const displayText = label ?? `${Math.round(clampedTarget)}%`;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedTarget)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? `${Math.round(clampedTarget)}% complete`}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={geometry.center}
          cy={geometry.center}
          r={geometry.radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-100 dark:stroke-neutral-800"
        />
        {/* Dynamic animated progress arc */}
        <circle
          cx={geometry.center}
          cy={geometry.center}
          r={geometry.radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={geometry.circumference}
          strokeDashoffset={geometry.dashOffset}
          className={`${progressStrokeClass} transition-[stroke-dashoffset,stroke] duration-700 ease-out motion-reduce:transition-none`}
        />
      </svg>

      {showLabel && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold tabular-nums">
          {isComplete ? (
            <Check
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              strokeWidth={2.75}
              aria-hidden="true"
            />
          ) : (
            <span
              className={
                isLocked
                  ? 'text-slate-400 dark:text-neutral-500'
                  : 'text-slate-800 dark:text-neutral-100'
              }
            >
              {displayText}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
