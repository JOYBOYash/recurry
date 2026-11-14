import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Code2,
  Compass,
  Cpu,
  Crown,
  Layers,
  Loader2,
  Sprout,
  Terminal,
  Zap,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LanguageIcon } from '../components/LanguageIcon';
import { toLocalDateKey, useAppAuth } from '../context/AppAuthContext';
import {
  SUPPORTED_LANGUAGES,
  LEARNING_FOCUS_OPTIONS,
  PACE_DEPTHS,
  SKILL_LEVELS,
} from '../data/languages';
import type {
  CurriculumTrack,
  LanguageId,
  LearningFocus,
  PaceDepth,
  SkillLevel,
} from '../types/curriculum';
import { validatePersonalizationInput } from '../utils/curriculumLogic';

const SKILL_ICON_MAP: Record<SkillLevel, typeof Sprout> = {
  noob: Sprout,
  intern: Compass,
  expert: Zap,
  master: Cpu,
  legend: Crown,
};

export function GeneratingTrackView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoStart = searchParams.get('autostart') === '1';

  const {
    user,
    authReady,
    dataLoading,
    profile,
    quota,
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

  const [isGenerating, setIsGenerating] = useState(false);
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

  const runGeneration = useCallback(
    async (override?: {
      language: LanguageId;
      skillLevel: SkillLevel;
      learningFocus: LearningFocus;
      paceDepth: PaceDepth;
    }) => {
      setError(null);
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

      setIsGenerating(true);
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
          }),
        });

        const data = (await response.json()) as {
          track?: CurriculumTrack;
          error?: string;
        };

        if (!response.ok || !data.track) {
          setError(data.error ?? 'Could not generate curriculum.');
          setIsGenerating(false);
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
        setIsGenerating(false);
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
  }, [autoStart, authReady, dataLoading, user, profile, quota.allowed, runGeneration]);

  if (authReady && !user) {
    return <Navigate to="/login" replace />;
  }

  if (authReady && !dataLoading && user && !profile?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  const stages = [
    'Calibrating grammar & level',
    'Structuring progressive modules',
    'Writing syntax challenges',
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/app/curriculums"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>My Curriculums</span>
          </Link>
          <span
            className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold tabular-nums ${
              quota.allowed
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            Daily Quota: {quota.remainingToday}/1 left today
          </span>
        </div>

        {isGenerating ? (
          <section className="animate-view-enter rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
            {(() => {
              const progressPct =
                stageIndex >= 3 ? 90 : stageIndex === 2 ? 62 : 30;
              return (
                <div className="mx-auto max-w-sm space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-slate-500 tabular-nums">
                    <span>
                      Step {Math.min(Math.max(stageIndex, 1), 3)} of 3
                    </span>
                    <span className="text-blue-700">{progressPct}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Curriculum generation progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPct}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                  >
                    <div
                      style={{ width: `${progressPct}%` }}
                      className="h-full rounded-full bg-blue-600 transition-all duration-700 ease-out"
                    />
                  </div>
                </div>
              );
            })()}
            <h1 className="mt-6 font-display text-2xl font-bold text-slate-950">
              Generating your curriculum
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Building tailored syntax lessons and interactive challenges
            </p>

            <div className="mx-auto mt-8 max-w-sm space-y-2.5 text-left">
              {stages.map((label, idx) => {
                const active = stageIndex >= idx + 1;
                const done = stageIndex > idx + 1;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-xs font-semibold ${
                      active
                        ? 'border-blue-600 text-slate-950'
                        : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                    )}
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : !quota.allowed ? (
          <section className="animate-view-enter rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Clock className="mx-auto h-9 w-9 text-amber-600" aria-hidden="true" />
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-950">
              Daily generation limit reached
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              You can generate 1 custom curriculum per day for free. Your quota resets tomorrow — continue or redo your existing tracks anytime.
            </p>
            <Link
              to="/app/curriculums"
              className="btn-juice mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              <span>Go to My Curriculums</span>
            </Link>
          </section>
        ) : (
          <section className="animate-view-enter space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="font-display text-2xl font-bold text-slate-950">
                Create New Curriculum
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Uses today&apos;s free generation slot (1/day).
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-slate-700">
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
                      className={`btn-juice group relative flex items-center justify-between gap-2 overflow-hidden rounded-xl border-2 bg-white p-3 text-left ${
                        selected
                          ? 'border-blue-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative z-10">
                        <span className="font-display text-sm font-bold text-slate-950">
                          {lang.name}
                        </span>
                        <div className="font-mono text-[11px] text-slate-500">
                          {lang.paradigm}
                        </div>
                      </div>
                      <Check
                        className={`relative z-10 h-4 w-4 ${selected ? 'text-blue-600' : 'text-transparent'}`}
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
              <span className="block text-xs font-semibold text-slate-700">
                Skill Level
              </span>
              <div className="grid gap-2 sm:grid-cols-5">
                {SKILL_LEVELS.map((lvl) => {
                  const selected = skillLevel === lvl.id;
                  const CornerIcon = SKILL_ICON_MAP[lvl.id];
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSkillLevel(lvl.id)}
                      aria-pressed={selected}
                      className={`btn-juice relative overflow-hidden rounded-xl border-2 bg-white px-3 py-2.5 text-left ${
                        selected
                          ? 'border-blue-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-slate-950">
                          {lvl.label}
                        </div>
                        <div className="text-[11px] text-slate-500">{lvl.tag}</div>
                      </div>
                      <CornerIcon
                        aria-hidden="true"
                        className={`pointer-events-none absolute -right-1.5 -bottom-2 h-11 w-11 -rotate-12 ${
                          selected
                            ? 'text-blue-600 opacity-[0.14]'
                            : 'text-slate-400 opacity-[0.12]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-700">
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
                        className={`btn-juice relative flex items-center justify-between overflow-hidden rounded-xl border-2 bg-white px-3.5 py-2.5 text-left ${
                          selected
                            ? 'border-blue-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="relative z-10 text-xs font-bold text-slate-950">
                          {opt.label}
                        </span>
                        <Check
                          className={`relative z-10 h-4 w-4 ${selected ? 'text-blue-600' : 'text-transparent'}`}
                          aria-hidden="true"
                        />
                        <CornerIcon
                          aria-hidden="true"
                          className={`pointer-events-none absolute -right-1.5 -bottom-2 h-11 w-11 -rotate-12 ${
                            selected
                              ? 'text-blue-600 opacity-[0.14]'
                              : 'text-slate-400 opacity-[0.12]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-700">
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
                        className={`btn-juice rounded-xl border-2 bg-white p-2.5 text-left ${
                          selected
                            ? 'border-blue-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-950">
                          {p.label}
                        </div>
                        <div className="font-mono text-[11px] text-blue-700">
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
                  className="block text-xs font-semibold text-slate-700"
                >
                  Known Languages (Optional)
                </label>
                <input
                  id="gen-prior-bg"
                  type="text"
                  value={priorBackground}
                  onChange={(e) => setPriorBackground(e.target.value)}
                  placeholder="TypeScript, SQL..."
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="gen-focus-notes"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Custom Topics (Optional)
                </label>
                <input
                  id="gen-focus-notes"
                  type="text"
                  value={focusNotes}
                  onChange={(e) => setFocusNotes(e.target.value)}
                  placeholder="Window functions, smart pointers..."
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => void runGeneration()}
                className="btn-juice inline-flex min-h-12 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>Generate Curriculum</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
