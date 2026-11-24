import { useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SKILL_LEVELS } from '../data/languages';
import type { SkillLevel } from '../types/curriculum';
import { cycleIndex } from '../utils/uxFlowLogic';
import { RankIcon } from './RankIcon';

interface SkillLevelFlipCardProps {
  value: SkillLevel;
  onChange: (next: SkillLevel) => void;
  languageName?: string;
}

const LEVEL_HINTS: Record<SkillLevel, string> = {
  noob: 'Clear syntax walkthroughs, guided recall, and gentle first programs.',
  intern: 'Core control flow, data structures, and idiomatic fundamentals.',
  expert: 'Production patterns, clean abstractions, and real problem drills.',
  master: 'Deep language semantics, edge cases, and performance fluency.',
  legend: 'Compiler-grade precision, terse idioms, and zero hand-holding.',
};

/**
 * Interactive cyclic flip card for choosing a Skill Level one card at a time.
 */
export function SkillLevelFlipCard({
  value,
  onChange,
  languageName,
}: SkillLevelFlipCardProps) {
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');
  const currentIndex = Math.max(
    0,
    SKILL_LEVELS.findIndex((lvl) => lvl.id === value),
  );
  const current = SKILL_LEVELS[currentIndex] ?? SKILL_LEVELS[1];

  function handleStep(delta: 1 | -1) {
    setFlipDir(delta === 1 ? 'next' : 'prev');
    const nextIdx = cycleIndex(currentIndex, delta, SKILL_LEVELS.length);
    onChange(SKILL_LEVELS[nextIdx].id);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleStep(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleStep(-1);
    }
  }

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label="Skill level selector"
      onKeyDown={handleKeyDown}
      className="space-y-4 focus:outline-none"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          aria-label="Previous skill level"
          className="btn-juice flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-neutral-800 dark:bg-[#1E1E1E] dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            key={current.id}
            data-testid="skill-level-flip-card"
            className={`rounded-2xl border border-slate-200/90 bg-slate-50/70 px-6 py-7 text-center dark:border-neutral-800 dark:bg-[#1F1F1F] ${
              flipDir === 'next' ? 'animate-card-flip-next' : 'animate-card-flip-prev'
            }`}
          >
            <div className="mx-auto flex justify-center">
              <RankIcon rank={current.id} useRankColor className="h-10 w-10" />
            </div>

            <div className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-white">
              {current.label}
            </div>
            <div className="mt-1 font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
              {languageName ? `${languageName} · ${current.tag}` : current.tag}
            </div>
            <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-neutral-400">
              {LEVEL_HINTS[current.id]}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          aria-label="Next skill level"
          className="btn-juice flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-neutral-800 dark:bg-[#1E1E1E] dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Cyclic dot indicators */}
      <div className="flex items-center justify-center gap-2">
        {SKILL_LEVELS.map((lvl, idx) => {
          const active = lvl.id === current.id;
          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                setFlipDir(idx >= currentIndex ? 'next' : 'prev');
                onChange(lvl.id);
              }}
              aria-label={`Select ${lvl.label}`}
              aria-pressed={active}
              className={`h-2 cursor-pointer rounded-full transition-all duration-200 ${
                active
                  ? 'w-7 bg-blue-600 dark:bg-blue-500'
                  : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-neutral-700 dark:hover:bg-neutral-500'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
