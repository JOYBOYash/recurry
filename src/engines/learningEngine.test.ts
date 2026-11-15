import test from 'node:test';
import assert from 'node:assert/strict';
import type { CurriculumModule } from '../types/curriculum';
import {
  evaluateLessonMastery,
  getModuleRecallDrills,
  gradeRecallResponse,
} from './learningEngine';

const LEGACY_MODULE: CurriculumModule = {
  id: 'm1',
  order: 1,
  title: 'List Comprehensions',
  estimatedMinutes: 15,
  summary: 'Build lists concisely',
  syntaxGrammar: '[expr for item in iterable if cond]',
  syntaxTopics: ['comprehensions', 'filtering'],
  examples: [
    {
      title: 'Double positives',
      code: 'res = [x * 2 for x in nums if x > 0]',
      explanation: 'Doubles each positive element into a new list',
      usageNote: 'Prefer over map/filter chains',
    },
  ],
  commonPitfalls: ['Forgetting brackets creates a generator instead of a list'],
  challenge: {
    title: 'Square evens',
    prompt: 'Return squared even numbers',
    starterCode: '',
    expectedConcepts: ['list comprehension'],
    hint: 'Use if x % 2 == 0',
    sampleSolution: '[x * x for x in nums if x % 2 == 0]',
  },
};

test('getModuleRecallDrills synthesizes deterministic active recall drills for legacy modules', () => {
  const drills = getModuleRecallDrills(LEGACY_MODULE, 'python');
  assert.equal(drills.length, 3);
  assert.equal(drills[0].difficulty, 'foundation');
  assert.equal(drills[1].difficulty, 'applied');
  assert.equal(drills[2].difficulty, 'mastery');
});

test('gradeRecallResponse checks multiple-choice and fill_blank answers cleanly', () => {
  const fillDrill = {
    id: 'd-fill',
    type: 'fill_blank' as const,
    difficulty: 'applied' as const,
    prompt: 'Complete keyword',
    answer: 'SELECT DISTINCT',
    explanation: 'DISTINCT deduplicates rows.',
    conceptTag: 'SQL',
  };

  const pass = gradeRecallResponse(fillDrill, '  select   distinct ');
  assert.equal(pass.correct, true);

  const fail = gradeRecallResponse(fillDrill, 'SELECT ALL');
  assert.equal(fail.correct, false);
});

test('evaluateLessonMastery computes stage progression and XP accurately', () => {
  const drills = getModuleRecallDrills(LEGACY_MODULE, 'python');
  const start = evaluateLessonMastery({
    drills,
    passedDrillIds: [],
    attempts: 0,
    challengePassed: false,
    moduleXpReward: 30,
  });
  assert.equal(start.allDrillsPassed, false);
  assert.equal(start.recommendedStep, 'concept');
  assert.equal(start.xpEarned, 0);

  const drillsDone = evaluateLessonMastery({
    drills,
    passedDrillIds: drills.map((d) => d.id),
    attempts: 3,
    challengePassed: false,
    moduleXpReward: 30,
  });
  assert.equal(drillsDone.allDrillsPassed, true);
  assert.equal(drillsDone.recommendedStep, 'challenge');
  assert.equal(drillsDone.xpEarned, 15);

  const fullMastery = evaluateLessonMastery({
    drills,
    passedDrillIds: drills.map((d) => d.id),
    attempts: 3,
    challengePassed: true,
    moduleXpReward: 30,
  });
  assert.equal(fullMastery.recommendedStep, 'complete');
  assert.equal(fullMastery.xpEarned, 45);
});
