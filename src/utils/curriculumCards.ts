import type { CurriculumModule } from '../types/curriculum';

export type ModuleProgressStatus = 'completed' | 'available' | 'locked';

export function extractCoreObjectives(
  module: Pick<CurriculumModule, 'syntaxTopics' | 'challenge' | 'summary'>,
  maxItems = 3,
): string[] {
  const seen = new Set<string>();
  const collected: string[] = [];

  const pushUnique = (raw: string) => {
    const cleaned = raw.replace(/`/g, '').trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(cleaned);
  };

  for (const topic of module.syntaxTopics ?? []) {
    pushUnique(topic);
    if (collected.length >= maxItems) return collected;
  }

  for (const concept of module.challenge?.expectedConcepts ?? []) {
    pushUnique(concept);
    if (collected.length >= maxItems) return collected;
  }

  if (collected.length === 0 && module.summary) {
    pushUnique(module.summary);
  }

  return collected.slice(0, maxItems);
}

export function getModuleStatusLabel(status: ModuleProgressStatus): string {
  if (status === 'completed') return 'Done';
  if (status === 'available') return 'Next';
  return 'Locked';
}

export function getTrackStatusLabel(
  status: 'active' | 'completed' | 'locked',
): string {
  if (status === 'completed') return 'Completed';
  if (status === 'locked') return 'Locked';
  return 'Active';
}

export function formatModuleCountLabel(
  completedCount: number,
  totalCount: number,
): string {
  const safeTotal = Math.max(0, totalCount);
  const safeDone = Math.max(0, Math.min(completedCount, safeTotal));
  return `${safeDone}/${safeTotal} modules`;
}
