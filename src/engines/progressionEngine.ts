import type {
  CurriculumModule,
  CurriculumTrack,
  ModuleAccuracyEntry,
} from '../types/curriculum';

export type ModuleGateStatus = 'completed' | 'available' | 'locked';

export interface ModuleProgressionNode {
  moduleId: string;
  order: number;
  title: string;
  status: ModuleGateStatus;
  xpReward: number;
  lockedReason: string | null;
}

export interface TrackProgressionState {
  nodes: ModuleProgressionNode[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  nextUnlockedModuleId: string | null;
  isTrackComplete: boolean;
  totalXpEarned: number;
  totalXpPossible: number;
}

export interface TrackProgressSummary {
  completedCount: number;
  totalCount: number;
  percentage: number;
  nextModuleId: string | null;
}

export interface TrackAccuracySummary {
  accuracyPercent: number;
  stars: number;
  evaluatedCount: number;
}

export interface TrackCompletionSnapshot {
  trackId: string;
  isComplete: boolean;
}

export function getModuleXpReward(mod: CurriculumModule): number {
  return Math.max(15, Math.min(100, Number(mod.xpReward) || 30));
}

export function evaluateTrackModulesProgression(
  track: CurriculumTrack | null | undefined,
  completedModuleIds: string[],
): TrackProgressionState {
  if (!track || track.modules.length === 0) {
    return {
      nodes: [],
      completedCount: 0,
      totalCount: 0,
      percentage: 0,
      nextUnlockedModuleId: null,
      isTrackComplete: false,
      totalXpEarned: 0,
      totalXpPossible: 0,
    };
  }

  const completedSet = new Set(completedModuleIds);
  const nodes: ModuleProgressionNode[] = [];
  let completedCount = 0;
  let totalXpEarned = 0;
  let totalXpPossible = 0;
  let nextUnlockedModuleId: string | null = null;
  let priorModulesAllComplete = true;

  for (let i = 0; i < track.modules.length; i += 1) {
    const mod = track.modules[i];
    const xpReward = getModuleXpReward(mod);
    totalXpPossible += xpReward;

    const isDone = completedSet.has(mod.id);
    let status: ModuleGateStatus;
    let lockedReason: string | null = null;

    if (isDone) {
      status = 'completed';
      completedCount += 1;
      totalXpEarned += xpReward;
    } else if (priorModulesAllComplete) {
      status = 'available';
      if (!nextUnlockedModuleId) {
        nextUnlockedModuleId = mod.id;
      }
      priorModulesAllComplete = false;
    } else {
      status = 'locked';
      const prev = track.modules[i - 1];
      lockedReason = prev
        ? `Complete "${prev.title}" first to unlock`
        : 'Complete previous modules to unlock';
    }

    nodes.push({
      moduleId: mod.id,
      order: mod.order,
      title: mod.title,
      status,
      xpReward,
      lockedReason,
    });
  }

  const totalCount = track.modules.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isTrackComplete = completedCount === totalCount && totalCount > 0;

  return {
    nodes,
    completedCount,
    totalCount,
    percentage,
    nextUnlockedModuleId: nextUnlockedModuleId ?? track.modules[0]?.id ?? null,
    isTrackComplete,
    totalXpEarned,
    totalXpPossible,
  };
}

export function isModuleUnlocked(
  track: CurriculumTrack | null | undefined,
  moduleId: string,
  completedModuleIds: string[],
): boolean {
  const progression = evaluateTrackModulesProgression(track, completedModuleIds);
  const node = progression.nodes.find((n) => n.moduleId === moduleId);
  return node ? node.status !== 'locked' : false;
}

export function calculateTrackProgress(
  track: CurriculumTrack | null | undefined,
  completedModuleIds: string[],
): TrackProgressSummary {
  const progression = evaluateTrackModulesProgression(track, completedModuleIds);
  return {
    completedCount: progression.completedCount,
    totalCount: progression.totalCount,
    percentage: progression.percentage,
    nextModuleId: progression.nextUnlockedModuleId,
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

export function shouldTriggerTrackCelebration(
  prev: TrackCompletionSnapshot | null,
  next: TrackCompletionSnapshot,
): boolean {
  if (!prev) {
    return false;
  }
  if (prev.trackId !== next.trackId) {
    return false;
  }
  return !prev.isComplete && next.isComplete;
}
