import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Brain,
  CheckCircle2,
  Clock,
  Code2,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Star,
  Zap,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { InlineCodeText } from '../components/InlineCodeText';
import { LanguageIcon } from '../components/LanguageIcon';
import { RankIcon } from '../components/RankIcon';
import { WorkbenchView } from '../components/WorkbenchView';
import { useAppAuth } from '../context/AppAuthContext';
import { LANGUAGE_MAP, SKILL_LEVELS } from '../data/languages';
import { getModuleRecallDrills } from '../engines/learningEngine';
import {
  computeTrackAccuracyAndStars,
  evaluateTrackModulesProgression,
  shouldTriggerTrackCelebration,
  type TrackCompletionSnapshot,
} from '../engines/progressionEngine';
import { triggerTrackCompletionConfetti } from '../utils/confetti';

export function LearnPage() {
  const { trackId } = useParams<{ trackId?: string }>();
  const navigate = useNavigate();

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
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            No curriculum selected
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
            Generate or choose a curriculum to start learning.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/generate"
              className="btn-juice inline-flex min-h-11 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <span>Create Curriculum</span>
            </Link>
            <Link
              to="/app/curriculums"
              className="btn-juice inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
            >
              <span>My Curriculums</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isTrackLockedByActive && programmeLock.activeIncompleteTrackId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border-2 border-amber-300 bg-white p-8 text-center dark:border-amber-600/80 dark:bg-[#181818]">
          <Lock className="mx-auto h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-white">
            Curriculum Locked
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
            {evaluatedProgramme?.lockReason ??
              'Complete your active curriculum first to unlock this track.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to={`/app/learn/${encodeURIComponent(programmeLock.activeIncompleteTrackId)}`}
              className="btn-juice inline-flex min-h-11 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Resume Active Track</span>
            </Link>
            <Link
              to="/app/curriculums"
              className="btn-juice inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
            >
              <span>My Curriculums</span>
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
  const langMeta = LANGUAGE_MAP[selectedTrack.language];
  const skillLabel =
    SKILL_LEVELS.find((s) => s.id === selectedTrack.skillLevel)?.label ??
    selectedTrack.skillLevel;

  async function handleClaimCertificate() {
    if (!selectedTrack) return;
    setIssuingCert(true);
    try {
      await issueTrackCertificate(selectedTrack);
      navigate('/app/certificates');
    } finally {
      setIssuingCert(false);
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
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/app/curriculums"
          className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-[#202020] dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>My Curriculums</span>
        </Link>

        <button
          type="button"
          onClick={() => void redoTrack(selectedTrack.id)}
          className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Redo Track</span>
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-[#181818]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <LanguageIcon language={selectedTrack.language} className="mt-1 h-8 w-8" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-blue-700 dark:text-blue-400">
                <span className="font-semibold">
                  {langMeta.name} · {langMeta.standardLabel}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <RankIcon rank={selectedTrack.skillLevel} useRankColor className="h-3.5 w-3.5" />
                  <span>{skillLabel}</span>
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
                {selectedTrack.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-neutral-400">{selectedTrack.subtitle}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700 tabular-nums dark:text-blue-400">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {progression.totalXpEarned} / {progression.totalXpPossible} XP
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-neutral-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-neutral-200">
            <span>Sequential Mastery Path</span>
            <span className="font-mono tabular-nums">
              {progression.completedCount}/{progression.totalCount} · {progression.percentage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progression.percentage === 100 ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progression.percentage}%` }}
            />
          </div>

          {nextModule && (
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  await selectTrackAndModule(selectedTrack.id, nextModule.id);
                  setMode('workbench');
                }}
                className="btn-juice inline-flex min-h-12 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>
                  {progression.completedCount === 0
                    ? `Start: ${nextModule.title}`
                    : progression.percentage === 100
                      ? `Review: ${nextModule.title}`
                      : `Continue: ${nextModule.title}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {progression.percentage === 100 && (
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-amber-400 bg-white p-6 sm:flex-row sm:items-center dark:border-amber-600/80 dark:bg-[#181818]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < accuracy.stars
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-slate-300 dark:text-neutral-700'
                  }`}
                  aria-hidden="true"
                />
              ))}
              <span className="ml-1 font-mono text-xs font-bold text-amber-900 tabular-nums dark:text-amber-300">
                {accuracy.accuracyPercent}% Accuracy · {accuracy.stars}/5 Stars
              </span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Curriculum complete!
            </h2>
            <p className="text-xs text-slate-600 dark:text-neutral-400">
              {existingCert
                ? 'Your certificate has been issued to your Certificates vault.'
                : 'Claim your star-ranked certificate and unlock your next curriculum.'}
            </p>
          </div>

          {existingCert ? (
            <Link
              to="/app/certificates"
              className="btn-juice inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-b-2 border-amber-700 bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600"
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              <span>View Certificate</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled={issuingCert}
              onClick={() => void handleClaimCertificate()}
              className="btn-juice inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-b-2 border-amber-700 bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {issuingCert ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Award className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Claim Certificate</span>
            </button>
          )}
        </section>
      )}

      <ul className="space-y-3">
        {selectedTrack.modules.map((mod, idx) => {
          const node = progression.nodes[idx];
          const isDone = node?.status === 'completed';
          const isAvailable = node?.status === 'available';
          const isLocked = node?.status === 'locked';
          const modAcc = moduleAccuracy[mod.id];
          const drills = getModuleRecallDrills(mod, selectedTrack.language);
          const drillsPassedCount = (modAcc?.drillsPassed ?? []).length;
          const CornerIcon = isDone
            ? CheckCircle2
            : isAvailable
              ? Play
              : isLocked
                ? Lock
                : Code2;

          return (
            <li
              key={mod.id}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${
                isAvailable
                  ? 'border-2 border-blue-600 bg-white dark:border-blue-500 dark:bg-[#181818]'
                  : isDone
                    ? 'border-emerald-500 bg-white dark:border-emerald-600 dark:bg-[#181818]'
                    : 'border-slate-200 bg-slate-50/70 opacity-80 dark:border-neutral-800 dark:bg-[#141414]'
              }`}
            >
              <CornerIcon
                aria-hidden="true"
                className={`pointer-events-none absolute -right-3 -bottom-4 h-20 w-20 -rotate-12 ${
                  isDone
                    ? 'text-emerald-600 opacity-[0.09]'
                    : isAvailable
                      ? 'text-blue-600 opacity-[0.09]'
                      : 'text-slate-400 opacity-[0.08] dark:text-neutral-600'
                }`}
              />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                    {mod.unitTitle && (
                      <>
                        <span className="font-mono font-semibold text-slate-700 dark:text-neutral-300">
                          {mod.unitTitle}
                        </span>
                        <span>·</span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {mod.estimatedMinutes}m
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-blue-700 tabular-nums dark:text-blue-400">
                      <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                      {Math.min(drillsPassedCount, drills.length)}/{drills.length} recall
                    </span>
                    <span>·</span>
                    <span className="font-mono font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                      +{node?.xpReward ?? 30} XP
                    </span>
                    {modAcc && modAcc.attempts > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                          {modAcc.bestAccuracy}% accuracy
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-950 dark:text-white">
                    {mod.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-neutral-300">
                    {isLocked && node?.lockedReason ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-neutral-400">
                        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{node.lockedReason}</span>
                      </span>
                    ) : (
                      <InlineCodeText text={mod.summary} />
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => void toggleModuleComplete(mod.id)}
                      aria-pressed={isDone}
                      className={`btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-semibold dark:bg-[#202020] ${
                        isDone
                          ? 'border-emerald-500 text-emerald-800 dark:border-emerald-600 dark:text-emerald-300'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600'
                      }`}
                    >
                      <CheckCircle2
                        className={`h-4 w-4 ${isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-neutral-500'}`}
                        aria-hidden="true"
                      />
                      <span>{isDone ? 'Done' : 'Complete'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={async () => {
                      await selectTrackAndModule(selectedTrack.id, mod.id);
                      setMode('workbench');
                    }}
                    className={`btn-juice group inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
                      isLocked
                        ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-500'
                        : isAvailable
                          ? 'border-b-2 border-blue-800 bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#262626] dark:hover:bg-[#303030]'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Locked</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {isAvailable ? 'Start Lesson' : isDone ? 'Review' : 'Open'}
                        </span>
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
