import { useId } from 'react';

interface FlamingIconProps {
  active?: boolean;
  className?: string;
}

/**
 * Vibrant multi-tone colored flame icon for streak indicators.
 */
export function FlamingIcon({
  active = true,
  className = 'h-5 w-5',
}: FlamingIconProps) {
  const id = useId();
  const outerGradId = `flame-outer-${id}`;
  const innerGradId = `flame-inner-${id}`;

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${className} shrink-0 transition-transform duration-200`}
    >
      <defs>
        <linearGradient id={outerGradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={active ? '#FACC15' : '#FB923C'} />
          <stop offset="48%" stopColor={active ? '#F97316' : '#F97316'} />
          <stop offset="100%" stopColor={active ? '#DC2626' : '#EA580C'} />
        </linearGradient>
        <linearGradient id={innerGradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
      </defs>

      <path
        d="M12.3 2.1c.4 2.9-1.1 4.8-2.4 6.4-1.2 1.5-2.1 2.7-1.9 4.5.1 1 .8 1.9 1.7 2.2-.5-1.1-.3-2.5.7-3.5.7-.7 1.3-1.4 1.5-2.4 1.6 1.2 2.9 3 2.9 5.3 0 1.4-.6 2.6-1.5 3.4 2.6-.7 4.7-3.2 4.7-6.3 0-3.7-2.2-7-5.7-9.6ZM12 21.8c-4.2 0-7.4-3.1-7.4-7.3 0-2.8 1.5-5.3 3.7-7.1-.1 1.3.3 2.4 1.1 3.2.5-3.4 2.7-6.4 3-8.5 3.9 2.4 7 6.3 7 11.4 0 4.8-3.2 8.3-7.4 8.3Z"
        fill={`url(#${outerGradId})`}
        opacity={active ? 1 : 0.72}
      />
      <path
        d="M12.1 11.4c-.3 1.4-1.3 2.1-1.9 3.1-.5.9-.5 2.1.2 3 .6.8 1.7 1.1 2.6.8 1.4-.4 2.2-1.8 2-3.3-.2-1.5-1.4-2.8-2.9-3.6Z"
        fill={`url(#${innerGradId})`}
        opacity={active ? 1 : 0.65}
      />
    </svg>
  );
}
