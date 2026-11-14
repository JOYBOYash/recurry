import confetti, { type Options as ConfettiOptions } from 'canvas-confetti';

export const CELEBRATION_CONFETTI_COLORS = [
  '#2563EB', // Cobalt Blue
  '#3B82F6', // Bright Blue
  '#F59E0B', // Amber Gold
  '#FBBF24', // Warm Gold
  '#10B981', // Emerald
  '#38BDF8', // Sky Blue
] as const;

export type ConfettiRunner = (
  options?: ConfettiOptions,
) => Promise<undefined> | null | void;

export interface TriggerConfettiOptions {
  runner?: ConfettiRunner;
}

export function triggerTrackCompletionConfetti(
  options: TriggerConfettiOptions = {},
): () => void {
  const fire: ConfettiRunner =
    options.runner ??
    (typeof window !== 'undefined' ? confetti : () => null);

  if (typeof window === 'undefined' && !options.runner) {
    return () => {};
  }

  const colors = [...CELEBRATION_CONFETTI_COLORS];
  const baseDefaults: ConfettiOptions = {
    colors,
    disableForReducedMotion: true,
    zIndex: 100,
    ticks: 220,
    gravity: 1.05,
    scalar: 1,
  };

  void fire({
    ...baseDefaults,
    particleCount: 75,
    spread: 72,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.62 },
  });

  const leftTimer = window.setTimeout(() => {
    void fire({
      ...baseDefaults,
      particleCount: 45,
      angle: 60,
      spread: 58,
      startVelocity: 46,
      origin: { x: 0.14, y: 0.68 },
    });
  }, 160);

  const rightTimer = window.setTimeout(() => {
    void fire({
      ...baseDefaults,
      particleCount: 45,
      angle: 120,
      spread: 58,
      startVelocity: 46,
      origin: { x: 0.86, y: 0.68 },
    });
  }, 320);

  return () => {
    window.clearTimeout(leftTimer);
    window.clearTimeout(rightTimer);
  };
}
