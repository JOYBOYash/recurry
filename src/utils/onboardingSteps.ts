import type { LanguageId, LearningFocus, SkillLevel } from '../types/curriculum';

export type OnboardingStepId =
  | 'username'
  | 'language'
  | 'welcome'
  | 'level'
  | 'focus'
  | 'blueprint'
  | 'goal'
  | 'ready';

export const ONBOARDING_STEP_ORDER: readonly OnboardingStepId[] = [
  'username',
  'language',
  'welcome',
  'level',
  'focus',
  'blueprint',
  'goal',
  'ready',
];

export const ONBOARDING_PROGRESS: Record<
  OnboardingStepId,
  { percent: number; label: string; isInterstitial: boolean }
> = {
  username: { percent: 15, label: '1 of 5', isInterstitial: false },
  language: { percent: 30, label: '2 of 5', isInterstitial: false },
  welcome: { percent: 42, label: 'Checkpoint', isInterstitial: true },
  level: { percent: 55, label: '3 of 5', isInterstitial: false },
  focus: { percent: 70, label: '4 of 5', isInterstitial: false },
  blueprint: { percent: 82, label: 'Calibrated', isInterstitial: true },
  goal: { percent: 94, label: '5 of 5', isInterstitial: false },
  ready: { percent: 100, label: 'Ready', isInterstitial: true },
};

export interface DraftOnboardingState {
  username: string;
  preferredLanguage: LanguageId;
  skillLevel: SkillLevel;
  learningFocus: LearningFocus;
  dailyModuleGoal: number;
}

export function isValidOnboardingStep(
  step: string | undefined,
): step is OnboardingStepId {
  if (!step) return false;
  return (ONBOARDING_STEP_ORDER as readonly string[]).includes(step);
}

export function getNextOnboardingStep(
  current: OnboardingStepId,
): OnboardingStepId | null {
  const idx = ONBOARDING_STEP_ORDER.indexOf(current);
  if (idx < 0 || idx >= ONBOARDING_STEP_ORDER.length - 1) {
    return null;
  }
  return ONBOARDING_STEP_ORDER[idx + 1];
}

export function getPreviousOnboardingStep(
  current: OnboardingStepId,
): OnboardingStepId | null {
  const idx = ONBOARDING_STEP_ORDER.indexOf(current);
  if (idx <= 0) {
    return null;
  }
  return ONBOARDING_STEP_ORDER[idx - 1];
}

export function validateOnboardingUsername(raw: string): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  const cleaned = raw.trim();
  if (cleaned.length < 2 || cleaned.length > 32) {
    return {
      valid: false,
      cleaned,
      error: 'Pick a username between 2 and 32 characters.',
    };
  }
  return { valid: true, cleaned };
}
