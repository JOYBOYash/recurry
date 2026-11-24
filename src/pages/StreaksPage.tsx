import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Streaks
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Daily consistency and activity history.
          </p>
        </div>

        {activeTrack && (
          <Link
            to={`/app/learn/${encodeURIComponent(activeTrack.id)}`}
            className="btn-juice inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <span>Practice Today</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-[#181818]">
        <div className="flex items-center gap-3.5">
          <DailyGoalRing goal={dailyGoal} size={40} strokeWidth={3.5} />
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              {dailyGoal.isGoalMet
                ? 'Daily goal reached'
                : `${dailyGoal.remaining} more module${dailyGoal.remaining === 1 ? '' : 's'} to reach today's goal`}
            </div>
            <div className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
              {dailyGoal.completedToday} / {dailyGoal.dailyGoal} completed today
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGoalModalOpen(true)}
          className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-[#222222]"
        >
          Edit goal
        </button>
      </section>

      <StreakCalendar
        activityCounts={activityCounts}
        dailyGoal={profile?.dailyModuleGoal ?? 2}
      />

      <ConsistencyHeatmap30
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
