import { useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageIcon } from './LanguageIcon';
import { SUPPORTED_LANGUAGES, LANGUAGE_MAP } from '../data/languages';
import { getLanguageShowcase } from '../data/landingContent';
import type { LanguageId } from '../types/curriculum';
import { tokenizeCode, type SyntaxTokenType } from '../utils/syntaxHighlight';

interface SkillsShowcaseProps {
  primaryDestination: string;
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

export function SkillsShowcase({ primaryDestination }: SkillsShowcaseProps) {
  const [activeLanguage, setActiveLanguage] = useState<LanguageId>('python');
  const [copiedLang, setCopiedLang] = useState<LanguageId | null>(null);

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
      <div className="mx-auto max-w-2xl text-center">
        <span className="font-mono text-xs font-semibold text-blue-700">
          SKILLS · 6 LANGUAGES
        </span>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 text-balance sm:text-4xl">
          Practice every idiom across six languages
        </h2>
        <p className="mt-2.5 text-sm text-slate-600 sm:text-base">
          Switch languages below to compare array syntax across all six languages.
        </p>
      </div>

      <div className="relative min-w-0">
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Supported languages showcase"
            className="relative z-20 inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-t-2xl border border-b-0 border-slate-200 bg-white px-2.5 pt-2.5 pb-2"
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
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    selected
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <LanguageIcon language={lang.id} className="h-4 w-4" />
                  <span>{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-[#F7F8FA] p-4 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 75% at 15% 15%, rgba(37, 99, 235, 0.09), transparent 65%), radial-gradient(55% 75% at 85% 85%, rgba(14, 165, 233, 0.08), transparent 65%)',
            }}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 1200 440"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
          >
            <defs>
              <pattern
                id="skills-light-grid"
                width="44"
                height="44"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 44 0 L 0 0 0 44"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="1200" height="440" fill="url(#skills-light-grid)" />
          </svg>

          <div
            id="skills-code-panel"
            role="tabpanel"
            aria-label={`${meta.name} showcase`}
            className="relative z-10 mx-auto max-w-4xl min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
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
                  className="btn-juice inline-flex min-h-8 items-center gap-1.5 rounded-lg border-b-2 border-blue-800 bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
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
      </div>
    </section>
  );
}
