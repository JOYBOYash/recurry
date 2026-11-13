import { Check, Star } from 'lucide-react';
import { LanguageIcon } from './LanguageIcon';
import { SUPPORTED_LANGUAGES } from '../data/languages';

export function WhoItsForSection() {
  return (
    <section id="who" className="space-y-10 scroll-mt-20">
      <div className="max-w-xl space-y-3">
        <span className="font-mono text-xs font-semibold text-blue-700">
          WHO IT&apos;S FOR
        </span>
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 text-balance sm:text-4xl">
          Stop guessing syntax.{' '}
          <span className="text-blue-600">Master it.</span>
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          Whether you are writing your first loop, bridging from another stack, or prepping for technical interviews, every track adapts to your rank.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Beginners & Switchers */}
        <article className="flex flex-col">
          <div
            aria-hidden="true"
            className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  'radial-gradient(#CBD5E1 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />
            <div className="relative z-10 flex max-w-[270px] flex-wrap items-center justify-center gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <div
                  key={lang.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs"
                >
                  <LanguageIcon language={lang.id} className="h-4 w-4" />
                  <span className="font-display text-xs font-bold text-slate-900">
                    {lang.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
            Beginners &amp; Switchers
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Start from first principles or translate idioms directly from a language you already know.
          </p>
        </article>

        {/* Card 2: Working Engineers */}
        <article className="flex flex-col">
          <div
            aria-hidden="true"
            className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  'radial-gradient(#CBD5E1 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />
            <div className="relative z-10 w-full max-w-[260px] space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-display font-bold text-slate-950">
                  Syntax transfer check
                </span>
                <span className="font-mono text-blue-700">Expert</span>
              </div>
              <div className="space-y-1 font-mono text-[10px]">
                <div className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                  - for (i = 0; i &lt; n; i++)
                </div>
                <div className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                  + nums.filter((n) =&gt; n &gt; 0)
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
                  Verify syntax
                </span>
                <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                  Reference
                </span>
              </div>
            </div>
          </div>

          <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
            Working Engineers
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Close syntax gaps across SQL, Java, C++, Python, JavaScript, and Ruby without textbook fluff.
          </p>
        </article>

        {/* Card 3: Interview & Systems Prep */}
        <article className="flex flex-col">
          <div
            aria-hidden="true"
            className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  'radial-gradient(#CBD5E1 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />
            <div className="relative z-10 flex w-full max-w-[260px] flex-col items-center">
              <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xs">
                <span className="font-display text-xs font-bold text-slate-900">
                  Array &amp; pointer drill
                </span>
                <span className="font-mono text-[10px] text-slate-500">C++20</span>
              </div>
              <div className="h-3.5 w-0.5 bg-blue-600" />
              <div className="w-full space-y-1.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-display text-xs font-bold text-slate-950">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Challenge passed
                  </span>
                  <span className="font-mono text-[10px] font-bold text-blue-700 tabular-nums">
                    96%
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
                  <span className="text-slate-500">Certificate rating</span>
                  <span className="inline-flex items-center gap-0.5 font-mono font-bold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    5 / 5
                  </span>
                </div>
              </div>
            </div>
          </div>

          <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
            Interview &amp; Systems Prep
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Drill problem-solving syntax with instant AI code reviews and star-ranked certificates.
          </p>
        </article>
      </div>
    </section>
  );
}
