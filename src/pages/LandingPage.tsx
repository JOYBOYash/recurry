import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { FooterWithGithub } from '../components/FooterWithGithub';
import { GitHubStarDisplay } from '../components/GitHubStarDisplay';
import { HeroSection } from '../components/HeroSection';
import { HighlightText } from '../components/HighlightText';
import { FaqSection } from '../components/LandingFaqAndRepo';
import { LanguageOrbitSection } from '../components/LanguageOrbitSection';
import { ScrollReveal } from '../components/ScrollReveal';
import { SkillsShowcase } from '../components/SkillsShowcase';
import { WhoItsForSection } from '../components/WhoItsForSection';
import { useAppAuth } from '../context/AppAuthContext';
import type { LanguageId } from '../types/curriculum';

const NAV_LINKS = [
  { href: '#skills', label: 'Skills' },
  { href: '#who', label: "Who It's For" },
  { href: '#how', label: 'Workflow' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingPage() {
  const { user, profile } = useAppAuth();
  const [activeLanguage, setActiveLanguage] = useState<LanguageId>('python');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 72);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setMobileNavOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  const primaryDestination = user
    ? profile?.onboardingCompleted
      ? '/app/curriculums'
      : '/onboarding'
    : '/login';

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F7F8FA] text-[#0F172A]">
      <header
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-40 flex flex-col transition-all duration-300 ease-out ${
          isScrolled
            ? 'items-end px-4 pt-3 sm:px-6 md:items-center'
            : 'items-center px-0 pt-0'
        }`}
      >
        <div
          className={`flex items-center transition-all duration-300 ease-out ${
            isScrolled
              ? 'h-11 w-auto justify-end bg-transparent p-0 md:h-13 md:w-full md:max-w-[700px] md:justify-between md:gap-5 md:rounded-full md:border md:border-slate-200/90 md:bg-white/88 md:px-4 md:shadow-[0_14px_34px_-10px_rgba(15,23,42,0.18)] md:backdrop-blur-xl'
              : 'h-16 w-full justify-between gap-6 rounded-none border-b border-white/20 bg-blue-950/15 px-4 backdrop-blur-md sm:px-8 lg:px-12'
          }`}
        >
          <Link
            to="/"
            onClick={() => setMobileNavOpen(false)}
            className={`shrink-0 items-center whitespace-nowrap transition-opacity hover:opacity-85 ${
              isScrolled ? 'hidden md:flex' : 'flex'
            }`}
            aria-label="recurry home"
          >
            <BrandLogo
              size={isScrolled ? 'sm' : 'md'}
              tone={isScrolled ? 'brand' : 'light'}
              collapseText={isScrolled}
            />
          </Link>

          <nav
            aria-label="Landing navigation"
            className={`hidden items-center font-semibold transition-all duration-300 md:flex ${
              isScrolled
                ? 'gap-5 text-[13px] text-slate-600'
                : 'gap-7 text-sm text-white/90'
            }`}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap shrink-0 transition-colors ${
                  isScrolled ? 'hover:text-slate-950' : 'hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions + Clean GitHub Repo Stars */}
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <GitHubStarDisplay
              repo="JOYBOYash/recurry"
              tone={isScrolled ? 'dark' : 'light'}
            />

            {user ? (
              <Link
                to={primaryDestination}
                className={`btn-juice inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 font-bold transition-all duration-300 ${
                  isScrolled
                    ? 'min-h-9 rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-700'
                    : 'min-h-10 rounded-xl border-b-2 border-blue-200 bg-white px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 sm:text-sm'
                }`}
              >
                <span>Open App</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`btn-juice inline-flex items-center whitespace-nowrap shrink-0 font-semibold transition-all duration-300 ${
                    isScrolled
                      ? 'min-h-9 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs text-slate-800 hover:border-slate-300'
                      : 'min-h-10 rounded-xl border border-white/35 bg-white/15 px-4 py-2 text-xs text-white backdrop-blur-xs hover:bg-white/25 sm:text-sm'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className={`btn-juice inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 font-bold transition-all duration-300 ${
                    isScrolled
                      ? 'min-h-9 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs text-white hover:bg-blue-700'
                      : 'min-h-10 rounded-xl border-b-2 border-blue-200 bg-white px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 sm:text-sm'
                  }`}
                >
                  <span>Start Free</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu Trigger */}
          <button
            type="button"
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className={`inline-flex shrink-0 items-center justify-center transition-all duration-200 md:hidden ${
              isScrolled
                ? 'h-11 w-11 rounded-full border border-slate-200/90 bg-white/92 text-slate-800 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.22)] backdrop-blur-xl hover:bg-white'
                : 'h-9 w-9 rounded-xl border border-white/30 bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {mobileNavOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Hamburger Drawer Panel with Nav Links & CTAs */}
        {mobileNavOpen && (
          <div
            id="mobile-nav-drawer"
            role="region"
            aria-label="Mobile menu"
            className={`animate-view-enter mt-2 w-[calc(100vw-2rem)] max-w-sm self-center rounded-2xl border p-4 shadow-[0_22px_48px_-14px_rgba(15,23,42,0.28)] backdrop-blur-xl md:hidden ${
              isScrolled
                ? 'border-slate-200/90 bg-white/95 text-slate-900'
                : 'border-white/30 bg-white/95 text-slate-900'
            }`}
          >
            <nav aria-label="Mobile landing navigation" className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  {link.label}
                </a>
              ))}
              <GitHubStarDisplay
                repo="JOYBOYash/recurry"
                variant="drawer"
                onNavigate={() => setMobileNavOpen(false)}
              />
            </nav>

            <div className="mt-3 flex flex-col gap-2.5 border-t border-slate-200 pt-3.5">
              {user ? (
                <Link
                  to={primaryDestination}
                  onClick={() => setMobileNavOpen(false)}
                  className="btn-juice inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <span>Open App</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="btn-juice inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-slate-300"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="btn-juice inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    <span>Start Free</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
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

      {/* Container-width Halftone CTA Banner with Seamless Outline-Free Top Notch */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-[#1D4ED8] shadow-[0_24px_56px_-20px_rgba(29,78,216,0.35)]">
          {/* Seamless concave top-center cutout descending from #F7F8FA with centered icon only */}
          <div className="relative z-20 -mt-px flex justify-center">
            <div className="relative flex h-11 w-[124px] items-center justify-center">
              <svg
                aria-hidden="true"
                viewBox="0 0 124 44"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full text-[#F7F8FA]"
              >
                <path
                  d="M0 0 H124 C106 0 104 44 86 44 H38 C20 44 18 0 0 0 Z"
                  fill="currentColor"
                />
              </svg>
              <div className="relative z-10 -mt-1 flex items-center justify-center">
                <BrandLogo size="md" showText={false} tone="brand" />
              </div>
            </div>
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
            <div className="relative z-10 mx-auto max-w-3xl space-y-5 px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-14 sm:pb-20 lg:px-8">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white text-balance sm:text-5xl">
                Ready to write{' '}
                <HighlightText variant="sky">cleaner code</HighlightText>?
              </h2>
              <p className="mx-auto max-w-lg text-sm text-blue-100 sm:text-base">
                Start one custom track per day for free across all six languages.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  to={primaryDestination}
                  className="btn-juice inline-flex min-h-12 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl border-b-2 border-blue-200 bg-white px-7 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#skills"
                  className="btn-juice inline-flex min-h-12 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/40 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xs hover:bg-white/25"
                >
                  <span>Compare Languages</span>
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <FooterWithGithub primaryDestination={primaryDestination} />
    </div>
  );
}
