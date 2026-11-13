import type { LanguageId } from '../types/curriculum';

export interface LanguageShowcaseSnippet {
  language: LanguageId;
  filename: string;
  headline: string;
  code: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface RepoModule {
  id: string;
  label: string;
  path: string;
  testFile: string;
  summary: string;
  snippet: string;
}

export const REPO_URL = 'https://github.com/JOYBOYash/recurry';
export const REPO_CLONE_COMMAND = `git clone ${REPO_URL}.git`;

export const LANGUAGE_SHOWCASES: Record<LanguageId, LanguageShowcaseSnippet> = {
  sql: {
    language: 'sql',
    filename: 'array_sum.sql',
    headline: 'Filter & sum array elements',
    code: `WITH numbers AS (
  SELECT UNNEST(ARRAY[4, -2, 9, 5, 12]) AS val
)
SELECT
  ARRAY_AGG(val) AS positives,
  SUM(val) AS total
FROM numbers
WHERE val > 0;`,
  },
  java: {
    language: 'java',
    filename: 'ArraySum.java',
    headline: 'Sum positive array values',
    code: `public class ArraySum {
  public static void main(String[] args) {
    int[] nums = {4, -2, 9, 5, 12};
    int total = 0;

    for (int n : nums) {
      if (n > 0) total += n;
    }
    System.out.println(total);
  }
}`,
  },
  cpp: {
    language: 'cpp',
    filename: 'array_sum.cpp',
    headline: 'Sum positive array values',
    code: `#include <array>
#include <iostream>

int main() {
  std::array<int, 5> nums = {4, -2, 9, 5, 12};
  int total = 0;

  for (int n : nums) {
    if (n > 0) total += n;
  }
  std::cout << total << '\\n';
}`,
  },
  python: {
    language: 'python',
    filename: 'array_sum.py',
    headline: 'Sum positive list elements',
    code: `nums = [4, -2, 9, 5, 12]
positives = [n for n in nums if n > 0]
total = sum(positives)

print(positives)
print(total)`,
  },
  javascript: {
    language: 'javascript',
    filename: 'arraySum.js',
    headline: 'Filter and sum array items',
    code: `const nums = [4, -2, 9, 5, 12];
const positives = nums.filter((n) => n > 0);
const total = positives.reduce((acc, n) => acc + n, 0);

console.log(positives, total);`,
  },
  ruby: {
    language: 'ruby',
    filename: 'array_sum.rb',
    headline: 'Filter and sum array elements',
    code: `def sum_positives(nums)
  positives = nums.select { |n| n > 0 }
  positives.sum
end

nums = [4, -2, 9, 5, 12]
puts sum_positives(nums)`,
  },
};

export function getLanguageShowcase(language: LanguageId): LanguageShowcaseSnippet {
  return LANGUAGE_SHOWCASES[language];
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'quota',
    question: 'Why is curriculum generation limited to 1 per day?',
    answer:
      'Every account gets 1 free AI-tailored curriculum per calendar day with zero subscriptions or paywalls. You can open, review, or redo all of your saved tracks anytime.',
  },
  {
    id: 'apikey',
    question: 'Do I need to supply my own Gemini API key?',
    answer:
      'No. All curriculum generation and code evaluation runs securely through recurry server endpoints so you can start learning right after signing in.',
  },
  {
    id: 'languages',
    question: 'Which languages and levels are supported?',
    answer:
      'recurry supports SQL, Java, C++, Python, JavaScript, and Ruby—adapted across five ranks from Noob and Intern up to Expert, Master, and Legend.',
  },
  {
    id: 'certificates',
    question: 'How are 1–5 star certificates graded?',
    answer:
      'Finish every module in a curriculum track to unlock a certificate. Your 1 to 5 star rating reflects your average challenge accuracy across the completed modules.',
  },
  {
    id: 'streaks',
    question: 'How do the daily goal ring and streak counter work?',
    answer:
      'Pick a daily pace of 1 to 5 modules per day. Completing modules fills your navigation progress ring for the day and extends your consecutive active-day streak.',
  },
  {
    id: 'redo',
    question: 'Can I redo completed curriculums to improve my star rating?',
    answer:
      'Yes. Reopen any saved track from My Curriculums to reset and retake its modules. Improving your challenge accuracy updates your best score so you can earn a higher star certificate.',
  },
  {
    id: 'reference',
    question: 'What is the Syntax Reference tab?',
    answer:
      'Syntax Reference lets you generate and search side-by-side code comparisons for any programming concept across SQL, Java, C++, Python, JavaScript, and Ruby.',
  },
  {
    id: 'ranks',
    question: 'How do skill ranks change my generated lessons?',
    answer:
      'Selecting Noob through Legend calibrates grammar depth, code complexity, challenge difficulty, and hints to match your current fluency.',
  },
];

export const REPO_MODULES: RepoModule[] = [
  {
    id: 'logic',
    label: 'curriculumLogic.ts',
    path: 'src/utils/curriculumLogic.ts',
    testFile: 'src/utils/curriculumLogic.test.ts',
    summary:
      'Computes consecutive learning streaks, daily goal ring fill percentages, 1/day quota state, and 1–5 star accuracy rankings.',
    snippet: `export function computeStarRating(accuracyPercent: number): 1 | 2 | 3 | 4 | 5 {
  if (accuracyPercent >= 95) return 5;
  if (accuracyPercent >= 85) return 4;
  if (accuracyPercent >= 70) return 3;
  if (accuracyPercent >= 50) return 2;
  return 1;
}`,
  },
  {
    id: 'syntax',
    label: 'syntaxHighlight.ts',
    path: 'src/utils/syntaxHighlight.ts',
    testFile: 'src/utils/syntaxHighlight.test.ts',
    summary:
      'Zero-dependency single-pass lexer tokenizing SQL, Java, C++20, Python, JavaScript, and Ruby with zero font ligature interference.',
    snippet: `export function tokenizeCode(code: string, language: LanguageId): SyntaxToken[][] {
  return code.split('\\n').map((line) => tokenizeLine(line, language));
}`,
  },
  {
    id: 'onboarding',
    label: 'onboardingSteps.ts',
    path: 'src/utils/onboardingSteps.ts',
    testFile: 'src/utils/onboardingSteps.test.ts',
    summary:
      'Pure state-machine transitions, handle validation, and progress step mapping powering the 8-screen URL-routed onboarding flow.',
    snippet: `export const ONBOARDING_STEPS = [
  'username', 'language', 'welcome', 'level',
  'focus', 'blueprint', 'goal', 'ready',
] as const;`,
  },
  {
    id: 'rules',
    label: 'firestore.rules',
    path: 'firestore.rules',
    testFile: 'firestore.rules.test.ts',
    summary:
      'Owner-scoped security rules enforcing Firebase Auth UID matching across user profiles, generated curriculums, and certificates.',
    snippet: `match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}`,
  },
];
