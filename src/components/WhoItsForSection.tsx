import { Check, Flame, Star } from 'lucide-react';
import { LanguageIcon } from './LanguageIcon';
import { ScrollReveal } from './ScrollReveal';
import { SUPPORTED_LANGUAGES } from '../data/languages';

const SKILL_RANKS = ['Noob', 'Intern', 'Expert', 'Master', 'Legend'];

export function WhoItsForSection() {
  return (
    <section id="who" className="space-y-10 scroll-mt-20">
      <ScrollReveal>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 text-balance sm:text-4xl">
            Built for students, freshers, and working devs.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Start from scratch, move from another language, or brush up before technical interviews at your own pace.
          </p>
        </div>
      </ScrollReveal>

      {/* Relay-inspired 2x2 Bento Feature Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Beginners & Switchers */}
        <ScrollReveal delayMs={40}>
          <article className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 sm:p-8">
            <div className="space-y-1.5">
              <h3 className="font-display text-xl font-bold text-slate-950">
                Beginners &amp; Switchers
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Start from primitives or translate idioms directly from a language you already know.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative mt-6 flex h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-[#F7F8FA] p-5"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    'radial-gradient(#CBD5E1 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
              <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4">
                <div className="flex flex-wrap items-center justify-center gap-5">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <div
                      key={lang.id}
                      className="flex flex-col items-center gap-1 transition-transform duration-150 group-hover:scale-105"
                    >
                      <LanguageIcon language={lang.id} className="h-6 w-6" />
                      <span className="font-mono text-[10px] font-semibold text-slate-600">
                        {lang.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs shadow-xs">
                  <span className="font-medium text-slate-600">
                    Python list comprehension
                  </span>
                  <span className="font-mono font-semibold text-blue-700">
                    → Java Stream
                  </span>
                </div>
              </div>
            </div>
          </article>
        </ScrollReveal>

        {/* Card 2: Rank-Calibrated Tracks */}
        <ScrollReveal delayMs={100}>
          <article className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 sm:p-8">
            <div className="space-y-1.5">
              <h3 className="font-display text-xl font-bold text-slate-950">
                Rank-Calibrated Tracks
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Choose your fluency from Noob to Legend and focus on grammar or problem solving.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative mt-6 flex h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-[#F7F8FA] p-5"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    'radial-gradient(#CBD5E1 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
              <div className="relative z-10 w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display font-bold text-slate-950">
                    Skill Calibration
                  </span>
                  <span className="font-mono font-semibold text-blue-700">
                    Expert · Syntax
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {SKILL_RANKS.map((rank, idx) => (
                    <div
                      key={rank}
                      className={`rounded-lg border py-1.5 text-center font-mono text-[10px] font-semibold ${
                        idx === 2
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-[#F7F8FA] text-slate-600'
                      }`}
                    >
                      {rank}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
                  <span>Deep-dive edge cases</span>
                  <span className="font-mono font-semibold text-slate-900">
                    6 modules
                  </span>
                </div>
              </div>
            </div>
          </article>
        </ScrollReveal>

        {/* Card 3: Instant AI Code Reviews */}
        <ScrollReveal delayMs={140}>
          <article className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 sm:p-8">
            <div className="space-y-1.5">
              <h3 className="font-display text-xl font-bold text-slate-950">
                Instant AI Code Reviews
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Submit real solutions, catch syntax slips immediately, and ask the tutor in context.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative mt-6 flex h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-[#F7F8FA] p-5"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    'radial-gradient(#CBD5E1 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
              <div className="relative z-10 w-full max-w-sm space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display font-bold text-slate-950">
                    Syntax evaluation
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700">
                    <Check className="h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="rounded-md bg-red-50 px-2.5 py-1 text-red-700">
                    - for (i = 0; i &lt; n; i++)
                  </div>
                  <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    + nums.filter((n) =&gt; n &gt; 0)
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                  <span className="rounded-md bg-blue-600 px-3 py-1 font-bold text-white">
                    Verify Code
                  </span>
                  <span className="rounded-md border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                    Ask Tutor
                  </span>
                </div>
              </div>
            </div>
          </article>
        </ScrollReveal>

        {/* Card 4: Daily Rings & Certificates */}
        <ScrollReveal delayMs={200}>
          <article className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 sm:p-8">
            <div className="space-y-1.5">
              <h3 className="font-display text-xl font-bold text-slate-950">
                Daily Rings &amp; Certificates
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Keep daily streaks intact and earn 1–5 star certificates ranked by challenge accuracy.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative mt-6 flex h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-[#F7F8FA] p-5"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    'radial-gradient(#CBD5E1 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
              <div className="relative z-10 flex w-full max-w-sm flex-col gap-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3.5"
                        strokeDasharray="88"
                        strokeDashoffset="18"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div>
                      <div className="font-display text-xs font-bold text-slate-950">
                        Daily Goal Ring
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 tabular-nums">
                        2 / 2 modules today
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-600 tabular-nums">
                    <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    12d
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                  <div>
                    <div className="font-display text-xs font-bold text-slate-950">
                      C++20 Completion Certificate
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 tabular-nums">
                      96% average accuracy
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold text-amber-600 tabular-nums">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    5 / 5
                  </span>
                </div>
              </div>
            </div>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}
