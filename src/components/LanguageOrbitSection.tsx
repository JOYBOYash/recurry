import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HighlightText } from './HighlightText';
import { LanguageIcon } from './LanguageIcon';
import { ScrollReveal } from './ScrollReveal';
import type { LanguageId } from '../types/curriculum';

interface LanguageOrbitSectionProps {
  primaryDestination: string;
  onSelectLanguage: (lang: LanguageId) => void;
}

const LEFT_ORBIT: Array<{ id: LanguageId; label: string; offsetClass: string }> = [
  { id: 'sql', label: 'SQL', offsetClass: 'translate-x-8 sm:translate-x-12' },
  { id: 'java', label: 'Java', offsetClass: '-translate-x-2 sm:-translate-x-4' },
  { id: 'cpp', label: 'C++', offsetClass: 'translate-x-8 sm:translate-x-12' },
];

const RIGHT_ORBIT: Array<{ id: LanguageId; label: string; offsetClass: string }> = [
  { id: 'python', label: 'Python', offsetClass: '-translate-x-8 sm:-translate-x-12' },
  { id: 'javascript', label: 'JavaScript', offsetClass: 'translate-x-2 sm:translate-x-4' },
  { id: 'ruby', label: 'Ruby', offsetClass: '-translate-x-8 sm:-translate-x-12' },
];

export function LanguageOrbitSection({
  primaryDestination,
  onSelectLanguage,
}: LanguageOrbitSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const leftColRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const ringsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return;

    let rafId = 0;

    const updateOrbitScroll = () => {
      rafId = 0;
      const el = sectionRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || 800;
      const progress = Math.max(
        -1,
        Math.min(1, (viewportH * 0.5 - (rect.top + rect.height * 0.5)) / viewportH),
      );

      if (leftColRef.current) {
        leftColRef.current.style.transform = `translate3d(0, ${(progress * -18).toFixed(1)}px, 0)`;
      }
      if (rightColRef.current) {
        rightColRef.current.style.transform = `translate3d(0, ${(progress * 18).toFixed(1)}px, 0)`;
      }
      if (ringsRef.current) {
        ringsRef.current.style.transform = `scale(${(1 + (1 - Math.abs(progress)) * 0.03).toFixed(4)}) rotate(${(progress * 8).toFixed(2)}deg)`;
      }
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateOrbitScroll);
      }
    };

    updateOrbitScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  function handlePick(lang: LanguageId) {
    onSelectLanguage(lang);
    const target = document.getElementById('skills');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <section ref={sectionRef} id="how" className="scroll-mt-24">
      <ScrollReveal variant="scale">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-12 sm:px-10 sm:py-20 lg:py-24">
          {/* Concentric orbital rings reacting gently to scroll */}
          <div
            ref={ringsRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center will-change-transform"
          >
            <div className="h-[280px] w-[280px] rounded-full border border-slate-200/75 sm:h-[360px] sm:w-[360px]" />
            <div className="absolute h-[420px] w-[420px] rounded-full border border-slate-200/60 sm:h-[560px] sm:w-[560px]" />
            <div className="absolute h-[580px] w-[580px] rounded-full border border-slate-200/45 sm:h-[760px] sm:w-[760px]" />
          </div>

          <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-12">
            {/* Desktop Left orbital icons (plain icons without boxes) */}
            <div
              ref={leftColRef}
              className="hidden flex-col items-center gap-12 will-change-transform lg:col-span-3 lg:flex"
            >
              {LEFT_ORBIT.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePick(item.id)}
                  aria-label={`Inspect ${item.label} snippet`}
                  className={`group transition-transform duration-200 hover:-translate-y-1 ${item.offsetClass}`}
                >
                  <LanguageIcon
                    language={item.id}
                    className="h-11 w-11 transition-transform duration-200 group-hover:scale-110"
                  />
                </button>
              ))}
            </div>

            {/* Center hub message with responsive 3-top + 3-bottom icon framing */}
            <div className="mx-auto max-w-lg text-center lg:col-span-6">
              {/* Mobile / Tablet top 3 orbital icons */}
              <div className="mb-6 flex items-center justify-center gap-9 sm:gap-12 lg:hidden">
                {LEFT_ORBIT.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePick(item.id)}
                    aria-label={`Inspect ${item.label} snippet`}
                    className={`transition-transform duration-200 hover:scale-110 ${
                      idx === 1 ? '-translate-y-2' : ''
                    }`}
                  >
                    <LanguageIcon language={item.id} className="h-9 w-9 sm:h-10 sm:w-10" />
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 text-balance sm:text-4xl">
                  <HighlightText>Six languages.</HighlightText>{' '}
                  One simple workflow.
                </h2>
                <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                  Pick your level, read short grammar notes, check your code, and save examples to look up anytime.
                </p>
              </div>

              {/* Mobile / Tablet bottom 3 orbital icons */}
              <div className="mt-6 mb-6 flex items-center justify-center gap-9 sm:gap-12 lg:hidden">
                {RIGHT_ORBIT.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePick(item.id)}
                    aria-label={`Inspect ${item.label} snippet`}
                    className={`transition-transform duration-200 hover:scale-110 ${
                      idx === 1 ? 'translate-y-2' : ''
                    }`}
                  >
                    <LanguageIcon language={item.id} className="h-9 w-9 sm:h-10 sm:w-10" />
                  </button>
                ))}
              </div>

              <div className="pt-1 lg:pt-5">
                <Link
                  to={primaryDestination}
                  className="btn-juice inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <span>Build Your Curriculum</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Desktop Right orbital icons (plain icons without boxes) */}
            <div
              ref={rightColRef}
              className="hidden flex-col items-center gap-12 will-change-transform lg:col-span-3 lg:flex"
            >
              {RIGHT_ORBIT.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePick(item.id)}
                  aria-label={`Inspect ${item.label} snippet`}
                  className={`group transition-transform duration-200 hover:-translate-y-1 ${item.offsetClass}`}
                >
                  <LanguageIcon
                    language={item.id}
                    className="h-11 w-11 transition-transform duration-200 group-hover:scale-110"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
