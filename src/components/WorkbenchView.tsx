import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  CheckCheck,
  CheckCircle2,
  Layers,
  Lightbulb,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  Zap,
} from 'lucide-react';
import { LANGUAGE_MAP } from '../data/languages';
import {
  evaluateLessonMastery,
  getModuleRecallDrills,
  gradeRecallResponse,
  type RecallGradingResult,
} from '../engines/learningEngine';
import type { TrackProgressionState } from '../engines/progressionEngine';
import type {
  CodeEvaluationResult,
  CurriculumModule,
  CurriculumTrack,
  DeepDiveExpansion,
  ModuleAccuracyEntry,
  TutorMessage,
} from '../types/curriculum';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { checkBalancedDelimiters } from '../utils/curriculumLogic';
import { extractCoreObjectives } from '../utils/curriculumCards';
import { parseApiJson } from '../utils/apiResponse';
import { CodeBlock } from './CodeBlock';
import { InlineCodeText } from './InlineCodeText';
import { LanguageIcon } from './LanguageIcon';

interface WorkbenchViewProps {
  activeTrack: CurriculumTrack | null;
  activeModuleId: string | null;
  completedModuleIds: string[];
  moduleAccuracy?: Record<string, ModuleAccuracyEntry>;
  progression?: TrackProgressionState;
  isTrackComplete?: boolean;
  getIdToken: () => Promise<string>;
  onBackToPath: () => void;
  onStartBuilder: () => void;
  onSelectModule: (moduleId: string) => void;
  onToggleComplete: (moduleId: string, forceValue?: boolean) => void;
  onRecordAttempt: (moduleId: string, passed: boolean) => void;
  onRecordRecallDrill?: (
    moduleId: string,
    drillId: string,
    correct: boolean,
  ) => void;
  onSaveDeepDive: (
    trackId: string,
    moduleId: string,
    deepDive: DeepDiveExpansion,
  ) => void;
}

type LessonStep = 'learn' | 'recall' | 'practice' | 'tutor';

