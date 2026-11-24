import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Layers,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LanguageIcon } from '../components/LanguageIcon';
import { SkillLevelFlipCard } from '../components/SkillLevelFlipCard';
import { toLocalDateKey, useAppAuth } from '../context/AppAuthContext';
import {
  LANGUAGE_MAP,
  LEARNING_FOCUS_OPTIONS,
  PACE_DEPTHS,
  SUPPORTED_LANGUAGES,
} from '../data/languages';
import { buildProgrammeBlueprint } from '../engines/programmesEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type {
  CurriculumTrack,
  LanguageId,
  LearningFocus,
  PaceDepth,
  SkillLevel,
} from '../types/curriculum';
import { checkApiHealth, type ApiHealthStatus } from '../utils/apiHealth';
import { consumeNdjsonStream } from '../utils/apiResponse';
import { validatePersonalizationInput } from '../utils/curriculumLogic';
import {
  NEW_CURRICULUM_PROGRESS,
  getNextNewCurriculumStep,
  getPreviousNewCurriculumStep,
  type NewCurriculumStepId,
} from '../utils/uxFlowLogic';

export function GeneratingTrackView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoStart = searchParams.get('autostart') === '1';

  const isOnline = useOnlineStatus();
  const {
    user,
    authReady,
    dataLoading,
    profile,
    quota,
    programmeLock,
    getIdToken,
    saveGeneratedTrack,
  } = useAppAuth();

  const [language, setLanguage] = useState<LanguageId>(
    profile?.preferredLanguage ?? 'python',
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(
    profile?.skillLevel ?? 'intern',
  );
  const [learningFocus, setLearningFocus] = useState<LearningFocus>(
    profile?.learningFocus ?? 'syntax',
  );
  const [paceDepth, setPaceDepth] = useState<PaceDepth>('comprehensive');
  const [priorBackground, setPriorBackground] = useState('');
  const [focusNotes, setFocusNotes] = useState('');

  const [step, setStep] = useState<NewCurriculumStepId>('language');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<{
    status: ApiHealthStatus;
    reason: string | null;
  }>({ status: 'checking', reason: null });
  const autoStartedRef = useRef(false);
  const profileInitializedRef = useRef(false);

  useEffect(() => {
    if (profile && !profileInitializedRef.current) {
      profileInitializedRef.current = true;
      setLanguage(profile.preferredLanguage);
      setSkillLevel(profile.skillLevel);
      setLearningFocus(profile.learningFocus);
    }
  }, [profile]);

  const verifyEndpointHealth = useCallback(async (): Promise<boolean> => {
    if (!isOnline) {
      setApiHealth({
        status: 'unreachable',
        reason: 'Offline — connect to the internet to generate a curriculum.',
      });
      return false;
    }

    setApiHealth((prev) => ({
      status: 'checking',
      reason: prev.status === 'unreachable' ? prev.reason : null,
    }));

    const result = await checkApiHealth();
    if (result.reachable) {
      setApiHealth({ status: 'reachable', reason: null });
      return true;
    }

    setApiHealth({
      status: 'unreachable',
      reason: result.reason ?? 'Unable to reach the generation endpoint.',
    });
    return false;
  }, [isOnline]);

  useEffect(() => {
    if (
      authReady &&
      !dataLoading &&
      user &&
      profile?.onboardingCompleted &&
      quota.allowed &&
      programmeLock.canGenerateNewProgramme
    ) {
      void verifyEndpointHealth();
    }
  }, [
    authReady,
    dataLoading,
    user,
    profile?.onboardingCompleted,
    quota.allowed,
    programmeLock.canGenerateNewProgramme,
    verifyEndpointHealth,
  ]);

  const blueprint = useMemo(
    () =>
      buildProgrammeBlueprint({
        language,
        skillLevel,
        learningFocus,
        paceDepth,
        priorBackground,
        focusNotes,
      }),
    [language, skillLevel, learningFocus, paceDepth, priorBackground, focusNotes],
  );

  const runGeneration = useCallback(
    async (override?: {
      language: LanguageId;
      skillLevel: SkillLevel;
      learningFocus: LearningFocus;
      paceDepth: PaceDepth;
    }) => {
      setError(null);
      if (!isOnline) {
        setApiHealth({
          status: 'unreachable',
          reason: 'Offline — connect to the internet to generate a curriculum.',
        });
        return;
      }

      const targetLang = override?.language ?? language;
      const targetSkill = override?.skillLevel ?? skillLevel;
      const targetFocus = override?.learningFocus ?? learningFocus;
      const targetPace = override?.paceDepth ?? paceDepth;

      const validation = validatePersonalizationInput({
        language: targetLang,
        skillLevel: targetSkill,
        learningFocus: targetFocus,
        paceDepth: targetPace,
        priorBackground,
        focusNotes,
      });
      if (!validation.valid) {
        setError(
          Object.values(validation.errors).filter(Boolean)[0] ??
            'Check your curriculum options.',
        );
        return;
      }

      const endpointReachable = await verifyEndpointHealth();
      if (!endpointReachable) {
        setIsGenerating(false);
        return;
      }

      const activePlan = buildProgrammeBlueprint({
        language: targetLang,
        skillLevel: targetSkill,
        learningFocus: targetFocus,
        paceDepth: targetPace,
        priorBackground,
        focusNotes,
      });

      setIsGenerating(true);
      setStageIndex(1);

      try {
        const token = await getIdToken();
        const clientDateKey = toLocalDateKey(new Date());
        const response = await fetch('/api/curriculum/generate', {
          method: 'POST',
          headers: {
            Accept: 'application/x-ndjson, application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            language: targetLang,
            skillLevel: targetSkill,
            learningFocus: targetFocus,
            paceDepth: targetPace,
            priorBackground,
            focusNotes,
            clientDateKey,
            plannedTopics: activePlan.moduleSlots.map((slot) => slot.topicFocus),
          }),
        });

        const result = await consumeNdjsonStream<CurriculumTrack>(
          response,
          'Could not generate curriculum.',
          (stage) => {
            setStageIndex((prev) => Math.max(prev, Math.min(3, stage)));
          },
        );

        if (result.error || !result.track) {
          const message = result.error ?? 'Could not generate curriculum.';
          console.error('[generate] Server generation error:', {
            status: response.status,
            contentType: response.headers.get('content-type'),
            message,
          });
          setError(message);
          setIsGenerating(false);
          setStep('plan');
          return;
        }

        await saveGeneratedTrack(result.track, clientDateKey);
        navigate(`/app/learn/${encodeURIComponent(result.track.id)}`, {
          replace: true,
        });
      } catch (err) {
        console.error('[generate] Curriculum generation exception:', err);
        let message = 'Network error while generating curriculum.';
        if (err instanceof Error) {
          try {
            const parsed = JSON.parse(err.message) as { error?: string };
            message = parsed.error
              ? `Could not save curriculum: ${parsed.error}`
              : err.message;
          } catch {
            message = err.message;
          }
        }
        setError(message);
        setIsGenerating(false);
        setStep('plan');
      }
    },
    [
      isOnline,
      language,
      skillLevel,
      learningFocus,
      paceDepth,
      priorBackground,
      focusNotes,
      verifyEndpointHealth,
      getIdToken,
      saveGeneratedTrack,
      navigate,
    ],
  );

  useEffect(() => {
    if (
      autoStart &&
      authReady &&
      !dataLoading &&
      user &&
      profile?.onboardingCompleted &&
      quota.allowed &&
      programmeLock.canGenerateNewProgramme &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true;
      void runGeneration({
        language: profile.preferredLanguage,
        skillLevel: profile.skillLevel,
        learningFocus: profile.learningFocus,
        paceDepth: 'comprehensive',
      });
    }
  }, [
    autoStart,
    authReady,
    dataLoading,
    user,
    profile,
    quota.allowed,
    programmeLock.canGenerateNewProgramme,
    runGeneration,
  ]);

  if (authReady && !user) {
    return <Navigate to="/login" replace />;
  }

  if (authReady && !dataLoading && user && !profile?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  const prevStep = getPreviousNewCurriculumStep(step);
  const progress = NEW_CURRICULUM_PROGRESS[step];
  const selectedLangMeta = LANGUAGE_MAP[language];

  function handleNextStep() {
    setError(null);
    const next = getNextNewCurriculumStep(step);
    if (!next) return;
    if (next === 'plan') {
      const validation = validatePersonalizationInput({
        language,
        skillLevel,
        learningFocus,
        paceDepth,
        priorBackground,
        focusNotes,
      });
      if (!validation.valid) {
        setError(
          Object.values(validation.errors).filter(Boolean)[0] ??
            'Check your curriculum options.',
        );
        return;
      }
    }
    setDirection(1);
    setStep(next);
  }

  function handleBackStep() {
    setError(null);
    if (prevStep) {
      setDirection(-1);
      setStep(prevStep);
    } else {
      navigate('/app/curriculums');
    }
  }

  const stages = [
    'Sequencing modules',
    'Writing recall drills',
    'Finalizing code challenges',
  ];

  const canConfigure =
    !isGenerating &&
    programmeLock.canGenerateNewProgramme &&
    quota.allowed;

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#F7F8FA] text-[#0F172A] dark:bg-[#121212] dark:text-neutral-100">
      {/* Unified Step Header (Matches Onboarding Flow) */}
      <header className="shrink-0 border-b border-slate-200/80 bg-white dark:border-neutral-800 dark:bg-[#181818]">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-4 px-4 sm:px-6">
          {isGenerating ? (
            <Link
              to="/app/curriculums"
              aria-label="Back to Curriculums"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#242424] dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBackStep}
              aria-label={prevStep ? 'Previous step' : 'Back to Curriculums'}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-[#242424] dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {canConfigure ? (
            <>
              <div className="flex-1">
                <div
                  role="progressbar"
                  aria-valuenow={progress.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="New curriculum progress"
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
            </>
          ) : (
            <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
              New Curriculum
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-4 py-8 sm:px-6">
        {isGenerating ? (
          <section className="animate-view-enter w-full rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
            {(() => {
              const progressPct =
                stageIndex >= 3 ? 90 : stageIndex === 2 ? 62 : 30;
              return (
                <div className="mx-auto max-w-xs space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums dark:text-neutral-400">
                    <span>Building</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {progressPct}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Curriculum generation progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPct}
                    className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800"
                  >
                    <div
                      style={{ width: `${progressPct}%` }}
                      className="h-full rounded-full bg-blue-600 transition-all duration-700 ease-out"
                    />
                  </div>
                </div>
              );
            })()}

            <h1 className="mt-6 font-display text-2xl font-bold text-slate-950 dark:text-white">
              Building {blueprint.languageName} track
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
              {blueprint.moduleCount} progressive modules
            </p>

            <div className="mx-auto mt-6 max-w-xs space-y-2 text-left">
              {stages.map((label, idx) => {
                const active = stageIndex >= idx + 1;
                const done = stageIndex > idx + 1;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-slate-100 text-slate-950 dark:bg-[#222222] dark:text-white'
                        : 'text-slate-400 dark:text-neutral-500'
                    }`}
                  >
                    {done ? (
                      <Check
                        className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                    ) : active ? (
                      <Loader2
                        className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-neutral-700" />
                    )}
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : !programmeLock.canGenerateNewProgramme &&
          programmeLock.activeIncompleteTrackId ? (
          <section className="animate-view-enter w-full rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
            <Lock
              className="mx-auto h-7 w-7 text-amber-500"
              aria-hidden="true"
            />
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-white">
              Finish your active track first
            </h1>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600 dark:text-neutral-400">
              Complete{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {programmeLock.activeIncompleteTrackTitle}
              </span>{' '}
              ({programmeLock.activeIncompleteProgressPercent}%) to unlock your
              next curriculum.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Link
                to={`/app/learn/${encodeURIComponent(programmeLock.activeIncompleteTrackId)}`}
                className="btn-juice inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resume Track</span>
              </Link>
              <Link
                to="/app/curriculums"
                className="inline-flex h-10 items-center rounded-lg px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-[#222222]"
              >
                Curriculums
              </Link>
            </div>
          </section>
        ) : !quota.allowed ? (
          <section className="animate-view-enter w-full rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
            <Clock
              className="mx-auto h-7 w-7 text-amber-500"
              aria-hidden="true"
            />
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-white">
              Daily limit reached
            </h1>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-600 dark:text-neutral-400">
              1 free curriculum per day. Your quota resets tomorrow.
            </p>
            <Link
              to="/app/curriculums"
              className="btn-juice mt-6 inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Back to Curriculums
            </Link>
          </section>
        ) : (
          <div
            key={step}
            className={`w-full ${
              direction === 1 ? 'animate-step-forward' : 'animate-step-back'
            }`}
          >
            {/* Step 1: Language Dropdown */}
            {step === 'language' && (
              <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
                <div className="space-y-1">
                  <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                    Pick a language
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Choose what you want to practice next.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3.5 flex items-center">
                      <LanguageIcon language={language} className="h-5 w-5" />
                    </span>
                    <label htmlFor="gen-language-select" className="sr-only">
                      Programming language
                    </label>
                    <select
                      id="gen-language-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as LanguageId)}
                      className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white pr-4 pl-11 text-sm font-semibold text-slate-950 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-[#141414] dark:text-white"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.name} — {lang.paradigm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                    {selectedLangMeta.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <span>Continue</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </section>
            )}

            {/* Step 2: Cyclic Skill Level Flip Card */}
            {step === 'level' && (
              <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
                <div className="space-y-1 text-center">
                  <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                    Choose your {selectedLangMeta.name} level
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Flip through tiers to match your pace.
                  </p>
                </div>

                <SkillLevelFlipCard
                  value={skillLevel}
                  onChange={setSkillLevel}
                  languageName={selectedLangMeta.name}
                />

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <span>Continue</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </section>
            )}

            {/* Step 3: Focus & Depth Dropdowns + Optional Context */}
            {step === 'focus' && (
              <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
                <div className="space-y-1">
                  <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                    Shape your track
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Pick your focus, length, and any optional topics.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="gen-focus-select"
                      className="block text-xs font-medium text-slate-600 dark:text-neutral-300"
                    >
                      Focus
                    </label>
                    <select
                      id="gen-focus-select"
                      value={learningFocus}
                      onChange={(e) =>
                        setLearningFocus(e.target.value as LearningFocus)
                      }
                      className="mt-1.5 h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-950 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-[#141414] dark:text-white"
                    >
                      {LEARNING_FOCUS_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="gen-depth-select"
                      className="block text-xs font-medium text-slate-600 dark:text-neutral-300"
                    >
                      Depth
                    </label>
                    <select
                      id="gen-depth-select"
                      value={paceDepth}
                      onChange={(e) => setPaceDepth(e.target.value as PaceDepth)}
                      className="mt-1.5 h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-950 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-[#141414] dark:text-white"
                    >
                      {PACE_DEPTHS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.description})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="gen-prior-bg"
                      className="block text-xs font-medium text-slate-600 dark:text-neutral-300"
                    >
                      Known Languages
                    </label>
                    <input
                      id="gen-prior-bg"
                      type="text"
                      value={priorBackground}
                      onChange={(e) => setPriorBackground(e.target.value)}
                      placeholder="Optional"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="gen-focus-notes"
                      className="block text-xs font-medium text-slate-600 dark:text-neutral-300"
                    >
                      Custom Topics
                    </label>
                    <input
                      id="gen-focus-notes"
                      type="text"
                      value={focusNotes}
                      onChange={(e) => setFocusNotes(e.target.value)}
                      placeholder="Optional"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400"
                  >
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-juice group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <span>Review Plan</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </section>
            )}

            {/* Step 4: Clean Plan Preview & Generate */}
            {step === 'plan' && (
              <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <LanguageIcon language={language} className="h-6 w-6 shrink-0" />
                    <div>
                      <h1 className="font-display text-xl font-bold text-slate-950 dark:text-white">
                        {blueprint.languageName} Track
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-neutral-400">
                        {blueprint.skillLabel} · {blueprint.focusLabel} ·{' '}
                        {blueprint.moduleCount} modules
                      </p>
                    </div>
                  </div>
                </div>

                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 dark:divide-neutral-800/80 dark:border-neutral-800">
                  {blueprint.moduleSlots.map((slot) => (
                    <li
                      key={slot.order}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                    >
                      <span className="font-medium text-slate-900 dark:text-neutral-100">
                        {slot.topicFocus}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-slate-400 capitalize dark:text-neutral-500">
                        {slot.difficulty}
                      </span>
                    </li>
                  ))}
                </ul>

                {(apiHealth.status === 'unreachable' ||
                  (apiHealth.status === 'checking' &&
                    apiHealth.reason !== null)) && (
                  <div
                    role="status"
                    data-testid="api-health-status"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-200"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <WifiOff
                        className="h-4 w-4 shrink-0 text-amber-500"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold">
                          {apiHealth.status === 'checking'
                            ? 'Checking generation endpoint...'
                            : 'Generation endpoint unreachable'}
                        </span>
                        {apiHealth.reason && (
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-400">
                            {apiHealth.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={apiHealth.status === 'checking'}
                      onClick={() => void verifyEndpointHealth()}
                      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-blue-600 hover:bg-slate-200/60 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-[#2A2A2A]"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${apiHealth.status === 'checking' ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400"
                  >
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={
                    apiHealth.status === 'unreachable' ||
                    (apiHealth.status === 'checking' && apiHealth.reason !== null)
                  }
                  onClick={() => void runGeneration()}
                  className="btn-juice flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  <span>Generate Curriculum</span>
                </button>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
