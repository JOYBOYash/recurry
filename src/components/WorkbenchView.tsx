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
  Code2,
  Layers,
  Lightbulb,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Send,
} from 'lucide-react';
import { useFocusMode } from '../context/FocusModeContext';
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
import {
  appendCodeLine,
  splitSolutionIntoIncrementalSteps,
} from '../utils/uxFlowLogic';
import { CodeBlock } from './CodeBlock';
import { ConfirmDialog } from './ConfirmDialog';
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

const STEP_RANK: Record<LessonStep, number> = {
  learn: 0,
  recall: 1,
  practice: 2,
  tutor: 3,
};

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
  const { focusMode } = useFocusMode();

  const [lessonStep, setLessonStep] = useState<LessonStep>('learn');
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward');
  const [activeDrillIdx, setActiveDrillIdx] = useState(0);
  const [drillAnswer, setDrillAnswer] = useState('');
  const [drillFeedback, setDrillFeedback] = useState<RecallGradingResult | null>(null);
  const [localPassedDrills, setLocalPassedDrills] = useState<Record<string, string[]>>({});
  const [localRecallAttempts, setLocalRecallAttempts] = useState<Record<string, number>>({});

  const [codeByModule, setCodeByModule] = useState<Record<string, string>>({});
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [revealedSolutionLines, setRevealedSolutionLines] = useState(1);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
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
            className="btn-juice mt-6 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
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

  const solutionSteps = useMemo(
    () => splitSolutionIntoIncrementalSteps(activeModule.challenge.sampleSolution),
    [activeModule.challenge.sampleSolution],
  );

  const currentCode =
    codeByModule[activeModule.id] ?? activeModule.challenge.starterCode;

  useEffect(() => {
    setLessonStep('learn');
    setStepDirection('forward');
    setActiveDrillIdx(0);
    setDrillAnswer('');
    setDrillFeedback(null);
    setShowHint(false);
    setShowSolution(false);
    setRevealedSolutionLines(1);
    setEvaluation(null);
    setEvalError(null);
    setDeepDiveError(null);
    setTutorError(null);
  }, [activeModule.id]);

  function navigateLessonStep(next: LessonStep) {
    setStepDirection(STEP_RANK[next] < STEP_RANK[lessonStep] ? 'back' : 'forward');
    setLessonStep(next);
  }

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
      setStepDirection('forward');
      setActiveDrillIdx((idx) => idx + 1);
      setDrillAnswer('');
      setDrillFeedback(null);
    } else {
      navigateLessonStep('practice');
    }
  }

  function updateEditorCode(nextValue: string) {
    setCodeByModule((prev) => ({ ...prev, [activeModule.id]: nextValue }));
  }

  function handleResetEditorConfirmed() {
    updateEditorCode(activeModule.challenge.starterCode);
    setEvaluation(null);
    setEvalError(null);
    setResetConfirmOpen(false);
  }

  function handleRequestResetEditor() {
    if (currentCode.trim() === activeModule.challenge.starterCode.trim()) {
      handleResetEditorConfirmed();
      return;
    }
    setResetConfirmOpen(true);
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
        'You are offline. Build with the step-by-step guide or mark Complete when ready.',
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
      setDeepDiveError('Offline mode: deep-dive expansion requires internet.');
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
  const transitionClass =
    stepDirection === 'back' ? 'animate-step-back' : 'animate-step-forward';

  const visibleSolutionLines = solutionSteps.slice(0, revealedSolutionLines);
  const currentSolutionPiece =
    solutionSteps[Math.min(revealedSolutionLines - 1, solutionSteps.length - 1)] ?? '';
  const hasMoreSolutionLines = revealedSolutionLines < solutionSteps.length;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-7 sm:px-6 lg:px-8">
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToPath}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#202020] dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Modules</span>
          </button>

          <div className="flex items-center gap-3">
            {!focusMode && (
              <span className="font-mono text-xs text-slate-400 tabular-nums dark:text-neutral-500">
                {activeModule.order}/{activeTrack.modules.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => onToggleComplete(activeModule.id)}
              aria-pressed={isModuleCompleted}
              className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                isModuleCompleted
                  ? 'text-emerald-600 hover:bg-slate-100 dark:text-emerald-400 dark:hover:bg-[#202020]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-[#202020] dark:hover:text-white'
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
              <span>{isModuleCompleted ? 'Completed' : 'Mark Complete'}</span>
            </button>
          </div>
        </div>

        {/* Clean underline stage navigation */}
        <div
          role="tablist"
          aria-label="Lesson stages"
          className="flex items-center gap-1 overflow-x-auto border-b border-slate-200/80 dark:border-neutral-800"
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
                onClick={() => navigateLessonStep(tab.id)}
                className={`relative -mb-px cursor-pointer whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage 1: Concept */}
      {lessonStep === 'learn' && (
        <section
          key="learn"
          className={`${transitionClass} space-y-7 rounded-xl border border-slate-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8`}
        >
          <div className="flex items-start gap-3.5 border-b border-slate-100 pb-5 dark:border-neutral-800/80">
            <LanguageIcon language={activeTrack.language} className="mt-1 h-6 w-6 shrink-0" />
            <div className="space-y-1.5">
              {!focusMode && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
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
              )}
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {activeModule.title}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                <InlineCodeText text={activeModule.summary} />
              </p>
            </div>
          </div>

          <div
            className={`grid gap-6 border-b border-slate-100 pb-5 dark:border-neutral-800/80 ${
              !focusMode && coreObjectives.length > 0 ? 'md:grid-cols-2' : ''
            }`}
          >
            {!focusMode && coreObjectives.length > 0 && (
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-400 dark:text-neutral-500">
                  Objectives
                </span>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-200">
                  {coreObjectives.join(' · ')}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-400 dark:text-neutral-500">
                Syntax Pattern
              </span>
              <code className="block overflow-x-auto font-mono text-sm text-slate-900 dark:text-neutral-100">
                {activeModule.syntaxGrammar}
              </code>
            </div>
          </div>

          <div className="space-y-7">
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
            <div className="border-t border-slate-100 pt-5 dark:border-neutral-800">
              <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
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
            <div className="space-y-4 border-t border-slate-100 pt-5 dark:border-neutral-800">
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
              className="flex items-start gap-2 rounded-xl border-l-2 border-rose-500 bg-slate-50 p-3.5 text-xs text-rose-700 dark:bg-[#141414] dark:text-rose-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
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
                className="btn-juice inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950 disabled:opacity-60 whitespace-nowrap dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:text-white"
              >
                {isLoadingDeepDive ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    <span>Deep-Dive</span>
                  </>
                )}
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => navigateLessonStep('recall')}
              className="btn-juice group inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              <Brain className="h-4 w-4" aria-hidden="true" />
              <span>Start Recall</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </section>
      )}

      {/* Stage 2: Active Recall with Duolingo-style micro-accomplishments */}
      {lessonStep === 'recall' && currentDrill && (
        <section
          key={`recall-${activeDrillIdx}`}
          className={`${transitionClass} space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8`}
        >
          {/* Segmented drill progress bar */}
          <div className="flex items-center gap-1.5">
            {drills.map((d, i) => {
              const passed = mergedPassedDrillIds.includes(d.id);
              const isCurrent = i === activeDrillIdx;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setStepDirection(i < activeDrillIdx ? 'back' : 'forward');
                    setActiveDrillIdx(i);
                    setDrillAnswer('');
                    setDrillFeedback(null);
                  }}
                  aria-label={`Jump to drill ${i + 1}`}
                  className={`h-1.5 flex-1 cursor-pointer rounded-full transition-colors ${
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

          <div className="space-y-1 border-b border-slate-100 pb-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-400 tabular-nums dark:text-neutral-500">
                {activeDrillIdx + 1}/{drills.length}
                {!focusMode ? ` · ${currentDrill.conceptTag}` : ''}
              </span>
            </div>
            <h1 className="font-display text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
              <InlineCodeText text={currentDrill.prompt} />
            </h1>
          </div>

          {currentDrill.codeSnippet && (
            <CodeBlock
              code={currentDrill.codeSnippet}
              language={activeTrack.language}
              title="Snippet"
              compact
            />
          )}

          {currentDrill.options && currentDrill.options.length > 0 ? (
            <div className="grid gap-2">
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
                    className={`btn-juice flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
                      selected
                        ? 'border-blue-600 bg-white text-slate-950 ring-1 ring-blue-600 dark:border-blue-500 dark:bg-[#202020] dark:text-white dark:ring-blue-500'
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
                className="block text-xs font-medium text-slate-500 dark:text-neutral-400"
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && drillAnswer.trim()) {
                    handleCheckRecallDrill();
                  }
                }}
                placeholder="Type the missing syntax or concept..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
              />
            </div>
          )}

          {/* Accomplishment / Retry banner */}
          {drillFeedback && (
            <div
              role="status"
              className={`animate-accomplish-pop flex flex-col gap-3 rounded-xl border-l-2 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-[#141414] ${
                drillFeedback.correct ? 'border-emerald-500' : 'border-amber-500'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {drillFeedback.correct ? (
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <div
                    className={`text-sm font-bold ${
                      drillFeedback.correct
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {drillFeedback.correct ? 'Recall nailed' : 'Try again'}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-neutral-300">
                    <InlineCodeText text={drillFeedback.feedback} />
                  </p>
                </div>
              </div>

              {drillFeedback.correct && (
                <button
                  type="button"
                  onClick={handleNextDrillOrPractice}
                  className="btn-juice inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <span>
                    {activeDrillIdx < drills.length - 1 ? 'Next Drill' : 'Start Challenge'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => navigateLessonStep('learn')}
              className="btn-juice inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:border-slate-300 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Concept</span>
            </button>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {!drillFeedback?.correct && (
                <button
                  type="button"
                  disabled={!drillAnswer.trim()}
                  onClick={handleCheckRecallDrill}
                  className="btn-juice inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Check</span>
                </button>
              )}

              {!drillFeedback?.correct && (
                <button
                  type="button"
                  onClick={handleNextDrillOrPractice}
                  className="btn-juice inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-[#222222] dark:hover:text-white"
                >
                  <span>
                    {activeDrillIdx < drills.length - 1 ? 'Skip' : 'Challenge'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Stage 3: Progressive Code Challenge */}
      {lessonStep === 'practice' && (
        <section
          key="practice"
          className={`${transitionClass} space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8`}
        >
          <div className="space-y-1.5 border-b border-slate-100 pb-4 dark:border-neutral-800">
            <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
              {activeModule.challenge.title}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
              <InlineCodeText text={activeModule.challenge.prompt} />
            </p>
          </div>

          {/* Code Editor with Icon-only Helper Toolbar */}
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#141414]">
            <div className="flex items-center justify-between border-b border-neutral-800 bg-[#1C1C1C] px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2 font-mono font-medium text-neutral-200">
                <LanguageIcon language={activeTrack.language} className="h-3.5 w-3.5" />
                <span>{langMeta.name}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowHint((v) => !v)}
                  aria-expanded={showHint}
                  aria-label="Toggle hint"
                  title="Hint"
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
                    showHint
                      ? 'bg-[#2A2A2A] text-amber-400'
                      : 'text-neutral-400 hover:bg-[#242424] hover:text-neutral-100'
                  }`}
                >
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSolution((v) => !v);
                    if (!showSolution) {
                      setRevealedSolutionLines(1);
                    }
                  }}
                  aria-expanded={showSolution}
                  aria-label="Toggle step-by-step solution"
                  title="Step-by-step solution"
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
                    showSolution
                      ? 'bg-[#2A2A2A] text-emerald-400'
                      : 'text-neutral-400 hover:bg-[#242424] hover:text-neutral-100'
                  }`}
                >
                  <Code2 className="h-4 w-4" aria-hidden="true" />
                </button>

                <span
                  className="mx-1 h-3.5 w-px bg-neutral-700"
                  aria-hidden="true"
                />

                <button
                  type="button"
                  onClick={handleRequestResetEditor}
                  aria-label="Reset editor code"
                  title="Reset editor"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-[#242424] hover:text-neutral-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
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
              style={{ fontVariantLigatures: 'none' }}
              className="w-full resize-y bg-[#141414] p-4 font-mono text-[13px] leading-6 text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          {showHint && (
            <div className="animate-view-enter rounded-xl bg-slate-50 p-3.5 text-sm text-slate-700 dark:bg-[#141414] dark:text-neutral-300">
              <InlineCodeText text={activeModule.challenge.hint} />
            </div>
          )}

          {/* Incremental Piece-by-Piece Solution Builder */}
          {showSolution && solutionSteps.length > 0 && (
            <div
              data-testid="incremental-solution-panel"
              className="animate-view-enter space-y-2.5 rounded-xl bg-slate-50 p-3.5 dark:bg-[#141414]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums dark:text-neutral-400">
                  Piece {Math.min(revealedSolutionLines, solutionSteps.length)}/
                  {solutionSteps.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateEditorCode(appendCodeLine(currentCode, currentSolutionPiece))
                    }
                    className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-slate-900 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Add</span>
                  </button>

                  {hasMoreSolutionLines && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedSolutionLines((n) =>
                          Math.min(solutionSteps.length, n + 1),
                        )
                      }
                      className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-slate-200/70 dark:text-blue-400 dark:hover:bg-[#222222]"
                    >
                      <span>Next piece</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <CodeBlock
                code={visibleSolutionLines.join('\n')}
                language={activeTrack.language}
                compact
              />
            </div>
          )}

          {delimiterWarnings.length > 0 && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border-l-2 border-amber-500 bg-slate-50 p-3.5 text-xs text-amber-800 dark:bg-[#141414] dark:text-amber-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>{delimiterWarnings[0]}</span>
            </div>
          )}

          {evalError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border-l-2 border-rose-500 bg-slate-50 p-3.5 text-xs text-rose-700 dark:bg-[#141414] dark:text-rose-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                aria-hidden="true"
              />
              <span>{evalError}</span>
            </div>
          )}

          {evaluation && (
            <div
              className={`animate-accomplish-pop space-y-3 rounded-xl border-l-2 bg-slate-50 p-4 dark:bg-[#141414] ${
                evaluation.passed ? 'border-emerald-500' : 'border-amber-500'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {evaluation.passed ? (
                    <CheckCircle2
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertCircle
                      className="h-5 w-5 text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      evaluation.passed
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {evaluation.passed ? 'Lesson mastered' : evaluation.verdictLabel}
                  </span>
                </div>

                {evaluation.passed && nextModule && isNextModuleUnlocked && (
                  <button
                    type="button"
                    onClick={() => onSelectModule(nextModule.id)}
                    className="btn-juice inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <span>Next Module</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-200">
                {evaluation.feedback}
              </p>

              {evaluation.syntaxIssues.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-rose-700 dark:text-rose-300">
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
              onClick={() => navigateLessonStep('recall')}
              className="btn-juice inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:border-slate-300 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Recall</span>
            </button>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {(evaluation?.passed || isModuleCompleted) && nextModule && (
                isNextModuleUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectModule(nextModule.id)}
                    className="btn-juice group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <span>Next Module</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 text-xs font-medium text-slate-500 dark:text-neutral-400">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Complete module to unlock next</span>
                  </span>
                )
              )}

              {isTrackComplete && !nextModule && (
                <button
                  type="button"
                  onClick={onBackToPath}
                  className="btn-juice inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  <Award className="h-4 w-4" aria-hidden="true" />
                  <span>Claim Certificate</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGeminiReview}
                disabled={isEvaluating}
                className="btn-juice inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* Stage 4: Tutor */}
      {lessonStep === 'tutor' && (
        <section
          key="tutor"
          className={`${transitionClass} space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8`}
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
                  className="btn-juice cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
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
              className="flex items-start gap-2 rounded-xl border-l-2 border-rose-500 bg-slate-50 p-3.5 text-xs text-rose-700 dark:bg-[#141414] dark:text-rose-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                aria-hidden="true"
              />
              <span>{tutorError}</span>
            </div>
          )}

          <form onSubmit={handleAskTutor} className="flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="tutor-question-input" className="sr-only">
              Ask a syntax question about {activeModule.title}
            </label>
            <input
              id="tutor-question-input"
              type="text"
              value={tutorInput}
              onChange={(e) => setTutorInput(e.target.value)}
              placeholder={`Ask about ${langMeta.name} syntax...`}
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isAskingTutor || !tutorInput.trim()}
              className="btn-juice inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap dark:bg-blue-600 dark:hover:bg-blue-700"
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
              onClick={() => navigateLessonStep('practice')}
              className="btn-juice inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:border-slate-300 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Challenge</span>
            </button>

            {nextModule && isNextModuleUnlocked ? (
              <button
                type="button"
                onClick={() => onSelectModule(nextModule.id)}
                className="btn-juice group inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <span>Next Module</span>
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            ) : isTrackComplete ? (
              <button
                type="button"
                onClick={onBackToPath}
                className="btn-juice inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-xs font-semibold text-white hover:bg-amber-600"
              >
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Claim Certificate</span>
              </button>
            ) : null}
          </div>
        </section>
      )}

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="Reset editor code?"
        description="Your current code edits for this challenge will be replaced with the starter template."
        confirmLabel="Reset Code"
        tone="danger"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={handleResetEditorConfirmed}
      />
    </div>
  );
}
