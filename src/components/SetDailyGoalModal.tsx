import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Coffee,
  Flame,
  Loader2,
  Rocket,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { useAppAuth } from '../context/AppAuthContext';
import {
  computeDailyGoalProgress,
  DAILY_GOAL_OPTIONS,
  normalizeDailyGoalTarget,
} from '../engines/streaksEngine';
import { DailyGoalRing } from './DailyGoalRing';

interface SetDailyGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GOAL_ICON_MAP: Record<number, typeof Coffee> = {
  1: Coffee,
  2: Target,
  3: Zap,
  4: Rocket,
  5: Flame,
};

export function SetDailyGoalModal({ isOpen, onClose }: SetDailyGoalModalProps) {
  const { profile, updateDailyModuleGoal } = useAppAuth();
  const persistedGoal = normalizeDailyGoalTarget(profile?.dailyModuleGoal ?? 2);

  const [selectedGoal, setSelectedGoal] = useState<number>(persistedGoal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedGoal(normalizeDailyGoalTarget(profile?.dailyModuleGoal ?? 2));
      setError(null);
    }
  }, [isOpen, profile?.dailyModuleGoal]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) {
    return null;
  }

  const previewProgress = computeDailyGoalProgress(
    profile?.moduleCompletedAt ?? {},
    selectedGoal,
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateDailyModuleGoal(selectedGoal);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save your daily goal. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-daily-goal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs dark:bg-black/75"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-[#181818] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-neutral-800">
          <div>
            <h2
              id="set-daily-goal-title"
              className="font-display text-xl font-bold text-slate-950 dark:text-white"
            >
              Set Daily Goal
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              Pick how many modules (1–5) you commit to finishing each day.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close daily goal modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-300 dark:hover:bg-[#262626] dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-[#F7F8FA] p-4 dark:border-neutral-800 dark:bg-[#202020]">
          <div className="flex items-center gap-3.5">
            <DailyGoalRing goal={previewProgress} size={52} strokeWidth={5} />
            <div>
              <div className="font-display text-base font-bold text-slate-950 dark:text-white">
                {selectedGoal} {selectedGoal === 1 ? 'module' : 'modules'} / day
              </div>
              <div className="font-mono text-xs text-slate-600 tabular-nums dark:text-neutral-300">
                {previewProgress.isGoalMet
                  ? 'Goal already reached today!'
                  : `${previewProgress.completedToday} of ${selectedGoal} completed today`}
              </div>
            </div>
          </div>

          <span className="rounded-lg bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-blue-700 shadow-2xs dark:border dark:border-neutral-700 dark:bg-[#181818] dark:text-blue-400">
            {DAILY_GOAL_OPTIONS.find((o) => o.modules === selectedGoal)?.cadence ?? '~20 min/day'}
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Daily module target"
          className="mt-4 space-y-2"
        >
          {DAILY_GOAL_OPTIONS.map((option) => {
            const selected = selectedGoal === option.modules;
            const Icon = GOAL_ICON_MAP[option.modules] ?? Flame;
            return (
              <button
                key={option.modules}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedGoal(option.modules)}
                className={`btn-juice flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                  selected
                    ? 'border-blue-600 bg-blue-50/50 text-slate-950 dark:border-blue-500 dark:bg-[#202020] dark:text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-neutral-800 dark:bg-[#181818] dark:text-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      selected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-neutral-400'
                    }`}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-slate-950 dark:text-white">
                        {option.label}
                      </span>
                      <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums dark:text-blue-400">
                        {option.modules} {option.modules === 1 ? 'module' : 'modules'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">{option.cadence}</div>
                  </div>
                </div>

                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected
                      ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                      : 'border-slate-300 bg-white dark:border-neutral-600 dark:bg-[#121212]'
                  }`}
                >
                  {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800/80 dark:bg-[#202020] dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-4 dark:border-neutral-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-juice inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:bg-[#262626]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-juice inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save Daily Goal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
