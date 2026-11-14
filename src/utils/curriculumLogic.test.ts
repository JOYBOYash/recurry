import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTrackProgress,
  canGenerateCurriculumToday,
  checkBalancedDelimiters,
  computeAttemptAccuracy,
  computeCertificateStars,
  computeCurrentStreak,
  computeDailyGoalProgress,
  computeLearningStats,
  computeTrackAccuracyAndStars,
  filterReferenceEntries,
  shouldTriggerTrackCelebration,
  validatePersonalizationInput,
  validateReferenceTopicInput,
} from './curriculumLogic';
import type { CurriculumTrack, ReferenceEntry } from '../types/curriculum';

const SAMPLE_TRACK: CurriculumTrack = {
  id: 'track-py-1',
  language: 'python',
  title: 'Python Essentials',
  subtitle: 'Foundational syntax',
  skillLevel: 'intern',
  learningFocus: 'syntax',
  paceDepth: 'essentials',
  priorBackground: '',
  bridgingStrategy: '',
  createdAt: '2026-11-13T00:00:00Z',
  modules: [
    {
      id: 'mod-1',
      order: 1,
      title: 'Variables & Types',
      estimatedMinutes: 15,
      summary: 'Learn bindings',
      syntaxGrammar: 'name = value',
      syntaxTopics: ['int', 'str'],
      examples: [],
      commonPitfalls: [],
      challenge: {
        title: 'Assign name',
        prompt: 'Assign string',
        starterCode: '',
        expectedConcepts: ['str'],
        hint: 'Use quotes',
        sampleSolution: 'name = "Ada"',
      },
    },
    {
      id: 'mod-2',
      order: 2,
      title: 'Loops & Comprehensions',
      estimatedMinutes: 20,
      summary: 'Iterate collections',
      syntaxGrammar: '[x for x in items]',
      syntaxTopics: ['for', 'list comprehension'],
      examples: [],
      commonPitfalls: [],
      challenge: {
        title: 'Filter list',
        prompt: 'Double numbers',
        starterCode: '',
        expectedConcepts: ['for'],
        hint: 'Use for',
        sampleSolution: '[x * 2 for x in nums]',
      },
    },
  ],
};

const SAMPLE_REFS: ReferenceEntry[] = [
  {
    id: 'ref-1',
    category: 'Collections & Iteration',
    concept: 'List / Array Filtering',
    description: 'Filter elements by predicate',
    createdAt: '2026-11-13T00:00:00Z',
    snippets: {
      sql: { syntax: 'SELECT * FROM items WHERE active = TRUE;', usage: 'Filter rows' },
      python: { syntax: '[x for x in items if x > 0]', usage: 'List comprehension' },
      javascript: { syntax: 'items.filter(x => x > 0)', usage: 'Array filter' },
    },
  },
];

test('calculateTrackProgress computes completion percentage and next module', () => {
  const empty = calculateTrackProgress(SAMPLE_TRACK, []);
  assert.equal(empty.completedCount, 0);
  assert.equal(empty.totalCount, 2);
  assert.equal(empty.percentage, 0);
  assert.equal(empty.nextModuleId, 'mod-1');

  const partial = calculateTrackProgress(SAMPLE_TRACK, ['mod-1']);
  assert.equal(partial.completedCount, 1);
  assert.equal(partial.percentage, 50);
  assert.equal(partial.nextModuleId, 'mod-2');

  const done = calculateTrackProgress(SAMPLE_TRACK, ['mod-1', 'mod-2']);
  assert.equal(done.percentage, 100);
});

test('computeLearningStats aggregates real completed modules, minutes, and current streak', () => {
  const refDate = new Date(2026, 10, 13, 12, 0, 0);
  const stats = computeLearningStats(
    [SAMPLE_TRACK],
    ['mod-1', 'mod-2'],
    {
      'mod-1': '2026-11-12',
      'mod-2': '2026-11-13',
    },
    refDate,
  );
  assert.equal(stats.totalTracks, 1);
  assert.equal(stats.totalModules, 2);
  assert.equal(stats.completedModules, 2);
  assert.equal(stats.completedMinutes, 35);
  assert.equal(stats.currentStreak, 2);
});

test('computeCurrentStreak counts consecutive days and handles yesterday/gaps', () => {
  const refDate = new Date(2026, 10, 13, 12, 0, 0);

  assert.equal(computeCurrentStreak([], refDate), 0);
  assert.equal(
    computeCurrentStreak(
      ['2026-11-13', '2026-11-13', '2026-11-12', '2026-11-11'],
      refDate,
    ),
    3,
  );
  assert.equal(
    computeCurrentStreak(['2026-11-12', '2026-11-11'], refDate),
    2,
  );
  assert.equal(
    computeCurrentStreak(['2026-11-13', '2026-11-10'], refDate),
    1,
  );
  assert.equal(computeCurrentStreak(['2026-11-10'], refDate), 0);
});

test('computeDailyGoalProgress calculates today progress ring percentage and remaining modules', () => {
  const refDate = new Date(2026, 10, 13, 14, 0, 0);
  const partial = computeDailyGoalProgress(
    {
      'mod-1': '2026-11-12',
      'mod-2': '2026-11-13',
    },
    3,
    refDate,
  );
  assert.equal(partial.completedToday, 1);
  assert.equal(partial.dailyGoal, 3);
  assert.equal(partial.percentage, 33);
  assert.equal(partial.remaining, 2);
  assert.equal(partial.isGoalMet, false);

  const met = computeDailyGoalProgress(
    {
      'mod-1': '2026-11-13',
      'mod-2': '2026-11-13',
      'mod-3': '2026-11-13',
    },
    2,
    refDate,
  );
  assert.equal(met.completedToday, 3);
  assert.equal(met.percentage, 100);
  assert.equal(met.remaining, 0);
  assert.equal(met.isGoalMet, true);
});

