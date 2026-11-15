import { SKILL_LEVELS } from '../data/languages';
import { calculateTrackProgress } from '../engines/progressionEngine';
import type { CurriculumTrack, SkillLevel } from '../types/curriculum';

export const RANK_ORDER: SkillLevel[] = [
  'noob',
  'intern',
  'expert',
  'master',
  'legend',
];

export interface RankMeta {
  id: SkillLevel;
  label: string;
  tag: string;
  badgeBgClass: string;
  badgeBorderClass: string;
  badgeTextClass: string;
  iconColorClass: string;
}

const RANK_STYLE_MAP: Record<
  SkillLevel,
  Omit<RankMeta, 'id' | 'label' | 'tag'>
> = {
  noob: {
    badgeBgClass: 'bg-emerald-50/90 dark:bg-[#202020]',
    badgeBorderClass: 'border-emerald-200 dark:border-neutral-700',
    badgeTextClass: 'text-emerald-800 dark:text-neutral-200',
    iconColorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  intern: {
    badgeBgClass: 'bg-sky-50/90 dark:bg-[#202020]',
    badgeBorderClass: 'border-sky-200 dark:border-neutral-700',
    badgeTextClass: 'text-sky-800 dark:text-neutral-200',
    iconColorClass: 'text-sky-600 dark:text-sky-400',
  },
  expert: {
    badgeBgClass: 'bg-blue-50/90 dark:bg-[#202020]',
    badgeBorderClass: 'border-blue-200 dark:border-neutral-700',
    badgeTextClass: 'text-blue-800 dark:text-neutral-200',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
  },
  master: {
    badgeBgClass: 'bg-violet-50/90 dark:bg-[#202020]',
    badgeBorderClass: 'border-violet-200 dark:border-neutral-700',
    badgeTextClass: 'text-violet-800 dark:text-neutral-200',
    iconColorClass: 'text-violet-600 dark:text-violet-400',
  },
  legend: {
    badgeBgClass: 'bg-amber-50/90 dark:bg-[#202020]',
    badgeBorderClass: 'border-amber-200 dark:border-neutral-700',
    badgeTextClass: 'text-amber-900 dark:text-neutral-200',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
  },
};

export const RANK_META: Record<SkillLevel, RankMeta> = SKILL_LEVELS.reduce(
  (acc, item) => {
    acc[item.id] = {
      id: item.id,
      label: item.label,
      tag: item.tag,
      ...RANK_STYLE_MAP[item.id],
    };
    return acc;
  },
  {} as Record<SkillLevel, RankMeta>,
);

export function getRankMeta(rank: SkillLevel | string | undefined): RankMeta {
  if (rank && rank in RANK_META) {
    return RANK_META[rank as SkillLevel];
  }
  return RANK_META.noob;
}

export function rankFromCompletionPercent(percent: number): SkillLevel {
  const safe = Math.max(0, Math.min(100, Math.round(percent) || 0));
  if (safe >= 100) return 'legend';
  if (safe >= 70) return 'master';
  if (safe >= 40) return 'expert';
  if (safe > 0) return 'intern';
  return 'noob';
}

export interface ActiveRankProgress {
  rank: SkillLevel;
  meta: RankMeta;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
  hasActiveTrack: boolean;
  nextRank: SkillLevel | null;
  nextRankLabel: string | null;
}

export function resolveProgressRank(
  activeTrack: CurriculumTrack | null | undefined,
  completedModuleIds: string[],
  fallbackRank: SkillLevel = 'noob',
): ActiveRankProgress {
  if (!activeTrack || activeTrack.modules.length === 0) {
    const safeFallback = getRankMeta(fallbackRank).id;
    const idx = RANK_ORDER.indexOf(safeFallback);
    const nextRank =
      idx >= 0 && idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1] : null;
    return {
      rank: safeFallback,
      meta: getRankMeta(safeFallback),
      progressPercent: 0,
      completedModules: 0,
      totalModules: 0,
      hasActiveTrack: false,
      nextRank,
      nextRankLabel: nextRank ? getRankMeta(nextRank).label : null,
    };
  }

  const progress = calculateTrackProgress(activeTrack, completedModuleIds);
  const rank = rankFromCompletionPercent(progress.percentage);
  const idx = RANK_ORDER.indexOf(rank);
  const nextRank =
    idx >= 0 && idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1] : null;

  return {
    rank,
    meta: getRankMeta(rank),
    progressPercent: progress.percentage,
    completedModules: progress.completedCount,
    totalModules: progress.totalCount,
    hasActiveTrack: true,
    nextRank,
    nextRankLabel: nextRank ? getRankMeta(nextRank).label : null,
  };
}

export function getDailyStreakMotivation(
  currentStreak: number,
  activeToday: boolean,
): string {
  if (currentStreak <= 0) {
    return 'Complete a module or recall drill today to spark your streak.';
  }
  if (currentStreak === 1) {
    return activeToday
      ? 'Day 1 locked in — come back tomorrow to build momentum.'
      : '1-day streak active — practice today to keep it alive.';
  }
  if (currentStreak < 7) {
    return activeToday
      ? `${currentStreak} days strong! Today's learning session is logged.`
      : `${currentStreak}-day streak on the line — knock out a quick drill today.`;
  }
  return activeToday
    ? `Unstoppable ${currentStreak}-day streak — keep the momentum going!`
    : `${currentStreak}-day streak waiting — practice today to extend it.`;
}
