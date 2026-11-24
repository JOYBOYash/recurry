import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlgoChecklistWorkspace } from '../components/algo/AlgoChecklistWorkspace';
import {
  AlgoIntakeSection,
  type AlgoIntakeSubmitPayload,
} from '../components/algo/AlgoIntakeSection';
import { AlgoLibraryGrid } from '../components/algo/AlgoLibraryGrid';
import { useAppAuth } from '../context/AppAuthContext';
import type {
  AlgoCacheHitStatus,
  AlgoLanguageAdapter,
  AlgoProblemBlueprint,
  AlgoUserProgress,
} from '../types/algo';
import type { LanguageId } from '../types/curriculum';
import {
  computeAlgoChecklistProgress,
  mergeAlgoProblemLibraries,
} from '../utils/algoLogic';
import {
  fetchAlgoProblemDetail,
  fetchSharedAlgoLibrary,
  fetchUserAlgoProgressMap,
  requestAlgoDecompose,
  requestAlgoLanguageAdapter,
  saveUserAlgoProgress,
} from '../utils/algoPersistence';

export function AlgoModePage() {
  const { problemId } = useParams<{ problemId?: string }>();
  const navigate = useNavigate();
  const { user, profile, getIdToken } = useAppAuth();

  const defaultLanguage: LanguageId = profile?.preferredLanguage ?? 'python';

  const [library, setLibrary] = useState<AlgoProblemBlueprint[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, AlgoUserProgress>>({});

  const [activeBlueprint, setActiveBlueprint] = useState<AlgoProblemBlueprint | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<LanguageId>(defaultLanguage);
  const [adaptersByKey, setAdaptersByKey] = useState<Record<string, AlgoLanguageAdapter>>({});
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [adaptingLanguage, setAdaptingLanguage] = useState(false);
  const [adapterError, setAdapterError] = useState<string | null>(null);
  const [cacheNote, setCacheNote] = useState<
    AlgoCacheHitStatus | 'adapter_cached' | 'adapter_generated' | null
  >(null);

  // Load shared library + private user progress once signed in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadInitial() {
      setLibraryLoading(true);
      try {
        const [token, progMap] = await Promise.all([
          getIdToken(),
          fetchUserAlgoProgressMap(user!.uid),
        ]);
        const problems = await fetchSharedAlgoLibrary(token);
        if (!cancelled) {
          setLibrary(problems);
          setProgressMap(progMap);
        }
      } catch {
        // Keep empty/existing library on transient errors.
      } finally {
        if (!cancelled) {
          setLibraryLoading(false);
        }
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken]);

  const ensureAdapterForProblem = useCallback(
    async (
      blueprint: AlgoProblemBlueprint,
      language: LanguageId,
      emitCacheNote = false,
    ) => {
      if (!user) return;
      const cacheKey = `${blueprint.id}:${language}`;
      if (adaptersByKey[cacheKey]) {
        if (emitCacheNote) setCacheNote('adapter_cached');
        return;
      }

      setAdaptingLanguage(true);
      setAdapterError(null);
      try {
        const token = await getIdToken();
        const detail = await fetchAlgoProblemDetail(token, blueprint.id, language);
        if (detail.adapter) {
          setAdaptersByKey((prev) => ({ ...prev, [cacheKey]: detail.adapter! }));
          if (emitCacheNote) setCacheNote('adapter_cached');
          return;
        }

        const adapted = await requestAlgoLanguageAdapter({
          token,
          problemId: blueprint.id,
          language,
          blueprint,
        });
        setAdaptersByKey((prev) => ({ ...prev, [cacheKey]: adapted.adapter }));
        setLibrary((prev) =>
          prev.map((item) =>
            item.id === blueprint.id && !item.availableLanguages.includes(language)
              ? {
                  ...item,
                  availableLanguages: [...item.availableLanguages, language],
                }
              : item,
          ),
        );
        setActiveBlueprint((prev) =>
          prev &&
          prev.id === blueprint.id &&
          !prev.availableLanguages.includes(language)
            ? {
                ...prev,
                availableLanguages: [...prev.availableLanguages, language],
              }
            : prev,
        );
        if (emitCacheNote) {
          setCacheNote(
            adapted.cacheHit ? 'adapter_cached' : 'adapter_generated',
          );
        }
      } catch (err) {
        setAdapterError(
          err instanceof Error
            ? err.message
            : 'Could not adapt syntax for this language.',
        );
      } finally {
        setAdaptingLanguage(false);
      }
    },
    [user, getIdToken, adaptersByKey],
  );

  // Synchronize URL `/app/algo/:problemId` with workspace state.
  useEffect(() => {
    if (!problemId) {
      setActiveBlueprint(null);
      setAdapterError(null);
      return;
    }
    if (!user) return;

    let cancelled = false;

    async function hydrateProblem() {
      const existingProgress = progressMap[problemId!];
      const desiredLang: LanguageId =
        existingProgress?.activeLanguage ?? activeLanguage ?? defaultLanguage;

      const fromLibrary = library.find((p) => p.id === problemId);
      if (fromLibrary) {
        setActiveBlueprint(fromLibrary);
        setActiveLanguage(desiredLang);
        void ensureAdapterForProblem(fromLibrary, desiredLang, false);
        return;
      }

      setWorkspaceLoading(true);
      try {
        const token = await getIdToken();
        const detail = await fetchAlgoProblemDetail(token, problemId!, desiredLang);
        if (cancelled) return;
        if (detail.blueprint) {
          setActiveBlueprint(detail.blueprint);
          setActiveLanguage(desiredLang);
          setLibrary((prev) => mergeAlgoProblemLibraries([detail.blueprint!], prev));
          if (detail.adapter) {
            setAdaptersByKey((prev) => ({
              ...prev,
              [`${detail.blueprint!.id}:${desiredLang}`]: detail.adapter!,
            }));
          } else {
            void ensureAdapterForProblem(detail.blueprint, desiredLang, false);
          }
        } else {
          navigate('/app/algo', { replace: true });
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    void hydrateProblem();
    return () => {
      cancelled = true;
    };
    // Intentionally scoped to route problemId & library hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, user, library.length]);

  async function handleIntakeSubmit(payload: AlgoIntakeSubmitPayload) {
    if (!user) return;
    setSubmitting(true);
    setIntakeError(null);
    setAdapterError(null);

    try {
      const token = await getIdToken();
      const result = await requestAlgoDecompose({
        token,
        uid: user.uid,
        language: payload.language,
        concept: payload.concept,
        problemText: payload.problemText,
        imageBase64: payload.imageBase64,
        imageMimeType: payload.imageMimeType,
      });

      setLibrary((prev) => mergeAlgoProblemLibraries([result.blueprint], prev));
      setActiveBlueprint(result.blueprint);
      setActiveLanguage(result.adapter.language);
      setAdaptersByKey((prev) => ({
        ...prev,
        [`${result.blueprint.id}:${result.adapter.language}`]: result.adapter,
      }));
      setCacheNote(result.cacheHit);

      // Persist active language choice in user progress if none exists yet.
      const existing = progressMap[result.blueprint.id];
      const nextProgress: AlgoUserProgress = existing
        ? {
            ...existing,
            activeLanguage: result.adapter.language,
            updatedAt: new Date().toISOString(),
          }
        : {
            problemId: result.blueprint.id,
            uid: user.uid,
            activeLanguage: result.adapter.language,
            completedStepIds: [],
            updatedAt: new Date().toISOString(),
            completedAt: null,
          };
      setProgressMap((prev) => ({ ...prev, [result.blueprint.id]: nextProgress }));
      void saveUserAlgoProgress(user.uid, nextProgress);

      navigate(`/app/algo/${result.blueprint.id}`);
    } catch (err) {
      setIntakeError(
        err instanceof Error
          ? err.message
          : 'Could not break down this problem. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectSavedProblem(problem: AlgoProblemBlueprint) {
    const savedProgress = progressMap[problem.id];
    const preferredLang: LanguageId =
      savedProgress?.activeLanguage ??
      (problem.availableLanguages.includes(defaultLanguage)
        ? defaultLanguage
        : problem.availableLanguages[0] ?? defaultLanguage);

    setActiveBlueprint(problem);
    setActiveLanguage(preferredLang);
    setCacheNote(null);
    setAdapterError(null);
    navigate(`/app/algo/${problem.id}`);
    void ensureAdapterForProblem(problem, preferredLang, false);
  }

  function handleMarkStepComplete(stepId: string) {
    if (!user || !activeBlueprint) return;
    const existing = progressMap[activeBlueprint.id];
    const prevSteps = existing?.completedStepIds ?? [];
    if (prevSteps.includes(stepId)) return;

    const nextSteps = [...prevSteps, stepId];
    const summary = computeAlgoChecklistProgress(
      activeBlueprint.steps.map((s) => s.id),
      nextSteps,
    );
    const now = new Date().toISOString();
    const nextProgress: AlgoUserProgress = {
      problemId: activeBlueprint.id,
      uid: user.uid,
      activeLanguage,
      completedStepIds: nextSteps,
      updatedAt: now,
      completedAt: summary.isComplete ? existing?.completedAt ?? now : null,
    };

    setProgressMap((prev) => ({ ...prev, [activeBlueprint.id]: nextProgress }));
    void saveUserAlgoProgress(user.uid, nextProgress);
  }

  function handleToggleStep(stepId: string) {
    if (!user || !activeBlueprint) return;
    const existing = progressMap[activeBlueprint.id];
    const prevSteps = existing?.completedStepIds ?? [];
    const nextSteps = prevSteps.includes(stepId)
      ? prevSteps.filter((id) => id !== stepId)
      : [...prevSteps, stepId];

    const summary = computeAlgoChecklistProgress(
      activeBlueprint.steps.map((s) => s.id),
      nextSteps,
    );
    const now = new Date().toISOString();
    const nextProgress: AlgoUserProgress = {
      problemId: activeBlueprint.id,
      uid: user.uid,
      activeLanguage,
      completedStepIds: nextSteps,
      updatedAt: now,
      completedAt: summary.isComplete ? existing?.completedAt ?? now : null,
    };

    setProgressMap((prev) => ({ ...prev, [activeBlueprint.id]: nextProgress }));
    void saveUserAlgoProgress(user.uid, nextProgress);
  }

  function handleResetProgress() {
    if (!user || !activeBlueprint) return;
    const nextProgress: AlgoUserProgress = {
      problemId: activeBlueprint.id,
      uid: user.uid,
      activeLanguage,
      completedStepIds: [],
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    setProgressMap((prev) => ({ ...prev, [activeBlueprint.id]: nextProgress }));
    void saveUserAlgoProgress(user.uid, nextProgress);
  }

  function handleSelectLanguage(nextLanguage: LanguageId) {
    if (!user || !activeBlueprint) return;
    setActiveLanguage(nextLanguage);
    setAdapterError(null);

    const existing = progressMap[activeBlueprint.id];
    const nextProgress: AlgoUserProgress = {
      problemId: activeBlueprint.id,
      uid: user.uid,
      activeLanguage: nextLanguage,
      completedStepIds: existing?.completedStepIds ?? [],
      updatedAt: new Date().toISOString(),
      completedAt: existing?.completedAt ?? null,
    };
    setProgressMap((prev) => ({ ...prev, [activeBlueprint.id]: nextProgress }));
    void saveUserAlgoProgress(user.uid, nextProgress);

    void ensureAdapterForProblem(activeBlueprint, nextLanguage, true);
  }

  const activeAdapter = useMemo(() => {
    if (!activeBlueprint) return null;
    return adaptersByKey[`${activeBlueprint.id}:${activeLanguage}`] ?? null;
  }, [activeBlueprint, activeLanguage, adaptersByKey]);

  const completedStepIds = useMemo(() => {
    if (!activeBlueprint) return [];
    return progressMap[activeBlueprint.id]?.completedStepIds ?? [];
  }, [activeBlueprint, progressMap]);

  if (problemId && workspaceLoading && !activeBlueprint) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <Loader2
          className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400"
          aria-label="Loading problem"
        />
      </div>
    );
  }

  if (problemId && activeBlueprint && user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AlgoChecklistWorkspace
          uid={user.uid}
          blueprint={activeBlueprint}
          adapter={activeAdapter}
          activeLanguage={activeLanguage}
          completedStepIds={completedStepIds}
          adaptingLanguage={adaptingLanguage}
          adapterError={adapterError}
          cacheNote={cacheNote}
          getIdToken={getIdToken}
          onBack={() => navigate('/app/algo')}
          onMarkStepComplete={handleMarkStepComplete}
          onToggleStep={handleToggleStep}
          onResetProgress={handleResetProgress}
          onSelectLanguage={handleSelectLanguage}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
          Algo Mode
        </h1>
        <p className="text-sm text-slate-600 dark:text-neutral-400">
          Pick a language, paste any coding problem or snippet, and write each sub-problem in flow until your code is output-ready.
        </p>
      </header>

      <AlgoIntakeSection
        defaultLanguage={defaultLanguage}
        submitting={submitting}
        error={intakeError}
        onClearError={() => setIntakeError(null)}
        onSubmit={handleIntakeSubmit}
      />

      <AlgoLibraryGrid
        problems={library}
        progressMap={progressMap}
        loading={libraryLoading}
        onSelectProblem={handleSelectSavedProblem}
      />
    </div>
  );
}
