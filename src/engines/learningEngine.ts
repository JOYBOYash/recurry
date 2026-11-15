import type {
  CurriculumModule,
  LanguageId,
  RecallDifficulty,
  RecallExercise,
} from '../types/curriculum';

export interface RecallGradingResult {
  correct: boolean;
  expectedAnswer: string;
  feedback: string;
}

export interface LessonMasteryState {
  totalDrills: number;
  passedDrillsCount: number;
  allDrillsPassed: boolean;
  recallScorePercent: number;
  challengePassed: boolean;
  recommendedStep: 'concept' | 'recall' | 'challenge' | 'complete';
  xpEarned: number;
}

const DIFFICULTY_RANK: Record<RecallDifficulty, number> = {
  foundation: 1,
  applied: 2,
  mastery: 3,
};

function normalizeAnswerToken(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getModuleRecallDrills(
  mod: CurriculumModule,
  language?: LanguageId,
): RecallExercise[] {
  if (Array.isArray(mod.recallDrills) && mod.recallDrills.length > 0) {
    return [...mod.recallDrills].sort(
      (a, b) =>
        (DIFFICULTY_RANK[a.difficulty] ?? 2) - (DIFFICULTY_RANK[b.difficulty] ?? 2),
    );
  }

  // Deterministic Duolingo-style active recall synthesis for legacy saved tracks
  const drills: RecallExercise[] = [];
  const primaryTopic = mod.syntaxTopics[0] ?? mod.title;
  const grammarForm = mod.syntaxGrammar.trim() || mod.title;
  const firstExample = mod.examples[0];
  const secondTopic = mod.syntaxTopics[1] ?? mod.challenge.expectedConcepts[0] ?? 'syntax form';

  // Drill 1: Foundation active recall on core syntax form
  const distractorLang = language === 'sql' ? 'SELECT * FROM table' : 'var x = null';
  drills.push({
    id: `${mod.id}-drill-1`,
    type: 'multiple_choice',
    difficulty: 'foundation',
    prompt: `Which grammar pattern belongs to "${mod.title}"?`,
    options: [
      grammarForm,
      `${distractorLang} /* unrelated template */`,
      `# deprecated macro for ${primaryTopic}`,
    ],
    answer: grammarForm,
    explanation: `${mod.title} uses \`${grammarForm}\` to express ${primaryTopic}.`,
    conceptTag: primaryTopic,
  });

  // Drill 2: Applied recall from example or expected concept
  if (firstExample && firstExample.code.trim()) {
    const codeLines = firstExample.code.trim().split('\n');
    const targetLine = codeLines.find((l) => l.trim().length > 3) ?? codeLines[0];
    drills.push({
      id: `${mod.id}-drill-2`,
      type: 'predict_output',
      difficulty: 'applied',
      prompt: `What is the primary purpose of this ${firstExample.title} snippet?`,
      codeSnippet: targetLine,
      options: [
        firstExample.explanation,
        `Bypasses ${secondTopic} type checks completely`,
        'Declares an unused global constant only',
      ],
      answer: firstExample.explanation,
      explanation: `${firstExample.explanation} ${firstExample.usageNote}`,
      conceptTag: secondTopic,
    });
  } else {
    const expectedConcept = mod.challenge.expectedConcepts[0] ?? primaryTopic;
    drills.push({
      id: `${mod.id}-drill-2`,
      type: 'fill_blank',
      difficulty: 'applied',
      prompt: `Type the key concept required for the "${mod.challenge.title}" challenge:`,
      codeSnippet: `// Challenge hint: ${mod.challenge.hint}`,
      answer: expectedConcept,
      explanation: `This module emphasizes \`${expectedConcept}\`.`,
      conceptTag: expectedConcept,
    });
  }

  // Drill 3: Mastery pitfall check if available
  if (mod.commonPitfalls.length > 0) {
    const pitfall = mod.commonPitfalls[0];
    drills.push({
      id: `${mod.id}-drill-3`,
      type: 'bug_fix',
      difficulty: 'mastery',
      prompt: `Which pitfall should you actively avoid when writing ${mod.title}?`,
      options: [
        pitfall,
        'Using descriptive variable names for readability',
        'Writing small, focused helper blocks',
      ],
      answer: pitfall,
      explanation: `Watch out: ${pitfall}`,
      conceptTag: 'Edge Cases',
    });
  }

  return drills;
}

export function gradeRecallResponse(
  drill: RecallExercise,
  userAnswer: string,
): RecallGradingResult {
  const expected = drill.answer.trim();
  const submitted = userAnswer.trim();

  if (!submitted) {
    return {
      correct: false,
      expectedAnswer: expected,
      feedback: 'Select or enter an answer to check recall.',
    };
  }

  const isCorrect =
    drill.type === 'fill_blank'
      ? normalizeAnswerToken(submitted) === normalizeAnswerToken(expected)
      : submitted === expected ||
        normalizeAnswerToken(submitted) === normalizeAnswerToken(expected);

  return {
    correct: isCorrect,
    expectedAnswer: expected,
    feedback: isCorrect
      ? `Correct! ${drill.explanation}`
      : `Not quite — expected "${expected}". ${drill.explanation}`,
  };
}

export function evaluateLessonMastery(params: {
  drills: RecallExercise[];
  passedDrillIds: string[];
  attempts: number;
  challengePassed: boolean;
  moduleXpReward?: number;
}): LessonMasteryState {
  const totalDrills = params.drills.length;
  const passedSet = new Set(params.passedDrillIds);
  const passedDrillsCount = params.drills.filter((d) => passedSet.has(d.id)).length;
  const allDrillsPassed = totalDrills === 0 || passedDrillsCount === totalDrills;

  const recallScorePercent =
    totalDrills === 0
      ? 100
      : Math.min(
          100,
          Math.round(
            (passedDrillsCount / Math.max(totalDrills, params.attempts || passedDrillsCount)) *
              100,
          ),
        );

  let recommendedStep: LessonMasteryState['recommendedStep'] = 'concept';
  if (allDrillsPassed && params.challengePassed) {
    recommendedStep = 'complete';
  } else if (allDrillsPassed) {
    recommendedStep = 'challenge';
  } else if (passedDrillsCount > 0) {
    recommendedStep = 'recall';
  }

  const baseXp = Math.max(15, params.moduleXpReward ?? 30);
  const drillXp = passedDrillsCount * 5;
  const challengeXp = params.challengePassed ? baseXp : 0;

  return {
    totalDrills,
    passedDrillsCount,
    allDrillsPassed,
    recallScorePercent,
    challengePassed: params.challengePassed,
    recommendedStep,
    xpEarned: drillXp + challengeXp,
  };
}
