import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Layers,
  Loader2,
  User,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { DailyGoalHearts } from '../components/DailyGoalHearts';
import { FlamingIcon } from '../components/FlamingIcon';
import { LanguageIcon } from '../components/LanguageIcon';
import { SkillLevelFlipCard } from '../components/SkillLevelFlipCard';
import { useAppAuth } from '../context/AppAuthContext';
import {
  DAILY_GOAL_PRESETS,
  LANGUAGE_MAP,
  LEARNING_FOCUS_OPTIONS,
  SKILL_LEVELS,
  SUPPORTED_LANGUAGES,
} from '../data/languages';
import type { LanguageId, LearningFocus } from '../types/curriculum';
import {
  ONBOARDING_PROGRESS,
  getPreviousOnboardingStep,
  isValidOnboardingStep,
  validateOnboardingUsername,
  type DraftOnboardingState,
  type OnboardingStepId,
} from '../utils/onboardingSteps';

export function OnboardingView() {
  const navigate = useNavigate();
  const { step: stepParam } = useParams<{ step?: string }>();
  const { user, authReady, dataLoading, profile, saveOnboardingProfile } =
    useAppAuth();

  const currentStep: OnboardingStepId = isValidOnboardingStep(stepParam)
    ? stepParam
    : 'username';

  const draftKey = user ? `recurry_onboarding_draft_${user.uid}` : null;

  const [draft, setDraft] = useState<DraftOnboardingState>(() => {
    const fallbackName =
      profile?.username ||
      user?.displayName?.split(' ')[0] ||
      user?.email?.split('@')[0] ||
      '';
    return {
      username: fallbackName,
      preferredLanguage: profile?.preferredLanguage ?? 'python',
      skillLevel: profile?.skillLevel ?? 'intern',
      learningFocus: profile?.learningFocus ?? 'syntax',
      dailyModuleGoal: profile?.dailyModuleGoal ?? 2,
    };
  });

  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = window.sessionStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DraftOnboardingState>;
        setDraft((prev) => ({
          username: parsed.username ?? prev.username,
          preferredLanguage: parsed.preferredLanguage ?? prev.preferredLanguage,
          skillLevel: parsed.skillLevel ?? prev.skillLevel,
          learningFocus: parsed.learningFocus ?? prev.learningFocus,
          dailyModuleGoal: parsed.dailyModuleGoal ?? prev.dailyModuleGoal,
        }));
        return;
      }
    } catch {
      // ignore storage read errors
    }

    const fallback =
      profile?.username ||
      user?.displayName?.split(' ')[0] ||
      user?.email?.split('@')[0] ||
      '';
    setDraft((prev) => ({
      username: prev.username || fallback,
      preferredLanguage: profile?.preferredLanguage ?? prev.preferredLanguage,
      skillLevel: profile?.skillLevel ?? prev.skillLevel,
      learningFocus: profile?.learningFocus ?? prev.learningFocus,
      dailyModuleGoal: profile?.dailyModuleGoal ?? prev.dailyModuleGoal,
    }));
  }, [
    draftKey,
    profile?.username,
    profile?.preferredLanguage,
    profile?.skillLevel,
    profile?.learningFocus,
    profile?.dailyModuleGoal,
    user?.displayName,
    user?.email,
  ]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // ignore storage write errors
    }
  }, [draftKey, draft]);

  if (!authReady || (user && dataLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4 dark:bg-[#121212]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-neutral-300">
          <Loader2
            className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
          <span>Loading onboarding...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!stepParam || !isValidOnboardingStep(stepParam)) {
    return <Navigate to="/onboarding/username" replace />;
  }

  const prevStep = getPreviousOnboardingStep(currentStep);

  function goToStep(nextStep: OnboardingStepId, dir: 1 | -1) {
    setError(null);
    setDirection(dir);
    navigate(`/onboarding/${nextStep}`);
  }

  function handleBack() {
    if (prevStep) {
      goToStep(prevStep, -1);
    }
  }

  function handleNextFromUsername(e: FormEvent) {
    e.preventDefault();
    const check = validateOnboardingUsername(draft.username);
    if (!check.valid) {
      setError(check.error ?? 'Pick a username between 2 and 32 characters.');
      return;
    }
    setDraft((prev) => ({ ...prev, username: check.cleaned }));
    goToStep('language', 1);
  }

  async function handleFinishAndGenerate() {
    setError(null);
    const check = validateOnboardingUsername(draft.username);
    if (!check.valid) {
      setError(check.error ?? 'Username must be 2 to 32 characters.');
      goToStep('username', -1);
      return;
    }

    setSubmitting(true);
    try {
      await saveOnboardingProfile({
        username: check.cleaned,
        preferredLanguage: draft.preferredLanguage,
        skillLevel: draft.skillLevel,
        learningFocus: draft.learningFocus,
        dailyModuleGoal: draft.dailyModuleGoal,
      });
      if (draftKey) {
        window.sessionStorage.removeItem(draftKey);
      }
      navigate('/generate?autostart=1', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save onboarding profile.',
      );
      setSubmitting(false);
    }
  }

  const progress = ONBOARDING_PROGRESS[currentStep];
  const selectedLang = LANGUAGE_MAP[draft.preferredLanguage];
  const selectedSkill =
    SKILL_LEVELS.find((s) => s.id === draft.skillLevel) ?? SKILL_LEVELS[1];
  const selectedFocus =
    LEARNING_FOCUS_OPTIONS.find((f) => f.id === draft.learningFocus) ??
    LEARNING_FOCUS_OPTIONS[0];
  const cleanHandle = draft.username.trim() || 'Learner';

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#F7F8FA] text-[#0F172A] dark:bg-[#121212] dark:text-neutral-100">
      <header className="shrink-0 border-b border-slate-200/80 bg-white dark:border-neutral-800 dark:bg-[#181818]">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-4 px-4 sm:px-6">
          {prevStep ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Previous step"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-[#242424] dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <BrandLogo size="sm" />
          )}

          <div className="flex-1">
            <div
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Onboarding progress"
              className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-800"
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          <span className="shrink-0 font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
            {progress.label}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div
          key={currentStep}
          className={`w-full ${
            direction === 1 ? 'animate-step-forward' : 'animate-step-back'
          }`}
        >
          {currentStep === 'username' && (
            <form
              onSubmit={handleNextFromUsername}
              className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]"
            >
              <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  Pick your handle
                </h1>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Shown on your profile, leaderboard, and certificates.
                </p>
              </div>

              <div>
                <label htmlFor="onboarding-username" className="sr-only">
                  Username
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
                    aria-hidden="true"
                  />
                  <input
                    id="onboarding-username"
                    type="text"
                    autoFocus
                    required
                    minLength={2}
                    maxLength={32}
                    value={draft.username}
                    onChange={(e) => {
                      setError(null);
                      setDraft((prev) => ({ ...prev, username: e.target.value }));
                    }}
                    placeholder="ada_lovelace"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-11 font-display text-base font-semibold text-slate-950 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <span>Continue</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </form>
          )}

          {currentStep === 'language' && (
            <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
              <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  Choose your first language
                </h1>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Pick from six supported languages.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 flex items-center">
                    <LanguageIcon
                      language={draft.preferredLanguage}
                      className="h-5 w-5"
                    />
                  </span>
                  <label htmlFor="onboarding-language-select" className="sr-only">
                    Language
                  </label>
                  <select
                    id="onboarding-language-select"
                    value={draft.preferredLanguage}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        preferredLanguage: e.target.value as LanguageId,
                      }))
                    }
                    className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white pr-4 pl-11 text-sm font-semibold text-slate-950 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-[#141414] dark:text-white"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name} — {lang.standardLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                  {selectedLang.summary}
                </p>
              </div>

              <button
                type="button"
                onClick={() => goToStep('welcome', 1)}
                className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <span>Continue</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {currentStep === 'welcome' && (
            <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-7 text-center dark:border-neutral-800 dark:bg-[#181818]">
              <div className="mx-auto flex justify-center">
                <LanguageIcon language={selectedLang.id} className="h-11 w-11" />
              </div>

              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  {selectedLang.name} is ready, @{cleanHandle}
                </h1>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                  {selectedLang.keyConstructs.slice(0, 4).join(' · ')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => goToStep('level', 1)}
                className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <span>Pick Your Level</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {currentStep === 'level' && (
            <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
              <div className="space-y-1 text-center">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  What&apos;s your {selectedLang.name} level?
                </h1>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Flip through tiers to match your pace.
                </p>
              </div>

              <SkillLevelFlipCard
                value={draft.skillLevel}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, skillLevel: next }))
                }
                languageName={selectedLang.name}
              />

              <button
                type="button"
                onClick={() => goToStep('focus', 1)}
                className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <span>Continue</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {currentStep === 'focus' && (
            <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
              <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  What do you want to master?
                </h1>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Balance syntax fluency and problem-solving drills.
                </p>
              </div>

              <div className="space-y-2.5">
                <label htmlFor="onboarding-focus-select" className="sr-only">
                  Learning focus
                </label>
                <select
                  id="onboarding-focus-select"
                  value={draft.learningFocus}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      learningFocus: e.target.value as LearningFocus,
                    }))
                  }
                  className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-[#141414] dark:text-white"
                >
                  {LEARNING_FOCUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {selectedFocus.tag}
                </p>
              </div>

              <button
                type="button"
                onClick={() => goToStep('blueprint', 1)}
                className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <span>Continue</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {currentStep === 'blueprint' && (
            <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-7 text-center dark:border-neutral-800 dark:bg-[#181818]">
              <Layers
                className="mx-auto h-9 w-9 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />

              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  Built for {selectedSkill.label} {selectedLang.name}
                </h1>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                  6 progressive modules focused on {selectedFocus.label.toLowerCase()}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => goToStep('goal', 1)}
                className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <span>Set Daily Pace</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {currentStep === 'goal' && (
            <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                    Daily pace
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Fill your hearts each day to keep your streak alive.
                  </p>
                </div>

                <DailyGoalHearts
                  completedToday={1}
                  dailyGoal={draft.dailyModuleGoal}
                  size="md"
                />
              </div>

              <div className="grid grid-cols-5 gap-2">
                {DAILY_GOAL_PRESETS.map((preset) => {
                  const selected = draft.dailyModuleGoal === preset.modules;
                  return (
                    <button
                      key={preset.modules}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          dailyModuleGoal: preset.modules,
                        }))
                      }
                      aria-pressed={selected}
                      className={`btn-juice cursor-pointer rounded-xl px-2 py-3 text-center transition-colors ${
                        selected
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-mono text-base font-bold tabular-nums">
                        {preset.modules}
                      </div>
                      <div
                        className={`mt-0.5 text-[11px] ${
                          selected
                            ? 'text-blue-100'
                            : 'text-slate-500 dark:text-neutral-400'
                        }`}
                      >
                        {preset.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => goToStep('ready', 1)}
                className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <span>Continue</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {currentStep === 'ready' && (
            <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-7 text-center dark:border-neutral-800 dark:bg-[#181818]">
              <div className="mx-auto flex justify-center">
                <FlamingIcon active className="h-10 w-10" />
              </div>

              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  Ready to launch, @{cleanHandle}
                </h1>
                <p className="mx-auto max-w-xs text-xs text-slate-500 dark:text-neutral-400">
                  {selectedLang.name} · {selectedSkill.label} · {selectedFocus.label} ·{' '}
                  {draft.dailyModuleGoal}/day
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-center justify-center gap-2 text-xs text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleFinishAndGenerate()}
                className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Build My Curriculum</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
