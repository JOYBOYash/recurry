import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractCoreObjectives,
  formatModuleCountLabel,
  getModuleStatusLabel,
  getTrackStatusLabel,
} from './curriculumCards';

test('extractCoreObjectives deduplicates syntaxTopics and falls back to expectedConcepts cleanly', () => {
  const objectives = extractCoreObjectives(
    {
      syntaxTopics: ['`let` / `const`', 'Lexical Scope', 'let / const'],
      challenge: {
        title: 'Scope Drill',
        prompt: 'Write bindings',
        starterCode: '',
        expectedConcepts: ['Shadowing', 'Hoisting'],
        hint: '',
        sampleSolution: '',
      },
      summary: 'Learn variable scope',
    },
    3,
  );

  assert.deepEqual(objectives, ['let / const', 'Lexical Scope', 'Shadowing']);
});

test('extractCoreObjectives falls back to summary when topics and concepts are empty', () => {
  const objectives = extractCoreObjectives({
    syntaxTopics: [],
    challenge: {
      title: 'Test',
      prompt: 'Test',
      starterCode: '',
      expectedConcepts: [],
      hint: '',
      sampleSolution: '',
    },
    summary: 'Master pattern matching',
  });

  assert.deepEqual(objectives, ['Master pattern matching']);
});

test('status and module count labels format deterministically', () => {
  assert.equal(getModuleStatusLabel('completed'), 'Done');
  assert.equal(getModuleStatusLabel('available'), 'Next');
  assert.equal(getModuleStatusLabel('locked'), 'Locked');

  assert.equal(getTrackStatusLabel('active'), 'Active');
  assert.equal(getTrackStatusLabel('completed'), 'Completed');
  assert.equal(getTrackStatusLabel('locked'), 'Locked');

  assert.equal(formatModuleCountLabel(4, 6), '4/6 modules');
  assert.equal(formatModuleCountLabel(9, 6), '6/6 modules');
});
