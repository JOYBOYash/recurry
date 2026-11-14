import type { ReactNode } from 'react';

interface ScenicBackdropProps {
  children: ReactNode;
  className?: string;
}

export function ScenicBackdrop({ children, className = '' }: ScenicBackdropProps) {
  return (
    <div
      className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-b from-[#1D4ED8] via-[#2563EB] via-60% to-[#60A5FA] ${className}`}
    >
      {/* Far sky parallax clouds layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 z-[1] h-[125%]"
      >
        <img
          src="/assets/images/parallax-clouds.webp"
          alt=""
          className="h-full w-full object-cover object-top opacity-95"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(66% 56% at 50% 34%, rgba(29, 78, 216, 0.52) 0%, rgba(37, 99, 235, 0.22) 64%, transparent 100%)',
          }}
        />
      </div>

      {/* Foreground grassy wildflower meadow anchored sharply at the bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-[84px] z-[2] h-[300px] sm:-bottom-[96px] sm:h-[360px] lg:-bottom-[108px] lg:h-[400px]"
      >
        <img
          src="/assets/images/parallax-ground.webp"
          alt=""
          className="h-full w-full object-cover object-bottom contrast-[1.04] saturate-[1.06]"
        />
      </div>

      {/* Foreground content layer */}
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
