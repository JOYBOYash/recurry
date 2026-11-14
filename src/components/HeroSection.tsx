import { useEffect, useRef } from 'react';
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

      const maxScroll = heroEl.offsetHeight + 120;
      const scrollY = Math.max(0, Math.min(window.scrollY, maxScroll));

      // Far sky & clouds lag behind scroll speed for clear atmospheric depth
      if (cloudsRef.current) {
        cloudsRef.current.style.transform = `translate3d(0, ${(scrollY * 0.44).toFixed(1)}px, 0) scale(1.06)`;
      }
      // Foreground grassy rocky hill rises cleanly against the sky
      if (groundRef.current) {
        groundRef.current.style.transform = `translate3d(0, ${(-scrollY * 0.16).toFixed(1)}px, 0)`;
      }
      // Hero headline & CTAs drift slightly slower than foreground hill
      if (copyRef.current) {
        copyRef.current.style.transform = `translate3d(0, ${(scrollY * 0.14).toFixed(1)}px, 0)`;
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

  function handleScrollToSkills(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById('skills');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[600px] w-full flex-col justify-between overflow-hidden bg-gradient-to-b from-[#1D4ED8] via-[#2563EB] via-65% to-[#60A5FA] sm:h-[calc(100vh-4rem)] sm:min-h-[660px] sm:max-h-[820px]"
    >
      {/* Far sky parallax clouds layer */}
      <div
        ref={cloudsRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-10 z-[1] h-[110%] will-change-transform"
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
              'radial-gradient(66% 56% at 50% 34%, rgba(29, 78, 216, 0.54) 0%, rgba(37, 99, 235, 0.22) 62%, transparent 100%)',
          }}
        />
      </div>

      {/* Foreground grassy hill parallax layer anchored with buffer below so scrolling never exposes a seam */}
      <div
        ref={groundRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-40 z-[3] h-[430px] will-change-transform sm:-bottom-44 sm:h-[520px] lg:-bottom-48 lg:h-[600px]"
      >
        <img
          src="/assets/images/parallax-ground.webp"
          alt=""
          className="h-full w-full object-cover object-bottom"
        />
      </div>

      {/* Subtle anchored bottom edge transition into the #F7F8FA canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-16 bg-gradient-to-t from-[#F7F8FA] via-[#F7F8FA]/65 to-transparent"
      />

      {/* Centered Hero Copy & CTAs */}
      <div
        ref={copyRef}
        className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-14 text-center will-change-transform sm:px-6 sm:pt-20 lg:px-8 lg:pt-24"
      >
        <div className="mx-auto max-w-3xl space-y-5">
          <h1 className="font-display text-4xl leading-[1.2] font-bold tracking-tight text-white text-balance sm:text-5xl lg:text-[3.6rem] lg:leading-[1.16]">
            Write better code,{' '}
            <HighlightText variant="sky">tailored</HighlightText> to your skill.
          </h1>

          <p className="mx-auto max-w-xl text-base leading-relaxed text-blue-50 sm:text-lg">
            Pick your level from beginner to pro. Practice SQL, Java, C++, Python, JavaScript, and Ruby with short lessons and instant code checks.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Link
              to={primaryDestination}
              className="btn-juice inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border-b-2 border-blue-200 bg-white px-6 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 sm:w-auto"
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              <span>
                {isAuthenticated ? 'Go to Dashboard' : 'Start Free Track'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#skills"
              className="btn-juice inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/45 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xs hover:bg-white/25 sm:w-auto"
            >
              <span>Explore 6 Languages</span>
            </a>
          </div>
        </div>
      </div>

      {/* Unboxed editorial scroll-rail indicator anchored cleanly over the meadow */}
      <div className="relative z-10 flex justify-center px-4 pb-10 pt-8 sm:pb-12">
        <a
          href="#skills"
          onClick={handleScrollToSkills}
          className="group inline-flex flex-col items-center gap-2 px-3 py-1.5 text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.7)] transition-opacity hover:opacity-85"
        >
          <span className="text-xs font-semibold tracking-wide">
            Scroll to know more
          </span>
          <span
            aria-hidden="true"
            className="flex flex-col items-center"
          >
            <span className="relative h-7 w-[2px] overflow-hidden rounded-full bg-white/40">
              <span className="animate-scroll-beam absolute inset-x-0 top-0 h-3.5 rounded-full bg-white" />
            </span>
            <ChevronDown
              className="-mt-1.5 h-4 w-4 text-white transition-transform duration-200 group-hover:translate-y-0.5"
            />
          </span>
        </a>
      </div>
    </section>
  );
}
