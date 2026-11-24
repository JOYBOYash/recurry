import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Star,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LanguageIcon } from '../components/LanguageIcon';
import { WorkbenchView } from '../components/WorkbenchView';
import { useAppAuth } from '../context/AppAuthContext';
import { useFocusMode } from '../context/FocusModeContext';
import {
  computeTrackAccuracyAndStars,
  evaluateTrackModulesProgression,
  shouldTriggerTrackCelebration,
  type TrackCompletionSnapshot,
} from '../engines/progressionEngine';
import { triggerTrackCompletionConfetti } from '../utils/confetti';
import {
  extractCoreObjectives,
  formatModuleCountLabel,
} from '../utils/curriculumCards';

export function LearnPage() {
  const { trackId } = useParams<{ trackId?: string }>();
  const navigate = useNavigate();
  const { focusMode } = useFocusMode();

  const {
    profile,
    tracks,
    certificates,
    programmeLock,
    activeTrack,
    activeModuleId,
    selectTrackAndModule,
    toggleModuleComplete,
    recordChallengeAttempt,
    recordRecallDrillAttempt,
    saveModuleDeepDive,
    redoTrack,
    issueTrackCertificate,
    getIdToken,
  } = useAppAuth();

  const [mode, setMode] = useState<'overview' | 'workbench'>('overview');
  const [issuingCert, setIssuingCert] = useState(false);
  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const selectedTrack = trackId
    ? tracks.find((t) => t.id === trackId) ?? activeTrack
    : activeTrack;

  const completedModuleIds = profile?.completedModuleIds ?? [];
  const progression = useMemo(
    () => evaluateTrackModulesProgression(selectedTrack, completedModuleIds),
    [selectedTrack, completedModuleIds],
  );

  const isTrackComplete = progression.isTrackComplete;
  const evaluatedProgramme = selectedTrack
    ? programmeLock.programmesById[selectedTrack.id]
    : undefined;
  const isTrackLockedByActive = evaluatedProgramme?.status === 'locked';

  const prevCompletionRef = useRef<TrackCompletionSnapshot | null>(null);
  const confettiCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      confettiCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!selectedTrack) {
      prevCompletionRef.current = null;
      return;
    }

    const nextSnapshot: TrackCompletionSnapshot = {
      trackId: selectedTrack.id,
      isComplete: isTrackComplete,
    };

    if (shouldTriggerTrackCelebration(prevCompletionRef.current, nextSnapshot)) {
      confettiCleanupRef.current?.();
      confettiCleanupRef.current = triggerTrackCompletionConfetti();
    } else if (
      prevCompletionRef.current &&
      prevCompletionRef.current.trackId !== nextSnapshot.trackId
    ) {
      confettiCleanupRef.current?.();
      confettiCleanupRef.current = null;
    }

    prevCompletionRef.current = nextSnapshot;
  }, [selectedTrack, isTrackComplete]);

  useEffect(() => {
    if (
      selectedTrack &&
      !isTrackLockedByActive &&
      activeTrack?.id !== selectedTrack.id
    ) {
      void selectTrackAndModule(
        selectedTrack.id,
        progression.nextUnlockedModuleId ?? selectedTrack.modules[0]?.id ?? null,
      );
    }
  }, [
    selectedTrack,
    isTrackLockedByActive,
    activeTrack?.id,
    progression.nextUnlockedModuleId,
    selectTrackAndModule,
  ]);

  if (!selectedTrack) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <h1 className="font-display text-xl font-bold text-slate-950 dark:text-white">
            No curriculum selected
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Choose or create a track to begin.
          </p>
          <div className="mt-5 flex justify-center gap-2.5">
            <Link
              to="/generate"
              className="btn-juice inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Create Curriculum
            </Link>
            <Link
              to="/app/curriculums"
              className="inline-flex h-9 items-center rounded-lg px-4 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-[#222222]"
            >
              Curriculums
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isTrackLockedByActive && programmeLock.activeIncompleteTrackId) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <Lock
            className="mx-auto h-6 w-6 text-amber-500"
            aria-hidden="true"
          />
          <h1 className="mt-3 font-display text-xl font-bold text-slate-950 dark:text-white">
            Curriculum Locked
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Finish your active curriculum first.
          </p>
          <div className="mt-5 flex justify-center gap-2.5">
            <Link
              to={`/app/learn/${encodeURIComponent(programmeLock.activeIncompleteTrackId)}`}
              className="btn-juice inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Resume Active</span>
            </Link>
            <Link
              to="/app/curriculums"
              className="inline-flex h-9 items-center rounded-lg px-4 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-[#222222]"
            >
              Curriculums
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const moduleAccuracy = profile?.moduleAccuracy ?? {};
  const accuracy = computeTrackAccuracyAndStars(
    selectedTrack,
    moduleAccuracy,
    completedModuleIds,
  );
  const existingCert = certificates.find((c) => c.trackId === selectedTrack.id);

  async function handleClaimCertificate() {
    if (!selectedTrack) return;
    setIssuingCert(true);
    try {
      await issueTrackCertificate(selectedTrack);
      navigate('/app/profile?tab=certificates');
    } finally {
      setIssuingCert(false);
    }
  }

  async function handleConfirmRestart() {
    if (!selectedTrack) return;
    setRestarting(true);
    try {
      await redoTrack(selectedTrack.id);
    } finally {
      setRestarting(false);
      setConfirmRestartOpen(false);
    }
  }

  if (mode === 'workbench') {
    return (
      <WorkbenchView
        activeTrack={selectedTrack}
        activeModuleId={activeModuleId}
        completedModuleIds={completedModuleIds}
        moduleAccuracy={moduleAccuracy}
        progression={progression}
        isTrackComplete={isTrackComplete}
        getIdToken={getIdToken}
        onBackToPath={() => setMode('overview')}
        onStartBuilder={() => navigate('/generate')}
        onSelectModule={(modId) => {
          void selectTrackAndModule(selectedTrack.id, modId);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onToggleComplete={(modId, val) => void toggleModuleComplete(modId, val)}
        onRecordAttempt={(modId, passed) => void recordChallengeAttempt(modId, passed)}
        onRecordRecallDrill={(modId, drillId, correct) =>
          void recordRecallDrillAttempt(modId, drillId, correct)
        }
        onSaveDeepDive={(tid, modId, dd) => void saveModuleDeepDive(tid, modId, dd)}
      />
    );
  }

  const nextModule =
    selectedTrack.modules.find((m) => m.id === progression.nextUnlockedModuleId) ??
    selectedTrack.modules[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {!focusMode && (
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/app/curriculums"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#202020] dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Curriculums</span>
          </Link>

          <button
            type="button"
            onClick={() => setConfirmRestartOpen(true)}
            aria-label={`Restart ${selectedTrack.title}`}
            title="Restart track"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-950 dark:text-neutral-500 dark:hover:bg-[#202020] dark:hover:text-white"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Minimalist Track Summary */}
      <section className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-[#181818]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <LanguageIcon
              language={selectedTrack.language}
              className="h-6 w-6 shrink-0"
            />
            <h1 className="truncate font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white">
              {selectedTrack.title}
            </h1>
          </div>

          {nextModule && (
            <button
              type="button"
              onClick={async () => {
                await selectTrackAndModule(selectedTrack.id, nextModule.id);
                setMode('workbench');
              }}
              className="btn-juice inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {progression.completedCount === 0
                  ? 'Start'
                  : progression.percentage === 100
                    ? 'Review'
                    : 'Continue'}
              </span>
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progression.percentage === 100 ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progression.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums dark:text-neutral-400">
            <span>
              {formatModuleCountLabel(
                progression.completedCount,
                progression.totalCount,
              )}
            </span>
            <span>{progression.percentage}%</span>
          </div>
        </div>
      </section>

      {progression.percentage === 100 && (
        <section className="animate-accomplish-pop flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < accuracy.stars
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-slate-200 dark:text-neutral-700'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Track Complete
            </span>
          </div>

          {existingCert ? (
            <Link
              to="/app/profile?tab=certificates"
              className="btn-juice inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              <span>Certificate</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled={issuingCert}
              onClick={() => void handleClaimCertificate()}
              className="btn-juice inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {issuingCert ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Award className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Claim Award</span>
            </button>
          )}
        </section>
      )}

      {/* Minimalist Lesson Cards — Tight Vertical Rhythm */}
      <section aria-label="Curriculum lessons" className="space-y-2">
        {selectedTrack.modules.map((mod, idx) => {
          const node = progression.nodes[idx];
          const status = node?.status ?? 'available';
          const isDone = status === 'completed';
          const isAvailable = status === 'available';
          const isLocked = status === 'locked';
          const firstObjective = extractCoreObjectives(mod, 2).join(' · ');

          return (
            <article
              key={mod.id}
              className={`group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
                isAvailable
                  ? 'border-blue-500/70 bg-white dark:border-blue-500/60 dark:bg-[#181818]'
                  : isDone
                    ? 'border-slate-200/80 bg-white dark:border-neutral-800 dark:bg-[#181818]'
                    : 'border-slate-200/50 bg-slate-50/40 opacity-65 dark:border-neutral-800/60 dark:bg-[#151515]'
              }`}
            >
              <button
                type="button"
                disabled={isLocked}
                onClick={async () => {
                  await selectTrackAndModule(selectedTrack.id, mod.id);
                  setMode('workbench');
                }}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left disabled:cursor-not-allowed"
              >
                <span className="shrink-0">
                  {isDone ? (
                    <CheckCircle2
                      className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                  ) : isLocked ? (
                    <Lock
                      className="h-4 w-4 text-slate-400 dark:text-neutral-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <Play
                      className="h-4 w-4 text-blue-600 dark:text-blue-400"
                      aria-hidden="true"
                    />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-sm font-bold text-slate-950 dark:text-white">
                    {mod.title}
                  </h2>
                  {!focusMode && firstObjective && (
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-neutral-400">
                      {firstObjective}
                    </p>
                  )}
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => void toggleModuleComplete(mod.id)}
                    aria-pressed={isDone}
                    aria-label={
                      isDone
                        ? `Mark ${mod.title} incomplete`
                        : `Mark ${mod.title} complete`
                    }
                    title={isDone ? 'Mark incomplete' : 'Mark complete'}
                    className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                      isDone
                        ? 'text-emerald-600 hover:bg-slate-100 dark:text-emerald-400 dark:hover:bg-[#242424]'
                        : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:text-neutral-600 dark:hover:bg-[#242424] dark:hover:text-neutral-200'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}

                {!isLocked && (
                  <button
                    type="button"
                    onClick={async () => {
                      await selectTrackAndModule(selectedTrack.id, mod.id);
                      setMode('workbench');
                    }}
                    aria-label={`Open ${mod.title}`}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-500 dark:hover:bg-[#242424] dark:hover:text-white"
                  >
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <ConfirmDialog
        isOpen={confirmRestartOpen}
        title="Restart curriculum?"
        description={`Reset all completed modules for "${selectedTrack.title}" and start fresh?`}
        confirmLabel="Restart"
        busy={restarting}
        onConfirm={handleConfirmRestart}
        onCancel={() => setConfirmRestartOpen(false)}
      />
    </div>
  );
}
