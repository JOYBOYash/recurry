import { Compass, Cpu, Crown, Sprout, Zap } from 'lucide-react';
import type { SkillLevel } from '../types/curriculum';
import { getRankMeta } from '../utils/rankSystem';

const RANK_ICON_COMPONENTS: Record<SkillLevel, typeof Sprout> = {
  noob: Sprout,
  intern: Compass,
  expert: Zap,
  master: Cpu,
  legend: Crown,
};

interface RankIconProps {
  rank: SkillLevel;
  className?: string;
  useRankColor?: boolean;
}

export function RankIcon({
  rank,
  className = 'h-4 w-4',
  useRankColor = false,
}: RankIconProps) {
  const Icon = RANK_ICON_COMPONENTS[rank] ?? Sprout;
  const meta = getRankMeta(rank);
  const resolvedClass = useRankColor
    ? `${className} ${meta.iconColorClass}`
    : className;

  return <Icon className={resolvedClass} aria-hidden="true" />;
}

interface RankBadgeProps {
  rank: SkillLevel;
  progressPercent?: number;
  hasActiveTrack?: boolean;
  size?: 'sm' | 'md';
  showProgress?: boolean;
}

export function RankBadge({
  rank,
  progressPercent = 0,
  hasActiveTrack = false,
  size = 'md',
  showProgress = false,
}: RankBadgeProps) {
  const meta = getRankMeta(rank);
  const titleText = hasActiveTrack
    ? `Rank: ${meta.label} (${progressPercent}% active curriculum mastery)`
    : `Rank: ${meta.label} (${meta.tag})`;

  return (
    <span
      title={titleText}
      aria-label={titleText}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-xl border font-mono font-bold transition-colors ${meta.badgeBorderClass} ${meta.badgeBgClass} ${meta.badgeTextClass} ${
        size === 'sm'
          ? 'gap-1 px-2 py-1 text-[11px]'
          : 'gap-1.5 px-2.5 py-1 text-xs'
      }`}
    >
      <RankIcon
        rank={rank}
        useRankColor
        className={size === 'sm' ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'}
      />
      <span>{meta.label}</span>
      {showProgress && hasActiveTrack && (
        <span className="opacity-75 tabular-nums">· {progressPercent}%</span>
      )}
    </span>
  );
}
