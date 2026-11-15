import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, SlidersHorizontal } from 'lucide-react';
import { ConsistencyHeatmap30 } from '../components/ConsistencyHeatmap30';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { SetDailyGoalModal } from '../components/SetDailyGoalModal';
import { StreakCalendar } from '../components/StreakCalendar';
import { useAppAuth } from '../context/AppAuthContext';
import { computeDailyGoalProgress } from '../engines/streaksEngine';

export function StreaksPage() {
  const { profile, activityCounts, activeTrack } = useAppAuth();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const dailyGoal = computeDailyGoalProgress(
    profile?.moduleCompletedAt ?? {},
    profile?.dailyModuleGoal ?? 2,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
            Streak Calendar
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
            Active learning days, daily goal completions, and consecutive streak history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGoalModalOpen(true)}
            className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Set Daily Goal</span>
          </button>
          {activeTrack && (
            <Link
              to={`/app/learn/${encodeURIComponent(activeTrack.id)}`}
              className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Practice Today</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#181818]">
        <div className="flex items-center gap-4">
          <DailyGoalRing goal={dailyGoal} size={56} strokeWidth={5} />
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Today&apos;s Progress</div>
            <div className="font-display text-lg font-bold text-slate-950 dark:text-white">
              {dailyGoal.isGoalMet
                ? 'Daily goal reached!'
                : `${dailyGoal.remaining} more module${dailyGoal.remaining === 1 ? '' : 's'} to hit today's goal`}
            </div>
            <div className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
              {dailyGoal.completedToday} / {dailyGoal.dailyGoal} modules completed today
            </div>
          </div>
        </div>
      </section>

      <ConsistencyHeatmap30
        activityCounts={activityCounts}
        dailyGoal={profile?.dailyModuleGoal ?? 2}
      />

      <StreakCalendar
        activityCounts={activityCounts}
        dailyGoal={profile?.dailyModuleGoal ?? 2}
      />

      <SetDailyGoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
      />
    </div>
  );
}
