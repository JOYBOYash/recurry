import type { CurriculumTrack } from '../types/curriculum';

export interface DailyGoalProgress {
  completedToday: number;
  dailyGoal: number;
  percentage: number;
  remaining: number;
  isGoalMet: boolean;
}

export interface StreakMetrics {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  activeToday: boolean;
}

export interface CalendarDayCell {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  completedCount: number;
  intensity: 0 | 1 | 2 | 3;
  isGoalMet: boolean;
  isInCurrentStreak: boolean;
}

export interface StreakCalendarMonth {
  year: number;
  monthIndex: number; // 0-11
  monthLabel: string;
  cells: CalendarDayCell[]; // Always 35 or 42 cells (Sun-Sat rows)
  activeDaysInMonth: number;
  modulesCompletedInMonth: number;
}

export interface MiniWeekDay {
  dateKey: string;
  shortLabel: string;
  dayNumber: number;
  isToday: boolean;
  isActive: boolean;
  isGoalMet: boolean;
  completedCount: number;
}

export interface LearningOverviewStats {
  totalTracks: number;
  totalModules: number;
  completedModules: number;
  completedMinutes: number;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseActivityDateKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return toLocalDateKey(parsed);
}

function parseKeyToLocalDate(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function collectDailyActivityCounts(
  moduleCompletedAt: Record<string, string> = {},
  activeStudyDates: string[] = [],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const raw of Object.values(moduleCompletedAt)) {
    const key = parseActivityDateKey(raw);
    if (key) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  for (const raw of activeStudyDates) {
    const key = parseActivityDateKey(raw);
    if (key && !(key in counts)) {
      counts[key] = 1;
    }
  }

  return counts;
}

export function computeCurrentStreak(
  completionDates: string[],
  referenceDate: Date = new Date(),
): number {
  const activeDays = new Set<string>();
  for (const raw of completionDates) {
    const key = parseActivityDateKey(raw);
    if (key) {
      activeDays.add(key);
    }
  }

  if (activeDays.size === 0) {
    return 0;
  }

  const cursor = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const todayKey = toLocalDateKey(cursor);

  if (!activeDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(toLocalDateKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDays.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeStreakMetrics(
  activityCounts: Record<string, number>,
  referenceDate: Date = new Date(),
): StreakMetrics {
  const activeKeys = Object.keys(activityCounts)
    .filter((k) => activityCounts[k] > 0)
    .sort();

  const todayKey = toLocalDateKey(referenceDate);
  const currentStreak = computeCurrentStreak(activeKeys, referenceDate);

  let longestStreak = 0;
  let running = 0;
  let prevDate: Date | null = null;

  for (const key of activeKeys) {
    const currDate = parseKeyToLocalDate(key);
    if (!currDate) continue;
    if (prevDate) {
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / 86_400_000,
      );
      running = diffDays === 1 ? running + 1 : 1;
    } else {
      running = 1;
    }
    if (running > longestStreak) {
      longestStreak = running;
    }
    prevDate = currDate;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalActiveDays: activeKeys.length,
    activeToday: (activityCounts[todayKey] ?? 0) > 0,
  };
}

export function getCurrentStreakDateSet(
  activityCounts: Record<string, number>,
  referenceDate: Date = new Date(),
): Set<string> {
  const activeSet = new Set(
    Object.keys(activityCounts).filter((k) => activityCounts[k] > 0),
  );
  const result = new Set<string>();
  if (activeSet.size === 0) return result;

  const cursor = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const todayKey = toLocalDateKey(cursor);
  if (!activeSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeSet.has(toLocalDateKey(cursor))) {
      return result;
    }
  }

  while (activeSet.has(toLocalDateKey(cursor))) {
    result.add(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return result;
}

export const DAILY_GOAL_MIN = 1;
export const DAILY_GOAL_MAX = 5;

export interface DailyGoalOption {
  modules: number;
  label: string;
  cadence: string;
}

export const DAILY_GOAL_OPTIONS: DailyGoalOption[] = [
  { modules: 1, label: 'Casual', cadence: '~10 min/day' },
  { modules: 2, label: 'Steady', cadence: '~20 min/day' },
  { modules: 3, label: 'Focused', cadence: '~35 min/day' },
  { modules: 4, label: 'Driven', cadence: '~50 min/day' },
  { modules: 5, label: 'Intense', cadence: '~65 min/day' },
];

export function normalizeDailyGoalTarget(value: number): number {
  if (!Number.isFinite(value)) return 2;
  const rounded = Math.round(value);
  return Math.max(DAILY_GOAL_MIN, Math.min(DAILY_GOAL_MAX, rounded));
}

export function computeDailyGoalProgress(
  moduleCompletedAt: Record<string, string>,
  dailyModuleGoal: number,
  referenceDate: Date = new Date(),
): DailyGoalProgress {
  const normalizedGoal = Math.max(1, Math.min(10, Math.round(dailyModuleGoal) || 1));
  const todayKey = toLocalDateKey(referenceDate);

  let completedToday = 0;
  for (const timestamp of Object.values(moduleCompletedAt)) {
    const key = parseActivityDateKey(timestamp);
    if (key === todayKey) {
      completedToday += 1;
    }
  }

  const percentage = Math.min(
    100,
    Math.round((completedToday / normalizedGoal) * 100),
  );

  return {
    completedToday,
    dailyGoal: normalizedGoal,
    percentage,
    remaining: Math.max(0, normalizedGoal - completedToday),
    isGoalMet: completedToday >= normalizedGoal,
  };
}

function resolveIntensity(
  count: number,
  goal: number,
): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count >= Math.max(2, goal)) return 3;
  if (count >= goal) return 2;
  return 1;
}

export function buildStreakCalendarMonth(
  year: number,
  monthIndex: number,
  activityCounts: Record<string, number>,
  dailyModuleGoal: number = 2,
  referenceDate: Date = new Date(),
): StreakCalendarMonth {
  const safeGoal = Math.max(1, Math.min(10, Math.round(dailyModuleGoal) || 2));
  const firstOfMonth = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const lastOfMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const daysInMonth = lastOfMonth.getDate();

  const totalCells = startWeekday + daysInMonth > 35 ? 42 : 35;
  const gridStart = new Date(year, monthIndex, 1 - startWeekday, 12, 0, 0, 0);

  const todayKey = toLocalDateKey(referenceDate);
  const streakDates = getCurrentStreakDateSet(activityCounts, referenceDate);

  const cells: CalendarDayCell[] = [];
  let activeDaysInMonth = 0;
  let modulesCompletedInMonth = 0;

  for (let i = 0; i < totalCells; i += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const dateKey = toLocalDateKey(cellDate);
    const isCurrentMonth =
      cellDate.getFullYear() === year && cellDate.getMonth() === monthIndex;
    const completedCount = activityCounts[dateKey] ?? 0;

    if (isCurrentMonth && completedCount > 0) {
      activeDaysInMonth += 1;
      modulesCompletedInMonth += completedCount;
    }

    cells.push({
      dateKey,
      dayNumber: cellDate.getDate(),
      isCurrentMonth,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
      completedCount,
      intensity: resolveIntensity(completedCount, safeGoal),
      isGoalMet: completedCount >= safeGoal,
      isInCurrentStreak: streakDates.has(dateKey),
    });
  }

  return {
    year,
    monthIndex,
    monthLabel: `${MONTH_NAMES[monthIndex] ?? 'Month'} ${year}`,
    cells,
    activeDaysInMonth,
    modulesCompletedInMonth,
  };
}

export function buildMiniWeekStrip(
  activityCounts: Record<string, number>,
  dailyModuleGoal: number = 2,
  referenceDate: Date = new Date(),
): MiniWeekDay[] {
  const safeGoal = Math.max(1, Math.min(10, Math.round(dailyModuleGoal) || 2));
  const todayKey = toLocalDateKey(referenceDate);
  const strip: MiniWeekDay[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - offset,
      12,
      0,
      0,
      0,
    );
    const dateKey = toLocalDateKey(day);
    const completedCount = activityCounts[dateKey] ?? 0;

    strip.push({
      dateKey,
      shortLabel: WEEKDAY_SHORT[day.getDay()] ?? 'D',
      dayNumber: day.getDate(),
      isToday: dateKey === todayKey,
      isActive: completedCount > 0,
      isGoalMet: completedCount >= safeGoal,
      completedCount,
    });
  }

  return strip;
}

export interface ConsistencyDayPoint {
  dateKey: string;
  shortDate: string;
  dayNumber: number;
  weekdayLabel: string;
  completedCount: number;
  intensity: 0 | 1 | 2 | 3;
  isGoalMet: boolean;
  isToday: boolean;
}

export interface RollingConsistencyWindow {
  windowDays: number;
  days: ConsistencyDayPoint[];
  activeDaysCount: number;
  goalMetDaysCount: number;
  totalModulesCompleted: number;
  consistencyPercent: number;
  peakDayCount: number;
}

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildRollingConsistencyWindow(
  activityCounts: Record<string, number>,
  dailyModuleGoal: number = 2,
  windowDays: number = 30,
  referenceDate: Date = new Date(),
): RollingConsistencyWindow {
  const safeWindow = Math.max(7, Math.min(90, Math.round(windowDays) || 30));
  const safeGoal = Math.max(1, Math.min(10, Math.round(dailyModuleGoal) || 2));
  const todayKey = toLocalDateKey(referenceDate);

  const days: ConsistencyDayPoint[] = [];
  let activeDaysCount = 0;
  let goalMetDaysCount = 0;
  let totalModulesCompleted = 0;
  let peakDayCount = 0;

  for (let offset = safeWindow - 1; offset >= 0; offset -= 1) {
    const day = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - offset,
      12,
      0,
      0,
      0,
    );
    const dateKey = toLocalDateKey(day);
    const completedCount = Math.max(0, Number(activityCounts[dateKey]) || 0);
    const isGoalMet = completedCount >= safeGoal;

    if (completedCount > 0) {
      activeDaysCount += 1;
      totalModulesCompleted += completedCount;
    }
    if (isGoalMet) {
      goalMetDaysCount += 1;
    }
    if (completedCount > peakDayCount) {
      peakDayCount = completedCount;
    }

    days.push({
      dateKey,
      shortDate: `${SHORT_MONTH_NAMES[day.getMonth()] ?? 'M'} ${day.getDate()}`,
      dayNumber: day.getDate(),
      weekdayLabel: WEEKDAY_NAMES[day.getDay()] ?? 'Day',
      completedCount,
      intensity: resolveIntensity(completedCount, safeGoal),
      isGoalMet,
      isToday: dateKey === todayKey,
    });
  }

  const consistencyPercent = Math.round((activeDaysCount / safeWindow) * 100);

  return {
    windowDays: safeWindow,
    days,
    activeDaysCount,
    goalMetDaysCount,
    totalModulesCompleted,
    consistencyPercent,
    peakDayCount,
  };
}

export function computeLearningStats(
  tracks: CurriculumTrack[],
  completedModuleIds: string[],
  moduleCompletedAt: Record<string, string> = {},
  referenceDate: Date = new Date(),
  activeStudyDates: string[] = [],
): LearningOverviewStats {
  const completedSet = new Set(completedModuleIds);
  let totalModules = 0;
  let completedModules = 0;
  let completedMinutes = 0;

  for (const track of tracks) {
    for (const mod of track.modules) {
      totalModules += 1;
      if (completedSet.has(mod.id)) {
        completedModules += 1;
        completedMinutes += mod.estimatedMinutes;
      }
    }
  }

  const activityMap = collectDailyActivityCounts(moduleCompletedAt, activeStudyDates);
  const metrics = computeStreakMetrics(activityMap, referenceDate);

  return {
    totalTracks: tracks.length,
    totalModules,
    completedModules,
    completedMinutes,
    currentStreak: metrics.currentStreak,
    longestStreak: metrics.longestStreak,
    totalActiveDays: metrics.totalActiveDays,
  };
}
