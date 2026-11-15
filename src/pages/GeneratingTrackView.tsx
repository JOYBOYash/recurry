import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  Clock,
  Code2,
  Flame,
  Layers,
  Loader2,
  Lock,
  Play,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LanguageIcon } from '../components/LanguageIcon';
import { RankIcon } from '../components/RankIcon';
import { toLocalDateKey, useAppAuth } from '../context/AppAuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  LEARNING_FOCUS_OPTIONS,
  PACE_DEPTHS,
  SKILL_LEVELS,
  SUPPORTED_LANGUAGES,
} from '../data/languages';
import { buildProgrammeBlueprint } from '../engines/programmesEngine';
import type {
  CurriculumTrack,
  LanguageId,
  LearningFocus,
  PaceDepth,
  SkillLevel,
} from '../types/curriculum';
import { validatePersonalizationInput } from '../utils/curriculumLogic';

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

  const [phase, setPhase] = useState<'configure' | 'plan' | 'generating'>('configure');
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (profile) {
      setLanguage(profile.preferredLanguage);
      setSkillLevel(profile.skillLevel);
      setLearningFocus(profile.learningFocus);
    }
  }, [profile]);

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
        setError(
          'Internet connection required to generate a new AI curriculum. Your active curriculum remains available offline.',
        );
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

      const activePlan = buildProgrammeBlueprint({
        language: targetLang,
        skillLevel: targetSkill,
        learningFocus: targetFocus,
        paceDepth: targetPace,
        priorBackground,
        focusNotes,
      });

      setPhase('generating');
      setStageIndex(1);
      const stageTimer = window.setInterval(() => {
        setStageIndex((prev) => (prev < 3 ? prev + 1 : prev));
      }, 2400);

      try {
        const token = await getIdToken();
        const clientDateKey = toLocalDateKey(new Date());
        const response = await fetch('/api/curriculum/generate', {
          method: 'POST',
          headers: {
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

        const data = (await response.json()) as {
          track?: CurriculumTrack;
          error?: string;
        };

        if (!response.ok || !data.track) {
          setError(data.error ?? 'Could not generate curriculum.');
          setPhase('plan');
          return;
        }

        await saveGeneratedTrack(data.track, clientDateKey);
        navigate(`/app/learn/${encodeURIComponent(data.track.id)}`, {
          replace: true,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Network error while generating curriculum.',
        );
        setPhase('plan');
      } finally {
        window.clearInterval(stageTimer);
      }
    },
    [
      language,
      skillLevel,
      learningFocus,
      paceDepth,
      priorBackground,
      focusNotes,
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

  const stages = [
    'Calibrating difficulty & progression units',
    'Building active recall drills per module',
    'Writing syntax challenges & grading criteria',
  ];

  const handleOpenPlanPreview = () => {
    setError(null);
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
    setPhase('plan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-4 py-8 sm:px-6 lg:py-12 dark:bg-[#121212]">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/app/curriculums"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>My Curriculums</span>
          </Link>
          <span
            className={`font-mono text-xs font-semibold tabular-nums ${
              quota.allowed
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            Daily Quota: {quota.remainingToday}/1 left today
          </span>
        </div>

        {phase === 'generating' ? (
          <section className="animate-view-enter rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12 dark:border-neutral-800 dark:bg-[#181818]">
            {(() => {
              const progressPct =
                stageIndex >= 3 ? 90 : stageIndex === 2 ? 62 : 30;
              return (
                <div className="mx-auto max-w-sm space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-slate-500 tabular-nums dark:text-neutral-400">
                    <span>
                      Step {Math.min(Math.max(stageIndex, 1), 3)} of 3
                    </span>
                    <span className="text-blue-700 dark:text-blue-400">{progressPct}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Curriculum generation progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPct}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800"
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
              Generating your curriculum once
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
              Creating {blueprint.moduleCount} sequential modules, active recall drills, and coding challenges
            </p>

            <div className="mx-auto mt-8 max-w-sm space-y-2.5 text-left">
              {stages.map((label, idx) => {
                const active = stageIndex >= idx + 1;
                const done = stageIndex > idx + 1;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-xs font-semibold dark:bg-[#202020] ${
                      active
                        ? 'border-blue-600 text-slate-950 dark:border-blue-500 dark:text-white'
                        : 'border-slate-200 text-slate-400 dark:border-neutral-800 dark:text-neutral-500'
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-neutral-700" />
                    )}
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : !programmeLock.canGenerateNewProgramme && programmeLock.activeIncompleteTrackId ? (
          <section className="animate-view-enter rounded-2xl border-2 border-amber-300 bg-white p-8 text-center sm:p-10 dark:border-amber-600/80 dark:bg-[#181818]">
            <Lock className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-white">
              Finish your active curriculum first
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-neutral-400">
              One curriculum is active at a time. Complete{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {programmeLock.activeIncompleteTrackTitle}
              </span>{' '}
              ({programmeLock.activeIncompleteProgressPercent}% complete) to unlock your certificate and generate your next programme.
            </p>

            <div className="mx-auto mt-6 max-w-xs space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${programmeLock.activeIncompleteProgressPercent}%` }}
                />
              </div>
              <div className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
                {programmeLock.activeIncompleteProgressPercent}% mastered
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to={`/app/learn/${encodeURIComponent(programmeLock.activeIncompleteTrackId)}`}
                className="btn-juice inline-flex min-h-12 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>Resume Active Curriculum</span>
              </Link>
              <Link
                to="/app/curriculums"
                className="btn-juice inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
              >
                <span>View My Curriculums</span>
              </Link>
            </div>
          </section>
        ) : !quota.allowed ? (
          <section className="animate-view-enter rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
            <Clock className="mx-auto h-9 w-9 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-white">
              Daily generation limit reached
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-neutral-400">
              You can generate 1 custom curriculum per day for free. Your quota resets tomorrow — continue or redo your existing tracks anytime.
            </p>
            <Link
              to="/app/curriculums"
              className="btn-juice mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              <span>Go to My Curriculums</span>
            </Link>
          </section>
        ) : phase === 'plan' ? (
          <section className="animate-view-enter space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-[#181818]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-neutral-800">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  {blueprint.languageName} Curriculum Plan
                </h1>
                <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">
                  {blueprint.standardLabel} · {blueprint.skillLabel} · {blueprint.focusLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs font-semibold text-slate-700 tabular-nums dark:text-neutral-300">
                <span>{blueprint.moduleCount} modules</span>
                <span className="text-slate-300 dark:text-neutral-700">·</span>
                <span className="text-blue-700 dark:text-blue-400">
                  {blueprint.totalXpTarget} XP
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-neutral-800 dark:bg-[#202020]">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>Learning Engine</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-neutral-400">
                  {blueprint.pedagogyModel}. {blueprint.calibrationNotes}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-neutral-800 dark:bg-[#202020]">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Progression &amp; Programmes Engines</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-neutral-400">
                  Modules unlock sequentially after active recall + code check. This track locks other new programmes until 100% completion and certificate issuance.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:col-span-2 dark:border-neutral-800 dark:bg-[#202020]">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>Streaks Engine</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-neutral-400">
                  Every completed recall session and module updates your active learning calendar ({profile?.dailyModuleGoal ?? 2} modules/day target).
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-xs font-bold text-slate-700 uppercase dark:text-neutral-300">
                Planned Progression Path ({blueprint.estimatedTotalMinutes}m total)
              </h2>
              <div className="space-y-2">
                {blueprint.moduleSlots.map((slot) => (
                  <div
                    key={slot.order}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center dark:border-neutral-800 dark:bg-[#202020]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                        <span className="font-bold text-blue-700 dark:text-blue-400">
                          {String(slot.order).padStart(2, '0')}
                        </span>
                        <span>·</span>
                        <span>{slot.unitLabel}</span>
                        <span>·</span>
                        <span className="capitalize">{slot.difficulty}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-950 dark:text-white">
                        {slot.topicFocus}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                        Drills: {slot.drillMix.join(' -> ')}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] font-semibold text-slate-600 tabular-nums dark:text-neutral-400">
                      <span>{slot.estimatedMinutes}m</span>
                      <span>·</span>
                      <span className="text-blue-700 dark:text-blue-400">+{slot.xpReward + 15} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800/80 dark:bg-[#202020] dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setPhase('configure')}
                className="btn-juice inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit Options</span>
              </button>

              <button
                type="button"
                onClick={() => void runGeneration()}
                className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>Generate Full Curriculum</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="animate-view-enter space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-[#181818]">
            <div className="border-b border-slate-100 pb-4 dark:border-neutral-800">
              <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                Create New Curriculum
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                Configure your targets, preview the 4-engine curriculum plan, then generate once.
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Language
              </span>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const selected = language === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id)}
                      aria-pressed={selected}
                      className={`btn-juice group relative flex items-center justify-between gap-2 overflow-hidden rounded-xl border-2 bg-white p-3 text-left dark:bg-[#202020] ${
                        selected
                          ? 'border-blue-600 dark:border-blue-500'
                          : 'border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="relative z-10">
                        <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                          {lang.name}
                        </span>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                          {lang.paradigm}
                        </div>
                      </div>
                      <Check
                        className={`relative z-10 h-4 w-4 ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-transparent'}`}
                        aria-hidden="true"
                      />
                      <LanguageIcon
                        language={lang.id}
                        className={`pointer-events-none absolute -right-1.5 -bottom-2 h-12 w-12 -rotate-12 ${
                          selected ? 'opacity-[0.34]' : 'opacity-[0.22]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Skill Level
              </span>
              <div className="grid gap-2 sm:grid-cols-5">
                {SKILL_LEVELS.map((lvl) => {
                  const selected = skillLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSkillLevel(lvl.id)}
                      aria-pressed={selected}
                      className={`btn-juice relative overflow-hidden rounded-xl border-2 bg-white px-3 py-2.5 text-left dark:bg-[#202020] ${
                        selected
                          ? 'border-blue-600 dark:border-blue-500'
                          : 'border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="relative z-10">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-950 dark:text-white">
                          <RankIcon rank={lvl.id} useRankColor className="h-3.5 w-3.5 shrink-0" />
                          <span>{lvl.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400">{lvl.tag}</div>
                      </div>
                      <RankIcon
                        rank={lvl.id}
                        className={`pointer-events-none absolute -right-1.5 -bottom-2 h-11 w-11 -rotate-12 ${
                          selected
                            ? 'text-blue-600 opacity-[0.14] dark:text-blue-400'
                            : 'text-slate-400 opacity-[0.12] dark:text-neutral-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Focus
                </span>
                <div className="grid gap-2">
                  {LEARNING_FOCUS_OPTIONS.map((opt) => {
                    const selected = learningFocus === opt.id;
                    const CornerIcon = opt.id === 'syntax' ? Code2 : Terminal;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLearningFocus(opt.id)}
                        aria-pressed={selected}
                        className={`btn-juice relative flex items-center justify-between overflow-hidden rounded-xl border-2 bg-white px-3.5 py-2.5 text-left dark:bg-[#202020] ${
                          selected
                            ? 'border-blue-600 dark:border-blue-500'
                            : 'border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                        }`}
                      >
                        <span className="relative z-10 text-xs font-bold text-slate-950 dark:text-white">
                          {opt.label}
                        </span>
                        <Check
                          className={`relative z-10 h-4 w-4 ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-transparent'}`}
                          aria-hidden="true"
                        />
                        <CornerIcon
                          aria-hidden="true"
                          className={`pointer-events-none absolute -right-1.5 -bottom-2 h-11 w-11 -rotate-12 ${
                            selected
                              ? 'text-blue-600 opacity-[0.14] dark:text-blue-400'
                              : 'text-slate-400 opacity-[0.12] dark:text-neutral-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Depth
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {PACE_DEPTHS.map((p) => {
                    const selected = paceDepth === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaceDepth(p.id)}
                        aria-pressed={selected}
                        className={`btn-juice rounded-xl border-2 bg-white p-2.5 text-left dark:bg-[#202020] ${
                          selected
                            ? 'border-blue-600 dark:border-blue-500'
                            : 'border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-950 dark:text-white">
                          {p.label}
                        </div>
                        <div className="font-mono text-[11px] text-blue-700 dark:text-blue-400">
                          {p.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="gen-prior-bg"
                  className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
                >
                  Known Languages (Optional)
                </label>
                <input
                  id="gen-prior-bg"
                  type="text"
                  value={priorBackground}
                  onChange={(e) => setPriorBackground(e.target.value)}
                  placeholder="TypeScript, SQL..."
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />
              </div>
              <div>
                <label
                  htmlFor="gen-focus-notes"
                  className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
                >
                  Custom Topics (Optional)
                </label>
                <input
                  id="gen-focus-notes"
                  type="text"
                  value={focusNotes}
                  onChange={(e) => setFocusNotes(e.target.value)}
                  placeholder="Window functions, smart pointers..."
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800/80 dark:bg-[#202020] dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleOpenPlanPreview}
                className="btn-juice group inline-flex min-h-12 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <span>Review Curriculum Plan</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
