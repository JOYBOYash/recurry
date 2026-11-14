import type { ReactNode } from 'react';

interface HighlightTextProps {
  children: ReactNode;
  variant?: 'light' | 'sky';
}

export function HighlightText({
  children,
  variant = 'light',
}: HighlightTextProps) {
  const isSky = variant === 'sky';

  return (
    <span className="relative mx-1 inline-block whitespace-nowrap px-2 align-baseline">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-[2px] ${
          isSky ? 'bg-white/22' : 'bg-blue-600/14'
        }`}
      />
      {/* Left bracket stem + top dot matching highlight.webp */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 bottom-0 left-0 w-[2px] ${
          isSky ? 'bg-white' : 'bg-blue-600'
        }`}
      >
        <span
          className={`absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
            isSky ? 'bg-white' : 'bg-blue-600'
          }`}
        />
      </span>
      {/* Right bracket stem + bottom dot matching highlight.webp */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 bottom-0 right-0 w-[2px] ${
          isSky ? 'bg-white' : 'bg-blue-600'
        }`}
      >
        <span
          className={`absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
            isSky ? 'bg-white' : 'bg-blue-600'
          }`}
        />
      </span>
      <span className={`relative z-10 ${isSky ? 'text-white' : 'text-blue-700'}`}>
        {children}
      </span>
    </span>
  );
}
