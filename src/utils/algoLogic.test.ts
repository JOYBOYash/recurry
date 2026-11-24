import assert from 'node:assert/strict';
import test from 'node:test';
import type { AlgoProblemBlueprint } from '../types/algo';
import {
  appendStepSnippetToCode,
  buildAugmentedStepCode,
  buildFinalOutputCode,
  buildInitialStepCode,
  buildProblemIdFromFingerprint,
  computeAlgoChecklistProgress,
  computeProblemFingerprint,
  extractCodeEvaluationResult,
  filterAlgoProblems,
  getLanguageCommentPrefix,
  mergeAlgoProblemLibraries,
  normalizeProblemText,
  validateAlgoTextInput,
  validateAlgoUploadedFile,
} from './algoLogic';

test('normalizeProblemText and computeProblemFingerprint deduplicate equivalent problem prompts', () => {
  const a = normalizeProblemText('  Write a program to ADD two numbers!\n\n');
  const b = normalizeProblemText('write a program to add two numbers!');
  assert.equal(a, b);

  const fp1 = computeProblemFingerprint(
    'Write a program to add two numbers',
    'foundations_io',
  );
  const fp2 = computeProblemFingerprint(
    '  WRITE a program   to add two numbers  ',
    'foundations_io',
  );
  const fpDifferentConcept = computeProblemFingerprint(
    'Write a program to add two numbers',
    'functions_scope',
  );

  assert.equal(fp1, fp2);
  assert.equal(fp1.length, 16);
  assert.notEqual(fp1, fpDifferentConcept);
  assert.match(buildProblemIdFromFingerprint(fp1), /^algo-[a-f0-9]{16}$/);
});

test('validateAlgoTextInput and validateAlgoUploadedFile enforce bounds and allowlisted MIME types', () => {
  assert.equal(validateAlgoTextInput('short').valid, false);
  assert.equal(validateAlgoTextInput('Write a program to add two integers').valid, true);
  assert.equal(validateAlgoTextInput('a'.repeat(4001)).valid, false);

  assert.deepEqual(
    validateAlgoUploadedFile({ name: 'problem.png', type: 'image/png', size: 120_000 }),
    { valid: true, kind: 'image' },
  );
  assert.deepEqual(
    validateAlgoUploadedFile({ name: 'prompt.md', type: 'text/markdown', size: 1024 }),
    { valid: true, kind: 'text' },
  );
  assert.equal(
    validateAlgoUploadedFile({ name: 'huge.png', type: 'image/png', size: 5 * 1024 * 1024 }).valid,
    false,
  );
  assert.equal(
    validateAlgoUploadedFile({ name: 'script.exe', type: 'application/octet-stream', size: 100 }).valid,
    false,
  );
});

test('computeAlgoChecklistProgress ignores stale IDs and reports accurate percentages', () => {
  const summary = computeAlgoChecklistProgress(
    ['s1', 's2', 's3', 's4'],
    ['s1', 's3', 'stale-step', 's1'],
  );
  assert.deepEqual(summary, {
    completedCount: 2,
    totalCount: 4,
    percent: 50,
    isComplete: false,
  });

  const complete = computeAlgoChecklistProgress(['s1', 's2'], ['s1', 's2']);
  assert.equal(complete.isComplete, true);
  assert.equal(complete.percent, 100);
});