test('computeAttemptAccuracy, computeCertificateStars, and computeTrackAccuracyAndStars score 1-5 stars accurately', () => {
  assert.equal(computeAttemptAccuracy(1, true), 100);
  assert.equal(computeAttemptAccuracy(2, true), 85);
  assert.equal(computeAttemptAccuracy(3, true), 70);
  assert.equal(computeAttemptAccuracy(2, false), 0);

  assert.equal(computeCertificateStars(95), 5);
  assert.equal(computeCertificateStars(80), 4);
  assert.equal(computeCertificateStars(65), 3);
  assert.equal(computeCertificateStars(45), 2);
  assert.equal(computeCertificateStars(20), 1);

  const summary = computeTrackAccuracyAndStars(
    SAMPLE_TRACK,
    {
      'mod-1': { attempts: 1, passed: true, bestAccuracy: 100 },
      'mod-2': { attempts: 2, passed: true, bestAccuracy: 85 },
    },
    ['mod-1', 'mod-2'],
  );
  assert.equal(summary.accuracyPercent, 93);
  assert.equal(summary.stars, 5);
  assert.equal(summary.evaluatedCount, 2);
});

test('canGenerateCurriculumToday enforces 1 curriculum per calendar day', () => {
  const refDate = new Date(2026, 10, 13, 12, 0, 0);
  const fresh = canGenerateCurriculumToday('', 0, refDate);
  assert.equal(fresh.allowed, true);
  assert.equal(fresh.remainingToday, 1);

  const yesterday = canGenerateCurriculumToday('2026-11-12', 1, refDate);
  assert.equal(yesterday.allowed, true);
  assert.equal(yesterday.remainingToday, 1);

  const used = canGenerateCurriculumToday('2026-11-13', 1, refDate);
  assert.equal(used.allowed, false);
  assert.equal(used.remainingToday, 0);
});

test('filterReferenceEntries filters by query, category, and available language', () => {
  const matched = filterReferenceEntries(SAMPLE_REFS, 'comprehension', 'All', ['python']);
  assert.equal(matched.length, 1);

  const missingLanguage = filterReferenceEntries(SAMPLE_REFS, '', 'All', ['cpp']);
  assert.equal(missingLanguage.length, 0);

  const mismatchedCategory = filterReferenceEntries(
    SAMPLE_REFS,
    'comprehension',
    'Errors & Safety',
    ['python'],
  );
  assert.equal(mismatchedCategory.length, 0);
});

test('validatePersonalizationInput validates language and text lengths', () => {
  const valid = validatePersonalizationInput({
    language: 'cpp',
    skillLevel: 'expert',
    learningFocus: 'problem_solving',
    paceDepth: 'comprehensive',
    priorBackground: 'Python and JavaScript',
    focusNotes: 'Focus on smart pointers',
  });
  assert.equal(valid.valid, true);
});

test('validateReferenceTopicInput validates topic length and languages', () => {
  const emptyTopic = validateReferenceTopicInput({
    topic: ' ',
    category: 'Control Flow',
    languages: ['sql'],
  });
  assert.equal(emptyTopic.valid, false);

  const validTopic = validateReferenceTopicInput({
    topic: 'Window Functions',
    category: 'Queries & Concurrency',
    languages: ['sql', 'python'],
  });
  assert.equal(validTopic.valid, true);
});

test('checkBalancedDelimiters detects unclosed braces and quotes', () => {
  assert.deepEqual(checkBalancedDelimiters('if (a > 0) { return "ok"; }'), []);
  const broken = checkBalancedDelimiters('if (a > 0 { return "ok; }');
  assert.ok(broken.length > 0);
});

test('shouldTriggerTrackCelebration fires only on false -> true completion within the same track', () => {
  // Initial mount already complete: do not fire
  assert.equal(
    shouldTriggerTrackCelebration(null, { trackId: 't1', isComplete: true }),
    false,
  );
  // Initial mount incomplete: do not fire
  assert.equal(
    shouldTriggerTrackCelebration(null, { trackId: 't1', isComplete: false }),
    false,
  );
  // Progressing from incomplete to still incomplete: do not fire
  assert.equal(
    shouldTriggerTrackCelebration(
      { trackId: 't1', isComplete: false },
      { trackId: 't1', isComplete: false },
    ),
    false,
  );
  // Completing the final module on the same track: fire!
  assert.equal(
    shouldTriggerTrackCelebration(
      { trackId: 't1', isComplete: false },
      { trackId: 't1', isComplete: true },
    ),
    true,
  );
  // Remaining complete on subsequent renders: do not fire again
  assert.equal(
    shouldTriggerTrackCelebration(
      { trackId: 't1', isComplete: true },
      { trackId: 't1', isComplete: true },
    ),
    false,
  );
  // Switching to a different already-completed track: do not fire
  assert.equal(
    shouldTriggerTrackCelebration(
      { trackId: 't1', isComplete: false },
      { trackId: 't2', isComplete: true },
    ),
    false,
  );
  // Redo track resets to incomplete (do not fire), then completing again fires
  assert.equal(
    shouldTriggerTrackCelebration(
      { trackId: 't1', isComplete: true },
      { trackId: 't1', isComplete: false },
    ),
    false,
  );
  assert.equal(
    shouldTriggerTrackCelebration(
      { trackId: 't1', isComplete: false },
      { trackId: 't1', isComplete: true },
    ),
    true,
  );
});
