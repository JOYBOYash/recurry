import { useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Coffee,
  Flame,
  Loader2,
  Minus,
  Plus,
  Target,
  Zap,
} from 'lucide-react';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { useAppAuth } from '../context/AppAuthContext';
import {
  SUPPORTED_LANGUAGES,
  DAILY_GOAL_PRESETS,
  LEARNING_FOCUS_OPTIONS,
  SKILL_LEVELS,
} from '../data/languages';
import type { LanguageId, LearningFocus, SkillLevel } from '../types/curriculum';
import { computeDailyGoalProgress } from '../utils/curriculumLogic';

const GOAL_ICON_MAP: Record<number, typeof Coffee> = {
  1: Coffee,
  2: Target,
  3: Zap,
  5: Flame,
};

export function SettingsPage() {
  const { profile, updateSettingsProfile } = useAppAuth();

  const [username, setUsername] = useState(profile?.username ?? 'Learner');
  const [dailyModuleGoal, setDailyModuleGoal] = useState<number>(
    profile?.dailyModuleGoal ?? 2,
  );
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageId>(
    profile?.preferredLanguage ?? 'python',
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(
    profile?.skillLevel ?? 'intern',
  );
  const [learningFocus, setLearningFocus] = useState<LearningFocus>(
    profile?.learningFocus ?? 'syntax',
  );

  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const previewGoal = computeDailyGoalProgress(
    profile?.moduleCompletedAt ?? {},
    dailyModuleGoal,
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await updateSettingsProfile({
        username: username.trim() || 'Learner',
        dailyModuleGoal,
        preferredLanguage,
        skillLevel,
        learningFocus,
      });
      setSavedBanner(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
          Daily Goal &amp; Profile
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Set how many modules you aim to finish each day.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <DailyGoalRing goal={previewGoal} size={56} strokeWidth={5} />
            <div>
              <div className="font-display text-base font-bold text-slate-950">
                {dailyModuleGoal} {dailyModuleGoal === 1 ? 'module' : 'modules'} / day
              </div>
              <div className="font-mono text-xs text-slate-600 tabular-nums">
                {previewGoal.completedToday} completed today
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDailyModuleGoal((v) => Math.max(1, v - 1))}
              aria-label="Decrease daily module goal"
              className="btn-juice flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="w-8 text-center font-mono text-sm font-bold text-slate-950 tabular-nums">
              {dailyModuleGoal}
            </span>
            <button
              type="button"
              onClick={() => setDailyModuleGoal((v) => Math.min(10, v + 1))}
              aria-label="Increase daily module goal"
              className="btn-juice flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAILY_GOAL_PRESETS.map((preset) => {
            const selected = dailyModuleGoal === preset.modules;
            const CornerIcon = GOAL_ICON_MAP[preset.modules] ?? Flame;
            return (
              <button
                key={preset.modules}
                type="button"
                onClick={() => setDailyModuleGoal(preset.modules)}
                aria-pressed={selected}
                className={`btn-juice relative overflow-hidden rounded-xl border-2 bg-white px-3 py-3 text-left ${
                  selected
                    ? 'border-blue-600 text-blue-900'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="relative z-10">
                  <div className="font-mono text-sm font-bold tabular-nums">
                    {preset.modules}/day
                  </div>
                  <div className="text-[11px] text-slate-500">{preset.label}</div>
                </div>
                <CornerIcon
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-1.5 -bottom-2 h-11 w-11 -rotate-12 ${
                    selected
                      ? 'text-blue-600 opacity-[0.14]'
                      : 'text-slate-400 opacity-[0.12]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div>
          <label
            htmlFor="settings-username"
            className="block text-xs font-semibold text-slate-700"
          >
            Username
          </label>
          <input
            id="settings-username"
            type="text"
            required
            minLength={2}
            maxLength={32}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="settings-lang"
              className="block text-xs font-semibold text-slate-700"
            >
              Default Language
            </label>
            <select
              id="settings-lang"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as LanguageId)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-skill"
              className="block text-xs font-semibold text-slate-700"
            >
              Skill Level
            </label>
            <select
              id="settings-skill"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {SKILL_LEVELS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-focus"
              className="block text-xs font-semibold text-slate-700"
            >
              Learning Focus
            </label>
            <select
              id="settings-focus"
              value={learningFocus}
              onChange={(e) => setLearningFocus(e.target.value as LearningFocus)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {LEARNING_FOCUS_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {savedBanner && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>Daily goal and profile saved.</span>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-juice inline-flex min-h-11 items-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
