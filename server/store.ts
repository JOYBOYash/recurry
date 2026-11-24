import fs from 'node:fs/promises';
import path from 'node:path';

interface QuotaRecord {
  dateKey: string;
  count: number;
}

type QuotaMap = Record<string, QuotaRecord>;

let writeQueue: Promise<void> = Promise.resolve();
let memoryQuotas: QuotaMap = {};
let activeQuotaPath: string | null = null;

function resolveInitialQuotaPath(): string {
  if (activeQuotaPath) return activeQuotaPath;
  const customPath = process.env.QUOTA_STORE_PATH?.trim();
  if (customPath) {
    return path.resolve(customPath);
  }
  return path.resolve(process.cwd(), '.data', 'recurry-quotas.json');
}

function getFallbackQuotaPath(): string {
  return path.resolve('/tmp', 'recurry-quotas.json');
}

async function readQuotas(): Promise<QuotaMap> {
  for (const candidate of [resolveInitialQuotaPath(), getFallbackQuotaPath()]) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') {
        memoryQuotas = { ...(parsed as QuotaMap), ...memoryQuotas };
        return { ...memoryQuotas };
      }
    } catch {
      // Try next path or memory cache
    }
  }
  return { ...memoryQuotas };
}

async function writeQuotas(map: QuotaMap): Promise<void> {
  memoryQuotas = { ...map };
  const candidates = Array.from(
    new Set([resolveInitialQuotaPath(), getFallbackQuotaPath()]),
  );

  for (const quotaPath of candidates) {
    try {
      await fs.mkdir(path.dirname(quotaPath), { recursive: true });
      const tempPath = `${quotaPath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(map, null, 2), 'utf8');
      await fs.rename(tempPath, quotaPath);
      activeQuotaPath = quotaPath;
      return;
    } catch (err) {
      console.warn(
        `[store] Unable to persist quota store at ${quotaPath}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

function withQuotaLock<T>(mutator: (map: QuotaMap) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const current = await readQuotas();
    const result = await mutator(current);
    await writeQuotas(current);
    return result;
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function resolveSafeDateKey(clientDateKey?: string): string {
  const serverNow = new Date();
  const serverUtcKey = serverNow.toISOString().slice(0, 10);
  if (!clientDateKey || !/^\d{4}-\d{2}-\d{2}$/.test(clientDateKey)) {
    return serverUtcKey;
  }
  const clientMs = Date.parse(`${clientDateKey}T12:00:00Z`);
  const serverMs = Date.parse(`${serverUtcKey}T12:00:00Z`);
  if (Number.isNaN(clientMs) || Math.abs(clientMs - serverMs) > 36 * 3600 * 1000) {
    return serverUtcKey;
  }
  return clientDateKey;
}

export async function getUserDailyQuota(
  uid: string,
  clientDateKey?: string,
): Promise<{ allowed: boolean; remainingToday: number; todayKey: string }> {
  const todayKey = resolveSafeDateKey(clientDateKey);
  const map = await readQuotas();
  const record = Object.hasOwn(map, uid) ? map[uid] : undefined;
  const used = record && record.dateKey === todayKey ? record.count : 0;
  const remainingToday = Math.max(0, 1 - used);
  return {
    allowed: remainingToday > 0,
    remainingToday,
    todayKey,
  };
}

const inFlightQuotaKeys = new Set<string>();

/**
 * Atomically checks and reserves a user's daily generation slot before AI work starts,
 * preventing concurrent requests from bypassing the 1/day limit.
 */
export function reserveUserDailyQuota(
  uid: string,
  clientDateKey?: string,
): Promise<{
  reserved: boolean;
  inFlight: boolean;
  todayKey: string;
  remainingToday: number;
}> {
  return withQuotaLock((map) => {
    const todayKey = resolveSafeDateKey(clientDateKey);
    const flightKey = `${uid}:${todayKey}`;
    const existing = Object.hasOwn(map, uid) ? map[uid] : undefined;
    const used = existing && existing.dateKey === todayKey ? existing.count : 0;
    if (used >= 1) {
      return { reserved: false, inFlight: false, todayKey, remainingToday: 0 };
    }
    if (inFlightQuotaKeys.has(flightKey)) {
      return { reserved: false, inFlight: true, todayKey, remainingToday: 0 };
    }
    inFlightQuotaKeys.add(flightKey);
    return { reserved: true, inFlight: false, todayKey, remainingToday: 1 };
  });
}

export function releaseUserDailyQuota(uid: string, todayKey: string): void {
  inFlightQuotaKeys.delete(`${uid}:${todayKey}`);
}

export function consumeUserDailyQuota(
  uid: string,
  clientDateKey?: string,
): Promise<{ dateKey: string; count: number; remainingToday: number }> {
  return withQuotaLock((map) => {
    const todayKey = resolveSafeDateKey(clientDateKey);
    inFlightQuotaKeys.delete(`${uid}:${todayKey}`);
    const existing = Object.hasOwn(map, uid) ? map[uid] : undefined;
    const currentCount = existing && existing.dateKey === todayKey ? existing.count : 0;
    const nextCount = Math.min(1, currentCount + 1);
    map[uid] = { dateKey: todayKey, count: nextCount };
    return {
      dateKey: todayKey,
      count: nextCount,
      remainingToday: Math.max(0, 1 - nextCount),
    };
  });
}
