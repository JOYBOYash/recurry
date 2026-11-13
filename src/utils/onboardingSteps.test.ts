import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_PROGRESS,
  ONBOARDING_STEP_ORDER,
  getNextOnboardingStep,
  getPreviousOnboardingStep,
  isValidOnboardingStep,
  validateOnboardingUsername,
} from './onboardingSteps';

test('ONBOARDING_STEP_ORDER has 5 question steps and 3 in-between screens in exact order', () => {
  assert.deepEqual(ONBOARDING_STEP_ORDER, [
    'username',
    'language',
    'welcome',
    'level',
    'focus',
    'blueprint',
    'goal',
    'ready',
  ]);
  const questions = ONBOARDING_STEP_ORDER.filter(
    (step) => !ONBOARDING_PROGRESS[step].isInterstitial,
  );
  const interstitials = ONBOARDING_STEP_ORDER.filter(
    (step) => ONBOARDING_PROGRESS[step].isInterstitial,
  );
  assert.equal(questions.length, 5);
  assert.equal(interstitials.length, 3);
});

test('progress increases monotonically across all onboarding steps', () => {
  let lastPercent = 0;
  for (const step of ONBOARDING_STEP_ORDER) {
    const { percent } = ONBOARDING_PROGRESS[step];
    assert.ok(percent > lastPercent, `Expected ${step} percent > ${lastPercent}`);
    lastPercent = percent;
  }
  assert.equal(lastPercent, 100);
});

test('next and previous onboarding step navigation wraps cleanly at ends', () => {
  assert.equal(getPreviousOnboardingStep('username'), null);
  assert.equal(getNextOnboardingStep('username'), 'language');
  assert.equal(getNextOnboardingStep('language'), 'welcome');
  assert.equal(getPreviousOnboardingStep('welcome'), 'language');
  assert.equal(getNextOnboardingStep('ready'), null);
  assert.equal(getPreviousOnboardingStep('ready'), 'goal');
});

test('isValidOnboardingStep guards route parameters', () => {
  assert.equal(isValidOnboardingStep('welcome'), true);
  assert.equal(isValidOnboardingStep('blueprint'), true);
  assert.equal(isValidOnboardingStep('unknown'), false);
  assert.equal(isValidOnboardingStep(undefined), false);
});

test('validateOnboardingUsername trims whitespace and enforces 2..32 chars', () => {
  assert.equal(validateOnboardingUsername(' ').valid, false);
  assert.equal(validateOnboardingUsername('a').valid, false);
  assert.equal(validateOnboardingUsername('x'.repeat(33)).valid, false);
  const ok = validateOnboardingUsername('  ada_lovelace  ');
  assert.equal(ok.valid, true);
  assert.equal(ok.cleaned, 'ada_lovelace');
});
