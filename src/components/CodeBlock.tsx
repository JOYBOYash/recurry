import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { LanguageId } from '../types/curriculum';
import { tokenizeCode, type SyntaxTokenType } from '../utils/syntaxHighlight';

interface CodeBlockProps {
  code: string;
  language: LanguageId;
  title?: string;
  compact?: boolean;
}

const TOKEN_COLORS: Record<SyntaxTokenType, string> = {
  keyword: 'text-sky-400 font-medium',
  type: 'text-amber-300',
  string: 'text-emerald-300',
  number: 'text-orange-300',
  comment: 'text-neutral-500 italic',
  operator: 'text-neutral-300',
  function: 'text-indigo-300',
  plain: 'text-neutral-100',
};

const LANGUAGE_SHORT: Record<LanguageId, string> = {
  sql: 'SQL',
  java: 'Java',
  cpp: 'C++20',
  python: 'Python',
  javascript: 'JavaScript',
  ruby: 'Ruby',
};

export function CodeBlock({
  code,
  language,
  title,
  compact = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = tokenizeCode(code, language);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-[#141414]">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-[#1C1C1C] px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="font-mono font-medium text-neutral-200">
            {LANGUAGE_SHORT[language]}
          </span>
          {title && (
            <>
              <span aria-hidden="true">/</span>
              <span className="truncate">{title}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${title ?? LANGUAGE_SHORT[language]} code`}
          className="inline-flex min-h-8 items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-[#262626] hover:text-white focus-visible:outline-2 focus-visible:outline-blue-500 whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className={`overflow-x-auto ${compact ? 'p-3' : 'p-4'}`}>
        <pre className="font-mono text-[13px] leading-6 tabular-nums">
          <code>
            {lines.map((tokens, lineIdx) => (
              <div key={lineIdx} className="flex">
                {!compact && (
                  <span
                    aria-hidden="true"
                    className="mr-4 w-6 select-none text-right text-xs leading-6 text-neutral-600"
                  >
                    {lineIdx + 1}
                  </span>
                )}
                <span className="whitespace-pre">
                  {tokens.map((tok, tokIdx) => (
                    <span key={tokIdx} className={TOKEN_COLORS[tok.type]}>
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
  );
}
