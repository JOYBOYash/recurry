import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  Code2,
  Edit3,
  FileCode2,
  Lightbulb,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useFocusMode } from '../../context/FocusModeContext';
import { LANGUAGE_MAP, SUPPORTED_LANGUAGES } from '../../data/languages';
import type {
  AlgoCacheHitStatus,
  AlgoDifficulty,
  AlgoLanguageAdapter,
  AlgoProblemBlueprint,
  AlgoStepLanguageHint,
} from '../../types/algo';
import type { CodeEvaluationResult, LanguageId } from '../../types/curriculum';
import {
  ALGO_CONCEPT_LABELS,
  appendStepSnippetToCode,
  buildAugmentedStepCode,
  buildFinalOutputCode,
  buildInitialStepCode,
  computeAlgoChecklistProgress,
  extractCodeEvaluationResult,
} from '../../utils/algoLogic';
import {
  clearAlgoCodeDraft,
  loadAlgoCodeDraft,
  saveAlgoCodeDraft,
} from '../../utils/algoPersistence';
import { parseApiJson } from '../../utils/apiResponse';
import { CodeBlock } from '../CodeBlock';
import { ConfirmDialog } from '../ConfirmDialog';
import { LanguageIcon } from '../LanguageIcon';

interface AlgoChecklistWorkspaceProps {
  uid: string;
  blueprint: AlgoProblemBlueprint;
  adapter: AlgoLanguageAdapter | null;
  activeLanguage: LanguageId;
  completedStepIds: string[];
  adaptingLanguage: boolean;
  adapterError: string | null;
  cacheNote: AlgoCacheHitStatus | 'adapter_cached' | 'adapter_generated' | null;
  getIdToken: () => Promise<string>;
  onBack: () => void;
  onMarkStepComplete: (stepId: string) => void;
  onToggleStep: (stepId: string) => void;
  onResetProgress: () => void;
  onSelectLanguage: (language: LanguageId) => void;
}

