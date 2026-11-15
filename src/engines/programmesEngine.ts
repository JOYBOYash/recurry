import { LANGUAGE_MAP, PACE_DEPTHS, SKILL_LEVELS } from '../data/languages';
import type {
  CurriculumTrack,
  LearningFocus,
  PaceDepth,
  PersonalizationRequest,
  RecallDifficulty,
  SkillLevel,
} from '../types/curriculum';
import { calculateTrackProgress } from './progressionEngine';

export type ProgrammeStatus = 'active' | 'completed' | 'locked';

export interface EvaluatedProgramme {
  trackId: string;
  status: ProgrammeStatus;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isCertificateReady: boolean;
  lockReason: string | null;
}

export interface ProgrammeLockSummary {
  canGenerateNewProgramme: boolean;
  canStartOtherIncompleteTrack: boolean;
  activeIncompleteTrackId: string | null;
  activeIncompleteTrackTitle: string | null;
  activeIncompleteProgressPercent: number;
  completedProgrammesCount: number;
  programmesById: Record<string, EvaluatedProgramme>;
  lockMessage: string | null;
}

export interface BlueprintModuleSlot {
  order: number;
  unitNumber: number;
  unitLabel: string;
  topicFocus: string;
  difficulty: RecallDifficulty;
  drillMix: string[];
  estimatedMinutes: number;
  xpReward: number;
}

export interface ProgrammeBlueprint {
  languageName: string;
  standardLabel: string;
  skillLabel: string;
  focusLabel: string;
  moduleCount: number;
  estimatedTotalMinutes: number;
  totalXpTarget: number;
  pedagogyModel: string;
  calibrationNotes: string;
  unitsSummary: string[];
  moduleSlots: BlueprintModuleSlot[];
  aiGenerationDirectives: string[];
}

const LANGUAGE_SYLLABUS_TOPICS: Record<PersonalizationRequest['language'], string[]> = {
  sql: [
    'Relational Filtering & Projections',
    'Multi-Table Joins & Normalization',
    'Aggregations, Grouping & HAVING',
    'Subqueries & Common Table Expressions',
    'Window Analytics & Ranking OVER()',
    'Transactions, Constraints & Indexing',
    'JSON & Semi-Structured Queries',
    'Execution Plans & Query Tuning',
  ],
  java: [
    'Primitive Types, Control Flow & Strings',
    'Classes, Records & Encapsulation',
    'Interfaces, Generics & Contracts',
    'Collections Framework & Iterators',
    'Streams, Lambdas & Optional Safety',
    'Checked vs Unchecked Exception Design',
    'Concurrency & Virtual Threads',
    'Modular Architecture & Memory Idioms',
  ],
  cpp: [
    'Value Semantics, References & Pointers',
    'Control Flow, Ranges & Const-Correctness',
    'RAII & Smart Pointers (unique/shared)',
    'STL Containers & Iterator Categories',
    'Algorithm Pipelines & Lambdas',
    'Templates, Type Deduction & Concepts',
    'Move Semantics & Perfect Forwarding',
    'Zero-Overhead Concurrency & Atomics',
  ],
  python: [
    'Core Bindings, Slicing & Truthiness',
    'Control Flow & Comprehensions',
    'Functions, Closures & Unpacking',
    'Dictionaries, Sets & Collections',
    'Classes, Dataclasses & Protocols',
    'Generators, Iterators & Context Managers',
    'Decorators, Type Hints & Error Handling',
    'Asyncio Concurrency & Packaging',
  ],
  javascript: [
    'Bindings, Scope & Coercion Rules',
    'Destructuring, Spread & Rest Patterns',
    'Higher-Order Array Transformations',
    'Closures, Lexical Context & `this`',
    'Prototypes, Classes & Modules',
    'Promises & Microtask Execution Order',
    'Async/Await & Error Boundaries',
    'Immutability, Maps/Sets & Event Patterns',
  ],
  ruby: [
    'Objects, Symbols & Truthy Semantics',
    'Blocks, Procs & Lambdas',
    'Enumerable Transformations & Chaining',
    'Hashes, Keyword Arguments & Structs',
    'Classes, Modules & Mixin Lookup',
    'Pattern Matching & Destructuring',
    'Metaprogramming & Method Missing',
    'Exceptions, Fibers & Idiomatic Testing',
  ],
};

