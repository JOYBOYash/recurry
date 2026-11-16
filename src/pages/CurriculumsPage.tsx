import {
  ArrowRight,
  Award,
  CheckCircle2,
  Layers,
  Lock,
  PlusCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { DailyStreakWidget } from '../components/DailyStreakWidget';
import { FriendlyLeaderboard } from '../components/FriendlyLeaderboard';
import { LanguageIcon } from '../components/LanguageIcon';
import { RankIcon } from '../components/RankIcon';
import { SetDailyGoalModal } from '../components/SetDailyGoalModal';
import { toLocalDateKey, useAppAuth } from '../context/AppAuthContext';
import {
  LEARNING_FOCUS_OPTIONS,
  LANGUAGE_MAP,
  SKILL_LEVELS,
} from '../data/languages';
import {
  extractCoreObjectives,
  formatModuleCountLabel,
  getTrackStatusLabel,
} from '../utils/curriculumCards';
import {
  calculateTrackProgress,
  computeDailyGoalProgress,
  computeLearningStats,
  computeTrackAccuracyAndStars,
} from '../utils/curriculumLogic';
import { resolveProgressRank } from '../utils/rankSystem';

export function CurriculumsPage() {
  const navigate = useNavigate();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const {
    user,
    profile,
    tracks,
    certificates,
    quota,
    programmeLock,
    activityCounts,
    activeTrack,
    getIdToken,
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
  const rankProgress = resolveProgressRank(
    activeTrack,
    completedModuleIds,
    profile?.skillLevel ?? 'intern',
  );
  const todayKey = toLocalDateKey(new Date());
  const activeToday = (activityCounts[todayKey] ?? 0) > 0;
  const isLockedFromNew = !programmeLock.canGenerateNewProgramme;
  const totalModulePercent =
    stats.totalModules > 0
      ? Math.round((stats.completedModules / stats.totalModules) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
            {isLockedFromNew
              ? `Finish ${programmeLock.activeIncompleteTrackTitle} (${programmeLock.activeIncompleteProgressPercent}%)`
              : `${quota.remainingToday}/1 generation today`}
          </p>
        </div>

        <Link
          to="/generate"
          className={`btn-juice inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
            isLockedFromNew
              ? 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-600/70 dark:bg-[#181818] dark:text-amber-300 dark:hover:bg-[#202020]'
              : quota.allowed
                ? 'border-b-2 border-blue-800 bg-blue-600 text-white hover:bg-blue-700'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-300 dark:hover:bg-[#202020]'
          }`}
        >
          {isLockedFromNew ? (
            <>
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span>Track Active</span>
            </>
          ) : (
            <>
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>{quota.allowed ? 'New Curriculum' : 'Limit Reached'}</span>
            </>
          )}
        </Link>
      </section>

      <section
        aria-label="Dashboard overview"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <button
          type="button"
          onClick={() => setGoalModalOpen(true)}
          aria-label="Set daily module goal"
          className={`btn-juice flex items-center gap-3.5 rounded-2xl border bg-white p-5 text-left dark:bg-[#181818] ${
            dailyGoal.isGoalMet
              ? 'border-emerald-500'
              : 'border-slate-200 hover:border-blue-400 dark:border-neutral-800 dark:hover:border-blue-500'
          }`}
        >
          <DailyGoalRing goal={dailyGoal} size={46} strokeWidth={4} />
          <div className="min-w-0 space-y-0.5">
            <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
              Daily Goal
            </div>
            <div className="font-mono text-lg font-bold text-slate-950 tabular-nums dark:text-white">
              {dailyGoal.completedToday}/{dailyGoal.dailyGoal}
            </div>
            <div className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400">
              Set 1–5
            </div>
          </div>
        </button>

        <DailyStreakWidget
          currentStreak={stats.currentStreak}
          longestStreak={stats.longestStreak}
          activeToday={activeToday}
        />

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#181818]">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                Modules
              </div>
              <div className="font-mono text-lg font-bold text-slate-950 tabular-nums dark:text-white">
                {stats.completedModules}/{stats.totalModules}
              </div>
            </div>
            <Layers
              aria-hidden="true"
              className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400"
            />
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${totalModulePercent}%` }}
            />
          </div>
        </div>

        <Link
          to="/app/certificates"
          className="btn-juice flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-400 dark:border-neutral-800 dark:bg-[#181818] dark:hover:border-blue-500"
        >
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
              Certificates
            </div>
            <div className="font-mono text-lg font-bold text-slate-950 tabular-nums dark:text-white">
              {certificates.length}
            </div>
            <div className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">
              Earned
            </div>
          </div>
          <Award
            aria-hidden="true"
            className="h-7 w-7 shrink-0 text-amber-500 dark:text-amber-400"
          />
        </Link>
      </section>

      {tracks.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#181818]">
          <h2 className="font-display text-xl font-bold text-slate-950 dark:text-white">
            No curriculums yet
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Create a track to start practicing.
          </p>
          <Link
            to="/generate"
            className="btn-juice mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Create Curriculum</span>
          </Link>
        </section>
      ) : (
        <section aria-label="Saved curriculums" className="space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Curriculums
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {tracks.map((track) => {
              const langMeta = LANGUAGE_MAP[track.language];
              const progress = calculateTrackProgress(track, completedModuleIds);
              const evaluated = programmeLock.programmesById[track.id];
              const status = evaluated?.status ?? 'active';
              const isLocked = status === 'locked';
              const accuracy = computeTrackAccuracyAndStars(
                track,
                moduleAccuracy,
                completedModuleIds,
              );
              const skillLabel =
                SKILL_LEVELS.find((s) => s.id === track.skillLevel)?.label ??
                track.skillLevel;
              const focusLabel =
                LEARNING_FOCUS_OPTIONS.find((f) => f.id === track.learningFocus)?.label ??
                track.learningFocus;
              const isSelected = activeTrack?.id === track.id;
              const nextMod =
                track.modules.find((m) => m.id === progress.nextModuleId) ??
                track.modules[0];
              const previewObjectives = nextMod
                ? extractCoreObjectives(nextMod, 3)
                : [];

              return (
                <article
                  key={track.id}
                  className={`flex flex-col justify-between gap-5 rounded-2xl border bg-white p-6 dark:bg-[#181818] ${
                    isLocked
                      ? 'border-slate-200 opacity-85 dark:border-neutral-800'
                      : isSelected
                        ? 'border-blue-600 dark:border-blue-500'
                        : 'border-slate-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <LanguageIcon language={track.language} className="mt-0.5 h-7 w-7 shrink-0" />
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-lg font-bold text-slate-950 dark:text-white">
                            {track.title}
                          </h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                            <span className="font-semibold text-blue-700 dark:text-blue-400">
                              {langMeta.name}
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <RankIcon rank={track.skillLevel} useRankColor className="h-3 w-3" />
                              <span>{skillLabel}</span>
                            </span>
                            <span>·</span>
                            <span>{focusLabel}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-bold ${
                          status === 'completed'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : status === 'locked'
                              ? 'text-slate-500 dark:text-neutral-400'
                              : 'text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {status === 'completed' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : status === 'locked' ? (
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : null}
                        <span>{getTrackStatusLabel(status)}</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-mono text-xs text-slate-600 tabular-nums dark:text-neutral-400">
                        <span>
                          {formatModuleCountLabel(progress.completedCount, progress.totalCount)}
                        </span>
                        <span>
                          {progress.percentage}%
                          {accuracy.evaluatedCount > 0
                            ? ` · ${accuracy.accuracyPercent}%`
                            : ''}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            progress.percentage === 100
                              ? 'bg-emerald-600'
                              : isLocked
                                ? 'bg-slate-400 dark:bg-neutral-600'
                                : 'bg-blue-600'
                          }`}
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    {previewObjectives.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {previewObjectives.map((obj) => (
                          <span
                            key={obj}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-700 dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-300"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-neutral-800">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={async () => {
                        await selectTrackAndModule(
                          track.id,
                          progress.nextModuleId ?? track.modules[0]?.id ?? null,
                        );
                        navigate(`/app/learn/${encodeURIComponent(track.id)}`);
                      }}
                      className={`btn-juice group inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
                        isLocked
                          ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-500'
                          : 'border-b-2 border-blue-800 bg-blue-600 text-white hover:bg-blue-700'
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
                            {progress.percentage === 100
                              ? 'Review'
                              : progress.completedCount > 0
                                ? 'Continue'
                                : 'Start'}
                          </span>
                          <ArrowRight
                            className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isLockedFromNew && status === 'completed'}
                        onClick={async () => {
                          await redoTrack(track.id);
                          navigate(`/app/learn/${encodeURIComponent(track.id)}`);
                        }}
                        aria-label={`Redo ${track.title}`}
                        className="btn-juice inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Redo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteTrack(track.id)}
                        aria-label={`Delete curriculum ${track.title}`}
                        className="btn-juice inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-400 dark:hover:border-red-800 dark:hover:bg-[#262626] dark:hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {user && profile && (
        <FriendlyLeaderboard
          currentUid={user.uid}
          username={profile.username}
          preferredLanguage={activeTrack?.language ?? profile.preferredLanguage}
          rank={rankProgress.rank}
          activityCounts={activityCounts}
          completedModuleIds={completedModuleIds}
          getIdToken={getIdToken}
        />
      )}

      <SetDailyGoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
      />
    </div>
  );
}
