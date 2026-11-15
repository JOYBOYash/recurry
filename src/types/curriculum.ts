export type LanguageId = 'sql' | 'java' | 'cpp' | 'python' | 'javascript' | 'ruby';

export type SkillLevel = 'noob' | 'intern' | 'expert' | 'master' | 'legend';

export type LearningFocus = 'syntax' | 'problem_solving';

export type ExperienceLevel =
  | 'beginner'
  | 'cross_language'
  | 'intermediate'
  | 'mastery';

export type LearningGoal =
  | 'syntax_mastery'
  | 'backend_data'
  | 'interviews'
  | 'systems_perf'
  | 'fullstack';

export type PaceDepth = 'essentials' | 'comprehensive' | 'complete';

export interface LanguageMeta {
  id: LanguageId;
  name: string;
  standardLabel: string;
  paradigm: string;
  typingSystem: string;
  summary: string;
  keyConstructs: string[];
  accentColor: string;
}

export interface SyntaxExample {
  title: string;
  code: string;
  explanation: string;
  usageNote: string;
}

export interface PracticeChallenge {
  title: string;
  prompt: string;
  starterCode: string;
  expectedConcepts: string[];
  hint: string;
  sampleSolution: string;
}

export interface DeepDiveExpansion {
  mentalModelBridge: string;
  edgeCases: string[];
  additionalExamples: SyntaxExample[];
  generatedAt: string;
}

export type RecallExerciseType =
  | 'multiple_choice'
  | 'predict_output'
  | 'fill_blank'
  | 'bug_fix';

export type RecallDifficulty = 'foundation' | 'applied' | 'mastery';

export interface RecallExercise {
  id: string;
  type: RecallExerciseType;
  difficulty: RecallDifficulty;
  prompt: string;
  codeSnippet?: string;
  options?: string[];
  answer: string;
  explanation: string;
  conceptTag: string;
}

export interface ModuleRecallProgress {
  drillsPassed: string[];
  attempts: number;
  correctCount: number;
  xpEarned: number;
}

export interface CurriculumModule {
  id: string;
  order: number;
  unitTitle?: string;
  title: string;
  estimatedMinutes: number;
  summary: string;
  syntaxGrammar: string;
  syntaxTopics: string[];
  examples: SyntaxExample[];
  commonPitfalls: string[];
  recallDrills?: RecallExercise[];
  xpReward?: number;
  challenge: PracticeChallenge;
  deepDive?: DeepDiveExpansion;
}

export interface CurriculumTrack {
  id: string;
  uid?: string;
  language: LanguageId;
  title: string;
  subtitle: string;
  skillLevel: SkillLevel;
  learningFocus: LearningFocus;
  experienceLevel?: ExperienceLevel;
  goal?: LearningGoal;
  paceDepth: PaceDepth;
  priorBackground: string;
  bridgingStrategy: string;
  createdAt: string;
  redoCount?: number;
  modules: CurriculumModule[];
}

export interface PersonalizationRequest {
  language: LanguageId;
  skillLevel: SkillLevel;
  learningFocus: LearningFocus;
  paceDepth: PaceDepth;
  priorBackground: string;
  focusNotes: string;
  clientDateKey?: string;
  plannedTopics?: string[];
}

export interface ModuleAccuracyEntry {
  attempts: number;
  passed: boolean;
  bestAccuracy: number;
  drillsPassed?: string[];
  recallAttempts?: number;
  xpEarned?: number;
  lastPracticedDate?: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  dailyModuleGoal: number;
  onboardingCompleted: boolean;
  preferredLanguage: LanguageId;
  skillLevel: SkillLevel;
  learningFocus: LearningFocus;
  lastGeneratedDate: string;
  dailyGenerationCount: number;
  activeTrackId: string | null;
  activeModuleId: string | null;
  completedModuleIds: string[];
  moduleCompletedAt: Record<string, string>;
  moduleAccuracy: Record<string, ModuleAccuracyEntry>;
}

export interface CertificateRecord {
  id: string;
  uid: string;
  trackId: string;
  trackTitle: string;
  language: LanguageId;
  username: string;
  accuracyPercent: number;
  stars: number;
  completedModulesCount: number;
  certificateCode: string;
  issuedAt: string;
}

export interface CodeEvaluationResult {
  passed: boolean;
  verdictLabel: 'Verified' | 'Needs Revision' | 'Syntax Issue';
  feedback: string;
  syntaxIssues: string[];
  strengths: string[];
  improvedSnippet: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  codeSnippet?: string;
}

export type ReferenceCategory =
  | 'Types & Variables'
  | 'Control Flow'
  | 'Functions & Closures'
  | 'Collections & Iteration'
  | 'OOP & Data Modeling'
  | 'Errors & Safety'
  | 'Queries & Concurrency';

export interface ReferenceSnippet {
  syntax: string;
  usage: string;
}

export interface ReferenceEntry {
  id: string;
  uid?: string;
  category: ReferenceCategory;
  concept: string;
  description: string;
  createdAt: string;
  snippets: Partial<Record<LanguageId, ReferenceSnippet>>;
}

export interface ReferenceGenerateRequest {
  topic: string;
  category: ReferenceCategory;
  languages: LanguageId[];
}

export interface PersistedAppState {
  tracks: CurriculumTrack[];
  completedModuleIds: string[];
  moduleCompletedAt: Record<string, string>;
  referenceEntries: ReferenceEntry[];
  activeTrackId: string | null;
  activeModuleId: string | null;
}