const DIFFICULTY_LABEL: Record<AlgoDifficulty, string> = {
  foundation: 'Foundation',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

type HintPanelKey = 'logic' | 'syntax' | 'snippet';

interface StepAccomplishment {
  completedStepNumber: number;
  completedTitle: string;
  nextTitle: string | null;
  nextIndex: number;
  isFinal: boolean;
}

export function AlgoChecklistWorkspace({
  uid,
  blueprint,
  adapter,
  activeLanguage,
  completedStepIds,
  adaptingLanguage,
  adapterError,
  cacheNote,
  getIdToken,
  onBack,
  onMarkStepComplete,
  onToggleStep,
  onResetProgress,
  onSelectLanguage,
}: AlgoChecklistWorkspaceProps) {
  const { focusMode } = useFocusMode();
  const completedSet = useMemo(() => new Set(completedStepIds), [completedStepIds]);
  const progress = useMemo(
    () =>
      computeAlgoChecklistProgress(
        blueprint.steps.map((s) => s.id),
        completedStepIds,
      ),
    [blueprint.steps, completedStepIds],
  );

  const resolveInitialStepIndex = () => {
    const firstIncomplete = blueprint.steps.findIndex((s) => !completedSet.has(s.id));
    if (firstIncomplete === -1 && blueprint.steps.length > 0) {
      return blueprint.steps.length;
    }
    return Math.max(0, firstIncomplete);
  };

  const [activeStepIndex, setActiveStepIndex] = useState<number>(resolveInitialStepIndex);
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward');
  const [codeBuffer, setCodeBuffer] = useState<string>(() => {
    const saved = loadAlgoCodeDraft(uid, blueprint.id, activeLanguage);
    if (saved) return saved;
    return buildInitialStepCode(blueprint.steps[0]?.title ?? '', activeLanguage);
  });
  const [activeHint, setActiveHint] = useState<HintPanelKey | null>(null);
  const [editingFinalCode, setEditingFinalCode] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [accomplishment, setAccomplishment] = useState<StepAccomplishment | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<CodeEvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  function clearAdvanceTimer() {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => clearAdvanceTimer();
  }, []);

  // Reload per-problem + per-language draft buffer when problem or language changes.
  useEffect(() => {
    const saved = loadAlgoCodeDraft(uid, blueprint.id, activeLanguage);
    if (saved) {
      setCodeBuffer(saved);
    } else {
      setCodeBuffer(buildInitialStepCode(blueprint.steps[0]?.title ?? '', activeLanguage));
    }
    setEvalResult(null);
    setEvalError(null);
    setEditingFinalCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, blueprint.id, activeLanguage]);

  // Reset active step index when opening a different problem.
  useEffect(() => {
    clearAdvanceTimer();
    setAccomplishment(null);
    setActiveStepIndex(resolveInitialStepIndex());
    setActiveHint(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint.id]);

  // Persist live code buffer as the learner writes.
  useEffect(() => {
    saveAlgoCodeDraft(uid, blueprint.id, activeLanguage, codeBuffer);
  }, [uid, blueprint.id, activeLanguage, codeBuffer]);

  const hintByStepId = useMemo(() => {
    const map = new Map<string, AlgoStepLanguageHint>();
    for (const h of adapter?.stepHints ?? []) {
      map.set(h.stepId, h);
    }
    return map;
  }, [adapter]);

  const isFinalOutputStage =
    blueprint.steps.length > 0 && activeStepIndex >= blueprint.steps.length;
  const activeStep = !isFinalOutputStage
    ? blueprint.steps[activeStepIndex] ?? blueprint.steps[0]
    : null;
  const activeStepHint = activeStep ? hintByStepId.get(activeStep.id) : undefined;
  const isLastStep = activeStepIndex === blueprint.steps.length - 1;

  const activeLangMeta = LANGUAGE_MAP[activeLanguage];
  const cacheLabel =
    cacheNote === 'full'
      ? 'Shared cache'
      : cacheNote === 'logic_only'
        ? 'Reused logic'
        : cacheNote === 'adapter_cached'
          ? `${activeLangMeta.name} cached`
          : cacheNote === 'adapter_generated'
            ? `${activeLangMeta.name} saved`
            : null;

  const fallbackSnippets = useMemo(
    () =>
      blueprint.steps
        .map((s) => hintByStepId.get(s.id)?.stepSnippet ?? '')
        .filter(Boolean),
    [blueprint.steps, hintByStepId],
  );

  const finalOutputCode = useMemo(
    () => buildFinalOutputCode(codeBuffer, fallbackSnippets),
    [codeBuffer, fallbackSnippets],
  );

  function toggleHintPanel(panel: HintPanelKey) {
    setActiveHint((prev) => (prev === panel ? null : panel));
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = `${codeBuffer.slice(0, start)}  ${codeBuffer.slice(end)}`;
    setCodeBuffer(next);
    requestAnimationFrame(() => {
      target.selectionStart = start + 2;
      target.selectionEnd = start + 2;
    });
  }

  function finishAccomplishmentTransition(nextIndex: number, isFinal: boolean) {
    clearAdvanceTimer();
    setAccomplishment(null);
    setStepDirection('forward');
    setActiveHint(null);
    setActiveStepIndex(nextIndex);
    if (isFinal) {
      setEditingFinalCode(false);
    } else {
      requestAnimationFrame(() => {
        const el = editorRef.current;
        if (el) {
          el.focus();
          el.selectionStart = el.value.length;
          el.selectionEnd = el.value.length;
        }
      });
    }
  }

  function handleCompleteAndAugment() {
    if (!activeStep) return;
    onMarkStepComplete(activeStep.id);
    setEvalResult(null);
    setEvalError(null);
    setActiveHint(null);

    const hasNext = activeStepIndex + 1 < blueprint.steps.length;
    const nextStep = hasNext ? blueprint.steps[activeStepIndex + 1] : null;
    const nextIndex = hasNext ? activeStepIndex + 1 : blueprint.steps.length;

    if (nextStep) {
      setCodeBuffer((prev) =>
        buildAugmentedStepCode(prev, nextStep.title, activeLanguage),
      );
    }

    const nextAccomplishment: StepAccomplishment = {
      completedStepNumber: activeStepIndex + 1,
      completedTitle: activeStep.title,
      nextTitle: nextStep?.title ?? null,
      nextIndex,
      isFinal: !hasNext,
    };
    setAccomplishment(nextAccomplishment);

    clearAdvanceTimer();
    advanceTimerRef.current = window.setTimeout(() => {
      finishAccomplishmentTransition(nextIndex, !hasNext);
    }, 950);
  }

  function handleSelectStepIndex(idx: number) {
    clearAdvanceTimer();
    setAccomplishment(null);
    setEvalResult(null);
    setEvalError(null);
    setEditingFinalCode(false);
    setActiveHint(null);
    setStepDirection(idx < activeStepIndex ? 'back' : 'forward');
    if (idx < blueprint.steps.length && idx > activeStepIndex) {
      const targetStep = blueprint.steps[idx];
      setCodeBuffer((prev) =>
        buildAugmentedStepCode(prev, targetStep.title, activeLanguage),
      );
    }
    setActiveStepIndex(idx);
  }

  function handleInsertStepSnippet() {
    if (!activeStepHint?.stepSnippet) return;
    setCodeBuffer((prev) => appendStepSnippetToCode(prev, activeStepHint.stepSnippet));
    requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }

  function executeResetFlow() {
    clearAdvanceTimer();
    setAccomplishment(null);
    clearAlgoCodeDraft(uid, blueprint.id, activeLanguage);
    setCodeBuffer(buildInitialStepCode(blueprint.steps[0]?.title ?? '', activeLanguage));
    setActiveStepIndex(0);
    setActiveHint(null);
    setEvalResult(null);
    setEvalError(null);
    setEditingFinalCode(false);
    setResetConfirmOpen(false);
    onResetProgress();
  }

  async function handleEvaluateCode(mode: 'step' | 'final') {
    const codeToCheck = mode === 'final' ? finalOutputCode : codeBuffer;
    if (codeToCheck.trim().length < 2) {
      setEvalError('Write a few lines of code in the editor first.');
      return;
    }

    setEvaluating(true);
    setEvalError(null);
    setEvalResult(null);

    try {
      const token = await getIdToken();
      const challengeTitle =
        mode === 'final'
          ? `${blueprint.title} (Full Program)`
          : `${blueprint.title}: ${activeStep?.title ?? 'Current Step'}`;
      const challengePrompt =
        mode === 'final'
          ? `${blueprint.canonicalPrompt}\nCheck that the assembled program is complete, syntactically valid, and output-ready.`
          : `Current progressive step goal: ${activeStep?.goal ?? ''}\nDone when: ${activeStep?.checkCriteria ?? ''}\nNote: The learner is building the program incrementally, so earlier steps' code may also appear above this step.`;
      const expectedConcepts =
        mode === 'final'
          ? blueprint.steps.map((s) => s.title).slice(0, 6)
          : [activeStep?.title ?? blueprint.title, activeStep?.checkCriteria ?? ''].filter(
              Boolean,
            );

      const res = await fetch('/api/code/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: activeLanguage,
          challengeTitle,
          challengePrompt,
          expectedConcepts,
          userCode: codeToCheck,
        }),
      });

      const parsed = await parseApiJson<{
        evaluation?: CodeEvaluationResult;
        error?: string;
      }>(res, 'Could not check your code right now.');
      const evaluation = extractCodeEvaluationResult(parsed.data);
      if (!parsed.ok || !evaluation) {
        throw new Error(parsed.error ?? 'Could not check your code right now.');
      }
      setEvalResult(evaluation);
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : 'Could not check your code right now.',
      );
    } finally {
      setEvaluating(false);
    }
  }

  const transitionClass =
    stepDirection === 'back' ? 'animate-step-back' : 'animate-step-forward';

  return (
    <div className="space-y-5">
      {/* Top navigation + minimal problem header */}
      <div className={`space-y-2 ${focusMode ? 'mx-auto max-w-3xl' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Problems</span>
          </button>

          {!focusMode && cacheLabel && (
            <span className="font-mono text-[11px] text-slate-400 dark:text-neutral-500">
              {cacheLabel}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            {blueprint.title}
          </h1>
          {!focusMode && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-neutral-400">
              <span>{ALGO_CONCEPT_LABELS[blueprint.conceptCategory]}</span>
              <span aria-hidden="true">·</span>
              <span>{DIFFICULTY_LABEL[blueprint.difficulty]}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{blueprint.steps.length} steps</span>
            </div>
          )}
        </div>
      </div>

      {/* Main workspace (single centered column in Focus Mode, 2-zone otherwise) */}
      <div
        className={
          focusMode
            ? 'mx-auto max-w-3xl space-y-4'
            : 'grid grid-cols-1 items-start gap-6 lg:grid-cols-12'
        }
      >
        <div className={focusMode ? 'space-y-4' : 'space-y-4 lg:col-span-8'}>
          {adapterError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border-l-2 border-rose-500 bg-white px-3.5 py-2.5 text-xs text-rose-700 dark:bg-[#181818] dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{adapterError}</span>
            </div>
          )}

          {/* Micro-accomplishment transition screen between steps */}
          {accomplishment ? (
            <section
              key={`accomplish-${accomplishment.completedStepNumber}`}
              aria-live="polite"
              data-testid="algo-step-accomplishment"
              className="animate-accomplish-pop flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>

              <h2 className="mt-4 font-display text-xl font-bold text-slate-950 dark:text-white">
                Step {accomplishment.completedStepNumber} complete
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                {accomplishment.completedTitle}
              </p>

              <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100 dark:bg-[#262626]">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (accomplishment.completedStepNumber /
                          Math.max(1, blueprint.steps.length)) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-4 font-mono text-xs text-slate-500 dark:text-neutral-400">
                {accomplishment.isFinal
                  ? 'Assembling final output code...'
                  : `Up next: ${accomplishment.nextTitle}`}
              </p>

              <button
                type="button"
                onClick={() =>
                  finishAccomplishmentTransition(
                    accomplishment.nextIndex,
                    accomplishment.isFinal,
                  )
                }
                className="btn-juice mt-5 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200"
              >
                <span>{accomplishment.isFinal ? 'View Final Code' : 'Continue'}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </section>
          ) : isFinalOutputStage ? (
            <section
              key="final-stage"
              aria-label="Final output-ready code"
              data-testid="algo-final-output"
              className="animate-accomplish-pop space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-[#181818]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-neutral-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                      {activeLangMeta.name} Solution Ready
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {progress.isComplete
                      ? `Assembled across ${blueprint.steps.length} steps.`
                      : `${progress.completedCount}/${progress.totalCount} steps complete.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingFinalCode((prev) => !prev)}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-[#222222] dark:hover:text-white"
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{editingFinalCode ? 'Preview' : 'Edit'}</span>
                </button>
              </div>

              {editingFinalCode ? (
                <textarea
                  aria-label="Final output code editor"
                  rows={14}
                  value={codeBuffer}
                  spellCheck={false}
                  style={{ fontVariantLigatures: 'none' }}
                  onKeyDown={handleEditorKeyDown}
                  onChange={(e) => setCodeBuffer(e.target.value)}
                  className="w-full resize-y rounded-xl border border-neutral-800 bg-[#141414] p-4 font-mono text-sm leading-relaxed text-neutral-100 focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <CodeBlock
                  code={finalOutputCode || `${activeLangMeta.name} solution buffer is empty.`}
                  language={activeLanguage}
                  title={`${blueprint.title} · ${activeLangMeta.name}`}
                />
              )}

              {evalError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border-l-2 border-rose-500 bg-slate-50 px-3.5 py-2.5 text-xs text-rose-700 dark:bg-[#141414] dark:text-rose-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{evalError}</span>
                </div>
              )}

              {evalResult && (
                <div
                  className={`space-y-2 rounded-xl border-l-2 bg-slate-50 p-4 text-xs dark:bg-[#141414] ${
                    evalResult.passed
                      ? 'border-emerald-500 text-slate-800 dark:text-neutral-200'
                      : 'border-amber-500 text-slate-800 dark:text-neutral-200'
                  }`}
                >
                  <div
                    className={`font-mono text-[11px] font-bold ${
                      evalResult.passed
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {evalResult.verdictLabel}
                  </div>
                  <p className="leading-relaxed">{evalResult.feedback}</p>
                  {(evalResult.syntaxIssues ?? []).length > 0 && (
                    <ul className="list-disc space-y-1 pl-4 text-rose-700 dark:text-rose-300">
                      {(evalResult.syntaxIssues ?? []).map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(true)}
                  className="btn-juice inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Practice Again</span>
                </button>

                <button
                  type="button"
                  disabled={evaluating}
                  onClick={() => void handleEvaluateCode('final')}
                  className="btn-juice inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {evaluating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Reviewing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Review Full Code</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          ) : (
            activeStep && (
              <section
                key={`step-${activeStep.id}`}
                aria-label={`Active coding step: ${activeStep.title}`}
                data-testid="algo-step-editor-card"
                className={`${transitionClass} space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-[#181818]`}
              >
                {/* Segmented step progress bar */}
                <div className="flex items-center gap-1" aria-hidden="true">
                  {blueprint.steps.map((step, idx) => {
                    const isDone = completedSet.has(step.id);
                    const isCurrent = idx === activeStepIndex;
                    return (
                      <div
                        key={step.id}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          isDone
                            ? 'bg-emerald-500'
                            : isCurrent
                              ? 'bg-blue-600'
                              : 'bg-slate-100 dark:bg-[#262626]'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Step Objective */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-slate-950 sm:text-xl dark:text-white">
                      {activeStep.title}
                    </h2>
                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-400 tabular-nums dark:text-neutral-500">
                      {activeStepIndex + 1}/{blueprint.steps.length}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                    {activeStep.goal}
                  </p>
                  {!focusMode && (
                    <p className="font-mono text-xs text-slate-400 dark:text-neutral-500">
                      {activeStep.checkCriteria}
                    </p>
                  )}
                </div>

                {/* Live Progressive Code Editor */}
                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#141414]">
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-800 bg-[#1C1C1C] px-3.5 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                      <LanguageIcon language={activeLanguage} className="h-3.5 w-3.5" />
                      <span>{activeLangMeta.name}</span>
                    </div>

                    {/* Icon-only helpers + editor reset */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Logic hint"
                        aria-expanded={activeHint === 'logic'}
                        title="Logic hint"
                        onClick={() => toggleHintPanel('logic')}
                        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
                          activeHint === 'logic'
                            ? 'bg-[#2A2A2A] text-amber-400'
                            : 'text-neutral-400 hover:bg-[#242424] hover:text-neutral-100'
                        }`}
                      >
                        <Lightbulb className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        aria-label={`${activeLangMeta.name} syntax hint`}
                        aria-expanded={activeHint === 'syntax'}
                        title={`${activeLangMeta.name} syntax`}
                        onClick={() => toggleHintPanel('syntax')}
                        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
                          activeHint === 'syntax'
                            ? 'bg-[#2A2A2A] text-blue-400'
                            : 'text-neutral-400 hover:bg-[#242424] hover:text-neutral-100'
                        }`}
                      >
                        <Terminal className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        aria-label="Step snippet"
                        aria-expanded={activeHint === 'snippet'}
                        title="Step snippet"
                        onClick={() => toggleHintPanel('snippet')}
                        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
                          activeHint === 'snippet'
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
                        aria-label="Clear editor"
                        title="Clear editor"
                        onClick={() =>
                          setCodeBuffer(
                            buildInitialStepCode(activeStep.title, activeLanguage),
                          )
                        }
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-[#242424] hover:text-neutral-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <label htmlFor="algo-live-code-editor" className="sr-only">
                    Write {activeLangMeta.name} code for {activeStep.title}
                  </label>
                  <textarea
                    ref={editorRef}
                    id="algo-live-code-editor"
                    data-testid="algo-live-code-editor"
                    rows={11}
                    value={codeBuffer}
                    spellCheck={false}
                    style={{ fontVariantLigatures: 'none' }}
                    onKeyDown={handleEditorKeyDown}
                    onChange={(e) => {
                      setCodeBuffer(e.target.value);
                      if (evalError) setEvalError(null);
                    }}
                    placeholder={`Write your ${activeLangMeta.name} code for "${activeStep.title}" here...`}
                    className="block w-full resize-y bg-[#141414] px-4 py-3.5 font-mono text-sm leading-relaxed text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
                  />
                </div>

                {/* Single active hint disclosure panel */}
                {activeHint === 'logic' && (
                  <div className="animate-view-enter space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-[#141414]">
                    <p className="leading-relaxed text-slate-800 dark:text-neutral-200">
                      {activeStep.logicCue}
                    </p>
                    <p className="text-slate-500 dark:text-neutral-400">
                      Watch out: {activeStep.pitfall}
                    </p>
                  </div>
                )}

                {activeHint === 'syntax' && (
                  <div className="animate-view-enter space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-[#141414]">
                    {adaptingLanguage ? (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        <span>Adapting {activeLangMeta.name}...</span>
                      </div>
                    ) : activeStepHint ? (
                      <>
                        <p className="leading-relaxed text-slate-800 dark:text-neutral-200">
                          {activeStepHint.syntaxCue}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                          {activeStepHint.idiomNote}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 dark:text-neutral-400">
                        Syntax hint unavailable for this language.
                      </p>
                    )}
                  </div>
                )}

                {activeHint === 'snippet' && (
                  <div className="animate-view-enter space-y-2">
                    {adaptingLanguage ? (
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-500 dark:bg-[#141414] dark:text-neutral-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        <span>Generating {activeLangMeta.name} snippet...</span>
                      </div>
                    ) : activeStepHint ? (
                      <>
                        <CodeBlock
                          code={activeStepHint.stepSnippet}
                          language={activeLanguage}
                          title={activeStep.title}
                          compact
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleInsertStepSnippet}
                            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Add</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-500 dark:bg-[#141414] dark:text-neutral-400">
                        Snippet unavailable for this language.
                      </div>
                    )}
                  </div>
                )}

                {/* Evaluation Feedback */}
                {evalError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border-l-2 border-rose-500 bg-slate-50 px-3.5 py-2.5 text-xs text-rose-700 dark:bg-[#141414] dark:text-rose-300"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{evalError}</span>
                  </div>
                )}

                {evalResult && (
                  <div
                    className={`animate-accomplish-pop space-y-1.5 rounded-xl border-l-2 bg-slate-50 p-3.5 text-xs dark:bg-[#141414] ${
                      evalResult.passed
                        ? 'border-emerald-500 text-slate-800 dark:text-neutral-200'
                        : 'border-amber-500 text-slate-800 dark:text-neutral-200'
                    }`}
                  >
                    <div
                      className={`font-mono text-[11px] font-bold ${
                        evalResult.passed
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {evalResult.verdictLabel}
                    </div>
                    <p className="leading-relaxed">{evalResult.feedback}</p>
                    {(evalResult.syntaxIssues ?? []).length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-4 text-rose-700 dark:text-rose-300">
                        {(evalResult.syntaxIssues ?? []).map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Action Controls: Prev, Check Step, Complete & Augment Next */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    {activeStepIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectStepIndex(activeStepIndex - 1)}
                        className="btn-juice inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:text-white"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Back</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={evaluating}
                      onClick={() => void handleEvaluateCode('step')}
                      className="btn-juice inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:text-white"
                    >
                      {evaluating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Check</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    data-testid="algo-next-step-button"
                    onClick={handleCompleteAndAugment}
                    className="btn-juice inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <span>{isLastStep ? 'Finish & View Code' : 'Next Step'}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </section>
            )
          )}
        </div>

        {/* Right ~35%: Roadmap Panel (Hidden in Focus Mode) */}
        {!focusMode && (
          <aside className="lg:sticky lg:top-16 lg:col-span-4">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white dark:divide-neutral-800/80 dark:border-neutral-800 dark:bg-[#181818]">
              {/* Language & Progress */}
              <div className="space-y-3.5 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="algo-workspace-language"
                      className="text-xs font-medium text-slate-500 dark:text-neutral-400"
                    >
                      Language
                    </label>
                    {adaptingLanguage && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        <span>Adapting</span>
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 flex items-center">
                      <LanguageIcon language={activeLanguage} className="h-4 w-4" />
                    </span>
                    <select
                      id="algo-workspace-language"
                      aria-label="Switch coding language"
                      value={activeLanguage}
                      disabled={adaptingLanguage}
                      onChange={(e) => onSelectLanguage(e.target.value as LanguageId)}
                      className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white pr-8 pl-9 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => {
                        const isCached = (blueprint.availableLanguages ?? []).includes(
                          lang.id,
                        );
                        return (
                          <option key={lang.id} value={lang.id}>
                            {lang.name}
                            {isCached ? ' (Cached)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-neutral-400">
                      {progress.completedCount}/{progress.totalCount} steps · {progress.percent}%
                    </span>
                    {progress.completedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setResetConfirmOpen(true)}
                        aria-label="Reset coding flow progress"
                        className="cursor-pointer text-slate-400 transition-colors hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-200"
                        title="Reset progress"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#262626]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        progress.isComplete ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Step Checklist + Final Code */}
              <div className="space-y-1 p-3">
                {blueprint.steps.map((step, idx) => {
                  const isDone = completedSet.has(step.id);
                  const isActive = !isFinalOutputStage && activeStepIndex === idx;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        isActive
                          ? 'bg-slate-100 text-slate-950 dark:bg-[#242424] dark:text-white'
                          : 'hover:bg-slate-50 dark:hover:bg-[#1E1E1E]'
                      }`}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isDone}
                        aria-label={`Mark "${step.title}" as ${isDone ? 'incomplete' : 'complete'}`}
                        onClick={() => onToggleStep(step.id)}
                        className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center text-slate-400 hover:text-blue-600 dark:text-neutral-500 dark:hover:text-blue-400"
                      >
                        {isDone ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectStepIndex(idx)}
                        className={`min-w-0 flex-1 cursor-pointer truncate text-left ${
                          isActive
                            ? 'font-semibold text-slate-950 dark:text-white'
                            : isDone
                              ? 'text-slate-400 line-through dark:text-neutral-500'
                              : 'text-slate-700 dark:text-neutral-300'
                        }`}
                      >
                        {step.title}
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleSelectStepIndex(blueprint.steps.length)}
                  className={`mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                    isFinalOutputStage
                      ? 'bg-slate-100 font-semibold text-emerald-700 dark:bg-[#242424] dark:text-emerald-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#1E1E1E] dark:hover:text-white'
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Final Output Code</span>
                </button>
              </div>

              {/* Collapsible Problem Brief, Complexity & Edge Cases */}
              <div className="p-3">
                <button
                  type="button"
                  aria-expanded={briefOpen}
                  onClick={() => setBriefOpen((prev) => !prev)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#1E1E1E] dark:hover:text-white"
                >
                  <span>Problem Brief</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      briefOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {briefOpen && (
                  <div className="mt-2 space-y-3 px-2 pb-1 text-xs">
                    <p className="leading-relaxed text-slate-600 dark:text-neutral-400">
                      {blueprint.canonicalPrompt}
                    </p>

                    {adapter?.setupNote && (
                      <p className="font-mono text-[11px] leading-relaxed text-slate-500 dark:text-neutral-400">
                        {adapter.setupNote}
                      </p>
                    )}

                    <div className="flex items-center gap-4 border-t border-slate-100 pt-2.5 font-mono text-[11px] text-slate-500 dark:border-neutral-800/80 dark:text-neutral-400">
                      <span>Time: {blueprint.timeComplexity}</span>
                      <span>Space: {blueprint.spaceComplexity}</span>
                    </div>

                    {(blueprint.edgeCases ?? []).length > 0 && (
                      <ul className="space-y-1 border-t border-slate-100 pt-2.5 text-slate-600 dark:border-neutral-800/80 dark:text-neutral-400">
                        {(blueprint.edgeCases ?? []).map((edge, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span
                              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-neutral-500"
                              aria-hidden="true"
                            />
                            <span>{edge}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="Reset problem progress?"
        description={`This clears your ${activeLangMeta.name} draft and step checkmarks for "${blueprint.title}".`}
        confirmLabel="Reset Progress"
        tone="danger"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={executeResetFlow}
      />
    </div>
  );
}
