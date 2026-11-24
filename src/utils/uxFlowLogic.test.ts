import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEW_CURRICULUM_PROGRESS,
  NEW_CURRICULUM_STEP_ORDER,
  appendCodeLine,
  computeDailyHeartStates,
  cycleIndex,
  getNextNewCurriculumStep,
  getPreviousNewCurriculumStep,
  parseFocusModeValue,
  serializeFocusModeValue,
  splitSolutionIntoIncrementalSteps,
} from './uxFlowLogic';

test('cycleIndex wraps smoothly forward and backward across skill cards', () => {
  assert.equal(cycleIndex(0, 1, 5), 1);
  assert.equal(cycleIndex(4, 1, 5), 0);
  assert.equal(cycleIndex(0, -1, 5), 4);
  assert.equal(cycleIndex(2, -1, 5), 1);
  assert.equal(cycleIndex(0, 1, 0), 0);
});

test('computeDailyHeartStates returns filled and blinking hearts accurately', () => {
  assert.deepEqual(computeDailyHeartStates(0, 2), ['blinking', 'blinking']);
  assert.deepEqual(computeDailyHeartStates(1, 2), ['filled', 'blinking']);
  assert.deepEqual(computeDailyHeartStates(2, 2), ['filled', 'filled']);
  assert.deepEqual(computeDailyHeartStates(5, 3), ['filled', 'filled', 'filled']);
  assert.deepEqual(computeDailyHeartStates(-1, 0), ['blinking', 'blinking']);
});

test('Focus Mode storage helpers parse and serialize booleans cleanly', () => {
  assert.equal(parseFocusModeValue('1'), true);
  assert.equal(parseFocusModeValue('true'), true);
  assert.equal(parseFocusModeValue('0'), false);
  assert.equal(parseFocusModeValue(null), false);
  assert.equal(serializeFocusModeValue(true), '1');
  assert.equal(serializeFocusModeValue(false), '0');
});

test('NEW_CURRICULUM_STEP_ORDER progresses monotonically without username step', () => {
  assert.deepEqual(NEW_CURRICULUM_STEP_ORDER, ['language', 'level', 'focus', 'plan']);
  assert.equal(getPreviousNewCurriculumStep('language'), null);
  assert.equal(getNextNewCurriculumStep('language'), 'level');
  assert.equal(getNextNewCurriculumStep('focus'), 'plan');
  assert.equal(getNextNewCurriculumStep('plan'), null);

  let prev = 0;
  for (const step of NEW_CURRICULUM_STEP_ORDER) {
    assert.ok(NEW_CURRICULUM_PROGRESS[step].percent > prev);
    prev = NEW_CURRICULUM_PROGRESS[step].percent;
  }
  assert.equal(prev, 100);
});

test('splitSolutionIntoIncrementalSteps and appendCodeLine build solutions piece by piece', () => {
  const chunks = splitSolutionIntoIncrementalSteps('let a = 1;\n\nlet b = 2;\nreturn a + b;\n');
  assert.deepEqual(chunks, ['let a = 1;', 'let b = 2;', 'return a + b;']);

  const s1 = appendCodeLine('', chunks[0]);
  assert.equal(s1, 'let a = 1;');
  const s2 = appendCodeLine(s1, chunks[1]);
  assert.equal(s2, 'let a = 1;\nlet b = 2;');
  // Avoid duplicating an already-added line
  assert.equal(appendCodeLine(s2, chunks[1]), s2);
});
