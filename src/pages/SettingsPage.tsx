import { useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Coffee,
  Flame,
  Loader2,
  Minus,
  Monitor,
  Moon,
  Plus,
  Rocket,
  Sun,
  Target,
  Zap,
} from 'lucide-react';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { RankIcon } from '../components/RankIcon';
import { SetDailyGoalModal } from '../components/SetDailyGoalModal';
import { useAppAuth } from '../context/AppAuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  SUPPORTED_LANGUAGES,
  DAILY_GOAL_PRESETS,
  LEARNING_FOCUS_OPTIONS,
  SKILL_LEVELS,
} from '../data/languages';
import { normalizeDailyGoalTarget } from '../engines/streaksEngine';
import type { LanguageId, LearningFocus, SkillLevel } from '../types/curriculum';
import { computeDailyGoalProgress } from '../utils/curriculumLogic';
import type { ThemePreference } from '../utils/themePreference';

const GOAL_ICON_MAP: Record<number, typeof Coffee> = {
  1: Coffee,
  2: Target,
  3: Zap,
  4: Rocket,
  5: Flame,
};

export function SettingsPage() {
  const { profile, updateSettingsProfile } = useAppAuth();
  const { preference, systemPrefersDark, resolvedTheme, setPreference } = useTheme();

  const [username, setUsername] = useState(profile?.username ?? 'Learner');
  const [dailyModuleGoal, setDailyModuleGoal] = useState<number>(
    normalizeDailyGoalTarget(profile?.dailyModuleGoal ?? 2),
  );
  const [goalModalOpen, setGoalModalOpen] = useState(false);
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

  const isDarkActive = resolvedTheme === 'dark';

  const themeOptions: Array<{
    id: ThemePreference;
    label: string;
    detail: string;
    icon: typeof Monitor;
  }> = [
    {
      id: 'system',
      label: 'System',
      detail: `OS is ${systemPrefersDark ? 'Dark' : 'Light'}`,
      icon: Monitor,
    },
    {
      id: 'light',
      label: 'Light',
      detail: 'Crisp daylight',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark',
      detail: 'Late-night focus',
      icon: Moon,
    },
  ];

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
            Settings &amp; Daily Goal
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
            Configure workspace appearance, daily module targets (1–5), and profile defaults.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGoalModalOpen(true)}
          className="btn-juice inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>Quick Set Goal Modal</span>
        </button>
      </div>

      <section
        aria-label="Workspace appearance"
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {isDarkActive ? (
              <Moon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
            ) : (
              <Sun className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            )}
            <div>
              <h2 className="font-display text-base font-bold text-slate-950 dark:text-white">
                Dark Mode
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                High-contrast workspace theme for late-night sessions (landing page stays light).
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isDarkActive}
            aria-label="Toggle dark mode"
            onClick={() => setPreference(isDarkActive ? 'light' : 'dark')}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              isDarkActive
                ? 'border-blue-500 bg-blue-600'
                : 'border-slate-300 bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                isDarkActive ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div
          role="radiogroup"
          aria-label="Theme preference"
          className="grid gap-2.5 sm:grid-cols-3"
        >
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const selected = preference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPreference(opt.id)}
                className={`btn-juice flex items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left transition-colors ${
                  selected
                    ? 'border-blue-600 bg-white text-slate-950 dark:border-blue-500 dark:bg-[#202020] dark:text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-neutral-800 dark:bg-[#202020] dark:text-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    selected
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-neutral-400'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="truncate font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                    {opt.detail}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#181818] sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#202020]">
          <div className="flex items-center gap-4">
            <DailyGoalRing goal={previewGoal} size={56} strokeWidth={5} />
            <div>
              <div className="font-display text-base font-bold text-slate-950 dark:text-white">
                {dailyModuleGoal} {dailyModuleGoal === 1 ? 'module' : 'modules'} / day
              </div>
              <div className="font-mono text-xs text-slate-600 tabular-nums dark:text-neutral-400">
                {previewGoal.completedToday} completed today
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDailyModuleGoal((v) => Math.max(1, v - 1))}
              aria-label="Decrease daily module goal"
              className="btn-juice flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:bg-[#262626]"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="w-8 text-center font-mono text-sm font-bold text-slate-950 tabular-nums dark:text-white">
              {dailyModuleGoal}
            </span>
            <button
              type="button"
              onClick={() => setDailyModuleGoal((v) => Math.min(5, v + 1))}
              aria-label="Increase daily module goal"
              className="btn-juice flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:bg-[#262626]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {DAILY_GOAL_PRESETS.map((preset) => {
            const selected = dailyModuleGoal === preset.modules;
            const CornerIcon = GOAL_ICON_MAP[preset.modules] ?? Flame;
            return (
              <button
                key={preset.modules}
                type="button"
                onClick={() => setDailyModuleGoal(preset.modules)}
                aria-pressed={selected}
                className={`btn-juice relative overflow-hidden rounded-xl border-2 bg-white px-3 py-3 text-left dark:bg-[#202020] ${
                  selected
                    ? 'border-blue-600 text-blue-900 dark:border-blue-500 dark:text-white'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="relative z-10">
                  <div className="font-mono text-sm font-bold tabular-nums">
                    {preset.modules}/day
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400">{preset.label}</div>
                </div>
                <CornerIcon
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-1.5 -bottom-2 h-11 w-11 -rotate-12 ${
                    selected
                      ? 'text-blue-600 opacity-[0.14] dark:text-blue-400 dark:opacity-[0.22]'
                      : 'text-slate-400 opacity-[0.12] dark:text-neutral-500 dark:opacity-[0.15]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div>
          <label
            htmlFor="settings-username"
            className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
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
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-100 dark:focus:border-blue-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="settings-lang"
              className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
            >
              Default Language
            </label>
            <select
              id="settings-lang"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as LanguageId)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-100 dark:focus:border-blue-500"
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
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-neutral-300"
            >
              <span>Skill Level</span>
              <RankIcon rank={skillLevel} useRankColor className="h-3.5 w-3.5" />
            </label>
            <select
              id="settings-skill"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-100 dark:focus:border-blue-500"
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
              className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
            >
              Learning Focus
            </label>
            <select
              id="settings-focus"
              value={learningFocus}
              onChange={(e) => setLearningFocus(e.target.value as LearningFocus)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-100 dark:focus:border-blue-500"
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
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-700/70 dark:bg-[#202020] dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Daily goal and profile saved.</span>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-neutral-800">
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
      <SetDailyGoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
      />
    </div>
  );
}