test('filterAlgoProblems and mergeAlgoProblemLibraries filter by concept/query and merge cached languages', () => {
  const p1: AlgoProblemBlueprint = {
    id: 'algo-1111111111111111',
    fingerprint: '1111111111111111',
    title: 'Add Two Numbers',
    problemSummary: 'Read two integers and output their sum.',
    canonicalPrompt: 'Write a program to read two numbers and return their sum.',
    conceptCategory: 'foundations_io',
    difficulty: 'foundation',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    edgeCases: ['Negative numbers'],
    steps: [],
    availableLanguages: ['python'],
    createdByUid: 'system',
    createdAt: '2026-11-20T00:00:00.000Z',
  };
  const p1Updated: AlgoProblemBlueprint = {
    ...p1,
    availableLanguages: ['cpp'],
  };
  const p2: AlgoProblemBlueprint = {
    ...p1,
    id: 'algo-2222222222222222',
    fingerprint: '2222222222222222',
    title: 'Two Sum',
    problemSummary: 'Find indices of two array numbers adding up to target.',
    canonicalPrompt: 'Given an array of integers and a target, return indices.',
    conceptCategory: 'hash_maps',
    availableLanguages: ['javascript'],
    createdAt: '2026-11-21T00:00:00.000Z',
  };

  const merged = mergeAlgoProblemLibraries([p1Updated, p2], [p1]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'algo-2222222222222222');
  const mergedAdd = merged.find((p) => p.id === p1.id);
  assert.ok(mergedAdd);
  assert.deepEqual(mergedAdd.availableLanguages.sort(), ['cpp', 'python']);

  assert.equal(filterAlgoProblems(merged, 'sum', 'all').length, 2);
  assert.equal(filterAlgoProblems(merged, 'sum', 'hash_maps').length, 1);
  assert.equal(filterAlgoProblems(merged, 'palindrome', 'all').length, 0);
});

test('Algo Mode progressive coding helpers preserve previous code and format markers per language', () => {
  assert.equal(getLanguageCommentPrefix('python'), '#');
  assert.equal(getLanguageCommentPrefix('ruby'), '#');
  assert.equal(getLanguageCommentPrefix('sql'), '--');
  assert.equal(getLanguageCommentPrefix('javascript'), '//');
  assert.equal(getLanguageCommentPrefix('cpp'), '//');
  assert.equal(getLanguageCommentPrefix('java'), '//');

  const step1 = buildInitialStepCode('Read two numbers', 'python');
  assert.equal(step1, '# Read two numbers\n');

  const afterStep1 = `${step1}a = int(input())\nb = int(input())`;
  const step2 = buildAugmentedStepCode(afterStep1, 'Compute sum', 'python');
  assert.equal(step2, '# Read two numbers\na = int(input())\nb = int(input())\n\n# Compute sum\n');

  // Calling buildAugmentedStepCode again with the same marker is idempotent
  assert.equal(buildAugmentedStepCode(step2, 'Compute sum', 'python'), step2);

  const withSnippet = appendStepSnippetToCode(step2, 'total = a + b');
  assert.equal(
    withSnippet,
    '# Read two numbers\na = int(input())\nb = int(input())\n\n# Compute sum\ntotal = a + b\n',
  );
  // Inserting the same snippet twice does not duplicate it
  assert.equal(appendStepSnippetToCode(withSnippet, 'total = a + b'), withSnippet);

  assert.equal(
    buildFinalOutputCode(withSnippet, ['fallback()']),
    withSnippet.trim(),
  );
  assert.equal(
    buildFinalOutputCode('   ', ['a = 1', 'b = 2']),
    'a = 1\n\nb = 2',
  );
});

test('extractCodeEvaluationResult unwraps /api/code/evaluate responses and defaults syntaxIssues safely', () => {
  const wrapped = extractCodeEvaluationResult({
    evaluation: {
      passed: true,
      verdictLabel: 'Verified',
      feedback: 'Good variable names and parsing.',
      syntaxIssues: ['Minor style tip'],
      strengths: ['Clean input handling'],
      improvedSnippet: 'a = int(input())',
    },
  });
  assert.deepEqual(wrapped, {
    passed: true,
    verdictLabel: 'Verified',
    feedback: 'Good variable names and parsing.',
    syntaxIssues: ['Minor style tip'],
    strengths: ['Clean input handling'],
    improvedSnippet: 'a = int(input())',
  });

  const missingIssues = extractCodeEvaluationResult({
    evaluation: {
      passed: false,
      feedback: 'Missing return statement.',
    },
  });
  assert.deepEqual(missingIssues, {
    passed: false,
    verdictLabel: 'Needs Revision',
    feedback: 'Missing return statement.',
    syntaxIssues: [],
    strengths: [],
    improvedSnippet: '',
  });

  assert.equal(extractCodeEvaluationResult({}), null);
  assert.equal(extractCodeEvaluationResult(null), null);
});
