import test from 'node:test';
import assert from 'node:assert/strict';
import type { CurriculumTrack } from '../types/curriculum';
import {
  evaluateTrackModulesProgression,
  isModuleUnlocked,
} from './progressionEngine';

const TRACK: CurriculumTrack = {
  id: 't1',
  language: 'python',
  title: 'Python Core',
  subtitle: 'Clean syntax',
  skillLevel: 'intern',
  learningFocus: 'syntax',
  paceDepth: 'essentials',
  priorBackground: '',
  bridgingStrategy: '',
  createdAt: '2026-11-15T00:00:00Z',
  modules: [
    {
      id: 'm1',
      order: 1,
      title: 'Variables',
      estimatedMinutes: 15,
      summary: 'Bindings',
      syntaxGrammar: 'x = 1',
      syntaxTopics: ['variables'],
      examples: [],
      commonPitfalls: [],
      xpReward: 30,
      challenge: {
        title: 'Assign x',
        prompt: 'Assign',
        starterCode: '',
        expectedConcepts: [],
        hint: '',
        sampleSolution: 'x = 1',
      },
    },
    {
      id: 'm2',
      order: 2,
      title: 'Conditionals',
      estimatedMinutes: 20,
      summary: 'Branching',
      syntaxGrammar: 'if cond:',
      syntaxTopics: ['if'],
      examples: [],
      commonPitfalls: [],
      xpReward: 40,
      challenge: {
        title: 'Branch',
        prompt: 'Branch',
        starterCode: '',
        expectedConcepts: [],
        hint: '',
        sampleSolution: 'if True: pass',
      },
    },
    {
      id: 'm3',
      order: 3,
      title: 'Loops',
      estimatedMinutes: 25,
      summary: 'Iteration',
      syntaxGrammar: 'for x in items:',
      syntaxTopics: ['for'],
      examples: [],
      commonPitfalls: [],
      xpReward: 50,
      challenge: {
        title: 'Loop',
        prompt: 'Loop',
        starterCode: '',
        expectedConcepts: [],
        hint: '',
        sampleSolution: 'for x in [1]: pass',
      },
    },
  ],
};

test('evaluateTrackModulesProgression locks future modules until previous ones are completed', () => {
  const initial = evaluateTrackModulesProgression(TRACK, []);
  assert.equal(initial.nodes[0].status, 'available');
  assert.equal(initial.nodes[1].status, 'locked');
  assert.equal(initial.nodes[2].status, 'locked');
  assert.match(initial.nodes[1].lockedReason ?? '', /Variables/);
  assert.equal(initial.nextUnlockedModuleId, 'm1');
  assert.equal(initial.totalXpEarned, 0);
  assert.equal(initial.totalXpPossible, 120);

  const afterM1 = evaluateTrackModulesProgression(TRACK, ['m1']);
  assert.equal(afterM1.nodes[0].status, 'completed');
  assert.equal(afterM1.nodes[1].status, 'available');
  assert.equal(afterM1.nodes[2].status, 'locked');
  assert.equal(afterM1.nextUnlockedModuleId, 'm2');
  assert.equal(afterM1.totalXpEarned, 30);

  const complete = evaluateTrackModulesProgression(TRACK, ['m1', 'm2', 'm3']);
  assert.equal(complete.isTrackComplete, true);
  assert.equal(complete.percentage, 100);
  assert.equal(complete.totalXpEarned, 120);
});

test('isModuleUnlocked accurately reflects sequential gate', () => {
  assert.equal(isModuleUnlocked(TRACK, 'm1', []), true);
  assert.equal(isModuleUnlocked(TRACK, 'm2', []), false);
  assert.equal(isModuleUnlocked(TRACK, 'm2', ['m1']), true);
  assert.equal(isModuleUnlocked(TRACK, 'm3', ['m1']), false);
});