const SKILL_DIFFICULTY_NOTES: Record<SkillLevel, string> = {
  noob: 'Start from zero assumptions with micro-step syntax bites and forgiving foundation recall.',
  intern: 'Focus on clean idioms, standard library patterns, and applied output prediction.',
  expert: 'Calibrate to production-grade edge cases, bug-spotting drills, and strict type/memory safety.',
  master: 'Emphasize deep language semantics, concurrency/performance subtleties, and corner-case mastery.',
  legend: 'Demand specification-level precision, zero-overhead abstractions, and adversarial bug-fix drills.',
};

const SKILL_LABEL_MAP: Record<SkillLevel, string> = SKILL_LEVELS.reduce(
  (acc, item) => {
    acc[item.id] = item.label;
    return acc;
  },
  {} as Record<SkillLevel, string>,
);

export function evaluateProgrammeLockState(
  tracks: CurriculumTrack[],
  completedModuleIds: string[],
  activeTrackId?: string | null,
): ProgrammeLockSummary {
  const progressEntries = tracks.map((track) => ({
    track,
    progress: calculateTrackProgress(track, completedModuleIds),
  }));

  const incompleteEntries = progressEntries.filter(
    ({ progress }) => progress.totalCount > 0 && progress.completedCount < progress.totalCount,
  );

  // Only one active incomplete curriculum allowed at a time
  const activeIncomplete =
    incompleteEntries.find((e) => e.track.id === activeTrackId) ??
    incompleteEntries[0] ??
    null;

  const programmesById: Record<string, EvaluatedProgramme> = {};
  let completedProgrammesCount = 0;

  for (const { track, progress } of progressEntries) {
    const isComplete =
      progress.totalCount > 0 && progress.completedCount >= progress.totalCount;

    if (isComplete) {
      completedProgrammesCount += 1;
      programmesById[track.id] = {
        trackId: track.id,
        status: 'completed',
        completedCount: progress.completedCount,
        totalCount: progress.totalCount,
        percentage: 100,
        isCertificateReady: true,
        lockReason: null,
      };
      continue;
    }

    if (activeIncomplete && activeIncomplete.track.id === track.id) {
      programmesById[track.id] = {
        trackId: track.id,
        status: 'active',
        completedCount: progress.completedCount,
        totalCount: progress.totalCount,
        percentage: progress.percentage,
        isCertificateReady: false,
        lockReason: null,
      };
    } else {
      programmesById[track.id] = {
        trackId: track.id,
        status: 'locked',
        completedCount: progress.completedCount,
        totalCount: progress.totalCount,
        percentage: progress.percentage,
        isCertificateReady: false,
        lockReason: activeIncomplete
          ? `Complete "${activeIncomplete.track.title}" (${activeIncomplete.progress.completedCount}/${activeIncomplete.progress.totalCount}) to unlock.`
          : 'Locked until active curriculum is completed.',
      };
    }
  }

  const canGenerateNewProgramme = !activeIncomplete;

  return {
    canGenerateNewProgramme,
    canStartOtherIncompleteTrack: !activeIncomplete,
    activeIncompleteTrackId: activeIncomplete?.track.id ?? null,
    activeIncompleteTrackTitle: activeIncomplete?.track.title ?? null,
    activeIncompleteProgressPercent: activeIncomplete?.progress.percentage ?? 100,
    completedProgrammesCount,
    programmesById,
    lockMessage: activeIncomplete
      ? `Complete "${activeIncomplete.track.title}" (${activeIncomplete.progress.completedCount}/${activeIncomplete.progress.totalCount} modules) before generating or starting another curriculum.`
      : null,
  };
}

