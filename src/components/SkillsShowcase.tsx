import { useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
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

  const activeLanguage = controlledLang ?? internalLang;
  const setActiveLanguage = onSelectLanguage ?? setInternalLang;

  const meta = LANGUAGE_MAP[activeLanguage];
  const showcase = getLanguageShowcase(activeLanguage);
  const lines = tokenizeCode(showcase.code, activeLanguage);

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
    <section id="skills" className="space-y-8 scroll-mt-20">
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

      <ScrollReveal delayMs={80}>
        {/* Atmospheric showcase frame with flush top-center inverted notch matching reference format */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#DBEAFE] via-[#EFF6FF] to-[#BAE6FD]/65 px-4 pt-0 pb-6 sm:px-8 sm:pb-10 lg:px-12 lg:pb-12">
          {/* Soft atmospheric sky-cobalt glow in recurry theme */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(65% 80% at 15% 10%, rgba(37, 99, 235, 0.22), transparent 60%), radial-gradient(60% 75% at 88% 92%, rgba(29, 78, 216, 0.2), transparent 62%)',
            }}
          />

          {/* Flush top-center cutout notch descending into the frame */}
          <div className="relative z-20 flex justify-center">
            <div className="relative flex max-w-full items-start">
              {/* Left concave fillet bridging outer frame top edge into notch */}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="hidden h-4 w-4 shrink-0 text-[#F7F8FA] sm:block"
              >
                <path d="M0 0 H16 V16 A16 16 0 0 0 0 0 Z" fill="currentColor" />
              </svg>

              <div
                role="tablist"
                aria-label="Supported languages showcase"
                className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-b-2xl bg-[#F7F8FA] px-2.5 pt-1.5 pb-2.5 sm:px-3.5"
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
                      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all sm:px-3.5 sm:text-sm ${
                        selected
                          ? 'border border-slate-200/90 bg-white text-blue-700 shadow-xs'
                          : 'border border-transparent text-slate-600 hover:bg-white/60 hover:text-slate-950'
                      }`}
                    >
                      <LanguageIcon language={lang.id} className="h-4 w-4" />
                      <span>{lang.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right concave fillet bridging notch back to outer frame top edge */}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="hidden h-4 w-4 shrink-0 text-[#F7F8FA] sm:block"
              >
                <path d="M16 0 H0 V16 A16 16 0 0 1 16 0 Z" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Floating crisp white light-theme code card inside the frame */}
          <div
            id="skills-code-panel"
            role="tabpanel"
            aria-label={`${meta.name} showcase`}
            className="relative z-10 mx-auto mt-6 max-w-4xl min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.14)] sm:mt-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-mono font-semibold text-slate-900">
                  {showcase.filename}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-slate-500">
                  {meta.standardLabel}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  aria-label={`Copy ${meta.name} snippet`}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                >
                  {copiedLang === activeLanguage ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <Link
                  to={primaryDestination}
                  className="btn-juice inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border-b-2 border-blue-800 bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <span>Start {meta.name}</span>
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
