import { ArrowRight, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageIcon } from './LanguageIcon';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import type { LanguageId } from '../types/curriculum';

interface HeroSectionProps {
  isAuthenticated: boolean;
  primaryDestination: string;
}

const LEFT_TILES: Array<{ id: LanguageId; offset: string }> = [
  { id: 'sql', offset: 'translate-x-6' },
  { id: 'java', offset: '-translate-x-4' },
  { id: 'cpp', offset: 'translate-x-7' },
];

const RIGHT_TILES: Array<{ id: LanguageId; offset: string }> = [
  { id: 'python', offset: '-translate-x-6' },
  { id: 'javascript', offset: 'translate-x-4' },
  { id: 'ruby', offset: '-translate-x-7' },
];

export function HeroSection({
  isAuthenticated,
  primaryDestination,
}: HeroSectionProps) {
  return (
    <section className="relative w-full overflow-hidden bg-[#F7F8FA]">
      {/* Full-bleed hero backdrop: upper sky & mountains behind copy, meadow strictly below buttons */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 top-72 sm:top-40 lg:top-24"
      >
        <img
          src="/assets/aistudio/image_468fb10f.png"
          alt=""
          className="h-full w-full object-cover object-top"
        />
        {/* Seamless top sky fade & bottom meadow blend into #F7F8FA */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #F7F8FA 0%, rgba(247, 248, 250, 0.72) 15%, rgba(247, 248, 250, 0.16) 36%, rgba(247, 248, 250, 0) 50%, rgba(247, 248, 250, 0) 86%, #F7F8FA 100%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-12 pb-64 sm:px-6 sm:pt-14 sm:pb-72 lg:px-8 lg:pt-16 lg:pb-[360px]">
        <div className="grid items-center gap-8 lg:grid-cols-12">
          {/* Left flanking plain icons */}
          <div
            aria-hidden="true"
            className="hidden flex-col items-center gap-9 lg:col-span-2 lg:flex"
          >
            {LEFT_TILES.map((tile) => (
              <div
                key={tile.id}
                className={`transition-transform duration-200 hover:-translate-y-1 ${tile.offset}`}
              >
                <LanguageIcon
                  language={tile.id}
                  className="h-12 w-12 drop-shadow-[0_2px_10px_rgba(255,255,255,0.92)]"
                />
              </div>
            ))}
          </div>

          {/* Center hero copy + CTAs */}
          <div className="mx-auto max-w-2xl space-y-6 text-center lg:col-span-8">
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-950 text-balance sm:text-5xl lg:text-6xl">
              Complete language syntax, tailored to your level.
            </h1>

            <p className="mx-auto max-w-xl text-base leading-relaxed font-medium text-slate-700 sm:text-lg">
              Adaptive syntax and problem-solving tracks across SQL, Java, C++, Python, JavaScript, and Ruby with instant code evaluation and star-ranked certificates.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row">
              <Link
                to={primaryDestination}
                className="btn-juice inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto"
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isAuthenticated ? 'Go to Dashboard' : 'Build Your Curriculum'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#skills"
                className="btn-juice inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-6 py-3 text-sm font-semibold text-slate-800 backdrop-blur-xs hover:border-slate-400 hover:text-slate-950 sm:w-auto"
              >
                <span>View 6 Languages</span>
              </a>
            </div>

            {/* Mobile / tablet compact row of plain scaled icons */}
            <div
              aria-hidden="true"
              className="flex flex-wrap items-center justify-center gap-5 pt-2 lg:hidden"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <LanguageIcon
                  key={lang.id}
                  language={lang.id}
                  className="h-10 w-10 drop-shadow-[0_2px_6px_rgba(255,255,255,0.92)]"
                />
              ))}
            </div>
          </div>

          {/* Right flanking plain icons */}
          <div
            aria-hidden="true"
            className="hidden flex-col items-center gap-9 lg:col-span-2 lg:flex"
          >
            {RIGHT_TILES.map((tile) => (
              <div
                key={tile.id}
                className={`transition-transform duration-200 hover:-translate-y-1 ${tile.offset}`}
              >
                <LanguageIcon
                  language={tile.id}
                  className="h-12 w-12 drop-shadow-[0_2px_10px_rgba(255,255,255,0.92)]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
