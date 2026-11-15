import test from 'node:test';
import assert from 'node:assert/strict';
import type { CurriculumTrack } from '../types/curriculum';
import {
  RANK_ORDER,
  getDailyStreakMotivation,
  getRankMeta,
  rankFromCompletionPercent,
  resolveProgressRank,
} from './rankSystem';

function makeTrack(moduleCount: number): CurriculumTrack {
  return {
    id: 'track-py-1',
    uid: 'user-1',
    language: 'python',
    title: 'Python Mastery',
    subtitle: 'Core idioms and drills',
    skillLevel: 'noob',
    learningFocus: 'syntax',
    paceDepth: 'comprehensive',
    priorBackground: 'None',
    bridgingStrategy: 'Step-by-step foundations',
    createdAt: '2026-11-15T00:00:00.000Z',
    modules: Array.from({ length: moduleCount }, (_, idx) => ({
      id: `mod-${idx + 1}`,
      order: idx + 1,
      title: `Module ${idx + 1}`,
      estimatedMinutes: 10,
      summary: 'Summary',
      syntaxGrammar: 'var = value',
      syntaxTopics: ['Variables'],
      examples: [
        {
          title: 'Assignment',
          code: 'x = 1',
          explanation: 'Binds 1 to x',
          usageNote: 'No type keyword required',
        },
      ],
      commonPitfalls: ['Rebinding reserved names'],
      xpReward: 30,
      challenge: {
        title: 'Assign x',
        prompt: 'Assign 1 to x',
        starterCode: '',
        expectedConcepts: ['assignment'],
        hint: 'Use =',
        sampleSolution: 'x = 1',
      },
    })),
  };
}

test('getRankMeta covers every rank in RANK_ORDER with labels and dark-compatible classes', () => {
  for (const rank of RANK_ORDER) {
    const meta = getRankMeta(rank);
    assert.equal(meta.id, rank);
    assert.ok(meta.label.length > 0);
    assert.ok(meta.badgeBgClass.includes('dark:'));
    assert.ok(meta.iconColorClass.includes('dark:'));
  }
});

test('rankFromCompletionPercent maps active curriculum progress across all 5 ranks', () => {
  assert.equal(rankFromCompletionPercent(0), 'noob');
  assert.equal(rankFromCompletionPercent(1), 'intern');
  assert.equal(rankFromCompletionPercent(39), 'intern');
  assert.equal(rankFromCompletionPercent(40), 'expert');
  assert.equal(rankFromCompletionPercent(69), 'expert');
  assert.equal(rankFromCompletionPercent(70), 'master');
  assert.equal(rankFromCompletionPercent(99), 'master');
  assert.equal(rankFromCompletionPercent(100), 'legend');
});

test('resolveProgressRank advances rank based on active curriculum module completions', () => {
  const track = makeTrack(6);

  const atStart = resolveProgressRank(track, []);
  assert.equal(atStart.rank, 'noob');
  assert.equal(atStart.progressPercent, 0);
  assert.equal(atStart.nextRank, 'intern');

  const atOne = resolveProgressRank(track, ['mod-1']);
  assert.equal(atOne.rank, 'intern');
  assert.equal(atOne.progressPercent, 17);
  assert.equal(atOne.nextRank, 'expert');

  const atThree = resolveProgressRank(track, ['mod-1', 'mod-2', 'mod-3']);
  assert.equal(atThree.rank, 'expert');
  assert.equal(atThree.progressPercent, 50);
  assert.equal(atThree.nextRank, 'master');

  const atFive = resolveProgressRank(track, [
    'mod-1',
    'mod-2',
    'mod-3',
    'mod-4',
    'mod-5',
  ]);
  assert.equal(atFive.rank, 'master');
  assert.equal(atFive.progressPercent, 83);
  assert.equal(atFive.nextRank, 'legend');

  const atComplete = resolveProgressRank(track, [
    'mod-1',
    'mod-2',
    'mod-3',
    'mod-4',
    'mod-5',
    'mod-6',
  ]);
  assert.equal(atComplete.rank, 'legend');
  assert.equal(atComplete.progressPercent, 100);
  assert.equal(atComplete.nextRank, null);
});

test('resolveProgressRank falls back cleanly when no active track exists', () => {
  const res = resolveProgressRank(null, [], 'expert');
  assert.equal(res.hasActiveTrack, false);
  assert.equal(res.rank, 'expert');
  assert.equal(res.meta.label, 'Expert');
  assert.equal(res.nextRank, 'master');
});

test('getDailyStreakMotivation returns motivating copy across streak states', () => {
  assert.match(getDailyStreakMotivation(0, false), /spark your streak/i);
  assert.match(getDailyStreakMotivation(1, true), /Day 1 locked in/i);
  assert.match(getDailyStreakMotivation(4, false), /4-day streak on the line/i);
  assert.match(getDailyStreakMotivation(12, true), /Unstoppable 12-day streak/i);
});
