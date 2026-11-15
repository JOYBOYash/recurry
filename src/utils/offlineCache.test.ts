import test from 'node:test';
import assert from 'node:assert/strict';
import type { CurriculumTrack, UserProfile } from '../types/curriculum';
import {
  buildOfflineWorkspaceSnapshot,
  clearOfflineWorkspaceSnapshot,
  hasStartedActiveCurriculum,
  loadOfflineWorkspaceSnapshot,
  OFFLINE_WORKSPACE_STORAGE_KEY,
  saveOfflineWorkspaceSnapshot,
  type StorageLike,
} from './offlineCache';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

const sampleProfile: UserProfile = {
  uid: 'user-1',
  username: 'alex',
  dailyModuleGoal: 3,
  onboardingCompleted: true,
  preferredLanguage: 'python',
  skillLevel: 'intern',
  learningFocus: 'syntax',
  lastGeneratedDate: '2026-11-15',
  dailyGenerationCount: 1,
  activeTrackId: 'track-py-1',
  activeModuleId: 'mod-1',
  completedModuleIds: ['mod-1'],
  moduleCompletedAt: { 'mod-1': '2026-11-15T09:00:00.000Z' },
  moduleAccuracy: {},
};

const sampleTrack: CurriculumTrack = {
  id: 'track-py-1',
  uid: 'user-1',
  language: 'python',
  title: 'Python Core Syntax',
  subtitle: 'Comprehensions and idioms',
  skillLevel: 'intern',
  learningFocus: 'syntax',
  paceDepth: 'essentials',
  priorBackground: '',
  bridgingStrategy: '',
  createdAt: '2026-11-15T08:00:00.000Z',
  modules: [
    {
      id: 'mod-1',
      order: 1,
      title: 'List Comprehensions',
      summary: 'Transform collections cleanly',
      estimatedMinutes: 10,
      syntaxGrammar: '[expr for x in iterable if cond]',
      syntaxTopics: ['List comprehensions', 'Filtering predicates'],
      examples: [],
      commonPitfalls: [],
      challenge: {
        title: 'Square Evens',
        prompt: 'Return squares of even numbers',
        starterCode: 'def solve(nums):\n  pass',
        hint: 'Use [n * n for n in nums if n % 2 == 0]',
        sampleSolution: 'def solve(nums):\n  return [n * n for n in nums if n % 2 == 0]',
        expectedConcepts: ['list comprehension'],
      },
    },
  ],
};

test('saveOfflineWorkspaceSnapshot and loadOfflineWorkspaceSnapshot persist and isolate by uid', () => {
  const storage = createMemoryStorage();
  const snapshot = buildOfflineWorkspaceSnapshot({
    uid: 'user-1',
    profile: sampleProfile,
    tracks: [sampleTrack],
    certificates: [],
    referenceEntries: [],
    now: new Date('2026-11-15T10:00:00.000Z'),
  });

  assert.equal(saveOfflineWorkspaceSnapshot(snapshot, storage), true);
  assert.equal(hasStartedActiveCurriculum(snapshot), true);

  const loaded = loadOfflineWorkspaceSnapshot('user-1', storage);
  assert.ok(loaded);
  assert.equal(loaded.profile?.dailyModuleGoal, 3);
  assert.equal(loaded.tracks.length, 1);
  assert.equal(loaded.tracks[0].title, 'Python Core Syntax');

  // Different uid must not receive user-1 snapshot
  assert.equal(loadOfflineWorkspaceSnapshot('user-2', storage), null);

  clearOfflineWorkspaceSnapshot(storage);
  assert.equal(loadOfflineWorkspaceSnapshot('user-1', storage), null);
});

test('loadOfflineWorkspaceSnapshot handles corrupted JSON safely and hasStartedActiveCurriculum detects empty tracks', () => {
  const storage = createMemoryStorage();
  storage.setItem(OFFLINE_WORKSPACE_STORAGE_KEY, '{not-valid-json');
  assert.equal(loadOfflineWorkspaceSnapshot('user-1', storage), null);

  assert.equal(
    hasStartedActiveCurriculum({
      profile: sampleProfile,
      tracks: [],
    }),
    false,
  );
});
