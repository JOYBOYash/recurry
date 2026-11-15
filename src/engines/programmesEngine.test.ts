import test from 'node:test';
import assert from 'node:assert/strict';
import type { CurriculumTrack } from '../types/curriculum';
import {
  buildProgrammeBlueprint,
  evaluateProgrammeLockState,
} from './programmesEngine';

function makeTrack(id: string, moduleIds: string[]): CurriculumTrack {
  return {
    id,
    language: 'python',
    title: `Track ${id}`,
    subtitle: 'Sub',
    skillLevel: 'intern',
    learningFocus: 'syntax',
    paceDepth: 'essentials',
    priorBackground: '',
    bridgingStrategy: '',
    createdAt: '2026-11-15T00:00:00Z',
    modules: moduleIds.map((mId, idx) => ({
      id: mId,
      order: idx + 1,
      title: `Mod ${mId}`,
      estimatedMinutes: 15,
      summary: 'Sum',
      syntaxGrammar: 'x = 1',
      syntaxTopics: ['basics'],
      examples: [],
      commonPitfalls: [],
      challenge: {
        title: 'Chal',
        prompt: 'Prompt',
        starterCode: '',
        expectedConcepts: [],
        hint: '',
        sampleSolution: '',
      },
    })),
  };
}

test('evaluateProgrammeLockState allows generation when no tracks or all tracks are completed', () => {
  const empty = evaluateProgrammeLockState([], []);
  assert.equal(empty.canGenerateNewProgramme, true);
  assert.equal(empty.activeIncompleteTrackId, null);

  const t1 = makeTrack('t1', ['m1', 'm2']);
  const allDone = evaluateProgrammeLockState([t1], ['m1', 'm2'], 't1');
  assert.equal(allDone.canGenerateNewProgramme, true);
  assert.equal(allDone.completedProgrammesCount, 1);
  assert.equal(allDone.programmesById.t1.status, 'completed');
  assert.equal(allDone.programmesById.t1.isCertificateReady, true);
});

test('evaluateProgrammeLockState locks new generation and secondary tracks when an active curriculum is incomplete', () => {
  const t1 = makeTrack('t1', ['m1', 'm2']);
  const t2 = makeTrack('t2', ['m3', 'm4']);
  const state = evaluateProgrammeLockState([t1, t2], ['m1'], 't1');

  assert.equal(state.canGenerateNewProgramme, false);
  assert.equal(state.activeIncompleteTrackId, 't1');
  assert.equal(state.programmesById.t1.status, 'active');
  assert.equal(state.programmesById.t2.status, 'locked');
  assert.match(state.lockMessage ?? '', /Track t1/);
});

test('buildProgrammeBlueprint creates calibrated pre-generation plan matching depth and custom notes', () => {
  const plan = buildProgrammeBlueprint({
    language: 'sql',
    skillLevel: 'expert',
    learningFocus: 'problem_solving',
    paceDepth: 'comprehensive',
    priorBackground: 'Python',
    focusNotes: 'CTEs, Window analytics',
  });

  assert.equal(plan.languageName, 'SQL');
  assert.equal(plan.moduleCount, 6);
  assert.equal(plan.moduleSlots.length, 6);
  assert.equal(plan.moduleSlots[0].difficulty, 'foundation');
  assert.equal(plan.moduleSlots[5].difficulty, 'mastery');
  assert.match(plan.moduleSlots[0].topicFocus, /CTEs/);
  assert.ok(plan.totalXpTarget > 200);
});
