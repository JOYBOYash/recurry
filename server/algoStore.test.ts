import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import type { AlgoLanguageAdapter, AlgoProblemBlueprint } from '../src/types/algo';
import {
  findAlgoProblemByFingerprint,
  getAlgoProblemWithAdapter,
  listAlgoProblems,
  resetAlgoStoreMemoryForTests,
  saveAlgoBlueprintAndAdapter,
  saveAlgoLanguageAdapter,
} from './algoStore';

test('algoStore seeds starter problems and caches new language adapters without duplicating logic', async () => {
  const storePath = `/tmp/recurry-algo-test-${Date.now()}.json`;
  process.env.ALGO_STORE_PATH = storePath;
  resetAlgoStoreMemoryForTests();

  try {
    const initial = await listAlgoProblems(20);
    assert.ok(initial.length >= 3);
    const addProblem = initial.find((p) => p.title === 'Add Two Numbers');
    assert.ok(addProblem);
    assert.ok(addProblem.availableLanguages.includes('python'));

    const fetchedPython = await getAlgoProblemWithAdapter(addProblem.id, 'python');
    assert.ok(fetchedPython.blueprint);
    assert.ok(fetchedPython.adapter);
    assert.equal(fetchedPython.adapter.language, 'python');

    const fetchedCppBefore = await getAlgoProblemWithAdapter(addProblem.id, 'cpp');
    assert.equal(fetchedCppBefore.adapter, null);

    const cppAdapter: AlgoLanguageAdapter = {
      problemId: addProblem.id,
      language: 'cpp',
      setupNote: 'Include <iostream> for std::cin and std::cout.',
      stepHints: addProblem.steps.map((s) => ({
        stepId: s.id,
        syntaxCue: `C++ syntax cue for ${s.title}`,
        idiomNote: 'Use int or double depending on constraints.',
        stepSnippet: 'int sum = a + b;',
      })),
      createdAt: new Date().toISOString(),
    };
    await saveAlgoLanguageAdapter(cppAdapter);

    const fetchedCppAfter = await getAlgoProblemWithAdapter(addProblem.id, 'cpp');
    assert.ok(fetchedCppAfter.adapter);
    assert.equal(fetchedCppAfter.adapter.language, 'cpp');
    assert.ok(fetchedCppAfter.cachedLanguages.includes('cpp'));

    const customBp: AlgoProblemBlueprint = {
      id: 'algo-abcdef1234567890',
      fingerprint: 'abcdef1234567890',
      title: 'Reverse Array In-Place',
      problemSummary: 'Swap symmetric elements from both ends.',
      canonicalPrompt: 'Reverse an array of integers in-place without extra memory.',
      conceptCategory: 'two_pointers',
      difficulty: 'foundation',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      edgeCases: ['Empty array', 'Single element'],
      steps: [
        {
          id: 'step-1',
          title: 'Set pointers',
          goal: 'Point left to 0 and right to n-1.',
          logicCue: 'left = 0, right = n - 1',
          checkCriteria: 'Both pointers start at ends.',
          pitfall: 'Off-by-one right pointer.',
        },
      ],
      availableLanguages: ['java'],
      createdByUid: 'user-1',
      createdAt: new Date().toISOString(),
    };
    await saveAlgoBlueprintAndAdapter(customBp);

    const foundByFp = await findAlgoProblemByFingerprint('abcdef1234567890');
    assert.ok(foundByFp);
    assert.equal(foundByFp.title, 'Reverse Array In-Place');
  } finally {
    await fs.rm(storePath, { force: true });
    delete process.env.ALGO_STORE_PATH;
    resetAlgoStoreMemoryForTests();
  }
});
