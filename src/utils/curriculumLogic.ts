import type {
  CurriculumTrack,
  LanguageId,
  ModuleAccuracyEntry,
  PersonalizationRequest,
  ReferenceCategory,
  ReferenceEntry,
  ReferenceGenerateRequest,
} from '../types/curriculum';

export interface TrackProgressSummary {
  completedCount: number;
  totalCount: number;
  percentage: number;
  nextModuleId: string | null;
}

export interface LearningOverviewStats {
  totalTracks: number;
  totalModules: number;
  completedModules: number;
  completedMinutes: number;
  currentStreak: number;
}

export interface DailyGoalProgress {
  completedToday: number;
  dailyGoal: number;
  percentage: number;
  remaining: number;
  isGoalMet: boolean;
}

export interface DailyQuotaStatus {
  allowed: boolean;
  remainingToday: number;
  todayKey: string;
}

export interface TrackAccuracySummary {
  accuracyPercent: number;
  stars: number;
  evaluatedCount: number;
}

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseCompletionDateKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return toLocalDateKey(parsed);
}

export function computeCurrentStreak(
  completionDates: string[],
  referenceDate: Date = new Date(),
): number {
  const activeDays = new Set<string>();
  for (const raw of completionDates) {
    const key = parseCompletionDateKey(raw);
    if (key) {
      activeDays.add(key);
    }
  }

  if (activeDays.size === 0) {
    return 0;
  }

  const cursor = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const todayKey = toLocalDateKey(cursor);

  if (!activeDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(toLocalDateKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDays.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeDailyGoalProgress(
  moduleCompletedAt: Record<string, string>,
  dailyModuleGoal: number,
  referenceDate: Date = new Date(),
): DailyGoalProgress {
  const normalizedGoal = Math.max(1, Math.min(10, Math.round(dailyModuleGoal) || 1));
  const todayKey = toLocalDateKey(referenceDate);

  let completedToday = 0;
  for (const timestamp of Object.values(moduleCompletedAt)) {
    const key = parseCompletionDateKey(timestamp);
    if (key === todayKey) {
      completedToday += 1;
    }
  }

  const percentage = Math.min(
    100,
    Math.round((completedToday / normalizedGoal) * 100),
  );

  return {
    completedToday,
    dailyGoal: normalizedGoal,
    percentage,
    remaining: Math.max(0, normalizedGoal - completedToday),
    isGoalMet: completedToday >= normalizedGoal,
  };
}

export function computeAttemptAccuracy(attempts: number, passed: boolean): number {
  if (!passed) return 0;
  const safeAttempts = Math.max(1, Math.round(attempts) || 1);
  if (safeAttempts === 1) return 100;
  if (safeAttempts === 2) return 85;
  if (safeAttempts === 3) return 70;
  if (safeAttempts === 4) return 55;
  return 45;
}

export function computeCertificateStars(accuracyPercent: number): number {
  const score = Math.max(0, Math.min(100, Math.round(accuracyPercent)));
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export function computeTrackAccuracyAndStars(
  track: CurriculumTrack | null | undefined,
  moduleAccuracy: Record<string, ModuleAccuracyEntry>,
  completedModuleIds: string[],
): TrackAccuracySummary {
  if (!track || track.modules.length === 0) {
    return { accuracyPercent: 0, stars: 1, evaluatedCount: 0 };
  }

  const completedSet = new Set(completedModuleIds);
  let scoreSum = 0;
  let counted = 0;

  for (const mod of track.modules) {
    const entry = moduleAccuracy[mod.id];
    if (entry && entry.attempts > 0) {
      scoreSum += Math.max(0, Math.min(100, entry.bestAccuracy));
      counted += 1;
    } else if (completedSet.has(mod.id)) {
      scoreSum += 70;
      counted += 1;
    }
  }

  const accuracyPercent = counted > 0 ? Math.round(scoreSum / counted) : 0;
  return {
    accuracyPercent,
    stars: computeCertificateStars(accuracyPercent),
    evaluatedCount: counted,
  };
}

export function canGenerateCurriculumToday(
  lastGeneratedDate: string,
  dailyGenerationCount: number,
  referenceDate: Date = new Date(),
): DailyQuotaStatus {
  const todayKey = toLocalDateKey(referenceDate);
  const usedToday = lastGeneratedDate === todayKey ? Math.max(0, dailyGenerationCount) : 0;
  const remainingToday = Math.max(0, 1 - usedToday);

  return {
    allowed: remainingToday > 0,
    remainingToday,
    todayKey,
  };
}

export function calculateTrackProgress(
  track: CurriculumTrack | null | undefined,
  completedModuleIds: string[],
): TrackProgressSummary {
  if (!track || track.modules.length === 0) {
    return {
      completedCount: 0,
      totalCount: 0,
      percentage: 0,
      nextModuleId: null,
    };
  }

  const completedSet = new Set(completedModuleIds);
  const completedCount = track.modules.filter((m) =>
    completedSet.has(m.id),
  ).length;
  const totalCount = track.modules.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const nextModule =
    track.modules.find((m) => !completedSet.has(m.id)) ?? track.modules[0];

  return {
    completedCount,
    totalCount,
    percentage,
    nextModuleId: nextModule ? nextModule.id : null,
  };
}

export function computeLearningStats(
  tracks: CurriculumTrack[],
  completedModuleIds: string[],
  moduleCompletedAt: Record<string, string> = {},
  referenceDate: Date = new Date(),
): LearningOverviewStats {
  const completedSet = new Set(completedModuleIds);
  let totalModules = 0;
  let completedModules = 0;
  let completedMinutes = 0;
  const activeCompletionDates: string[] = [];

  for (const track of tracks) {
    for (const mod of track.modules) {
      totalModules += 1;
      if (completedSet.has(mod.id)) {
        completedModules += 1;
        completedMinutes += mod.estimatedMinutes;
        if (moduleCompletedAt[mod.id]) {
          activeCompletionDates.push(moduleCompletedAt[mod.id]);
        }
      }
    }
  }

  for (const id of completedSet) {
    if (moduleCompletedAt[id]) {
      activeCompletionDates.push(moduleCompletedAt[id]);
    }
  }

  return {
    totalTracks: tracks.length,
    totalModules,
    completedModules,
    completedMinutes,
    currentStreak: computeCurrentStreak(activeCompletionDates, referenceDate),
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
      : (['sql', 'java', 'cpp', 'python', 'javascript'] as LanguageId[]);

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
]);

export function validatePersonalizationInput(
  input: PersonalizationRequest,
): ValidationResult {
  const errors: Partial<Record<keyof PersonalizationRequest, string>> = {};

  if (!VALID_LANGUAGES.has(input.language)) {
    errors.language = 'Select one of the five supported languages.';
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
