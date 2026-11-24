import type {
  AlgoConceptId,
  AlgoProblemBlueprint,
  ResolvedAlgoConceptId,
} from '../types/algo';
import type { CodeEvaluationResult, LanguageId } from '../types/curriculum';

export interface AlgoConceptOption {
  id: AlgoConceptId;
  label: string;
  shortLabel: string;
}

export const ALGO_CONCEPTS: AlgoConceptOption[] = [
  { id: 'auto', label: 'Auto-detect', shortLabel: 'Auto' },
  { id: 'foundations_io', label: 'Foundations & I/O', shortLabel: 'Foundations' },
  { id: 'control_flow', label: 'Control Flow', shortLabel: 'Control Flow' },
  { id: 'functions_scope', label: 'Functions & Scope', shortLabel: 'Functions' },
  { id: 'arrays_strings', label: 'Arrays & Strings', shortLabel: 'Arrays' },
  { id: 'hash_maps', label: 'Hash Maps & Sets', shortLabel: 'Hash Maps' },
  { id: 'two_pointers', label: 'Two Pointers', shortLabel: 'Two Pointers' },
  { id: 'recursion_trees', label: 'Recursion & Trees', shortLabel: 'Recursion' },
  { id: 'sorting_searching', label: 'Sorting & Search', shortLabel: 'Sorting' },
  { id: 'dynamic_programming', label: 'Dynamic Programming', shortLabel: 'DP' },
  { id: 'queries_data', label: 'Queries & Data', shortLabel: 'Data' },
];

export const ALLOWED_ALGO_CONCEPTS = new Set<AlgoConceptId>(
  ALGO_CONCEPTS.map((c) => c.id),
);

export const ALLOWED_RESOLVED_CONCEPTS = new Set<ResolvedAlgoConceptId>(
  ALGO_CONCEPTS.filter((c) => c.id !== 'auto').map(
    (c) => c.id as ResolvedAlgoConceptId,
  ),
);

export const ALGO_CONCEPT_LABELS: Record<AlgoConceptId, string> =
  ALGO_CONCEPTS.reduce(
    (acc, item) => {
      acc[item.id] = item.label;
      return acc;
    },
    {} as Record<AlgoConceptId, string>,
  );

export const ALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MAX_PROBLEM_TEXT_LENGTH = 4000;
export const MIN_PROBLEM_TEXT_LENGTH = 10;
export const MAX_IMAGE_FILE_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_TEXT_FILE_BYTES = 20 * 1024; // 20 KB

export function normalizeProblemText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[`*_~#>]/g, ' ')
    .replace(/[^a-z0-9+\-*/=<>()[\]{}.,:;?!\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic 64-bit dual-FNV-1a hex fingerprint usable synchronously in both
 * Node.js and browser environments without SubtleCrypto async overhead.
 */
export function computeProblemFingerprint(
  rawText: string,
  concept: AlgoConceptId = 'auto',
): string {
  const normalized = normalizeProblemText(rawText);
  const key = `${concept === 'auto' ? 'any' : concept}|${normalized}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i += 1) {
    const ch = key.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= ch + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return (
    h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
  );
}

export function buildProblemIdFromFingerprint(fingerprint: string): string {
  const clean = fingerprint.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 24);
  return `algo-${clean || '0000000000000000'}`;
}

