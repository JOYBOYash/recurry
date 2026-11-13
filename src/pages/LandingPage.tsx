import {
  ArrowRight,
  Award,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FooterWithGithub } from '../components/FooterWithGithub';
import { HeroSection } from '../components/HeroSection';
import { FaqSection } from '../components/LandingFaqAndRepo';
import { SkillsShowcase } from '../components/SkillsShowcase';
import { WhoItsForSection } from '../components/WhoItsForSection';
import { useAppAuth } from '../context/AppAuthContext';

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
            <a href="#faq" className="hover:text-slate-950">
              FAQ
            </a>
            <a href="#github" className="hover:text-slate-950">
              GitHub
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

      <HeroSection
        isAuthenticated={Boolean(user)}
        primaryDestination={primaryDestination}
      />

      <main className="mx-auto max-w-6xl space-y-24 px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16 lg:pb-20">
        <SkillsShowcase primaryDestination={primaryDestination} />

        <WhoItsForSection />

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
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 pb-8"
                >
                  <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-3 -bottom-3 h-24 w-24 -rotate-12 text-blue-600 opacity-[0.16]"
                  />
                  <div className="relative z-10 pr-8">
                    <h3 className="font-display text-xl font-bold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <FaqSection />
      </main>

      {/* Full-width CTA band preceding merged GitHub + Footer */}
      <section className="w-full bg-blue-700">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6 lg:px-8 lg:py-16">
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to write cleaner code?
            </h2>
            <p className="text-sm text-blue-100 sm:text-base">
              Generate one tailored curriculum per day at zero cost.
            </p>
          </div>
          <Link
            to={primaryDestination}
            className="btn-juice inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-b-2 border-blue-200 bg-white px-6 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <FooterWithGithub primaryDestination={primaryDestination} />
    </div>
  );
}
