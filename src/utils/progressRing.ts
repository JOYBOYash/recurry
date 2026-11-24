export interface ProgressRingGeometryInput {
  percent: number;
  size: number;
  strokeWidth: number;
}

export interface ProgressRingGeometry {
  clampedPercent: number;
  center: number;
  radius: number;
  circumference: number;
  dashOffset: number;
}

/**
 * Pure geometry calculator for circular SVG progress rings.
 * Clamps percent to [0, 100] and returns exact circle & stroke-dashoffset metrics.
 */
export function computeProgressRingGeometry({
  percent,
  size,
  strokeWidth,
}: ProgressRingGeometryInput): ProgressRingGeometry {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const clampedPercent = Math.max(0, Math.min(100, safePercent));
  const safeSize = Math.max(8, size);
  const safeStroke = Math.max(1, Math.min(strokeWidth, safeSize / 2 - 1));
  const center = safeSize / 2;
  const radius = (safeSize - safeStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedPercent / 100);

  return {
    clampedPercent,
    center,
    radius,
    circumference,
    dashOffset,
  };
}
