import type {
  LanguageId,
  PersonalizationRequest,
  ReferenceCategory,
  ReferenceEntry,
  ReferenceGenerateRequest,
} from '../types/curriculum';

export {
  collectDailyActivityCounts,
  computeCurrentStreak,
  computeDailyGoalProgress,
  computeLearningStats,
  toLocalDateKey,
  type DailyGoalProgress,
  type LearningOverviewStats,
} from '../engines/streaksEngine';

export {
  calculateTrackProgress,
  computeAttemptAccuracy,
  computeCertificateStars,
  computeTrackAccuracyAndStars,
  shouldTriggerTrackCelebration,
  type TrackAccuracySummary,
  type TrackCompletionSnapshot,
  type TrackProgressSummary,
} from '../engines/progressionEngine';

export interface DailyQuotaStatus {
  allowed: boolean;
  remainingToday: number;
  todayKey: string;
}

export function canGenerateCurriculumToday(
  lastGeneratedDate: string,
  dailyGenerationCount: number,
  referenceDate: Date = new Date(),
): DailyQuotaStatus {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  const todayKey = `${year}-${month}-${day}`;
  const usedToday = lastGeneratedDate === todayKey ? Math.max(0, dailyGenerationCount) : 0;
  const remainingToday = Math.max(0, 1 - usedToday);

  return {
    allowed: remainingToday > 0,
    remainingToday,
    todayKey,
  };
}

export function filterReferenceEntries(
  entries: ReferenceEntry[],
  query: string,
  category: ReferenceCategory | 'All',
  activeLanguages: LanguageId[],
): ReferenceEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  const langSet =
    activeLanguages.length > 0
      ? activeLanguages
      : (['sql', 'java', 'cpp', 'python', 'javascript', 'ruby'] as LanguageId[]);

  return entries.filter((entry) => {
    if (category !== 'All' && entry.category !== category) {
      return false;
    }

    const hasRequestedLanguage = langSet.some((lang) => Boolean(entry.snippets[lang]));
    if (!hasRequestedLanguage) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const baseMatch =
      entry.concept.toLowerCase().includes(normalizedQuery) ||
      entry.description.toLowerCase().includes(normalizedQuery) ||
      entry.category.toLowerCase().includes(normalizedQuery);

    if (baseMatch) {
      return true;
    }

    return langSet.some((lang) => {
      const snippet = entry.snippets[lang];
      if (!snippet) return false;
      return (
        snippet.syntax.toLowerCase().includes(normalizedQuery) ||
        snippet.usage.toLowerCase().includes(normalizedQuery)
      );
    });
  });
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof PersonalizationRequest, string>>;
}

const VALID_LANGUAGES: Set<LanguageId> = new Set([
  'sql',
  'java',
  'cpp',
  'python',
  'javascript',
  'ruby',
]);

export function validatePersonalizationInput(
  input: PersonalizationRequest,
): ValidationResult {
  const errors: Partial<Record<keyof PersonalizationRequest, string>> = {};

  if (!VALID_LANGUAGES.has(input.language)) {
    errors.language = 'Select one of the supported languages.';
  }

  if (input.priorBackground.trim().length > 300) {
    errors.priorBackground = 'Keep your background summary under 300 characters.';
  }

  if (input.focusNotes.trim().length > 400) {
    errors.focusNotes = 'Keep custom focus notes under 400 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateReferenceTopicInput(
  input: ReferenceGenerateRequest,
): { valid: boolean; error?: string } {
  if (input.topic.trim().length < 2) {
    return {
      valid: false,
      error: 'Enter a syntax concept (e.g., "Closures", "Window Functions").',
    };
  }
  if (input.topic.trim().length > 120) {
    return {
      valid: false,
      error: 'Keep the syntax topic under 120 characters.',
    };
  }
  if (!input.languages.length || input.languages.some((l) => !VALID_LANGUAGES.has(l))) {
    return {
      valid: false,
      error: 'Select at least one valid language.',
    };
  }
  return { valid: true };
}

export function checkBalancedDelimiters(code: string): string[] {
  const issues: string[] = [];
  const stack: Array<{ char: string; line: number }> = [];
  const pairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
  };
  const closingToOpening: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{',
  };

  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let line = 1;

  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    const prev = i > 0 ? code[i - 1] : '';

    if (ch === '\n') {
      line += 1;
      continue;
    }

    if (ch === "'" && !inDouble && !inBacktick && prev !== '\\') {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick && prev !== '\\') {
      inDouble = !inDouble;
      continue;
    }
    if (ch === '`' && !inSingle && !inDouble && prev !== '\\') {
      inBacktick = !inBacktick;
      continue;
    }

    if (inSingle || inDouble || inBacktick) {
      continue;
    }

    if (pairs[ch]) {
      stack.push({ char: ch, line });
    } else if (closingToOpening[ch]) {
      const top = stack.pop();
      if (!top || top.char !== closingToOpening[ch]) {
        issues.push(`Unmatched '${ch}' on line ${line}.`);
      }
    }
  }

  if (inSingle) {
    issues.push('Unclosed single-quoted literal.');
  }
  if (inDouble) {
    issues.push('Unclosed double-quoted literal.');
  }
  if (inBacktick) {
    issues.push('Unclosed template backtick literal.');
  }
  for (const unclosed of stack) {
    issues.push(`Unclosed '${unclosed.char}' opened on line ${unclosed.line}.`);
  }

  return issues;
}
