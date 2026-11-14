import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FooterWithGithub } from '../components/FooterWithGithub';
import { HeroSection } from '../components/HeroSection';
import { HighlightText } from '../components/HighlightText';
import { FaqSection } from '../components/LandingFaqAndRepo';
import { LanguageOrbitSection } from '../components/LanguageOrbitSection';
import { ScrollReveal } from '../components/ScrollReveal';
import { SkillsShowcase } from '../components/SkillsShowcase';
import { WhoItsForSection } from '../components/WhoItsForSection';
import { useAppAuth } from '../context/AppAuthContext';
import type { LanguageId } from '../types/curriculum';

export function LandingPage() {
  const { user, profile } = useAppAuth();
  const [activeLanguage, setActiveLanguage] = useState<LanguageId>('python');

  const primaryDestination = user
    ? profile?.onboardingCompleted
      ? '/app/curriculums'
      : '/onboarding'
    : '/login';

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="shrink-0 whitespace-nowrap font-display text-2xl font-bold tracking-tight text-slate-950"
          >
            recurry
          </Link>

          <nav
            aria-label="Landing navigation"
            className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex"
          >
            <a href="#skills" className="whitespace-nowrap transition-colors hover:text-slate-950">
              Skills
            </a>
            <a href="#who" className="whitespace-nowrap transition-colors hover:text-slate-950">
              Who It&apos;s For
            </a>
            <a href="#how" className="whitespace-nowrap transition-colors hover:text-slate-950">
              Workflow
            </a>
            <a href="#faq" className="whitespace-nowrap transition-colors hover:text-slate-950">
              FAQ
            </a>
            <a href="#github" className="whitespace-nowrap transition-colors hover:text-slate-950">
              GitHub
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            {user ? (
              <Link
                to={primaryDestination}
                className="btn-juice inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border-b-2 border-blue-800 bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 sm:text-sm"
              >
                <span>Open App</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-juice inline-flex min-h-10 items-center whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-slate-400 sm:text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="btn-juice inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border-b-2 border-blue-800 bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 sm:text-sm"
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

      <main className="mx-auto max-w-6xl space-y-24 px-4 pt-12 pb-20 sm:px-6 lg:px-8 lg:pt-16 lg:pb-24">
        <SkillsShowcase
          primaryDestination={primaryDestination}
          activeLanguage={activeLanguage}
          onSelectLanguage={setActiveLanguage}
        />

        <WhoItsForSection />

        <LanguageOrbitSection
          primaryDestination={primaryDestination}
          onSelectLanguage={setActiveLanguage}
        />

        <FaqSection />
      </main>

      {/* Relay-inspired Halftone CTA Banner in recurry Cobalt Blue */}
      <section className="relative w-full overflow-hidden bg-[#1D4ED8]">
        {/* Architectural top center notch silhouette echoing Relay CTA */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        >
          <div className="h-4 w-48 rounded-b-2xl bg-[#F7F8FA] sm:h-5 sm:w-64" />
        </div>

        {/* Halftone cloud dot texture blended into our cobalt theme */}
        <img
          src="/assets/images/halftone-white.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-45 mix-blend-screen"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 75% at 50% 45%, rgba(29, 78, 216, 0.72) 0%, rgba(29, 78, 216, 0.42) 55%, rgba(29, 78, 216, 0.85) 100%)',
          }}
        />

        <ScrollReveal>
          <div className="relative z-10 mx-auto max-w-3xl space-y-5 px-4 pt-20 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-24 lg:px-8">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white text-balance sm:text-5xl">
              Ready to write{' '}
              <HighlightText variant="sky">cleaner code</HighlightText>?
            </h2>
            <p className="mx-auto max-w-lg text-sm text-blue-100 sm:text-base">
              Start one custom track per day for free across all six languages.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <Link
                to={primaryDestination}
                className="btn-juice inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border-b-2 border-blue-200 bg-white px-7 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 sm:w-auto"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#skills"
                className="btn-juice inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/40 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xs hover:bg-white/25 sm:w-auto"
              >
                <span>Compare Languages</span>
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <FooterWithGithub primaryDestination={primaryDestination} />
    </div>
  );
}
