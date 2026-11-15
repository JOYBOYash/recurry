import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  listLeaderboardEntries,
  normalizeLeaderboardEntry,
  upsertLeaderboardEntry,
} from './leaderboardStore.ts';

test('normalizeLeaderboardEntry clamps extreme counts and invalid languages safely', () => {
  const entry = normalizeLeaderboardEntry('uid-1', {
    username: '  Ada <script> ',
    preferredLanguage: 'brainfuck',
    rank: 'legend',
    weeklyActiveDays: 99,
    currentStreak: -5,
    weeklyModulesCompleted: 20,
    totalModulesCompleted: 90,
  });

  assert.equal(entry.uid, 'uid-1');
  assert.equal(entry.username, 'Ada script');
  assert.equal(entry.preferredLanguage, 'python');
  assert.equal(entry.rank, 'legend');
  assert.equal(entry.weeklyActiveDays, 7);
  assert.equal(entry.currentStreak, 0);
  assert.equal(entry.weeklyModulesCompleted, 20);
  assert.equal(entry.totalModulesCompleted, 90);
});

test('upsertLeaderboardEntry persists and lists multiple learners cleanly', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recurry-lb-'));
  const storeFile = path.join(tmpDir, 'leaderboard.json');
  process.env.LEADERBOARD_STORE_PATH = storeFile;

  try {
    await upsertLeaderboardEntry('u1', {
      username: 'sri',
      preferredLanguage: 'python',
      rank: 'expert',
      weeklyActiveDays: 3,
      currentStreak: 3,
      weeklyModulesCompleted: 5,
      totalModulesCompleted: 9,
    });
    await upsertLeaderboardEntry('u2', {
      username: 'maya',
      preferredLanguage: 'sql',
      rank: 'master',
      weeklyActiveDays: 6,
      currentStreak: 6,
      weeklyModulesCompleted: 11,
      totalModulesCompleted: 18,
    });

    const list = await listLeaderboardEntries();
    assert.equal(list.length, 2);
    assert.equal(list[0]?.uid, 'u2');
    assert.equal(list[1]?.uid, 'u1');
  } finally {
    delete process.env.LEADERBOARD_STORE_PATH;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