export function buildProgrammeBlueprint(
  req: PersonalizationRequest,
): ProgrammeBlueprint {
  const langMeta = LANGUAGE_MAP[req.language];
  const paceMeta =
    PACE_DEPTHS.find((p) => p.id === req.paceDepth) ?? PACE_DEPTHS[1];
  const moduleCount = paceMeta.moduleCount;
  const topics = LANGUAGE_SYLLABUS_TOPICS[req.language] ?? LANGUAGE_SYLLABUS_TOPICS.python;

  const customTopics = req.focusNotes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const unitTitles = [
    'Unit 1 · Core Foundations',
    'Unit 2 · Structured Patterns',
    'Unit 3 · Applied Mastery',
    'Unit 4 · Production Capstone',
  ];

  const focusLabel: Record<LearningFocus, string> = {
    syntax: 'Syntax Mastery (Grammar + Idioms)',
    problem_solving: 'Problem Solving (Algorithms + Applied Code)',
  };

  const moduleSlots: BlueprintModuleSlot[] = [];
  let estimatedTotalMinutes = 0;
  let totalXpTarget = 0;

  for (let i = 0; i < moduleCount; i += 1) {
    const ratio = moduleCount <= 1 ? 0 : i / (moduleCount - 1);
    const difficulty: RecallDifficulty =
      ratio < 0.35 ? 'foundation' : ratio < 0.75 ? 'applied' : 'mastery';

    const unitNumber = Math.min(unitTitles.length, Math.floor(i / 2) + 1);
    const unitLabel = unitTitles[unitNumber - 1] ?? `Unit ${unitNumber}`;
    const customTopic = customTopics[i];
    const baseTopic = topics[i] ?? `Advanced ${langMeta.name} Topic ${i + 1}`;
    const topicFocus = customTopic ? `${baseTopic} · ${customTopic}` : baseTopic;

    const estimatedMinutes =
      req.skillLevel === 'noob' ? 15 : req.skillLevel === 'legend' ? 25 : 20;
    const xpReward = difficulty === 'foundation' ? 30 : difficulty === 'applied' ? 40 : 50;

    estimatedTotalMinutes += estimatedMinutes;
    totalXpTarget += xpReward + 15; // 3 recall drills x 5 XP + challenge XP

    const drillMix =
      difficulty === 'foundation'
        ? ['Grammar Recall', 'Predict Output', 'Guided Syntax']
        : difficulty === 'applied'
          ? ['Fill-in-Syntax', 'Predict Output', 'Debug Pitfall']
          : ['Bug Fix', 'Edge-Case Recall', 'Full Code Challenge'];

    moduleSlots.push({
      order: i + 1,
      unitNumber,
      unitLabel,
      topicFocus,
      difficulty,
      drillMix,
      estimatedMinutes,
      xpReward,
    });
  }

  const aiGenerationDirectives = [
    `Generate all ${moduleCount} modules + active recall drills in one coherent pass.`,
    `Adapt mental models${req.priorBackground.trim() ? ` from ${req.priorBackground.trim()}` : ''} to ${langMeta.standardLabel}.`,
    `Enforce sequential unlocking: Module N+1 stays locked until Module N active recall & code challenge pass.`,
    `Pair every concept bite with 3 progressive active-recall drills (foundation -> applied -> mastery) + 1 code challenge.`,
    `Issue a verified ${langMeta.name} completion certificate when 100% of modules are mastered.`,
  ];

  return {
    languageName: langMeta.name,
    standardLabel: langMeta.standardLabel,
    skillLabel: SKILL_LABEL_MAP[req.skillLevel] ?? req.skillLevel,
    focusLabel: focusLabel[req.learningFocus] ?? req.learningFocus,
    moduleCount,
    estimatedTotalMinutes,
    totalXpTarget,
    pedagogyModel: 'Duolingo-style Active Recall + Progressive Difficulty',
    calibrationNotes: SKILL_DIFFICULTY_NOTES[req.skillLevel],
    unitsSummary: Array.from(new Set(moduleSlots.map((m) => m.unitLabel))),
    moduleSlots,
    aiGenerationDirectives,
  };
}
