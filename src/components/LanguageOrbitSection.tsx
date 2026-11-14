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
  function handlePick(lang: LanguageId) {
    onSelectLanguage(lang);
    const target = document.getElementById('skills');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <section id="how" className="scroll-mt-20">
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-16 sm:px-10 sm:py-24">
          {/* Concentric orbital rings inspired by Relay integration showcase */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-[300px] w-[300px] rounded-full border border-slate-200/75 sm:h-[360px] sm:w-[360px]" />
            <div className="absolute h-[460px] w-[460px] rounded-full border border-slate-200/60 sm:h-[560px] sm:w-[560px]" />
            <div className="absolute h-[640px] w-[640px] rounded-full border border-slate-200/45 sm:h-[760px] sm:w-[760px]" />
          </div>

          <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-12">
            {/* Left orbital icons (plain icons without boxes) */}
            <div className="hidden flex-col items-center gap-12 lg:col-span-3 lg:flex">
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

            {/* Center hub message */}
            <div className="mx-auto max-w-lg space-y-5 text-center lg:col-span-6">
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 text-balance sm:text-4xl">
                <HighlightText>Six languages.</HighlightText>{' '}
                One simple workflow.
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                Pick your level, read short grammar notes, check your code, and save examples to look up anytime.
              </p>

              {/* Mobile / tablet compact row of plain orbital icons */}
              <div className="flex flex-wrap items-center justify-center gap-6 py-2 lg:hidden">
                {[...LEFT_ORBIT, ...RIGHT_ORBIT].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePick(item.id)}
                    aria-label={`Inspect ${item.label} snippet`}
                    className="transition-transform duration-150 hover:scale-110"
                  >
                    <LanguageIcon language={item.id} className="h-9 w-9" />
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <Link
                  to={primaryDestination}
                  className="btn-juice inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <span>Build Your Curriculum</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Right orbital icons (plain icons without boxes) */}
            <div className="hidden flex-col items-center gap-12 lg:col-span-3 lg:flex">
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
