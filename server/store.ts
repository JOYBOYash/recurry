import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const QUOTA_PATH = path.join(DATA_DIR, 'recurry-quotas.json');

interface QuotaRecord {
  dateKey: string;
  count: number;
}

type QuotaMap = Record<string, QuotaRecord>;

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readQuotas(): Promise<QuotaMap> {
  try {
    const raw = await fs.readFile(QUOTA_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as QuotaMap) : {};
  } catch {
    return {};
  }
}

async function writeQuotas(map: QuotaMap): Promise<void> {
  await ensureDir();
  const tempPath = `${QUOTA_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(map, null, 2), 'utf8');
  await fs.rename(tempPath, QUOTA_PATH);
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
  const record = map[uid];
  const used = record && record.dateKey === todayKey ? record.count : 0;
  const remainingToday = Math.max(0, 1 - used);
  return {
    allowed: remainingToday > 0,
    remainingToday,
    todayKey,
  };
}

export function consumeUserDailyQuota(
  uid: string,
  clientDateKey?: string,
): Promise<{ dateKey: string; count: number; remainingToday: number }> {
  return withQuotaLock((map) => {
    const todayKey = resolveSafeDateKey(clientDateKey);
    const existing = map[uid];
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
