import { useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Code2,
  Flame,
  Layers,
  SlidersHorizontal,
  Terminal,
  Users,
} from 'lucide-react';
import { FaGithub } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { LanguageIcon } from '../components/LanguageIcon';
import { useAppAuth } from '../context/AppAuthContext';
import { BEGINNING_FIVE_LANGUAGES } from '../data/languages';

const AUDIENCE_CARDS = [
  {
    title: 'Beginners & Switchers',
    summary: 'Start from first principles or bridge idioms from a language you already know.',
    icon: Users,
  },
  {
    title: 'Working Engineers',
    summary: 'Close syntax gaps across SQL, Java, C++, Python, and JavaScript without textbook fluff.',
    icon: Code2,
  },
  {
    title: 'Interview & Systems Prep',
    summary: 'Drill problem-solving syntax with strict AI code reviews and accuracy tracking.',
    icon: Terminal,
  },
];

const WORKFLOW_STEPS = [
  {
    title: 'Calibrate',
    detail: 'Pick your language, skill rank (Noob to Legend), daily goal, and focus.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Practice',
    detail: 'Read concise grammar rules, solve code challenges, and keep your daily streak.',
    icon: Terminal,
  },
  {
    title: 'Certify',
    detail: 'Complete every module to earn a 1–5 star certificate ranked by your accuracy.',
    icon: Award,
  },
];

export function LandingPage() {
  const { user, profile } = useAppAuth();
  const [imgFailed, setImgFailed] = useState(false);

  const primaryDestination = user
    ? profile?.onboardingCompleted
      ? '/app/curriculums'
      : '/onboarding'
    : '/login';

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="font-display text-2xl font-bold tracking-tight text-slate-950"
          >
            recurry
          </Link>

          <nav
            aria-label="Landing navigation"
            className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex"
          >
            <a href="#skills" className="hover:text-slate-950">
              Skills
            </a>
            <a href="#who" className="hover:text-slate-950">
              Who It&apos;s For
            </a>
            <a href="#how" className="hover:text-slate-950">
              How It Works
            </a>
            <a href="#credits" className="hover:text-slate-950">
              Credits
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Link
                to={primaryDestination}
                className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 sm:text-sm"
              >
                <span>Open App</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-juice inline-flex min-h-10 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-slate-400 sm:text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 sm:text-sm"
                >
                  <span>Start Free</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <section className="grid items-center gap-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-800">
              <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span>1 free custom curriculum daily · Zero subscriptions</span>
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-950 text-balance sm:text-5xl">
              Complete language syntax, tailored to your level.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-slate-600">
              Adaptive syntax and problem-solving tracks across SQL, Java, C++, Python, and JavaScript with instant code evaluation and star-ranked certificates.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to={primaryDestination}
                className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>{user ? 'Go to Dashboard' : 'Build Your Curriculum'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#skills"
                className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-950"
              >
                <span>View 5 Languages</span>
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:col-span-5">
            {!imgFailed ? (
              <img
                src="/placeholder-monograph.svg"
                alt="Architectural syntax curriculum wireframe placeholder"
                onError={() => setImgFailed(true)}
                className="h-64 w-full object-cover lg:h-72"
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center p-6 text-center lg:h-72">
                <span className="font-display text-lg font-bold text-slate-900">
                  Beginning Five
                </span>
                <span className="mt-1 font-mono text-xs text-slate-600">
                  SQL · Java · C++ · Python · JavaScript
                </span>
              </div>
            )}
          </div>
        </section>

        <section id="skills" className="space-y-6 scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-semibold text-blue-700">
                SKILLS
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                The Beginning Five
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Noob · Intern · Expert · Master · Legend
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BEGINNING_FIVE_LANGUAGES.map((lang) => (
              <div
                key={lang.id}
                className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-500"
              >
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <LanguageIcon language={lang.id} className="h-7 w-7" />
                  <span className="font-mono text-[11px] font-semibold text-slate-500">
                    {lang.paradigm}
                  </span>
                </div>
                <div className="relative z-10">
                  <h3 className="font-display text-lg font-bold text-slate-950">
                    {lang.name}
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    {lang.standardLabel}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {lang.summary}
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                  {lang.keyConstructs.slice(0, 3).map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <Link
              to={primaryDestination}
              className="btn-juice group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white p-5 transition-colors hover:border-blue-600"
            >
              <div className="relative z-10 flex items-start justify-between gap-3">
                <Code2 className="h-7 w-7 text-blue-600" aria-hidden="true" />
                <span className="font-mono text-[11px] font-semibold text-blue-700">
                  Cross-Language
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="font-display text-lg font-bold text-slate-950">
                  Side-by-Side Reference
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Compare syntax forms, closures, error handling, and queries across all five languages.
                </p>
              </div>
              <div className="relative z-10 inline-flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-bold text-blue-700">
                <span>Start practicing</span>
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </div>
        </section>

        <section id="who" className="space-y-6 scroll-mt-20">
          <div>
            <span className="font-mono text-xs font-semibold text-blue-700">
              WHO IT&apos;S FOR
            </span>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl">
              Built for deliberate practice
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {AUDIENCE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-3 -bottom-3 h-24 w-24 -rotate-12 text-slate-400 opacity-[0.1]"
                  />
                  <div className="relative z-10">
                    <Icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
                      {card.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {card.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="how" className="space-y-6 scroll-mt-20">
          <div>
            <span className="font-mono text-xs font-semibold text-blue-700">
              HOW IT WORKS
            </span>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl">
              Three steps from onboarding to certificate
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {WORKFLOW_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-3 -bottom-3 h-24 w-24 -rotate-12 text-blue-600 opacity-[0.09]"
                  />
                  <div className="relative z-10">
                    <Icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    <h3 className="mt-4 font-display text-xl font-bold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:p-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700">
              <Award className="h-4 w-4" aria-hidden="true" />
              <span>DAILY GOAL RING · STREAKS · 1–5 STAR CERTIFICATES</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
              Ready to write cleaner syntax?
            </h2>
            <p className="text-sm text-slate-600">
              Generate one tailored curriculum per day at zero cost.
            </p>
          </div>
          <Link
            to={primaryDestination}
            className="btn-juice inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section
          id="credits"
          className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-12 sm:p-8 scroll-mt-20"
        >
          <div className="space-y-3 sm:col-span-7">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-slate-700">
              <FaGithub className="h-4 w-4 text-slate-900" aria-hidden="true" />
              <span>OPEN SOURCE REPOSITORY</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-950">
              recurry — Open Curriculum Architecture
            </h2>
            <p className="text-sm text-slate-600">
              Inspect the rules, curriculum generator, syntax highlighter, and progression scoring utilities on GitHub.
            </p>
            <a
              href="https://github.com/recurry-org/recurry"
              target="_blank"
              rel="noreferrer"
              className="btn-juice inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 hover:border-slate-900"
            >
              <FaGithub className="h-4 w-4" aria-hidden="true" />
              <span>github.com/recurry-org/recurry</span>
            </a>
          </div>

          <div className="space-y-2.5 border-t border-slate-100 pt-4 sm:col-span-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <span className="font-mono text-xs font-semibold text-slate-500">
              CREDITS
            </span>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>Curriculum Engine — Gemini AI + Express</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>Auth &amp; Persistence — Firebase Auth &amp; Firestore</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>Icons — Lucide &amp; React Icons</span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8">
          <span className="font-display font-bold text-slate-900">recurry</span>
          <span>SQL · Java · C++ · Python · JavaScript</span>
        </div>
      </footer>
    </div>
  );
}
