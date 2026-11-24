export type DailyHeartState = 'filled' | 'blinking';

export type NewCurriculumStepId = 'language' | 'level' | 'focus' | 'plan';

export const NEW_CURRICULUM_STEP_ORDER: readonly NewCurriculumStepId[] = [
  'language',
  'level',
  'focus',
  'plan',
];

export const NEW_CURRICULUM_PROGRESS: Record<
  NewCurriculumStepId,
  { percent: number; label: string }
> = {
  language: { percent: 25, label: '1 of 4' },
  level: { percent: 50, label: '2 of 4' },
  focus: { percent: 75, label: '3 of 4' },
  plan: { percent: 100, label: 'Review' },
};

/**
 * Cycles an index cleanly through [0, length - 1] in either direction.
 */
export function cycleIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((current + delta) % length) + length) % length;
}

/**
 * Computes visual heart states for a user's daily module goal (clamped 1..5).
 * Earned slots are 'filled'; remaining unfinished slots are 'blinking'.
 */
export function computeDailyHeartStates(
  completedToday: number,
  dailyGoal: number,
): DailyHeartState[] {
  const safeGoal = Math.max(1, Math.min(5, Math.round(dailyGoal) || 2));
  const safeCompleted = Math.max(0, Math.min(safeGoal, Math.floor(completedToday) || 0));
  return Array.from({ length: safeGoal }, (_, idx) =>
    idx < safeCompleted ? 'filled' : 'blinking',
  );
}

export function parseFocusModeValue(raw: string | null | undefined): boolean {
  return raw === '1' || raw === 'true';
}

export function serializeFocusModeValue(enabled: boolean): '1' | '0' {
  return enabled ? '1' : '0';
}

export function getNextNewCurriculumStep(
  current: NewCurriculumStepId,
): NewCurriculumStepId | null {
  const idx = NEW_CURRICULUM_STEP_ORDER.indexOf(current);
  if (idx < 0 || idx >= NEW_CURRICULUM_STEP_ORDER.length - 1) return null;
  return NEW_CURRICULUM_STEP_ORDER[idx + 1];
}

export function getPreviousNewCurriculumStep(
  current: NewCurriculumStepId,
): NewCurriculumStepId | null {
  const idx = NEW_CURRICULUM_STEP_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return NEW_CURRICULUM_STEP_ORDER[idx - 1];
}

/**
 * Splits a reference solution into meaningful incremental chunks (non-empty lines)
 * so learners can reveal and append one step at a time instead of viewing the whole answer.
 */
export function splitSolutionIntoIncrementalSteps(solution: string): string[] {
  const lines = solution
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''));

  const chunks: string[] = [];
  for (const line of lines) {
    if (line.trim().length > 0) {
      chunks.push(line);
    }
  }
  return chunks;
}

/**
 * Appends a single code line/chunk onto an existing editor buffer cleanly.
 */
export function appendCodeLine(currentCode: string, chunk: string): string {
  const trimmedChunk = chunk.trimEnd();
  if (!trimmedChunk) return currentCode;
  if (!currentCode.trim()) return trimmedChunk;
  if (currentCode.includes(trimmedChunk.trim())) return currentCode;
  return `${currentCode.replace(/\s+$/, '')}\n${trimmedChunk}`;
}
