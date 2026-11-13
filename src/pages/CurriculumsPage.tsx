import {
  ArrowRight,
  Award,
  Flame,
  Layers,
  PlusCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { LanguageIcon } from '../components/LanguageIcon';
import { useAppAuth } from '../context/AppAuthContext';
import {
  LEARNING_FOCUS_OPTIONS,
  LANGUAGE_MAP,
  SKILL_LEVELS,
} from '../data/languages';
import {
  calculateTrackProgress,
  computeDailyGoalProgress,
  computeLearningStats,
  computeTrackAccuracyAndStars,
} from '../utils/curriculumLogic';

export function CurriculumsPage() {
  const navigate = useNavigate();
  const {
    profile,
    tracks,
    certificates,
    quota,
    activeTrack,
    selectTrackAndModule,
    redoTrack,
    deleteTrack,
  } = useAppAuth();

  const completedModuleIds = profile?.completedModuleIds ?? [];
  const moduleCompletedAt = profile?.moduleCompletedAt ?? {};
  const moduleAccuracy = profile?.moduleAccuracy ?? {};

  const stats = computeLearningStats(tracks, completedModuleIds, moduleCompletedAt);
  const dailyGoal = computeDailyGoalProgress(
    moduleCompletedAt,
    profile?.dailyModuleGoal ?? 2,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
            My Curriculums
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {quota.allowed
              ? '1 free curriculum generation available today'
              : 'Daily generation used · Resets tomorrow'}
          </p>
        </div>

        <Link
          to="/generate"
          className={`btn-juice inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
            quota.allowed
              ? 'border-b-2 border-blue-800 bg-blue-600 text-white hover:bg-blue-700'
              : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>{quota.allowed ? 'New Curriculum' : 'Limit Reached (1/1)'}</span>
        </Link>
      </section>

      <section
        aria-label="Daily progression overview"
        className="grid gap-3.5 sm:grid-cols-4"
      >
        <Link
          to="/app/settings"
          className={`btn-juice flex items-center gap-3 rounded-2xl border bg-white p-4 ${
            dailyGoal.isGoalMet
              ? 'border-emerald-500'
              : 'border-slate-200 hover:border-blue-400'
          }`}
        >
          <DailyGoalRing goal={dailyGoal} size={44} strokeWidth={4} />
          <div>
            <div className="text-xs font-semibold text-slate-500">Daily Goal</div>
            <div className="font-mono text-sm font-bold text-slate-950 tabular-nums">
              {dailyGoal.completedToday}/{dailyGoal.dailyGoal} today
            </div>
          </div>
        </Link>

        <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <Flame
            className={`h-6 w-6 shrink-0 ${
              stats.currentStreak > 0
                ? 'fill-amber-500/20 text-amber-500'
                : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <div className="relative z-10">
            <div className="text-xs font-semibold text-slate-500">Streak</div>
            <div className="font-mono text-sm font-bold text-slate-950 tabular-nums">
              {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
            </div>
          </div>
          <Flame
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -bottom-2 h-14 w-14 -rotate-12 text-amber-500 opacity-[0.09]"
          />
        </div>

        <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <Layers className="h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" />
          <div className="relative z-10">
            <div className="text-xs font-semibold text-slate-500">Modules</div>
            <div className="font-mono text-sm font-bold text-slate-950 tabular-nums">
              {stats.completedModules}/{stats.totalModules}
            </div>
          </div>
          <Layers
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -bottom-2 h-14 w-14 -rotate-12 text-blue-600 opacity-[0.08]"
          />
        </div>

        <Link
          to="/app/certificates"
          className="btn-juice relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-400"
        >
          <Award className="h-6 w-6 shrink-0 text-amber-500" aria-hidden="true" />
          <div className="relative z-10">
            <div className="text-xs font-semibold text-slate-500">Certificates</div>
            <div className="font-mono text-sm font-bold text-slate-950 tabular-nums">
              {certificates.length} earned
            </div>
          </div>
          <Award
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -bottom-2 h-14 w-14 -rotate-12 text-amber-500 opacity-[0.09]"
          />
        </Link>
      </section>

      {tracks.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="font-display text-xl font-bold text-slate-950">
            No curriculums yet
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Generate your first personalized track to begin your streak.
          </p>
          <Link
            to="/generate"
            className="btn-juice mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Create Curriculum</span>
          </Link>
        </section>
      ) : (
        <section aria-label="Saved curriculums" className="grid gap-4 sm:grid-cols-2">
          {tracks.map((track) => {
            const langMeta = LANGUAGE_MAP[track.language];
            const progress = calculateTrackProgress(track, completedModuleIds);
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

            return (
              <article
                key={track.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 ${
                  isSelected ? 'border-blue-600' : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <LanguageIcon language={track.language} className="mt-0.5 h-7 w-7" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-semibold text-blue-700">
                          <span>{langMeta.name}</span>
                          <span>·</span>
                          <span>{skillLabel}</span>
                          <span>·</span>
                          <span className="text-slate-500">{focusLabel}</span>
                        </div>
                        <h2 className="mt-0.5 font-display text-lg font-bold text-slate-950">
                          {track.title}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600">
                    {track.subtitle}
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs text-slate-600 tabular-nums">
                      <span>
                        {progress.completedCount}/{progress.totalCount} modules
                      </span>
                      <span>
                        {progress.percentage}%
                        {accuracy.evaluatedCount > 0
                          ? ` · ${accuracy.accuracyPercent}% acc`
                          : ''}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          progress.percentage === 100
                            ? 'bg-emerald-600'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      await selectTrackAndModule(
                        track.id,
                        progress.nextModuleId ?? track.modules[0]?.id ?? null,
                      );
                      navigate(`/app/learn/${encodeURIComponent(track.id)}`);
                    }}
                    className="btn-juice group inline-flex min-h-10 items-center gap-1.5 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <span>{progress.percentage === 100 ? 'Review' : 'Open & Learn'}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        await redoTrack(track.id);
                        navigate(`/app/learn/${encodeURIComponent(track.id)}`);
                      }}
                      title="Reset progress and redo curriculum"
                      className="btn-juice inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Redo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteTrack(track.id)}
                      aria-label={`Delete curriculum ${track.title}`}
                      className="btn-juice inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
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
    </div>
  );
}
