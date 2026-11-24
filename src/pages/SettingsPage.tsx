import { useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  EyeOff,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DailyGoalHearts } from '../components/DailyGoalHearts';
import { useAppAuth } from '../context/AppAuthContext';
import { useFocusMode } from '../context/FocusModeContext';
import { useTheme } from '../context/ThemeContext';
import {
  DAILY_GOAL_PRESETS,
  LEARNING_FOCUS_OPTIONS,
  SKILL_LEVELS,
  SUPPORTED_LANGUAGES,
} from '../data/languages';
import { normalizeDailyGoalTarget } from '../engines/streaksEngine';
import type { LanguageId, LearningFocus, SkillLevel } from '../types/curriculum';
import { computeDailyGoalProgress } from '../utils/curriculumLogic';
import type { ThemePreference } from '../utils/themePreference';

export function SettingsPage() {
  const navigate = useNavigate();
  const { profile, updateSettingsProfile, signOutUser } = useAppAuth();
  const { preference, setPreference } = useTheme();
  const { focusMode, toggleFocusMode } = useFocusMode();

  const initialGoal = normalizeDailyGoalTarget(profile?.dailyModuleGoal ?? 2);
  const [username, setUsername] = useState(profile?.username ?? 'Learner');
  const [dailyModuleGoal, setDailyModuleGoal] = useState<number>(initialGoal);
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
  const [confirmGoalOpen, setConfirmGoalOpen] = useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const previewGoal = computeDailyGoalProgress(
    profile?.moduleCompletedAt ?? {},
    dailyModuleGoal,
  );

  const themeOptions: Array<{
    id: ThemePreference;
    label: string;
    icon: typeof Monitor;
  }> = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ];

  async function commitSave() {
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
      setConfirmGoalOpen(false);
    }
  }

  function handleSaveSubmit(e: FormEvent) {
    e.preventDefault();
    if (dailyModuleGoal !== initialGoal) {
      setConfirmGoalOpen(true);
      return;
    }
    void commitSave();
  }

  async function handleConfirmSignOut() {
    setSigningOut(true);
    try {
      await signOutUser();
      navigate('/');
    } finally {
      setSigningOut(false);
      setConfirmSignOutOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
          Focus mode, appearance, daily goal, and account.
        </p>
      </div>

      <form
        onSubmit={handleSaveSubmit}
        className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white dark:divide-neutral-800/80 dark:border-neutral-800 dark:bg-[#181818]"
      >
        {/* Focus Mode Toggle */}
        <section aria-label="Focus mode" className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <EyeOff
                className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                  Focus Mode
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                  Hide sidebars, navigation chrome, and extra metadata while reading or coding.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={focusMode}
              aria-label="Toggle Focus Mode"
              data-testid="focus-mode-toggle"
              onClick={toggleFocusMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                focusMode
                  ? 'bg-blue-600'
                  : 'bg-slate-200 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                  focusMode ? 'translate-x-5.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section aria-label="Workspace appearance" className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                Appearance
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Choose light, dark, or system theme.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Theme preference"
              className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-[#121212]"
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
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-white text-slate-950 shadow-xs dark:bg-[#262626] dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Daily Goal */}
        <section aria-label="Daily module goal" className="space-y-3.5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                Daily Goal
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Hearts to fill each day.
              </p>
            </div>
            <DailyGoalHearts
              completedToday={previewGoal.completedToday}
              dailyGoal={dailyModuleGoal}
              size="md"
            />
          </div>

          <div className="grid grid-cols-5 gap-2">
            {DAILY_GOAL_PRESETS.map((preset) => {
              const selected = dailyModuleGoal === preset.modules;
              return (
                <button
                  key={preset.modules}
                  type="button"
                  onClick={() => setDailyModuleGoal(preset.modules)}
                  aria-pressed={selected}
                  className={`btn-juice cursor-pointer rounded-lg px-2 py-2.5 text-center transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="font-mono text-sm font-bold tabular-nums">
                    {preset.modules}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] ${
                      selected
                        ? 'text-blue-100'
                        : 'text-slate-500 dark:text-neutral-400'
                    }`}
                  >
                    {preset.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Profile & Learning Defaults */}
        <section aria-label="Profile defaults" className="space-y-4 p-6">
          <div>
            <label
              htmlFor="settings-username"
              className="block text-xs font-medium text-slate-600 dark:text-neutral-300"
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
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="settings-lang"
                className="block text-xs font-medium text-slate-600 dark:text-neutral-300"
              >
                Default Language
              </label>
              <select
                id="settings-lang"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as LanguageId)}
                className="mt-1.5 h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100"
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
                className="block text-xs font-medium text-slate-600 dark:text-neutral-300"
              >
                Skill Level
              </label>
              <select
                id="settings-skill"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                className="mt-1.5 h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100"
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
                className="block text-xs font-medium text-slate-600 dark:text-neutral-300"
              >
                Learning Focus
              </label>
              <select
                id="settings-focus"
                value={learningFocus}
                onChange={(e) => setLearningFocus(e.target.value as LearningFocus)}
                className="mt-1.5 h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-100"
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
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Settings saved.</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="btn-juice inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </section>

        {/* Account Sign Out */}
        <section aria-label="Account session" className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                Session
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Sign out of your account on this device.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setConfirmSignOutOpen(true)}
              data-testid="settings-sign-out-button"
              className="btn-juice inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </form>

      <ConfirmDialog
        isOpen={confirmGoalOpen}
        title="Update daily goal?"
        description={`Change your daily target from ${initialGoal} to ${dailyModuleGoal} ${dailyModuleGoal === 1 ? 'module' : 'modules'} per day?`}
        confirmLabel="Update Goal"
        busy={saving}
        onConfirm={commitSave}
        onCancel={() => setConfirmGoalOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmSignOutOpen}
        title="Sign out of recurry?"
        description="Your progress and curricula remain safely synced to your account."
        confirmLabel="Sign Out"
        tone="danger"
        busy={signingOut}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setConfirmSignOutOpen(false)}
      />
    </div>
  );
}