export function WorkbenchView({
  activeTrack,
  activeModuleId,
  completedModuleIds,
  moduleAccuracy = {},
  progression,
  isTrackComplete = false,
  getIdToken,
  onBackToPath,
  onStartBuilder,
  onSelectModule,
  onToggleComplete,
  onRecordAttempt,
  onRecordRecallDrill,
  onSaveDeepDive,
}: WorkbenchViewProps) {
  const isOnline = useOnlineStatus();
  const [lessonStep, setLessonStep] = useState<LessonStep>('learn');
  const [activeDrillIdx, setActiveDrillIdx] = useState(0);
  const [drillAnswer, setDrillAnswer] = useState('');
  const [drillFeedback, setDrillFeedback] = useState<RecallGradingResult | null>(null);
  const [localPassedDrills, setLocalPassedDrills] = useState<Record<string, string[]>>({});
  const [localRecallAttempts, setLocalRecallAttempts] = useState<Record<string, number>>({});

  const [codeByModule, setCodeByModule] = useState<Record<string, string>>({});
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [evaluation, setEvaluation] = useState<CodeEvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);

  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorInput, setTutorInput] = useState('');
  const [isAskingTutor, setIsAskingTutor] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);

  if (!activeTrack || activeTrack.modules.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            No active curriculum
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">
            Create a track to start lessons and code reviews.
          </p>
          <button
            type="button"
            onClick={onStartBuilder}
            className="btn-juice mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>Create Track</span>
          </button>
        </div>
      </div>
    );
  }

  const activeModule: CurriculumModule =
    activeTrack.modules.find((m) => m.id === activeModuleId) ??
    activeTrack.modules[0];

  const drills = useMemo(
    () => getModuleRecallDrills(activeModule, activeTrack.language),
    [activeModule, activeTrack.language],
  );

  const currentCode =
    codeByModule[activeModule.id] ?? activeModule.challenge.starterCode;

  useEffect(() => {
    setLessonStep('learn');
    setActiveDrillIdx(0);
    setDrillAnswer('');
    setDrillFeedback(null);
    setShowHint(false);
    setShowSolution(false);
    setEvaluation(null);
    setEvalError(null);
    setDeepDiveError(null);
    setTutorError(null);
  }, [activeModule.id]);

  const completedSet = new Set(completedModuleIds);
  const isModuleCompleted = completedSet.has(activeModule.id);
  const langMeta = LANGUAGE_MAP[activeTrack.language];

  const persistedModAcc = moduleAccuracy[activeModule.id];
  const mergedPassedDrillIds = Array.from(
    new Set([
      ...(persistedModAcc?.drillsPassed ?? []),
      ...(localPassedDrills[activeModule.id] ?? []),
    ]),
  );
  const totalAttempts =
    (persistedModAcc?.recallAttempts ?? 0) +
    (localRecallAttempts[activeModule.id] ?? 0);

  const mastery = evaluateLessonMastery({
    drills,
    passedDrillIds: mergedPassedDrillIds,
    attempts: totalAttempts,
    challengePassed: isModuleCompleted || Boolean(evaluation?.passed),
    moduleXpReward: activeModule.xpReward,
  });

  const currentIndex = activeTrack.modules.findIndex(
    (m) => m.id === activeModule.id,
  );
  const nextModule =
    currentIndex < activeTrack.modules.length - 1
      ? activeTrack.modules[currentIndex + 1]
      : null;

  const isNextModuleUnlocked = nextModule
    ? progression
      ? progression.nodes.find((n) => n.moduleId === nextModule.id)?.status !==
        'locked'
      : isModuleCompleted
    : false;

  const stepIndex =
    lessonStep === 'learn'
      ? 1
      : lessonStep === 'recall'
        ? 2
        : lessonStep === 'practice'
          ? 3
          : 4;
  const stepProgressPercent = Math.round((stepIndex / 4) * 100);
  const delimiterWarnings =
    currentCode.trim().length > 0 ? checkBalancedDelimiters(currentCode) : [];

  const currentDrill = drills[activeDrillIdx] ?? drills[0];

  function handleCheckRecallDrill() {
    if (!currentDrill) return;
    const result = gradeRecallResponse(currentDrill, drillAnswer);
    setDrillFeedback(result);

    setLocalRecallAttempts((prev) => ({
      ...prev,
      [activeModule.id]: (prev[activeModule.id] ?? 0) + 1,
    }));

    if (result.correct) {
      setLocalPassedDrills((prev) => {
        const list = prev[activeModule.id] ?? [];
        if (list.includes(currentDrill.id)) return prev;
        return { ...prev, [activeModule.id]: [...list, currentDrill.id] };
      });
    }

    onRecordRecallDrill?.(activeModule.id, currentDrill.id, result.correct);
  }

  function handleNextDrillOrPractice() {
    if (activeDrillIdx < drills.length - 1) {
      setActiveDrillIdx((idx) => idx + 1);
      setDrillAnswer('');
      setDrillFeedback(null);
    } else {
      setLessonStep('practice');
    }
  }

  function updateEditorCode(nextValue: string) {
    setCodeByModule((prev) => ({ ...prev, [activeModule.id]: nextValue }));
  }

  function handleEditorKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = `${currentCode.slice(0, start)}  ${currentCode.slice(end)}`;
      updateEditorCode(updated);
      requestAnimationFrame(() => {
        target.selectionStart = start + 2;
        target.selectionEnd = start + 2;
      });
    }
  }

  async function handleGeminiReview() {
    setEvalError(null);
    if (!isOnline) {
      setEvalError(
        'You are offline. Compare your code with Solution or mark Complete when ready — AI grading resumes online.',
      );
      return;
    }
    if (!currentCode.trim()) {
      setEvalError('Enter code in the editor before submitting.');
      return;
    }

    setIsEvaluating(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/code/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: activeTrack!.language,
          challengeTitle: activeModule.challenge.title,
          challengePrompt: activeModule.challenge.prompt,
          expectedConcepts: activeModule.challenge.expectedConcepts,
          userCode: currentCode,
        }),
      });
      const parsed = await parseApiJson<{
        evaluation?: CodeEvaluationResult;
        error?: string;
      }>(response, 'Evaluation failed.');
      if (!parsed.ok || !parsed.data?.evaluation) {
        setEvalError(parsed.error ?? 'Evaluation failed.');
        return;
      }
      setEvaluation(parsed.data.evaluation);
      onRecordAttempt(activeModule.id, parsed.data.evaluation.passed);
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : 'Network error during review.',
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleGenerateDeepDive() {
    setDeepDiveError(null);
    if (!isOnline) {
      setDeepDiveError(
        'Offline mode: cached concept examples and recall drills remain available. Deep-dive expansion requires internet.',
      );
      return;
    }
    setIsLoadingDeepDive(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/lesson/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: activeTrack!.language,
          moduleTitle: activeModule.title,
          syntaxGrammar: activeModule.syntaxGrammar,
          skillLevel: activeTrack!.skillLevel,
          priorBackground: activeTrack!.priorBackground,
        }),
      });
      const parsed = await parseApiJson<{
        deepDive?: DeepDiveExpansion;
        error?: string;
      }>(response, 'Could not load deep-dive.');
      if (!parsed.ok || !parsed.data?.deepDive) {
        setDeepDiveError(parsed.error ?? 'Could not load deep-dive.');
        return;
      }
      onSaveDeepDive(activeTrack!.id, activeModule.id, parsed.data.deepDive);
    } catch (err) {
      setDeepDiveError(
        err instanceof Error ? err.message : 'Network error loading deep-dive.',
      );
    } finally {
      setIsLoadingDeepDive(false);
    }
  }

  async function submitTutorQuestion(questionText: string) {
    const question = questionText.trim();
    if (!question) return;
    if (!isOnline) {
      setTutorError('You are offline. Reconnect to ask the live syntax tutor.');
      return;
    }

    setTutorError(null);
    const userMsg: TutorMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
    };
    const nextHistory = [...tutorMessages, userMsg];
    setTutorMessages(nextHistory);
    setTutorInput('');
    setIsAskingTutor(true);

    try {
      const token = await getIdToken();
      const response = await fetch('/api/tutor/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: activeTrack!.language,
          moduleTitle: activeModule.title,
          currentCode,
          question,
          history: nextHistory,
        }),
      });
      const parsed = await parseApiJson<{
        answer?: string;
        codeSnippet?: string;
        error?: string;
      }>(response, 'Tutor request failed.');
      if (!parsed.ok || !parsed.data?.answer) {
        setTutorError(parsed.error ?? 'Tutor request failed.');
        return;
      }
      setTutorMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: parsed.data!.answer!,
          codeSnippet: parsed.data!.codeSnippet,
        },
      ]);
    } catch (err) {
      setTutorError(
        err instanceof Error ? err.message : 'Network error reaching tutor.',
      );
    } finally {
      setIsAskingTutor(false);
    }
  }

  function handleAskTutor(e: FormEvent) {
    e.preventDefault();
    submitTutorQuestion(tutorInput);
  }

  const coreObjectives = extractCoreObjectives(activeModule, 4);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToPath}
            className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-[#202020] dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Curriculum</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-800 tabular-nums dark:bg-[#202020] dark:text-blue-400">
              <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>{mastery.xpEarned} XP</span>
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
              {activeModule.order} / {activeTrack.modules.length}
            </span>
            <button
              type="button"
              onClick={() => onToggleComplete(activeModule.id)}
              aria-pressed={isModuleCompleted}
              className={`btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                isModuleCompleted
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/70 dark:bg-[#202020] dark:text-emerald-400'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:bg-[#202020]'
              }`}
            >
              <CheckCircle2
                className={`h-4 w-4 ${
                  isModuleCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-neutral-500'
                }`}
                aria-hidden="true"
              />
              <span>{isModuleCompleted ? 'Done' : 'Complete'}</span>
            </button>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#262626]">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${stepProgressPercent}%` }}
          />
        </div>

        <div
          role="tablist"
          aria-label="Lesson stages"
          className="grid grid-cols-4 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-[#181818]"
        >
          {(
            [
              { id: 'learn', label: 'Concept' },
              {
                id: 'recall',
                label: `Recall (${mastery.passedDrillsCount}/${mastery.totalDrills})`,
              },
              { id: 'practice', label: 'Challenge' },
              { id: 'tutor', label: 'Tutor' },
            ] as Array<{ id: LessonStep; label: string }>
          ).map((tab) => {
            const active = lessonStep === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLessonStep(tab.id)}
                className={`min-h-10 rounded-xl px-2 py-2 text-[11px] font-semibold transition-all duration-150 whitespace-nowrap sm:px-3 sm:text-xs ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-[#202020] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {lessonStep === 'learn' && (
        <section
          key="learn"
          className="animate-view-enter space-y-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8"
        >
          <div className="flex items-start gap-4 border-b border-slate-100 pb-6 dark:border-neutral-800">
            <LanguageIcon language={activeTrack.language} className="mt-1 h-7 w-7 shrink-0" />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {langMeta.name}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{activeModule.estimatedMinutes}m</span>
                {activeModule.unitTitle && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{activeModule.unitTitle}</span>
                  </>
                )}
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                {activeModule.title}
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                <InlineCodeText text={activeModule.summary} />
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {coreObjectives.length > 0 && (
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-neutral-800 dark:bg-[#202020]">
                <span className="block text-xs font-semibold text-slate-500 dark:text-neutral-400">
                  Core Objectives
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {coreObjectives.map((obj) => (
                    <span
                      key={obj}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-800 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#202020]">
              <span className="block text-xs font-semibold text-slate-500 dark:text-neutral-400">
                Grammar
              </span>
              <code className="block overflow-x-auto font-mono text-sm font-medium text-slate-950 dark:text-neutral-100">
                {activeModule.syntaxGrammar}
              </code>
            </div>
          </div>

          <div className="space-y-8">
            {activeModule.examples.map((ex, idx) => (
              <div key={idx} className="space-y-3">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                  {ex.title}
                </h2>
                <CodeBlock
                  code={ex.code}
                  language={activeTrack.language}
                  title={ex.title}
                />
                <div className="grid gap-4 pt-1 sm:grid-cols-2">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 dark:text-neutral-400">
                      Mechanics
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
                      <InlineCodeText text={ex.explanation} />
                    </p>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 dark:text-neutral-400">
                      Usage
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
                      <InlineCodeText text={ex.usageNote} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {activeModule.commonPitfalls.length > 0 && (
            <div className="border-t border-slate-100 pt-6 dark:border-neutral-800">
              <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                Watch Out
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-700 dark:text-neutral-300">
                {activeModule.commonPitfalls.map((pitfall, idx) => (
                  <li key={idx}>
                    <InlineCodeText text={pitfall} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeModule.deepDive && (
            <div className="space-y-4 border-t border-slate-100 pt-6 dark:border-neutral-800">
              <h3 className="font-display text-base font-bold text-slate-950 dark:text-white">
                Deep-Dive
              </h3>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
                {activeModule.deepDive.mentalModelBridge}
              </p>
              {activeModule.deepDive.edgeCases.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-neutral-300">
                  {activeModule.deepDive.edgeCases.map((edge, i) => (
                    <li key={i}>{edge}</li>
                  ))}
                </ul>
              )}
              <div className="space-y-4 pt-2">
                {activeModule.deepDive.additionalExamples.map((ex, i) => (
                  <div key={i} className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      {ex.title}
                    </h4>
                    <CodeBlock
                      code={ex.code}
                      language={activeTrack.language}
                      title={ex.title}
                      compact
                    />
                    <p className="text-xs text-slate-600 dark:text-neutral-300">
                      <InlineCodeText
                        text={`${ex.explanation} — ${ex.usageNote}`}
                      />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deepDiveError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-800/80 dark:bg-[#202020] dark:text-red-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              <span>{deepDiveError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
            {!activeModule.deepDive ? (
              <button
                type="button"
                onClick={handleGenerateDeepDive}
                disabled={isLoadingDeepDive}
                className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700 disabled:opacity-60 whitespace-nowrap dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                {isLoadingDeepDive ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Loading Deep-Dive...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    <span>Expand Deep-Dive</span>
                  </>
                )}
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => setLessonStep('recall')}
              className="btn-juice group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto"
            >
              <Brain className="h-4 w-4" aria-hidden="true" />
              <span>Start Active Recall</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </section>
      )}

      {lessonStep === 'recall' && currentDrill && (
        <section
          key="recall"
          className="animate-view-enter space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-neutral-800">
            <div>
              <h1 className="font-display text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
                <InlineCodeText text={currentDrill.prompt} />
              </h1>
              <div className="mt-1 flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
                <span>
                  Drill {activeDrillIdx + 1} of {drills.length}
                </span>
                <span>·</span>
                <span className="capitalize">{currentDrill.difficulty}</span>
                <span>·</span>
                <span>{currentDrill.conceptTag}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {drills.map((d, i) => {
                const passed = mergedPassedDrillIds.includes(d.id);
                const isCurrent = i === activeDrillIdx;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setActiveDrillIdx(i);
                      setDrillAnswer('');
                      setDrillFeedback(null);
                    }}
                    aria-label={`Jump to drill ${i + 1}`}
                    className={`h-2.5 w-8 rounded-full transition-colors ${
                      passed
                        ? 'bg-emerald-500'
                        : isCurrent
                          ? 'bg-blue-600'
                          : 'bg-slate-200 hover:bg-slate-300 dark:bg-neutral-700 dark:hover:bg-neutral-600'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {currentDrill.codeSnippet && (
            <CodeBlock
              code={currentDrill.codeSnippet}
              language={activeTrack.language}
              title="Recall Snippet"
              compact
            />
          )}

          {currentDrill.options && currentDrill.options.length > 0 ? (
            <div className="grid gap-2.5">
              {currentDrill.options.map((opt) => {
                const selected = drillAnswer === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setDrillAnswer(opt);
                      setDrillFeedback(null);
                    }}
                    aria-pressed={selected}
                    className={`btn-juice flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-colors ${
                      selected
                        ? 'border-blue-600 bg-blue-50/70 text-slate-950 dark:border-blue-500 dark:bg-[#202020] dark:text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-200 dark:hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-mono text-xs sm:text-sm">
                      <InlineCodeText text={opt} />
                    </span>
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                        selected
                          ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
                          : 'border-slate-300 dark:border-neutral-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="recall-fill-input"
                className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
              >
                Your Answer
              </label>
              <input
                id="recall-fill-input"
                type="text"
                value={drillAnswer}
                onChange={(e) => {
                  setDrillAnswer(e.target.value);
                  setDrillFeedback(null);
                }}
                placeholder="Type the missing syntax or concept..."
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
              />
            </div>
          )}

          {drillFeedback && (
            <div
              role="status"
              className={`rounded-2xl border-2 p-4 text-sm ${
                drillFeedback.correct
                  ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950 dark:border-emerald-600/80 dark:bg-[#202020] dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50/80 text-amber-950 dark:border-amber-600/80 dark:bg-[#202020] dark:text-amber-300'
              }`}
            >
              <div className="font-bold">
                {drillFeedback.correct
                  ? 'Active Recall Verified (+5 XP)'
                  : 'Review & Retry'}
              </div>
              <p className="mt-1 text-xs leading-relaxed sm:text-sm">
                <InlineCodeText text={drillFeedback.feedback} />
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setLessonStep('learn')}
              className="btn-juice inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Concept</span>
            </button>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={!drillAnswer.trim()}
                onClick={handleCheckRecallDrill}
                className="btn-juice inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                <span>Check Recall</span>
              </button>

              <button
                type="button"
                onClick={handleNextDrillOrPractice}
                className="btn-juice inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-900 hover:border-blue-500 hover:text-blue-700 dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                <span>
                  {activeDrillIdx < drills.length - 1
                    ? 'Next Drill'
                    : 'Go to Code Challenge'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}

      {lessonStep === 'practice' && (
        <section
          key="practice"
          className="animate-view-enter space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5 dark:border-neutral-800">
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                {activeModule.challenge.title}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-neutral-300 sm:text-base">
                <InlineCodeText text={activeModule.challenge.prompt} />
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                aria-expanded={showHint}
                className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
              >
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSolution((v) => !v)}
                aria-expanded={showSolution}
                className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
              >
                <span>{showSolution ? 'Hide Solution' : 'Solution'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  updateEditorCode(activeModule.challenge.starterCode);
                  setEvaluation(null);
                  setEvalError(null);
                }}
                className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {showHint && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:border dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-300">
              <InlineCodeText text={activeModule.challenge.hint} />
            </div>
          )}

          {showSolution && (
            <CodeBlock
              code={activeModule.challenge.sampleSolution}
              language={activeTrack.language}
              title="Reference Solution"
              compact
            />
          )}

          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#141414]">
            <div className="flex items-center justify-between border-b border-neutral-800 bg-[#1C1C1C] px-4 py-2 text-xs text-neutral-400">
              <span className="font-mono font-medium text-neutral-200">
                {langMeta.name}
              </span>
              <span className="font-mono">Tab = 2 spaces</span>
            </div>
            <label htmlFor="practice-code-editor" className="sr-only">
              Practice code editor for {activeModule.challenge.title}
            </label>
            <textarea
              id="practice-code-editor"
              value={currentCode}
              onChange={(e) => updateEditorCode(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              rows={9}
              spellCheck={false}
              className="w-full resize-y bg-[#141414] p-4 font-mono text-[13px] leading-6 text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          {delimiterWarnings.length > 0 && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950 dark:border-amber-600/70 dark:bg-[#202020] dark:text-amber-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>{delimiterWarnings[0]}</span>
            </div>
          )}

          {evalError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800/80 dark:bg-[#202020] dark:text-red-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              <span>{evalError}</span>
            </div>
          )}

          {evaluation && (
            <div
              className={`space-y-3 rounded-2xl border-2 p-5 ${
                evaluation.passed
                  ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-600/80 dark:bg-[#202020]'
                  : 'border-amber-300 bg-amber-50/70 dark:border-amber-600/80 dark:bg-[#202020]'
              }`}
            >
              <div className="flex items-center gap-2">
                {evaluation.passed ? (
                  <CheckCircle2
                    className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertCircle
                    className="h-5 w-5 text-amber-700 dark:text-amber-400"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`text-sm font-bold ${
                    evaluation.passed
                      ? 'text-emerald-950 dark:text-emerald-300'
                      : 'text-amber-950 dark:text-amber-300'
                  }`}
                >
                  {evaluation.verdictLabel}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-slate-800 dark:text-neutral-200">
                {evaluation.feedback}
              </p>

              {evaluation.syntaxIssues.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-red-800 dark:text-red-300">
                  {evaluation.syntaxIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}

              {evaluation.improvedSnippet && (
                <CodeBlock
                  code={evaluation.improvedSnippet}
                  language={activeTrack.language}
                  title="Idiomatic Version"
                  compact
                />
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setLessonStep('recall')}
              className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Recall Drills</span>
            </button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {(evaluation?.passed || isModuleCompleted) && nextModule && (
                isNextModuleUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectModule(nextModule.id)}
                    className="btn-juice group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    <span>Next Module</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-400">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Complete module to unlock next</span>
                  </span>
                )
              )}

              {isTrackComplete && !nextModule && (
                <button
                  type="button"
                  onClick={onBackToPath}
                  className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-2 border-amber-700 bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600"
                >
                  <Award className="h-4 w-4" aria-hidden="true" />
                  <span>Track Complete · Claim Certificate</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGeminiReview}
                disabled={isEvaluating}
                className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Check Solution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {lessonStep === 'tutor' && (
        <section
          key="tutor"
          className="animate-view-enter space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8"
        >
          <div className="border-b border-slate-100 pb-4 dark:border-neutral-800">
            <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
              {activeModule.title}
            </h1>
          </div>

          {tutorMessages.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {[
                'Explain this grammar rule simply',
                'Check my current editor code',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitTutorQuestion(prompt)}
                  disabled={isAskingTutor}
                  className="btn-juice rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {tutorMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-4 text-sm ${
                    msg.role === 'user'
                      ? 'bg-slate-100 text-slate-900 dark:bg-[#262626] dark:text-white'
                      : 'border border-slate-200 bg-white text-slate-800 dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-200'
                  }`}
                >
                  <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    {msg.role === 'user' ? 'You' : 'Tutor'}
                  </span>
                  <p className="leading-relaxed">{msg.content}</p>
                  {msg.codeSnippet && (
                    <div className="mt-3">
                      <CodeBlock
                        code={msg.codeSnippet}
                        language={activeTrack.language}
                        compact
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tutorError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-800/80 dark:bg-[#202020] dark:text-red-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              <span>{tutorError}</span>
            </div>
          )}

          <form onSubmit={handleAskTutor} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="tutor-question-input" className="sr-only">
              Ask a syntax question about {activeModule.title}
            </label>
            <input
              id="tutor-question-input"
              type="text"
              value={tutorInput}
              onChange={(e) => setTutorInput(e.target.value)}
              placeholder={`Ask about ${langMeta.name} syntax...`}
              className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isAskingTutor || !tutorInput.trim()}
              className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-2 border-slate-950 bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap dark:border-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {isAskingTutor ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Ask</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setLessonStep('practice')}
              className="btn-juice inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Challenge</span>
            </button>

            {nextModule && isNextModuleUnlocked ? (
              <button
                type="button"
                onClick={() => onSelectModule(nextModule.id)}
                className="btn-juice group inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                <span>Next Module</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            ) : isTrackComplete ? (
              <button
                type="button"
                onClick={onBackToPath}
                className="btn-juice inline-flex min-h-11 items-center gap-1.5 rounded-xl border-b-2 border-amber-700 bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600"
              >
                <Award className="h-4 w-4" aria-hidden="true" />
                <span>Track Complete · Claim Certificate</span>
              </button>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
