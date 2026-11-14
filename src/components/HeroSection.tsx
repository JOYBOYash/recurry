import { useEffect, useRef, type MouseEvent } from 'react';
import { ArrowRight, ChevronDown, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HighlightText } from './HighlightText';

interface HeroSectionProps {
  isAuthenticated: boolean;
  primaryDestination: string;
}

export function HeroSection({
  isAuthenticated,
  primaryDestination,
}: HeroSectionProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const cloudsRef = useRef<HTMLDivElement | null>(null);
  const groundRef = useRef<HTMLDivElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const scrollCueRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return;

    let rafId = 0;

    const updateParallax = () => {
      rafId = 0;
      const heroEl = heroRef.current;
      if (!heroEl) return;

      const maxScroll = heroEl.offsetHeight + 160;
      const scrollY = Math.max(0, Math.min(window.scrollY, maxScroll));

      // Clouds drift downward smoothly as the user scrolls down without exposing a top edge
      if (cloudsRef.current) {
        cloudsRef.current.style.transform = `translate3d(0, ${(scrollY * 0.28).toFixed(1)}px, 0) scale(1.04)`;
      }
      // Foreground grassy ridge rises smoothly on scroll, clamped so its bottom edge never lifts into view
      if (groundRef.current) {
        const bottomTuck = Math.max(
          0,
          -parseFloat(window.getComputedStyle(groundRef.current).bottom) || 180,
        );
        const maxLift = Math.max(0, bottomTuck - 14);
        const lift = Math.min(scrollY * 0.24, maxLift);
        groundRef.current.style.transform = `translate3d(0, ${(-lift).toFixed(1)}px, 0)`;
      }
      // Hero headline & CTAs settle slightly slower against the sky
      if (copyRef.current) {
        const copyOpacity = Math.max(0.2, 1 - scrollY / 540);
        copyRef.current.style.transform = `translate3d(0, ${(scrollY * 0.14).toFixed(1)}px, 0)`;
        copyRef.current.style.opacity = copyOpacity.toFixed(3);
      }
      // Scroll cue between sky and ground fades itself out smoothly as you scroll
      if (scrollCueRef.current) {
        const cueOpacity = Math.max(0, 1 - scrollY / 140);
        scrollCueRef.current.style.opacity = cueOpacity.toFixed(3);
        scrollCueRef.current.style.transform = `translate3d(0, ${(scrollY * 0.18).toFixed(1)}px, 0)`;
      }
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateParallax);
      }
    };

    updateParallax();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  function handleScrollToSkills(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById('skills');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[680px] w-full flex-col justify-between overflow-hidden bg-gradient-to-b from-[#1D4ED8] via-[#2563EB] via-60% to-[#60A5FA] sm:h-[100svh] sm:min-h-[720px] sm:max-h-[900px]"
    >
      {/* Far sky parallax clouds layer */}
      <div
        ref={cloudsRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 z-[1] h-[140%] will-change-transform"
      >
        <img
          src="/assets/images/parallax-clouds.webp"
          alt=""
          className="h-full w-full object-cover object-top opacity-95"
        />
        {/* Measured radial cobalt scrim so white headline stays crisp over clouds */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(66% 56% at 50% 34%, rgba(29, 78, 216, 0.52) 0%, rgba(37, 99, 235, 0.2) 64%, transparent 100%)',
          }}
        />
      </div>

      {/* Foreground grassy wildflower meadow peeking below scroll cue at rest and rising smoothly on scroll */}
      <div
        ref={groundRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-[120px] z-[3] aspect-[16/9] min-h-[360px] w-full will-change-transform sm:-bottom-[180px] lg:-bottom-[260px]"
      >
        <img
          src="/assets/images/parallax-ground.webp"
          alt=""
          className="h-full w-full object-cover object-bottom contrast-[1.05] saturate-[1.05]"
        />
      </div>

      {/* Crisp minimal bottom edge seam into #F7F8FA without smudging foreground flowers */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-5 bg-gradient-to-t from-[#F7F8FA] to-transparent sm:h-6"
      />

      {/* Centered Hero Copy & CTAs in open sky (cleared below fixed glassmorphic navbar) */}
      <div
        ref={copyRef}
        className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-28 text-center will-change-transform sm:px-6 sm:pt-32 lg:px-8 lg:pt-36"
      >
        <div className="mx-auto max-w-3xl space-y-5">
          <h1 className="font-display text-4xl leading-[1.2] font-bold tracking-tight text-white text-balance sm:text-5xl lg:text-[3.6rem] lg:leading-[1.16]">
            Write better code,{' '}
            <HighlightText variant="sky">tailored</HighlightText> to your skill.
          </h1>

          <p className="mx-auto max-w-xl text-base leading-relaxed text-blue-50 sm:text-lg">
            Pick your level from beginner to pro. Practice SQL, Java, C++, Python, JavaScript, and Ruby with short lessons and instant code checks.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to={primaryDestination}
              className="btn-juice inline-flex min-h-12 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl border-b-2 border-blue-200 bg-white px-6 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              <span>
                {isAuthenticated ? 'Go to Dashboard' : 'Start Free Track'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#skills"
              className="btn-juice inline-flex min-h-12 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/45 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xs hover:bg-white/25"
            >
              <span>Explore 6 Languages</span>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator resting cleanly between sky and meadow horizon, fading out on scroll */}
      <div
        ref={scrollCueRef}
        className="relative z-10 flex justify-center px-4 pb-36 pt-6 will-change-transform sm:pb-44 lg:pb-52"
      >
        <a
          href="#skills"
          onClick={handleScrollToSkills}
          className="group inline-flex flex-col items-center gap-2 px-3 py-1.5 text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.55)] transition-opacity hover:opacity-85"
        >
          <span className="text-xs font-semibold tracking-wide">
            Scroll to know more
          </span>
          <span aria-hidden="true" className="flex flex-col items-center">
            <span className="relative h-7 w-[2px] overflow-hidden rounded-full bg-white/45">
              <span className="animate-scroll-beam absolute inset-x-0 top-0 h-3.5 rounded-full bg-white" />
            </span>
            <ChevronDown className="-mt-1.5 h-4 w-4 text-white transition-transform duration-200 group-hover:translate-y-0.5" />
          </span>
        </a>
      </div>
    </section>
  );
}
