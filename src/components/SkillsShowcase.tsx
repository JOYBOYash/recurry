import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageIcon } from './LanguageIcon';
import { ScrollReveal } from './ScrollReveal';
import { SUPPORTED_LANGUAGES, LANGUAGE_MAP } from '../data/languages';
import { getLanguageShowcase } from '../data/landingContent';
import type { LanguageId } from '../types/curriculum';
import { tokenizeCode, type SyntaxTokenType } from '../utils/syntaxHighlight';

interface SkillsShowcaseProps {
  primaryDestination: string;
  activeLanguage?: LanguageId;
  onSelectLanguage?: (lang: LanguageId) => void;
}

const TOKEN_COLORS_LIGHT: Record<SyntaxTokenType, string> = {
  keyword: 'text-blue-700 font-semibold',
  type: 'text-amber-700',
  string: 'text-emerald-700',
  number: 'text-orange-700',
  comment: 'text-slate-400 italic',
  operator: 'text-slate-500',
  function: 'text-indigo-700',
  plain: 'text-slate-900',
};

export function SkillsShowcase({
  primaryDestination,
  activeLanguage: controlledLang,
  onSelectLanguage,
}: SkillsShowcaseProps) {
  const [internalLang, setInternalLang] = useState<LanguageId>('python');
  const [copiedLang, setCopiedLang] = useState<LanguageId | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const activeLanguage = controlledLang ?? internalLang;
  const setActiveLanguage = onSelectLanguage ?? setInternalLang;

  const meta = LANGUAGE_MAP[activeLanguage];
  const showcase = getLanguageShowcase(activeLanguage);
  const lines = tokenizeCode(showcase.code, activeLanguage);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(showcase.code);
      setCopiedLang(activeLanguage);
      window.setTimeout(() => {
        setCopiedLang((prev) => (prev === activeLanguage ? null : prev));
      }, 1600);
    } catch {
      setCopiedLang(null);
    }
  }

  return (
    <section id="skills" className="space-y-8 scroll-mt-24">
      <ScrollReveal>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 text-balance sm:text-4xl">
            Compare real syntax across six languages
          </h2>
          <p className="mt-2.5 text-sm text-slate-600 sm:text-base">
            Pick any tab below to see how each language solves the same array problem.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={80} variant="scale">
        {/* Atmospheric showcase frame with continuous border wrapping smoothly into the top-center notch */}
        <div className="relative rounded-3xl border border-blue-300/85 px-3.5 pt-0 pb-5 shadow-[0_22px_52px_-24px_rgba(29,78,216,0.28)] sm:px-8 sm:pb-10 lg:px-12 lg:pb-12">
          {/* Clipped atmospheric sky-cobalt background and inner highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[23px] bg-gradient-to-br from-[#BFDBFE] via-[#DBEAFE] to-[#93C5FD]/90 ring-1 ring-inset ring-white/55"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(65% 80% at 12% 12%, rgba(37, 99, 235, 0.22), transparent 62%), radial-gradient(62% 78% at 88% 88%, rgba(37, 99, 235, 0.24), transparent 62%)',
              }}
            />
          </div>

          {/* Flush top-center cutout notch descending seamlessly from the page background */}
          <div className="relative z-30 -mt-[1px] flex justify-center">
            {/* Desktop & tablet inline tab notch */}
            <div className="hidden max-w-full items-stretch md:flex">
              <svg
                aria-hidden="true"
                viewBox="0 0 32 50"
                className="h-[50px] w-8 shrink-0 text-blue-300/85"
              >
                <path
                  d="M 0 0 H 32 V 49.5 C 18 49.5 16 40 16 25 C 16 10 14 0.5 0 0.5 Z"
                  fill="#F7F8FA"
                />
                <path
                  d="M 0 0.5 C 14 0.5 16 10 16 25 C 16 40 18 49.5 32 49.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>

              <div
                role="tablist"
                aria-label="Supported languages showcase"
                className="inline-flex h-[50px] max-w-full items-center justify-center gap-1 border-b border-blue-300/85 bg-[#F7F8FA] px-2 pt-0.5 pb-2"
              >
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const selected = activeLanguage === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="skills-code-panel"
                      onClick={() => setActiveLanguage(lang.id)}
                      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all ${
                        selected
                          ? 'border border-blue-200/90 bg-white text-blue-700 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.18)]'
                          : 'border border-transparent text-slate-600 hover:bg-white/75 hover:text-slate-950'
                      }`}
                    >
                      <LanguageIcon language={lang.id} className="h-4 w-4" />
                      <span>{lang.name}</span>
                    </button>
                  );
                })}
              </div>

              <svg
                aria-hidden="true"
                viewBox="0 0 32 50"
                className="h-[50px] w-8 shrink-0 text-blue-300/85"
              >
                <path
                  d="M 0 0 H 32 V 0.5 C 18 0.5 16 10 16 25 C 16 40 14 49.5 0 49.5 Z"
                  fill="#F7F8FA"
                />
                <path
                  d="M 0 49.5 C 14 49.5 16 40 16 25 C 16 10 18 0.5 32 0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Mobile notched touch-dropdown matching desktop notch silhouette */}
            <div ref={dropdownRef} className="relative flex flex-col items-center md:hidden">
              <div className="flex items-stretch">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 28 46"
                  className="h-[46px] w-7 shrink-0 text-blue-300/85"
                >
                  <path
                    d="M 0 0 H 28 V 45.5 C 16 45.5 14 37 14 23 C 14 9 12 0.5 0 0.5 Z"
                    fill="#F7F8FA"
                  />
                  <path
                    d="M 0 0.5 C 12 0.5 14 9 14 23 C 14 37 16 45.5 28 45.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>

                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={mobileMenuOpen}
                  aria-controls="skills-mobile-lang-menu"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="inline-flex h-[46px] items-center gap-2.5 border-b border-blue-300/85 bg-[#F7F8FA] px-3 pt-0.5 pb-1.5 text-sm font-semibold text-blue-700 transition-colors active:scale-[0.99]"
                >
                  <LanguageIcon language={activeLanguage} className="h-4 w-4 shrink-0" />
                  <span>{meta.name}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 text-blue-600 transition-transform duration-200 ${
                      mobileMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <svg
                  aria-hidden="true"
                  viewBox="0 0 28 46"
                  className="h-[46px] w-7 shrink-0 text-blue-300/85"
                >
                  <path
                    d="M 0 0 H 28 V 0.5 C 16 0.5 14 9 14 23 C 14 37 12 45.5 0 45.5 Z"
                    fill="#F7F8FA"
                  />
                  <path
                    d="M 0 45.5 C 12 45.5 14 37 14 23 C 14 9 16 0.5 28 0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </div>

              {mobileMenuOpen && (
                <div
                  id="skills-mobile-lang-menu"
                  role="listbox"
                  aria-label="Choose programming language"
                  className="animate-view-enter absolute top-full mt-2 w-60 rounded-2xl border border-blue-200/85 bg-white/95 p-1.5 shadow-[0_20px_44px_-12px_rgba(29,78,216,0.3)] backdrop-blur-xl"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const selected = activeLanguage === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setActiveLanguage(lang.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`flex min-h-10 w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                          selected
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <LanguageIcon language={lang.id} className="h-4 w-4 shrink-0" />
                          <span>{lang.name}</span>
                        </span>
                        {selected && (
                          <Check className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Floating crisp white light-theme code card inside the frame */}
          <div
            id="skills-code-panel"
            role="tabpanel"
            aria-label={`${meta.name} showcase`}
            className="relative z-10 mx-auto mt-5 max-w-4xl min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.14)] sm:mt-8"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/90 px-3.5 py-2.5 sm:px-5 sm:py-3">
              <div className="flex min-w-0 items-center gap-1.5 text-xs sm:gap-2.5">
                <span className="truncate font-mono font-semibold text-slate-900">
                  {showcase.filename}
                </span>
                <span className="shrink-0 text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="truncate font-mono text-slate-500">
                  {meta.standardLabel}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  aria-label={`Copy ${meta.name} snippet`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 sm:w-auto sm:gap-1.5 sm:px-2.5"
                >
                  {copiedLang === activeLanguage ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>

                <Link
                  to={primaryDestination}
                  aria-label={`Start ${meta.name}`}
                  className="btn-juice inline-flex h-8 w-8 items-center justify-center whitespace-nowrap rounded-lg border-b-2 border-blue-800 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 sm:w-auto sm:gap-1.5 sm:px-3"
                >
                  <span className="hidden sm:inline">Start {meta.name}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div
              key={activeLanguage}
              className="animate-view-enter h-[336px] overflow-x-auto overflow-y-auto bg-white px-4 py-5 sm:px-6 sm:py-6"
            >
              <pre className="font-mono text-[13px] leading-6 tabular-nums">
                <code>
                  {lines.map((tokens, lineIdx) => (
                    <div key={lineIdx} className="flex">
                      <span
                        aria-hidden="true"
                        className="mr-4 w-5 select-none text-right text-xs leading-6 text-slate-400"
                      >
                        {lineIdx + 1}
                      </span>
                      <span className="whitespace-pre">
                        {tokens.map((tok, tokIdx) => (
                          <span key={tokIdx} className={TOKEN_COLORS_LIGHT[tok.type]}>
                            {tok.text}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
