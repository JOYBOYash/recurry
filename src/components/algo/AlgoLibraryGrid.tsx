import { ArrowRight, CheckCircle2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LANGUAGE_MAP } from '../../data/languages';
import type {
  AlgoConceptId,
  AlgoDifficulty,
  AlgoProblemBlueprint,
  AlgoUserProgress,
} from '../../types/algo';
import {
  ALGO_CONCEPTS,
  ALGO_CONCEPT_LABELS,
  computeAlgoChecklistProgress,
  filterAlgoProblems,
} from '../../utils/algoLogic';

interface AlgoLibraryGridProps {
  problems: AlgoProblemBlueprint[];
  progressMap: Record<string, AlgoUserProgress>;
  loading: boolean;
  onSelectProblem: (problem: AlgoProblemBlueprint) => void;
}

const DIFFICULTY_LABEL: Record<AlgoDifficulty, string> = {
  foundation: 'Foundation',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function AlgoLibraryGrid({
  problems,
  progressMap,
  loading,
  onSelectProblem,
}: AlgoLibraryGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conceptFilter, setConceptFilter] = useState<AlgoConceptId | 'all'>('all');

  const filtered = useMemo(
    () => filterAlgoProblems(problems, searchQuery, conceptFilter),
    [problems, searchQuery, conceptFilter],
  );

  const conceptOptions = useMemo(
    () => ALGO_CONCEPTS.filter((item) => item.id !== 'auto'),
    [],
  );

  return (
    <section aria-label="Saved problem library" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Saved Problems
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
            {filtered.length}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problems..."
              aria-label="Search saved problems"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none sm:w-56 dark:border-neutral-800 dark:bg-[#181818] dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
          </div>

          <select
            aria-label="Filter by concept"
            value={conceptFilter}
            onChange={(e) =>
              setConceptFilter(e.target.value as AlgoConceptId | 'all')
            }
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-[#181818] dark:text-neutral-200"
          >
            <option value="all">All Concepts</option>
            {conceptOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && problems.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#181818]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
            No matching saved problems.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Adjust your filter or break down a new problem above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((problem) => {
            const userProg = progressMap[problem.id];
            const summary = computeAlgoChecklistProgress(
              problem.steps.map((s) => s.id),
              userProg?.completedStepIds ?? [],
            );
            const cachedLangNames = problem.availableLanguages
              .map((lang) => LANGUAGE_MAP[lang]?.name ?? lang)
              .slice(0, 3)
              .join(', ');
            const extraLangCount = Math.max(
              0,
              problem.availableLanguages.length - 3,
            );

            return (
              <button
                key={problem.id}
                type="button"
                onClick={() => onSelectProblem(problem)}
                className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-400 dark:border-neutral-800 dark:bg-[#181818] dark:hover:border-blue-500/80"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-slate-950 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
                      {problem.title}
                    </h3>
                    {summary.isComplete ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-label="Completed"
                      />
                    ) : (
                      <ArrowRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-neutral-500 dark:group-hover:text-blue-400"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-neutral-400">
                    {problem.problemSummary}
                  </p>
                </div>

                <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3 dark:border-neutral-800/80">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                    <span>{ALGO_CONCEPT_LABELS[problem.conceptCategory]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{problem.steps.length} steps</span>
                    <span aria-hidden="true">·</span>
                    <span>{DIFFICULTY_LABEL[problem.difficulty]}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate font-mono text-slate-500 dark:text-neutral-400">
                      {cachedLangNames}
                      {extraLangCount > 0 ? ` +${extraLangCount}` : ''}
                    </span>
                    {summary.completedCount > 0 && (
                      <span
                        className={`shrink-0 font-mono font-semibold tabular-nums ${
                          summary.isComplete
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {summary.completedCount}/{summary.totalCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
