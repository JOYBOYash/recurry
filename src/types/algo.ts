import type { LanguageId } from './curriculum';

export type AlgoConceptId =
  | 'auto'
  | 'foundations_io'
  | 'control_flow'
  | 'functions_scope'
  | 'arrays_strings'
  | 'hash_maps'
  | 'two_pointers'
  | 'recursion_trees'
  | 'sorting_searching'
  | 'dynamic_programming'
  | 'queries_data';

export type ResolvedAlgoConceptId = Exclude<AlgoConceptId, 'auto'>;

export type AlgoDifficulty = 'foundation' | 'intermediate' | 'advanced';

export interface AlgoLogicStep {
  id: string;
  title: string;
  goal: string;
  logicCue: string;
  checkCriteria: string;
  pitfall: string;
}

export interface AlgoProblemBlueprint {
  id: string;
  fingerprint: string;
  title: string;
  problemSummary: string;
  canonicalPrompt: string;
  conceptCategory: ResolvedAlgoConceptId;
  difficulty: AlgoDifficulty;
  timeComplexity: string;
  spaceComplexity: string;
  edgeCases: string[];
  steps: AlgoLogicStep[];
  availableLanguages: LanguageId[];
  createdByUid: string;
  createdAt: string;
}

export interface AlgoStepLanguageHint {
  stepId: string;
  syntaxCue: string;
  idiomNote: string;
  stepSnippet: string;
}

export interface AlgoLanguageAdapter {
  problemId: string;
  language: LanguageId;
  setupNote: string;
  stepHints: AlgoStepLanguageHint[];
  createdAt: string;
}

export interface AlgoUserProgress {
  problemId: string;
  uid: string;
  activeLanguage: LanguageId;
  completedStepIds: string[];
  updatedAt: string;
  completedAt: string | null;
}

export type AlgoCacheHitStatus = 'full' | 'logic_only' | 'none';

export interface AlgoDecomposeResponse {
  blueprint: AlgoProblemBlueprint;
  adapter: AlgoLanguageAdapter;
  cacheHit: AlgoCacheHitStatus;
}

export interface AlgoAdaptResponse {
  adapter: AlgoLanguageAdapter;
  cacheHit: boolean;
}