export interface AlgoInputValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAlgoTextInput(rawText: string): AlgoInputValidationResult {
  const trimmed = rawText.trim();
  if (trimmed.length < MIN_PROBLEM_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Describe or paste at least ${MIN_PROBLEM_TEXT_LENGTH} characters of the problem.`,
    };
  }
  if (trimmed.length > MAX_PROBLEM_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Keep the problem statement under ${MAX_PROBLEM_TEXT_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

export function validateAlgoUploadedFile(file: {
  name: string;
  type: string;
  size: number;
}): { valid: boolean; kind?: 'image' | 'text'; error?: string } {
  const lowerName = file.name.toLowerCase();
  const isTextFile =
    file.type === 'text/plain' ||
    file.type === 'text/markdown' ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md');

  if (isTextFile) {
    if (file.size === 0) {
      return { valid: false, error: 'The selected text file is empty.' };
    }
    if (file.size > MAX_TEXT_FILE_BYTES) {
      return {
        valid: false,
        error: 'Text files must be 20 KB or smaller.',
      };
    }
    return { valid: true, kind: 'text' };
  }

  if (ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    if (file.size === 0) {
      return { valid: false, error: 'The selected image file is empty.' };
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      return {
        valid: false,
        error: 'Screenshots must be 4 MB or smaller.',
      };
    }
    return { valid: true, kind: 'image' };
  }

  return {
    valid: false,
    error: 'Upload a PNG, JPEG, WebP screenshot, or a .txt / .md file.',
  };
}

export interface AlgoChecklistProgressSummary {
  completedCount: number;
  totalCount: number;
  percent: number;
  isComplete: boolean;
}

export function computeAlgoChecklistProgress(
  stepIds: string[],
  completedStepIds: string[],
): AlgoChecklistProgressSummary {
  const validSet = new Set(stepIds);
  const uniqueCompleted = new Set(
    completedStepIds.filter((id) => validSet.has(id)),
  );
  const totalCount = stepIds.length;
  const completedCount = uniqueCompleted.size;
  const percent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return {
    completedCount,
    totalCount,
    percent,
    isComplete: totalCount > 0 && completedCount === totalCount,
  };
}

export function filterAlgoProblems(
  problems: AlgoProblemBlueprint[],
  query: string,
  conceptFilter: AlgoConceptId | 'all',
): AlgoProblemBlueprint[] {
  const q = query.trim().toLowerCase();
  return problems.filter((item) => {
    if (
      conceptFilter !== 'all' &&
      conceptFilter !== 'auto' &&
      item.conceptCategory !== conceptFilter
    ) {
      return false;
    }
    if (!q) return true;
    const conceptLabel = ALGO_CONCEPT_LABELS[item.conceptCategory] ?? '';
    return (
      item.title.toLowerCase().includes(q) ||
      item.problemSummary.toLowerCase().includes(q) ||
      item.canonicalPrompt.toLowerCase().includes(q) ||
      conceptLabel.toLowerCase().includes(q)
    );
  });
}

export function mergeAlgoProblemLibraries(
  primary: AlgoProblemBlueprint[],
  secondary: AlgoProblemBlueprint[],
): AlgoProblemBlueprint[] {
  const byId = new Map<string, AlgoProblemBlueprint>();
  for (const item of [...secondary, ...primary]) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, {
        ...item,
        availableLanguages: Array.from(new Set(item.availableLanguages)),
      });
    } else {
      const mergedLangs = Array.from(
        new Set<LanguageId>([
          ...existing.availableLanguages,
          ...item.availableLanguages,
        ]),
      );
      byId.set(item.id, {
        ...existing,
        ...item,
        availableLanguages: mergedLangs,
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getLanguageCommentPrefix(language: LanguageId): string {
  if (language === 'python' || language === 'ruby') {
    return '#';
  }
  if (language === 'sql') {
    return '--';
  }
  return '//';
}

export function buildInitialStepCode(
  firstStepTitle: string,
  language: LanguageId,
): string {
  const prefix = getLanguageCommentPrefix(language);
  const cleanTitle = firstStepTitle.trim();
  return cleanTitle ? `${prefix} ${cleanTitle}\n` : '';
}

export function buildAugmentedStepCode(
  previousCode: string,
  nextStepTitle: string,
  language: LanguageId,
): string {
  const prefix = getLanguageCommentPrefix(language);
  const cleanTitle = nextStepTitle.trim();
  const marker = cleanTitle ? `${prefix} ${cleanTitle}` : '';
  const trimmedPrev = previousCode.replace(/\s+$/, '');

  if (!marker) {
    return trimmedPrev ? `${trimmedPrev}\n` : '';
  }

  if (!trimmedPrev) {
    return `${marker}\n`;
  }

  if (trimmedPrev.includes(marker)) {
    return `${trimmedPrev}\n`;
  }

  return `${trimmedPrev}\n\n${marker}\n`;
}

export function appendStepSnippetToCode(
  currentCode: string,
  snippet: string,
): string {
  const cleanSnippet = snippet.trim();
  if (!cleanSnippet) return currentCode;
  const trimmedCurrent = currentCode.replace(/\s+$/, '');
  if (!trimmedCurrent) {
    return `${cleanSnippet}\n`;
  }
  if (trimmedCurrent.includes(cleanSnippet)) {
    return currentCode;
  }
  return `${trimmedCurrent}\n${cleanSnippet}\n`;
}

export function buildFinalOutputCode(
  userCodeBuffer: string,
  fallbackSnippets: string[] = [],
): string {
  const trimmed = userCodeBuffer.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return fallbackSnippets
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function extractCodeEvaluationResult(
  payload: unknown,
): CodeEvaluationResult | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  const raw =
    obj.evaluation && typeof obj.evaluation === 'object'
      ? (obj.evaluation as Record<string, unknown>)
      : obj;

  if (
    typeof raw.passed !== 'boolean' &&
    typeof raw.feedback !== 'string' &&
    typeof raw.verdictLabel !== 'string'
  ) {
    return null;
  }

  const passed = Boolean(raw.passed);
  const verdictLabel: CodeEvaluationResult['verdictLabel'] =
    raw.verdictLabel === 'Verified' ||
    raw.verdictLabel === 'Needs Revision' ||
    raw.verdictLabel === 'Syntax Issue'
      ? raw.verdictLabel
      : passed
        ? 'Verified'
        : 'Needs Revision';

  return {
    passed,
    verdictLabel,
    feedback: typeof raw.feedback === 'string' ? raw.feedback : '',
    syntaxIssues: Array.isArray(raw.syntaxIssues)
      ? raw.syntaxIssues.filter((item): item is string => typeof item === 'string')
      : [],
    strengths: Array.isArray(raw.strengths)
      ? raw.strengths.filter((item): item is string => typeof item === 'string')
      : [],
    improvedSnippet:
      typeof raw.improvedSnippet === 'string' ? raw.improvedSnippet : '',
  };
}
