import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  GitCompareArrows,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_MAP,
  REFERENCE_CATEGORIES,
} from '../data/languages';
import type {
  LanguageId,
  ReferenceCategory,
  ReferenceEntry,
} from '../types/curriculum';
import {
  filterReferenceEntries,
  validateReferenceTopicInput,
} from '../utils/curriculumLogic';
import { parseApiJson } from '../utils/apiResponse';
import { CodeBlock } from './CodeBlock';
import { InlineCodeText } from './InlineCodeText';
import { LanguageIcon } from './LanguageIcon';

interface ReferenceViewProps {
  entries: ReferenceEntry[];
  getIdToken: () => Promise<string>;
  onGenerated: (entry: ReferenceEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onStartTrackForLanguage: (language: LanguageId) => void;
}

const SUGGESTED_TOPICS: Array<{
  label: string;
  topic: string;
  category: ReferenceCategory;
}> = [
  {
    label: 'Nullability',
    topic: 'Nullability & Optional Fallbacks',
    category: 'Types & Variables',
  },
  {
    label: 'Map & Filter',
    topic: 'Filtering & Mapping Collections',
    category: 'Collections & Iteration',
  },
  {
    label: 'Error Handling',
    topic: 'Error Handling & Resource Cleanup',
    category: 'Errors & Safety',
  },
  {
    label: 'Closures',
    topic: 'Closures & Anonymous Functions',
    category: 'Functions & Closures',
  },
];

export function ReferenceView({
  entries,
  getIdToken,
  onGenerated,
  onDeleteEntry,
  onStartTrackForLanguage,
}: ReferenceViewProps) {
  const [topicInput, setTopicInput] = useState('');
  const [genCategory, setGenCategory] =
    useState<ReferenceCategory>('Collections & Iteration');
  const [genLanguages, setGenLanguages] = useState<LanguageId[]>([
    'sql',
    'java',
    'cpp',
    'python',
    'javascript',
    'ruby',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ReferenceCategory | 'All'>(
    'All',
  );

  function toggleLanguage(id: LanguageId) {
    setGenLanguages((prev) => {
      if (prev.includes(id)) {
        return prev.length === 1 ? prev : prev.filter((l) => l !== id);
      }
      return [...prev, id];
    });
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setGenError(null);

    const validation = validateReferenceTopicInput({
      topic: topicInput,
      category: genCategory,
      languages: genLanguages,
    });
    if (!validation.valid) {
      setGenError(validation.error ?? 'Enter a syntax concept.');
      return;
    }

    setIsGenerating(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/reference/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: topicInput.trim(),
          category: genCategory,
          languages: genLanguages,
        }),
      });
      const parsed = await parseApiJson<{
        entry?: ReferenceEntry;
        error?: string;
      }>(response, 'Failed to generate comparison.');
      if (!parsed.ok || !parsed.data?.entry) {
        setGenError(parsed.error ?? 'Failed to generate comparison.');
        return;
      }
      onGenerated(parsed.data.entry);
      setTopicInput('');
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : 'Network error generating reference.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const filtered = filterReferenceEntries(
    entries,
    searchQuery,
    filterCategory,
    genLanguages,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
          Syntax Reference
        </h1>
        <p className="text-sm text-slate-600 dark:text-neutral-400">
          Side-by-side idioms across SQL, Java, C++, Python, JavaScript, and Ruby.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818]">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-12">
            <div className="sm:col-span-7">
              <label
                htmlFor="reference-topic-input"
                className="block text-xs font-semibold text-slate-600 dark:text-neutral-300"
              >
                Concept
              </label>
              <input
                id="reference-topic-input"
                type="text"
                value={topicInput}
                onChange={(e) => {
                  setTopicInput(e.target.value);
                  if (genError) setGenError(null);
                }}
                placeholder="Pattern matching, window functions, smart pointers..."
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-5">
              <label
                htmlFor="reference-category-select"
                className="block text-xs font-semibold text-slate-600 dark:text-neutral-300"
              >
                Category
              </label>
              <select
                id="reference-category-select"
                value={genCategory}
                onChange={(e) =>
                  setGenCategory(e.target.value as ReferenceCategory)
                }
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:focus:border-blue-500"
              >
                {REFERENCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = genLanguages.includes(lang.id);
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => toggleLanguage(lang.id)}
                  aria-pressed={selected}
                  className={`btn-juice group inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold dark:bg-[#202020] ${
                    selected
                      ? 'border-blue-600 text-blue-700 dark:border-blue-500 dark:text-blue-400'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  <LanguageIcon language={lang.id} className="h-4 w-4" />
                  <span>{lang.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-2">
              {SUGGESTED_TOPICS.map((item) => (
                <button
                  key={item.topic}
                  type="button"
                  onClick={() => {
                    setTopicInput(item.topic);
                    setGenCategory(item.category);
                    setGenError(null);
                  }}
                  className="btn-juice min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="btn-juice inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
                  <span>Compare</span>
                </>
              )}
            </button>
          </div>

          {genError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-800/80 dark:bg-[#202020] dark:text-red-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              <span>{genError}</span>
            </div>
          )}
        </form>
      </section>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            No saved comparisons
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Choose a concept above to compare syntax across languages.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#181818] sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <label htmlFor="reference-search-input" className="sr-only">
                Filter saved comparisons
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
                aria-hidden="true"
              />
              <input
                id="reference-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter comparisons..."
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
              />
            </div>

            <select
              aria-label="Filter by category"
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value as ReferenceCategory | 'All')
              }
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:focus:border-blue-500"
            >
              <option value="All">All Categories</option>
              {REFERENCE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-neutral-800 dark:bg-[#181818] dark:text-neutral-400">
              No matches found.
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((entry) => {
                const entryLangs = SUPPORTED_LANGUAGES.filter(
                  (l) => Boolean(entry.snippets[l.id]) && genLanguages.includes(l.id),
                );
                return (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818]"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-neutral-800">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                          {entry.category}
                        </p>
                        <h2 className="mt-1 font-display text-xl font-bold text-slate-950 dark:text-white">
                          {entry.concept}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
                          {entry.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label={`Remove reference entry ${entry.concept}`}
                        className="btn-juice inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-300 dark:hover:border-red-800 dark:hover:bg-[#262626] dark:hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      {entryLangs.map((lang) => {
                        const snippet = entry.snippets[lang.id]!;
                        return (
                          <div key={lang.id} className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-neutral-200">
                                <LanguageIcon
                                  language={lang.id}
                                  className="h-4 w-4"
                                />
                                <span>
                                  {lang.name} · {LANGUAGE_MAP[lang.id].standardLabel}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => onStartTrackForLanguage(lang.id)}
                                className="group inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <span>Track</span>
                                <ArrowRight
                                  className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                            <CodeBlock
                              code={snippet.syntax}
                              language={lang.id}
                              compact
                            />
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-neutral-300">
                              <InlineCodeText text={snippet.usage} />
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
