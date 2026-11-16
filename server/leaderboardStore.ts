import fs from 'node:fs/promises';
import path from 'node:path';
import type { LeaderboardEntry } from '../src/engines/leaderboardEngine.ts';
import type { LanguageId, SkillLevel } from '../src/types/curriculum.ts';
import {
  ALLOWED_LANGUAGES,
  ALLOWED_SKILL_LEVELS,
  clampString,
} from './security.ts';

type LeaderboardMap = Record<string, LeaderboardEntry>;

let leaderboardQueue: Promise<void> = Promise.resolve();
let memoryLeaderboard: LeaderboardMap = {};
let activeLeaderboardPath: string | null = null;

function resolveInitialLeaderboardPath(): string {
  if (activeLeaderboardPath) return activeLeaderboardPath;
  const customPath = process.env.LEADERBOARD_STORE_PATH?.trim();
  if (customPath) {
    return path.resolve(customPath);
  }
  return path.resolve(process.cwd(), '.data', 'recurry-leaderboard.json');
}

function getFallbackLeaderboardPath(): string {
  return path.resolve('/tmp', 'recurry-leaderboard.json');
}

async function readLeaderboardMap(): Promise<LeaderboardMap> {
  for (const candidate of [
    resolveInitialLeaderboardPath(),
    getFallbackLeaderboardPath(),
  ]) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') {
        memoryLeaderboard = { ...(parsed as LeaderboardMap), ...memoryLeaderboard };
        return { ...memoryLeaderboard };
      }
    } catch {
      // Try next path or memory cache
    }
  }
  return { ...memoryLeaderboard };
}

async function writeLeaderboardMap(map: LeaderboardMap): Promise<void> {
  memoryLeaderboard = { ...map };
  const candidates = Array.from(
    new Set([resolveInitialLeaderboardPath(), getFallbackLeaderboardPath()]),
  );
  for (const storePath of candidates) {
    try {
      await fs.mkdir(path.dirname(storePath), { recursive: true });
      const tempPath = `${storePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(map, null, 2), 'utf8');
      await fs.rename(tempPath, storePath);
      activeLeaderboardPath = storePath;
      return;
    } catch (err) {
      console.warn(
        `[leaderboardStore] Unable to persist leaderboard at ${storePath}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

function withLeaderboardLock<T>(
  mutator: (map: LeaderboardMap) => Promise<T> | T,
): Promise<T> {
  const run = leaderboardQueue.then(async () => {
    const current = await readLeaderboardMap();
    const result = await mutator(current);
    await writeLeaderboardMap(current);
    return result;
  });
  leaderboardQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function clampCount(value: unknown, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(max, Math.round(num)));
}

export interface SyncLeaderboardInput {
  username?: unknown;
  preferredLanguage?: unknown;
  rank?: unknown;
  weeklyActiveDays?: unknown;
  currentStreak?: unknown;
  weeklyModulesCompleted?: unknown;
  totalModulesCompleted?: unknown;
}

export function normalizeLeaderboardEntry(
  uid: string,
  input: SyncLeaderboardInput,
): LeaderboardEntry {
  const cleanedName =
    clampString(input.username, 32).replace(/[^a-zA-Z0-9._-\s]/g, '').trim() ||
    'Learner';

  const preferredLanguage: LanguageId =
    typeof input.preferredLanguage === 'string' &&
    ALLOWED_LANGUAGES.has(input.preferredLanguage as LanguageId)
      ? (input.preferredLanguage as LanguageId)
      : 'python';

  const rank: SkillLevel =
    typeof input.rank === 'string' &&
    ALLOWED_SKILL_LEVELS.has(input.rank as SkillLevel)
      ? (input.rank as SkillLevel)
      : 'noob';

  return {
    uid,
    username: cleanedName,
    preferredLanguage,
    rank,
    weeklyActiveDays: clampCount(input.weeklyActiveDays, 7),
    currentStreak: clampCount(input.currentStreak, 3650),
    weeklyModulesCompleted: clampCount(input.weeklyModulesCompleted, 500),
    totalModulesCompleted: clampCount(input.totalModulesCompleted, 5000),
    updatedAt: new Date().toISOString(),
  };
}

export async function listLeaderboardEntries(
  limit: number = 50,
): Promise<LeaderboardEntry[]> {
  const map = await readLeaderboardMap();
  return Object.values(map)
    .sort((a, b) => {
      if (b.weeklyActiveDays !== a.weeklyActiveDays) {
        return b.weeklyActiveDays - a.weeklyActiveDays;
      }
      if (b.weeklyModulesCompleted !== a.weeklyModulesCompleted) {
        return b.weeklyModulesCompleted - a.weeklyModulesCompleted;
      }
      return b.totalModulesCompleted - a.totalModulesCompleted;
    })
    .slice(0, Math.max(1, Math.min(100, limit)));
}

export function upsertLeaderboardEntry(
  uid: string,
  input: SyncLeaderboardInput,
): Promise<LeaderboardEntry> {
  return withLeaderboardLock((map) => {
    const entry = normalizeLeaderboardEntry(uid, input);
    map[uid] = entry;
    return entry;
  });
}
