import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Code2,
  Coffee,
  Compass,
  Cpu,
  Crown,
  Flame,
  Layers,
  Loader2,
  Sprout,
  Target,
  Terminal,
  User,
  Zap,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { LanguageIcon } from '../components/LanguageIcon';
import { useAppAuth } from '../context/AppAuthContext';
import {
  BEGINNING_FIVE_LANGUAGES,
  DAILY_GOAL_PRESETS,
  LANGUAGE_MAP,
  LEARNING_FOCUS_OPTIONS,
  SKILL_LEVELS,
} from '../data/languages';
import type { SkillLevel } from '../types/curriculum';
import {
  ONBOARDING_PROGRESS,
  type DraftOnboardingState,
  type OnboardingStepId,
  getPreviousOnboardingStep,
  isValidOnboardingStep,
  validateOnboardingUsername,
} from '../utils/onboardingSteps';

const SKILL_CORNER_ICON: Record<SkillLevel, typeof Sprout> = {
  noob: Sprout,
  intern: Compass,
  expert: Zap,
  master: Cpu,
  legend: Crown,
};

const GOAL_CORNER_ICON: Record<number, typeof Coffee> = {
  1: Coffee,
  2: Target,
  3: Zap,
  5: Flame,
};

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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
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
    <div className="flex min-h-screen flex-col bg-[#F7F8FA] text-[#0F172A]">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-4 px-4 sm:px-6">
          {prevStep ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Previous step"
              className="btn-juice inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <span className="font-display text-lg font-bold text-slate-950">
              recurry
            </span>
          )}

          <div className="flex-1">
            <div
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Onboarding progress"
              className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          <span className="shrink-0 font-mono text-xs font-semibold text-slate-500 tabular-nums">
            {progress.label}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <div
          key={currentStep}
          className={`w-full ${
            direction === 1 ? 'animate-step-forward' : 'animate-step-back'
          }`}
        >
            {currentStep === 'username' && (
              <form
                onSubmit={handleNextFromUsername}
                className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
              >
                <div className="space-y-1.5">
                  <span className="font-mono text-xs font-semibold text-blue-700">
                    HANDLE
                  </span>
                  <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                    Pick your handle
                  </h1>
                  <p className="text-sm text-slate-600">
                    This appears on your streak profile and certificates.
                  </p>
                </div>

                <div>
                  <label htmlFor="onboarding-username" className="sr-only">
                    Username
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                      className="min-h-13 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 font-display text-lg font-semibold text-slate-950 placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-juice group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
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
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="space-y-1.5">
                  <span className="font-mono text-xs font-semibold text-blue-700">
                    LANGUAGE
                  </span>
                  <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                    Choose your first language
                  </h1>
                  <p className="text-sm text-slate-600">
                    Start with one of the Beginning Five.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {BEGINNING_FIVE_LANGUAGES.map((lang) => {
                    const selected = draft.preferredLanguage === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, preferredLanguage: lang.id }))
                        }
                        aria-pressed={selected}
                        className={`btn-juice group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border-2 bg-white p-4 text-left ${
                          selected
                            ? 'border-blue-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="relative z-10 flex items-center gap-3.5">
                          <LanguageIcon language={lang.id} className="h-7 w-7" />
                          <div>
                            <div className="font-display text-base font-bold text-slate-950">
                              {lang.name}
                            </div>
                            <div className="font-mono text-xs text-slate-500">
                              {lang.standardLabel}
                            </div>
                          </div>
                        </div>
                        <span
                          aria-hidden="true"
                          className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <LanguageIcon
                          language={lang.id}
                          className={`pointer-events-none absolute -right-2 -bottom-3 h-16 w-16 -rotate-12 transition-transform duration-200 group-hover:scale-110 ${
                            selected ? 'opacity-[0.14]' : 'opacity-[0.06]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => goToStep('welcome', 1)}
                  className="btn-juice group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
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
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-10">
                <div className="mx-auto flex justify-center">
                  <LanguageIcon language={selectedLang.id} className="h-12 w-12" />
                </div>

                <div className="space-y-2">
                  <span className="font-mono text-xs font-semibold text-blue-700">
                    GREAT CHOICE, @{cleanHandle}
                  </span>
                  <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                    {selectedLang.name} is ready to unlock
                  </h1>
                  <p className="mx-auto max-w-md text-sm text-slate-600">
                    {selectedLang.summary}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
                  {selectedLang.keyConstructs.slice(0, 4).map((item) => (
                    <span
                      key={item}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-medium text-slate-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => goToStep('level', 1)}
                  className="btn-juice group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <span>Dial In Your Level</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            )}

            {currentStep === 'level' && (
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="space-y-1.5">
                  <span className="font-mono text-xs font-semibold text-blue-700">
                    SKILL RANK
                  </span>
                  <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                    What&apos;s your {selectedLang.name} rank?
                  </h1>
                  <p className="text-sm text-slate-600">
                    We match module complexity and challenge hints to your tier.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {SKILL_LEVELS.map((lvl) => {
                    const selected = draft.skillLevel === lvl.id;
                    const CornerIcon = SKILL_CORNER_ICON[lvl.id];
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, skillLevel: lvl.id }))
                        }
                        aria-pressed={selected}
                        className={`btn-juice group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border-2 bg-white px-4 py-3.5 text-left ${
                          selected
                            ? 'border-blue-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="relative z-10">
                          <div className="font-display text-base font-bold text-slate-950">
                            {lvl.label}
                          </div>
                          <div className="text-xs text-slate-500">{lvl.tag}</div>
                        </div>
                        <span
                          aria-hidden="true"
                          className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <CornerIcon
                          aria-hidden="true"
                          className={`pointer-events-none absolute -right-2 -bottom-3 h-16 w-16 -rotate-12 transition-transform duration-200 group-hover:scale-110 ${
                            selected
                              ? 'text-blue-600 opacity-[0.14]'
                              : 'text-slate-400 opacity-[0.12]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => goToStep('focus', 1)}
                  className="btn-juice group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
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
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="space-y-1.5">
                  <span className="font-mono text-xs font-semibold text-blue-700">
                    LEARNING FOCUS
                  </span>
                  <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                    What do you want to master?
                  </h1>
                  <p className="text-sm text-slate-600">
                    Choose how your modules balance grammar and coding drills.
                  </p>
                </div>

                <div className="space-y-3">
                  {LEARNING_FOCUS_OPTIONS.map((opt) => {
                    const selected = draft.learningFocus === opt.id;
                    const CornerIcon = opt.id === 'syntax' ? Code2 : Terminal;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, learningFocus: opt.id }))
                        }
                        aria-pressed={selected}
                        className={`btn-juice group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border-2 bg-white p-5 text-left ${
                          selected
                            ? 'border-blue-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="relative z-10">
                          <div className="font-display text-lg font-bold text-slate-950">
                            {opt.label}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-600">
                            {opt.tag}
                          </div>
                        </div>
                        <span
                          aria-hidden="true"
                          className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <CornerIcon
                          aria-hidden="true"
                          className={`pointer-events-none absolute -right-2 -bottom-3 h-20 w-20 -rotate-12 transition-transform duration-200 group-hover:scale-110 ${
                            selected
                              ? 'text-blue-600 opacity-[0.14]'
                              : 'text-slate-400 opacity-[0.12]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => goToStep('blueprint', 1)}
                  className="btn-juice group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
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
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-10">
                <Layers className="mx-auto h-10 w-10 text-blue-600" aria-hidden="true" />

                <div className="space-y-2">
                  <span className="font-mono text-xs font-semibold text-blue-700">
                    CURRICULUM CALIBRATED
                  </span>
                  <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                    Built for {selectedSkill.label} {selectedLang.name}
                  </h1>
                  <p className="mx-auto max-w-sm text-sm text-slate-600">
                    6 progressive modules tailored for {selectedFocus.label.toLowerCase()}, ending with a star-ranked certificate.
                  </p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white py-3.5 text-center">
                  <div>
                    <div className="font-mono text-[11px] text-slate-500">RANK</div>
                    <div className="mt-0.5 font-display text-sm font-bold text-slate-950">
                      {selectedSkill.label}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] text-slate-500">FOCUS</div>
                    <div className="mt-0.5 font-display text-sm font-bold text-slate-950">
                      {draft.learningFocus === 'syntax' ? 'Syntax' : 'Problems'}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] text-slate-500">MODULES</div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-blue-700 tabular-nums">
                      6 tracks
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => goToStep('goal', 1)}
                  className="btn-juice group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <span>Set Your Daily Pace</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            )}

            {currentStep === 'goal' && (
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="font-mono text-xs font-semibold text-blue-700">
                      DAILY GOAL
                    </span>
                    <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                      Pick a daily module goal
                    </h1>
                    <p className="text-sm text-slate-600">
                      Stay consistent to fill your ring and grow your streak.
                    </p>
                  </div>

                  <DailyGoalRing
                    goal={{
                      completedToday: 1,
                      dailyGoal: draft.dailyModuleGoal,
                      percentage: Math.min(
                        100,
                        Math.round((1 / draft.dailyModuleGoal) * 100),
                      ),
                      remaining: Math.max(0, draft.dailyModuleGoal - 1),
                      isGoalMet: draft.dailyModuleGoal <= 1,
                    }}
                    size={54}
                    strokeWidth={5}
                  />
                </div>

                <div className="space-y-2.5">
                  {DAILY_GOAL_PRESETS.map((preset) => {
                    const selected = draft.dailyModuleGoal === preset.modules;
                    const CornerIcon = GOAL_CORNER_ICON[preset.modules] ?? Flame;
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
                        className={`btn-juice group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border-2 bg-white px-4 py-3.5 text-left ${
                          selected
                            ? 'border-blue-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="relative z-10">
                          <div className="font-mono text-sm font-bold text-slate-950 tabular-nums">
                            {preset.modules} {preset.modules === 1 ? 'module' : 'modules'}/day
                          </div>
                          <div className="text-xs text-slate-500">{preset.label}</div>
                        </div>
                        <span
                          aria-hidden="true"
                          className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <CornerIcon
                          aria-hidden="true"
                          className={`pointer-events-none absolute -right-2 -bottom-3 h-16 w-16 -rotate-12 transition-transform duration-200 group-hover:scale-110 ${
                            selected
                              ? 'text-blue-600 opacity-[0.14]'
                              : 'text-slate-400 opacity-[0.12]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => goToStep('ready', 1)}
                  className="btn-juice group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
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
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-10">
                <div className="mx-auto flex items-center justify-center gap-4">
                  <Flame
                    className="h-9 w-9 fill-amber-500/20 text-amber-500"
                    aria-hidden="true"
                  />
                  <Award className="h-9 w-9 text-blue-600" aria-hidden="true" />
                </div>

                <div className="space-y-2">
                  <span className="font-mono text-xs font-semibold text-emerald-700">
                    PROFILE COMPLETE
                  </span>
                  <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                    Ready to launch, @{cleanHandle}!
                  </h1>
                  <p className="mx-auto max-w-sm text-sm text-slate-600">
                    Your {selectedLang.name} track ({selectedSkill.label}) is queued with a {draft.dailyModuleGoal}/day goal.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-left text-xs text-slate-700">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Language</span>
                    <span className="font-mono font-bold text-slate-950">
                      {selectedLang.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Rank &amp; Focus</span>
                    <span className="font-mono font-bold text-slate-950">
                      {selectedSkill.label} · {selectedFocus.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Daily Goal</span>
                    <span className="font-mono font-bold text-blue-700 tabular-nums">
                      {draft.dailyModuleGoal}/day
                    </span>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-left text-xs text-red-800"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleFinishAndGenerate()}
                  className="btn-juice group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Saving Profile...</span>
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
