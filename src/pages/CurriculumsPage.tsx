import { useState } from 'react';
import { ArrowRight, Lock, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DailyGoalHearts } from '../components/DailyGoalHearts';
import { FlamingIcon } from '../components/FlamingIcon';
import { LanguageIcon } from '../components/LanguageIcon';
import { ProgressRing } from '../components/ProgressRing';
import { useAppAuth } from '../context/AppAuthContext';
import { useFocusMode } from '../context/FocusModeContext';
import type { CurriculumTrack } from '../types/curriculum';
import { formatModuleCountLabel } from '../utils/curriculumCards';
import {
  calculateTrackProgress,
  computeDailyGoalProgress,
  computeLearningStats,
} from '../utils/curriculumLogic';

export function CurriculumsPage() {
  const navigate = useNavigate();
  const { focusMode } = useFocusMode();
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'redo';
    track: CurriculumTrack;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const {
    profile,
    tracks,
    certificates,
    quota,
    programmeLock,
    activeTrack,
    selectTrackAndModule,
    redoTrack,
    deleteTrack,
  } = useAppAuth();

  const completedModuleIds = profile?.completedModuleIds ?? [];
  const moduleCompletedAt = profile?.moduleCompletedAt ?? {};
  const moduleAccuracy = profile?.moduleAccuracy ?? {};
  const practicedDates = Object.values(moduleAccuracy)
    .map((entry) => entry.lastPracticedDate)
    .filter((d): d is string => Boolean(d));

  const stats = computeLearningStats(
    tracks,
    completedModuleIds,
    moduleCompletedAt,
    new Date(),
    practicedDates,
  );
  const dailyGoal = computeDailyGoalProgress(
    moduleCompletedAt,
    profile?.dailyModuleGoal ?? 2,
  );
  const isLockedFromNew = !programmeLock.canGenerateNewProgramme;
  const overallPercent =
    stats.totalModules > 0
      ? Math.round((stats.completedModules / stats.totalModules) * 100)
      : 0;

  async function handleConfirmTrackAction() {
    if (!confirmAction) return;
    setActionBusy(true);
    try {
      if (confirmAction.type === 'delete') {
        await deleteTrack(confirmAction.track.id);
      } else {
        await redoTrack(confirmAction.track.id);
        navigate(`/app/learn/${encodeURIComponent(confirmAction.track.id)}`);
      }
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
          Curriculums
        </h1>

        <Link
          to="/generate"
          className={`btn-juice inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
            isLockedFromNew
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-[#222222] dark:text-neutral-200 dark:hover:bg-[#2A2A2A]'
              : quota.allowed
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-500 dark:bg-[#222222] dark:text-neutral-400'
          }`}
        >
          {isLockedFromNew ? (
            <>
              <Lock className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span>Track Active</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{quota.allowed ? 'New Curriculum' : 'Limit Reached'}</span>
            </>
          )}
        </Link>
      </section>

      {!focusMode && (
        <section
          aria-label="Daily progress summary"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-3.5 dark:border-neutral-800 dark:bg-[#181818]"
        >
          <div className="flex flex-wrap items-center gap-6">
            <Link
              to="/app/profile?tab=streaks"
              className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
              aria-label="View daily goal hearts in Profile"
            >
              <DailyGoalHearts
                completedToday={dailyGoal.completedToday}
                dailyGoal={dailyGoal.dailyGoal}
                size="md"
              />
            </Link>

            <Link
              to="/app/profile?tab=streaks"
              className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 tabular-nums transition-opacity hover:opacity-80 dark:text-white"
              aria-label={`Current streak ${stats.currentStreak} days`}
            >
              <FlamingIcon active={stats.currentStreak > 0} className="h-5 w-5" />
              <span>{stats.currentStreak}d</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
            <div className="inline-flex items-center gap-2.5">
              <ProgressRing
                percent={overallPercent}
                size={34}
                strokeWidth={3.25}
                status={overallPercent >= 100 && stats.totalModules > 0 ? 'completed' : 'active'}
                showLabel={false}
                ariaLabel={`Overall curriculum completion ${overallPercent}%`}
              />
              <span>
                {stats.completedModules}/{stats.totalModules} modules
              </span>
            </div>
            <Link
              to="/app/profile?tab=certificates"
              className="transition-colors hover:text-slate-950 dark:hover:text-white"
            >
              {certificates.length} {certificates.length === 1 ? 'award' : 'awards'}
            </Link>
          </div>
        </section>
      )}

      {tracks.length === 0 ? (
        <section className="rounded-xl border border-slate-200/80 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            No curriculums yet
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Create your first track to begin practicing.
          </p>
          <Link
            to="/generate"
            className="btn-juice mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create Curriculum</span>
          </Link>
        </section>
      ) : (
        <section aria-label="Saved curriculums" className="grid gap-3 sm:grid-cols-2">
          {tracks.map((track) => {
            const progress = calculateTrackProgress(track, completedModuleIds);
            const evaluated = programmeLock.programmesById[track.id];
            const status = evaluated?.status ?? 'active';
            const isLocked = status === 'locked';
            const isSelected = activeTrack?.id === track.id;

            const handleOpenTrack = async () => {
              if (isLocked) return;
              await selectTrackAndModule(
                track.id,
                progress.nextModuleId ?? track.modules[0]?.id ?? null,
              );
              navigate(`/app/learn/${encodeURIComponent(track.id)}`);
            };

            return (
              <article
                key={track.id}
                className={`group flex flex-col justify-between gap-4 rounded-xl border bg-white p-4 transition-colors dark:bg-[#181818] ${
                  isLocked
                    ? 'border-slate-200/70 opacity-70 dark:border-neutral-800/70'
                    : isSelected
                      ? 'border-blue-500/70 dark:border-blue-500/60'
                      : 'border-slate-200/80 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <LanguageIcon
                        language={track.language}
                        className="h-4.5 w-4.5 shrink-0"
                      />
                      <h2 className="truncate font-display text-[15px] font-bold text-slate-950 dark:text-white">
                        {track.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 tabular-nums dark:text-neutral-400">
                      <span>
                        {formatModuleCountLabel(
                          progress.completedCount,
                          progress.totalCount,
                        )}
                      </span>
                      {isLocked && (
                        <Lock
                          className="h-3 w-3 text-slate-400 dark:text-neutral-500"
                          aria-label="Locked"
                        />
                      )}
                    </div>
                  </div>

                  <ProgressRing
                    percent={progress.percentage}
                    size={50}
                    strokeWidth={3.75}
                    status={
                      status === 'completed' || progress.percentage === 100
                        ? 'completed'
                        : isLocked
                          ? 'locked'
                          : 'active'
                    }
                    ariaLabel={`${track.title}: ${progress.percentage}% complete`}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => void handleOpenTrack()}
                    className={`btn-juice inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${
                      isLocked
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-[#222222] dark:text-neutral-500'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <span>
                      {isLocked
                        ? 'Locked'
                        : progress.percentage === 100
                          ? 'Review'
                          : progress.completedCount > 0
                            ? 'Continue'
                            : 'Start'}
                    </span>
                    {!isLocked && (
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isLockedFromNew && status === 'completed'}
                      onClick={() => setConfirmAction({ type: 'redo', track })}
                      aria-label={`Restart ${track.title}`}
                      title="Restart track"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35 dark:text-neutral-500 dark:hover:bg-[#242424] dark:hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'delete', track })}
                      aria-label={`Delete ${track.title}`}
                      title="Delete track"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-neutral-500 dark:hover:bg-[#2A1C1C] dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={
          confirmAction?.type === 'delete'
            ? 'Delete curriculum?'
            : 'Restart curriculum?'
        }
        description={
          confirmAction?.type === 'delete'
            ? `Permanently remove "${confirmAction.track.title}" from your saved tracks?`
            : `Reset module progress on "${confirmAction?.track.title ?? ''}" and start from the first lesson?`
        }
        confirmLabel={confirmAction?.type === 'delete' ? 'Delete' : 'Restart'}
        tone={confirmAction?.type === 'delete' ? 'danger' : 'default'}
        busy={actionBusy}
        onConfirm={handleConfirmTrackAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
