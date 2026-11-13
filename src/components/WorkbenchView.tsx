import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  Layers,
  Lightbulb,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import { LANGUAGE_MAP } from '../data/languages';
import type {
  CodeEvaluationResult,
  CurriculumModule,
  CurriculumTrack,
  DeepDiveExpansion,
  TutorMessage,
} from '../types/curriculum';
import { checkBalancedDelimiters } from '../utils/curriculumLogic';
import { CodeBlock } from './CodeBlock';
import { InlineCodeText } from './InlineCodeText';
import { LanguageIcon } from './LanguageIcon';

interface WorkbenchViewProps {
  activeTrack: CurriculumTrack | null;
  activeModuleId: string | null;
  completedModuleIds: string[];
  getIdToken: () => Promise<string>;
  onBackToPath: () => void;
  onStartBuilder: () => void;
  onSelectModule: (moduleId: string) => void;
  onToggleComplete: (moduleId: string, forceValue?: boolean) => void;
  onRecordAttempt: (moduleId: string, passed: boolean) => void;
  onSaveDeepDive: (
    trackId: string,
    moduleId: string,
    deepDive: DeepDiveExpansion,
  ) => void;
}

type LessonStep = 'learn' | 'practice' | 'tutor';

export function WorkbenchView({
  activeTrack,
  activeModuleId,
  completedModuleIds,
  getIdToken,
  onBackToPath,
  onStartBuilder,
  onSelectModule,
  onToggleComplete,
  onRecordAttempt,
  onSaveDeepDive,
}: WorkbenchViewProps) {
  const [lessonStep, setLessonStep] = useState<LessonStep>('learn');
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
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-slate-950">
            No active curriculum
          </h1>
          <p className="mt-2 text-sm text-slate-600">
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

  const currentCode =
    codeByModule[activeModule.id] ?? activeModule.challenge.starterCode;

  useEffect(() => {
    setLessonStep('learn');
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

  const currentIndex = activeTrack.modules.findIndex(
    (m) => m.id === activeModule.id,
  );
  const nextModule =
    currentIndex < activeTrack.modules.length - 1
      ? activeTrack.modules[currentIndex + 1]
      : null;

  const stepIndex = lessonStep === 'learn' ? 1 : lessonStep === 'practice' ? 2 : 3;
  const stepProgressPercent = Math.round((stepIndex / 3) * 100);
  const delimiterWarnings =
    currentCode.trim().length > 0 ? checkBalancedDelimiters(currentCode) : [];

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
      const data = (await response.json()) as {
        evaluation?: CodeEvaluationResult;
        error?: string;
      };
      if (!response.ok || !data.evaluation) {
        setEvalError(data.error ?? 'Evaluation failed.');
        return;
      }
      setEvaluation(data.evaluation);
      onRecordAttempt(activeModule.id, data.evaluation.passed);
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
      const data = (await response.json()) as {
        deepDive?: DeepDiveExpansion;
        error?: string;
      };
      if (!response.ok || !data.deepDive) {
        setDeepDiveError(data.error ?? 'Could not load deep-dive.');
        return;
      }
      onSaveDeepDive(activeTrack!.id, activeModule.id, data.deepDive);
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
      const data = (await response.json()) as {
        answer?: string;
        codeSnippet?: string;
        error?: string;
      };
      if (!response.ok || !data.answer) {
        setTutorError(data.error ?? 'Tutor request failed.');
        return;
      }
      setTutorMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.answer!,
          codeSnippet: data.codeSnippet,
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToPath}
            className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Path</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {String(activeModule.order).padStart(2, '0')} /{' '}
              {String(activeTrack.modules.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => onToggleComplete(activeModule.id)}
              aria-pressed={isModuleCompleted}
              className={`btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                isModuleCompleted
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2
                className={`h-4 w-4 ${isModuleCompleted ? 'text-emerald-600' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span>{isModuleCompleted ? 'Done' : 'Complete'}</span>
            </button>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${stepProgressPercent}%` }}
          />
        </div>

        <div
          role="tablist"
          aria-label="Lesson stages"
          className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5"
        >
          {(
            [
              { id: 'learn', label: 'Syntax' },
              { id: 'practice', label: 'Practice' },
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
                className={`min-h-10 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 whitespace-nowrap sm:text-sm ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
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
          className="animate-view-enter space-y-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
            <LanguageIcon language={activeTrack.language} className="mt-1 h-7 w-7" />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-blue-700">
                  {langMeta.standardLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {activeModule.estimatedMinutes}m
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                {activeModule.title}
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                <InlineCodeText text={activeModule.summary} />
              </p>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <span className="block text-xs font-semibold text-slate-500">
              Grammar
            </span>
            <code className="block overflow-x-auto font-mono text-sm font-medium text-slate-950">
              {activeModule.syntaxGrammar}
            </code>
          </div>

          <div className="space-y-8">
            {activeModule.examples.map((ex, idx) => (
              <div key={idx} className="space-y-3">
                <h2 className="text-sm font-bold text-slate-950">
                  {ex.title}
                </h2>
                <CodeBlock
                  code={ex.code}
                  language={activeTrack.language}
                  title={ex.title}
                />
                <div className="grid gap-4 pt-1 sm:grid-cols-2">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500">
                      Mechanics
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      <InlineCodeText text={ex.explanation} />
                    </p>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500">
                      Usage
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      <InlineCodeText text={ex.usageNote} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {activeModule.commonPitfalls.length > 0 && (
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-xs font-semibold text-amber-800">
                Watch Out
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-700">
                {activeModule.commonPitfalls.map((pitfall, idx) => (
                  <li key={idx}>
                    <InlineCodeText text={pitfall} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeModule.deepDive && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h3 className="font-display text-base font-bold text-slate-950">
                Deep-Dive
              </h3>
              <p className="text-sm leading-relaxed text-slate-700">
                {activeModule.deepDive.mentalModelBridge}
              </p>
              {activeModule.deepDive.edgeCases.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {activeModule.deepDive.edgeCases.map((edge, i) => (
                    <li key={i}>{edge}</li>
                  ))}
                </ul>
              )}
              <div className="space-y-4 pt-2">
                {activeModule.deepDive.additionalExamples.map((ex, i) => (
                  <div key={i} className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-900">
                      {ex.title}
                    </h4>
                    <CodeBlock
                      code={ex.code}
                      language={activeTrack.language}
                      title={ex.title}
                      compact
                    />
                    <p className="text-xs text-slate-600">
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
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <span>{deepDiveError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            {!activeModule.deepDive ? (
              <button
                type="button"
                onClick={handleGenerateDeepDive}
                disabled={isLoadingDeepDive}
                className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700 disabled:opacity-60 whitespace-nowrap"
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
              onClick={() => setLessonStep('practice')}
              className="btn-juice group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto"
            >
              <span>Practice</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </section>
      )}

      {lessonStep === 'practice' && (
        <section
          key="practice"
          className="animate-view-enter space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1.5">
              <p className="font-mono text-xs font-semibold text-blue-700">
                {langMeta.name} · Practice
              </p>
              <h1 className="font-display text-2xl font-bold text-slate-950">
                {activeModule.challenge.title}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                <InlineCodeText text={activeModule.challenge.prompt} />
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                aria-expanded={showHint}
                className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSolution((v) => !v)}
                aria-expanded={showSolution}
                className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {showHint && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
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

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0D1117]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#141922] px-4 py-2 text-xs text-slate-400">
              <span className="font-mono font-medium text-slate-300">
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
              className="w-full resize-y bg-[#0D1117] p-4 font-mono text-[13px] leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {delimiterWarnings.length > 0 && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <span>{delimiterWarnings[0]}</span>
            </div>
          )}

          {evalError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <span>{evalError}</span>
            </div>
          )}

          {evaluation && (
            <div
              className={`space-y-3 rounded-2xl border-2 p-5 ${
                evaluation.passed
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : 'border-amber-300 bg-amber-50/70'
              }`}
            >
              <div className="flex items-center gap-2">
                {evaluation.passed ? (
                  <CheckCircle2
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertCircle
                    className="h-5 w-5 text-amber-700"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`text-sm font-bold ${
                    evaluation.passed ? 'text-emerald-950' : 'text-amber-950'
                  }`}
                >
                  {evaluation.verdictLabel}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-slate-800">
                {evaluation.feedback}
              </p>

              {evaluation.syntaxIssues.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-red-800">
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

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setLessonStep('learn')}
              className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Syntax</span>
            </button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {evaluation?.passed && nextModule && (
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
          className="animate-view-enter space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          <div className="border-b border-slate-100 pb-4">
            <span className="font-mono text-xs font-semibold text-blue-700">
              {langMeta.name} · Tutor
            </span>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-950">
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
                  className="btn-juice rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
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
                      ? 'bg-slate-100 text-slate-900'
                      : 'border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
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
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
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
              className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAskingTutor || !tutorInput.trim()}
              className="btn-juice inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-2 border-slate-950 bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
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

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setLessonStep('practice')}
              className="btn-juice inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Practice</span>
            </button>

            {nextModule && (
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
            )}
          </div>
        </section>
      )}
    </div>
  );
}
