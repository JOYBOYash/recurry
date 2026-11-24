import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AlgoLanguageAdapter,
  AlgoProblemBlueprint,
} from '../src/types/algo.ts';
import type { LanguageId } from '../src/types/curriculum.ts';
import {
  buildProblemIdFromFingerprint,
  computeProblemFingerprint,
} from '../src/utils/algoLogic.ts';

interface AlgoLibraryStoreData {
  problems: Record<string, AlgoProblemBlueprint>;
  adapters: Record<string, Partial<Record<LanguageId, AlgoLanguageAdapter>>>;
}

function buildStarterStore(): AlgoLibraryStoreData {
  const addPrompt =
    'Write a program that reads two numbers from user input, adds them using a dedicated function, and prints the final sum.';
  const addFp = computeProblemFingerprint(addPrompt, 'foundations_io');
  const addId = buildProblemIdFromFingerprint(addFp);

  const twoSumPrompt =
    'Given an array of integers and a target value, find the indices of the two numbers that add up to the target in linear time.';
  const twoSumFp = computeProblemFingerprint(twoSumPrompt, 'hash_maps');
  const twoSumId = buildProblemIdFromFingerprint(twoSumFp);

  const palindromePrompt =
    'Determine whether a given string reads the same forward and backward after ignoring case and non-alphanumeric characters.';
  const palindromeFp = computeProblemFingerprint(palindromePrompt, 'two_pointers');
  const palindromeId = buildProblemIdFromFingerprint(palindromeFp);

  const addBlueprint: AlgoProblemBlueprint = {
    id: addId,
    fingerprint: addFp,
    title: 'Add Two Numbers',
    problemSummary:
      'Capture two numeric inputs, compute their sum in a helper function, and output the result.',
    canonicalPrompt: addPrompt,
    conceptCategory: 'foundations_io',
    difficulty: 'foundation',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    edgeCases: [
      'Negative numbers or zero inputs',
      'Decimal / floating-point values vs integers',
      'Non-numeric or empty user input',
    ],
    steps: [
      {
        id: 'step-1',
        title: 'Initialize the program entry point',
        goal: 'Set up the runnable entry structure and standard I/O imports.',
        logicCue: 'Define the main execution block where input and output happen.',
        checkCriteria: 'Your file compiles or runs cleanly with an empty main routine.',
        pitfall: 'Forgetting standard I/O imports in compiled languages before reading input.',
      },
      {
        id: 'step-2',
        title: 'Declare variables for both operands',
        goal: 'Create two clearly named numeric slots for the first and second values.',
        logicCue: 'Reserve variables `firstNumber` and `secondNumber` with an appropriate numeric type.',
        checkCriteria: 'Both inputs have explicit, descriptive variable names ready to store parsed numbers.',
        pitfall: 'Using integer types when the problem may pass decimal inputs.',
      },
      {
        id: 'step-3',
        title: 'Prompt and parse user input',
        goal: 'Read raw text from standard input and convert it safely into numbers.',
        logicCue: 'Read string tokens -> trim whitespace -> parse into numeric values.',
        checkCriteria: 'Entering "12" and "8" stores numeric 12 and 8 instead of string "12" and "8".',
        pitfall: 'Leaving inputs as strings causes concatenation ("12" + "8" = "128") instead of addition.',
      },
      {
        id: 'step-4',
        title: 'Write a dedicated addition function',
        goal: 'Isolate the sum computation in a pure function taking two parameters.',
        logicCue: 'function add(a, b) -> return a + b',
        checkCriteria: 'Calling add(a, b) returns the sum without mutating external state.',
        pitfall: 'Printing inside the helper instead of returning the computed value.',
      },
      {
        id: 'step-5',
        title: 'Return and display the final sum',
        goal: 'Invoke the helper with the parsed inputs and print the final result.',
        logicCue: 'result = add(firstNumber, secondNumber) -> output result',
        checkCriteria: 'Program outputs 20 for inputs 12 and 8, and handles negative values accurately.',
        pitfall: 'Dropping formatting or forgetting to return an exit status where required.',
      },
    ],
    availableLanguages: ['python', 'javascript'],
    createdByUid: 'starter-library',
    createdAt: '2026-11-18T00:00:00.000Z',
  };

  const addPythonAdapter: AlgoLanguageAdapter = {
    problemId: addId,
    language: 'python',
    setupNote: 'Use a `if __name__ == "__main__":` guard so your helper stays importable.',
    stepHints: [
      {
        stepId: 'step-1',
        syntaxCue: 'Create `def main() -> None:` and call it inside `if __name__ == "__main__":`.',
        idiomNote: 'Python requires no imports for built-in `input()` and `print()`.',
        stepSnippet: 'def main() -> None:\n    pass\n\nif __name__ == "__main__":\n    main()',
      },
      {
        stepId: 'step-2',
        syntaxCue: 'Bind two float variables using descriptive snake_case names.',
        idiomNote: 'Use `float` if decimals are possible, or `int` for strict integers.',
        stepSnippet: 'first_num: float = 0.0\nsecond_num: float = 0.0',
      },
      {
        stepId: 'step-3',
        syntaxCue: 'Wrap `input(...)` with `float(...)` to convert text into numbers.',
        idiomNote: '`input()` always returns `str` in Python 3.',
        stepSnippet: 'first_num = float(input("First number: "))\nsecond_num = float(input("Second number: "))',
      },
      {
        stepId: 'step-4',
        syntaxCue: 'Define `def add_numbers(a: float, b: float) -> float:` returning `a + b`.',
        idiomNote: 'Type annotations document expectations cleanly without runtime overhead.',
        stepSnippet: 'def add_numbers(a: float, b: float) -> float:\n    return a + b',
      },
      {
        stepId: 'step-5',
        syntaxCue: 'Store the return value and format it with an f-string in `print()`.',
        idiomNote: 'Use `:g` inside the f-string to strip trailing `.0` on whole numbers.',
        stepSnippet: 'total = add_numbers(first_num, second_num)\nprint(f"Sum: {total:g}")',
      },
    ],
    createdAt: '2026-11-18T00:00:00.000Z',
  };

  const addJsAdapter: AlgoLanguageAdapter = {
    problemId: addId,
    language: 'javascript',
    setupNote: 'In Node.js, use `node:readline/promises` with `async function main()` for clean input.',
    stepHints: [
      {
        stepId: 'step-1',
        syntaxCue: 'Import `createInterface` from `node:readline/promises` and wrap execution in `async function main()`.',
        idiomNote: 'Always close the readline interface inside a `finally` block.',
        stepSnippet: 'import { createInterface } from "node:readline/promises";\nimport { stdin, stdout } from "node:process";',
      },
      {
        stepId: 'step-2',
        syntaxCue: 'Declare immutable `const` bindings for both parsed numbers.',
        idiomNote: 'Prefer `const` over `let` when values are not reassigned.',
        stepSnippet: 'const firstNum = Number(rawFirst);\nconst secondNum = Number(rawSecond);',
      },
      {
        stepId: 'step-3',
        syntaxCue: 'Await `rl.question(...)` and parse via `Number(...)` with `Number.isNaN` validation.',
        idiomNote: 'Avoid unary `+` on empty strings since `+""` silently becomes `0`.',
        stepSnippet: 'const rl = createInterface({ input: stdin, output: stdout });\nconst firstNum = Number(await rl.question("First: "));\nconst secondNum = Number(await rl.question("Second: "));',
      },
      {
        stepId: 'step-4',
        syntaxCue: 'Write a pure function `function addNumbers(a, b) { return a + b; }`.',
        idiomNote: 'Keeping the function pure makes it trivial to unit-test.',
        stepSnippet: 'function addNumbers(a, b) {\n  return a + b;\n}',
      },
      {
        stepId: 'step-5',
        syntaxCue: 'Call `addNumbers(firstNum, secondNum)`, log the result, and call `rl.close()`.',
        idiomNote: 'Forgetting `rl.close()` keeps the Node.js event loop hanging.',
        stepSnippet: 'const total = addNumbers(firstNum, secondNum);\nconsole.log(`Sum: ${total}`);\nrl.close();',
      },
    ],
    createdAt: '2026-11-18T00:00:00.000Z',
  };

  const twoSumBlueprint: AlgoProblemBlueprint = {
    id: twoSumId,
    fingerprint: twoSumFp,
    title: 'Two Sum Index Lookup',
    problemSummary:
      'Use a single-pass hash map to find two distinct array indices whose values sum to target.',
    canonicalPrompt: twoSumPrompt,
    conceptCategory: 'hash_maps',
    difficulty: 'foundation',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    edgeCases: [
      'Same element cannot be reused twice (e.g., target = 6, nums = [3, 2, 4])',
      'Duplicate values in the input array (e.g., [3, 3], target = 6)',
      'Negative numbers or zero values',
    ],
    steps: [
      {
        id: 'step-1',
        title: 'Define the function signature',
        goal: 'Accept the integer list and target value, returning a pair of indices.',
        logicCue: 'function twoSum(nums, target) -> [indexA, indexB]',
        checkCriteria: 'Input types and return structure match expected pair of indices.',
        pitfall: 'Returning the array values instead of their 0-based indices.',
      },
      {
        id: 'step-2',
        title: 'Initialize a seen-values lookup map',
        goal: 'Store previously visited numbers mapped to their array index.',
        logicCue: 'Create an empty map: value -> index',
        checkCriteria: 'Lookup by value runs in O(1) average time.',
        pitfall: 'Pre-populating the entire map before checking can accidentally match an index with itself.',
      },
      {
        id: 'step-3',
        title: 'Iterate and compute each complement',
        goal: 'For every element at index `i`, compute `needed = target - nums[i]`.',
        logicCue: 'For each (i, value) in nums: complement = target - value',
        checkCriteria: 'Loop tracks both the current index and current value.',
        pitfall: 'Off-by-one loop bounds or losing track of the current index.',
      },
      {
        id: 'step-4',
        title: 'Check the map before inserting current value',
        goal: 'If `complement` is already in the map, return `[seen[complement], i]` immediately; otherwise record `seen[value] = i`.',
        logicCue: 'if complement in seen -> return [seen[complement], i]; else seen[value] = i',
        checkCriteria: 'Handles duplicate elements like [3, 3] with target 6 without reusing index 0.',
        pitfall: 'Inserting `value` into the map before checking for `complement`.',
      },
    ],
    availableLanguages: ['python'],
    createdByUid: 'starter-library',
    createdAt: '2026-11-17T00:00:00.000Z',
  };

  const twoSumPythonAdapter: AlgoLanguageAdapter = {
    problemId: twoSumId,
    language: 'python',
    setupNote: 'Use Python’s built-in `dict` and `enumerate()` for a clean single-pass lookup.',
    stepHints: [
      {
        stepId: 'step-1',
        syntaxCue: 'Declare `def two_sum(nums: list[int], target: int) -> list[int]:`.',
        idiomNote: 'Python 3.9+ supports built-in generic syntax like `list[int]`.',
        stepSnippet: 'def two_sum(nums: list[int], target: int) -> list[int]:',
      },
      {
        stepId: 'step-2',
        syntaxCue: 'Initialize an empty dictionary `seen: dict[int, int] = {}`.',
        idiomNote: 'Dictionary key lookups (`in seen`) run in O(1) average time.',
        stepSnippet: 'seen: dict[int, int] = {}',
      },
      {
        stepId: 'step-3',
        syntaxCue: 'Iterate with `for idx, value in enumerate(nums):` and compute `complement = target - value`.',
        idiomNote: '`enumerate()` avoids manual `range(len(nums))` indexing.',
        stepSnippet: 'for idx, value in enumerate(nums):\n    complement = target - value',
      },
      {
        stepId: 'step-4',
        syntaxCue: 'Check `if complement in seen:` before setting `seen[value] = idx`.',
        idiomNote: 'Return early as soon as the matching pair is found.',
        stepSnippet: 'if complement in seen:\n    return [seen[complement], idx]\nseen[value] = idx',
      },
    ],
    createdAt: '2026-11-17T00:00:00.000Z',
  };

  const palindromeBlueprint: AlgoProblemBlueprint = {
    id: palindromeId,
    fingerprint: palindromeFp,
    title: 'Valid Palindrome Check',
    problemSummary:
      'Use inward-moving left and right pointers to verify symmetry while skipping punctuation.',
    canonicalPrompt: palindromePrompt,
    conceptCategory: 'two_pointers',
    difficulty: 'foundation',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    edgeCases: [
      'Empty string or single-character string (should return true)',
      'Mixed uppercase and lowercase letters',
      'Strings containing only spaces or punctuation',
    ],
    steps: [
      {
        id: 'step-1',
        title: 'Initialize left and right pointers',
        goal: 'Place `left` at the start of the string and `right` at the last character.',
        logicCue: 'left = 0, right = length(text) - 1',
        checkCriteria: 'Pointers start at opposite ends without allocating a reversed copy.',
        pitfall: 'Setting `right = length` instead of `length - 1` causes an out-of-bounds read.',
      },
      {
        id: 'step-2',
        title: 'Skip non-alphanumeric characters',
        goal: 'Advance `left` forward and `right` backward past punctuation and spaces.',
        logicCue: 'while left < right and not isAlnum(text[left]) -> left++',
        checkCriteria: 'Both pointers stop on valid letters/digits or meet in the middle.',
        pitfall: 'Forgetting `left < right` inside the inner skip loop on punctuation-only strings.',
      },
      {
        id: 'step-3',
        title: 'Compare normalized characters',
        goal: 'Lowercase both characters and return false immediately on any mismatch.',
        logicCue: 'if lower(text[left]) != lower(text[right]) -> return false',
        checkCriteria: 'Case differences like "A" and "a" evaluate as equal.',
        pitfall: 'Mutating the original string on every iteration instead of comparing in place.',
      },
      {
        id: 'step-4',
        title: 'Move inward and return true after loop',
        goal: 'Increment `left`, decrement `right`, and return true once pointers cross.',
        logicCue: 'left++, right-- -> return true when left >= right',
        checkCriteria: 'Loop terminates cleanly for both even and odd string lengths.',
        pitfall: 'Forgetting to move both pointers after a match causes an infinite loop.',
      },
    ],
    availableLanguages: ['python'],
    createdByUid: 'starter-library',
    createdAt: '2026-11-16T00:00:00.000Z',
  };

  const palindromePythonAdapter: AlgoLanguageAdapter = {
    problemId: palindromeId,
    language: 'python',
    setupNote: 'Python strings expose `.isalnum()` and `.lower()` directly for O(1) extra-space scanning.',
    stepHints: [
      {
        stepId: 'step-1',
        syntaxCue: 'Initialize `left, right = 0, len(text) - 1`.',
        idiomNote: 'Tuple unpacking initializes both indices on one clean line.',
        stepSnippet: 'left, right = 0, len(text) - 1',
      },
      {
        stepId: 'step-2',
        syntaxCue: 'Use `while left < right and not text[left].isalnum(): left += 1` (and symmetric for `right`).',
        idiomNote: '`.isalnum()` matches letters and digits without importing `re`.',
        stepSnippet: 'while left < right and not text[left].isalnum():\n    left += 1\nwhile left < right and not text[right].isalnum():\n    right -= 1',
      },
      {
        stepId: 'step-3',
        syntaxCue: 'Compare `text[left].lower() != text[right].lower()`.',
        idiomNote: 'Return `False` immediately on the first mismatch.',
        stepSnippet: 'if text[left].lower() != text[right].lower():\n    return False',
      },
      {
        stepId: 'step-4',
        syntaxCue: 'Advance `left += 1; right -= 1` inside `while left < right:`, then `return True`.',
        idiomNote: 'Empty and single-char inputs skip the loop and return `True`.',
        stepSnippet: 'left += 1\nright -= 1\n# after loop:\nreturn True',
      },
    ],
    createdAt: '2026-11-16T00:00:00.000Z',
  };

  return {
    problems: {
      [addId]: addBlueprint,
      [twoSumId]: twoSumBlueprint,
      [palindromeId]: palindromeBlueprint,
    },
    adapters: {
      [addId]: {
        python: addPythonAdapter,
        javascript: addJsAdapter,
      },
      [twoSumId]: {
        python: twoSumPythonAdapter,
      },
      [palindromeId]: {
        python: palindromePythonAdapter,
      },
    },
  };
}

let storeQueue: Promise<void> = Promise.resolve();
let memoryStore: AlgoLibraryStoreData | null = null;
let activeStorePath: string | null = null;

function resolveInitialStorePath(): string {
  if (activeStorePath) return activeStorePath;
  const customPath = process.env.ALGO_STORE_PATH?.trim();
  if (customPath) {
    return path.resolve(customPath);
  }
  return path.resolve(process.cwd(), '.data', 'recurry-algo-library.json');
}

function getFallbackStorePath(): string {
  return path.resolve('/tmp', 'recurry-algo-library.json');
}

async function readAlgoStore(): Promise<AlgoLibraryStoreData> {
  for (const candidate of [resolveInitialStorePath(), getFallbackStorePath()]) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AlgoLibraryStoreData>;
      if (parsed && typeof parsed === 'object' && parsed.problems) {
        const merged: AlgoLibraryStoreData = {
          problems: {
            ...(memoryStore?.problems ?? {}),
            ...parsed.problems,
          },
          adapters: {
            ...(memoryStore?.adapters ?? {}),
            ...(parsed.adapters ?? {}),
          },
        };
        memoryStore = merged;
        return merged;
      }
    } catch {
      // Try fallback path or starter seed
    }
  }

  if (!memoryStore) {
    memoryStore = buildStarterStore();
  }
  return memoryStore;
}

async function writeAlgoStore(data: AlgoLibraryStoreData): Promise<void> {
  memoryStore = data;
  const candidates = Array.from(
    new Set([resolveInitialStorePath(), getFallbackStorePath()]),
  );
  for (const storePath of candidates) {
    try {
      await fs.mkdir(path.dirname(storePath), { recursive: true });
      const tempPath = `${storePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tempPath, storePath);
      activeStorePath = storePath;
      return;
    } catch (err) {
      console.warn(
        `[algoStore] Unable to persist algo store at ${storePath}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

function withAlgoStoreLock<T>(
  mutator: (data: AlgoLibraryStoreData) => Promise<T> | T,
): Promise<T> {
  const run = storeQueue.then(async () => {
    const current = await readAlgoStore();
    const result = await mutator(current);
    await writeAlgoStore(current);
    return result;
  });
  storeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function resetAlgoStoreMemoryForTests(): void {
  memoryStore = null;
  activeStorePath = null;
}

export async function listAlgoProblems(limit = 60): Promise<AlgoProblemBlueprint[]> {
  const data = await readAlgoStore();
  return Object.values(data.problems)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(100, limit)));
}

const MAX_STORED_ALGO_PROBLEMS = 250;

function pruneAlgoStoreIfNeeded(data: AlgoLibraryStoreData): void {
  const entries = Object.values(data.problems);
  if (entries.length <= MAX_STORED_ALGO_PROBLEMS) return;
  const removable = entries
    .filter((p) => p.createdByUid !== 'starter-library')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let excess = entries.length - MAX_STORED_ALGO_PROBLEMS;
  for (const item of removable) {
    if (excess <= 0) break;
    delete data.problems[item.id];
    delete data.adapters[item.id];
    excess -= 1;
  }
}

export async function findAlgoProblemByFingerprint(
  fingerprint: string,
): Promise<AlgoProblemBlueprint | null> {
  const data = await readAlgoStore();
  const id = buildProblemIdFromFingerprint(fingerprint);
  if (Object.hasOwn(data.problems, id)) {
    return data.problems[id];
  }
  return (
    Object.values(data.problems).find((p) => p.fingerprint === fingerprint) ??
    null
  );
}

export async function getAlgoProblemWithAdapter(
  problemId: string,
  language?: LanguageId,
): Promise<{
  blueprint: AlgoProblemBlueprint | null;
  adapter: AlgoLanguageAdapter | null;
  cachedLanguages: LanguageId[];
}> {
  const data = await readAlgoStore();
  const blueprint = Object.hasOwn(data.problems, problemId)
    ? data.problems[problemId]
    : null;
  if (!blueprint) {
    return { blueprint: null, adapter: null, cachedLanguages: [] };
  }
  const problemAdapters = Object.hasOwn(data.adapters, problemId)
    ? data.adapters[problemId]
    : {};
  const cachedLanguages = Array.from(
    new Set<LanguageId>([
      ...blueprint.availableLanguages,
      ...(Object.keys(problemAdapters) as LanguageId[]),
    ]),
  );
  const adapter =
    language && Object.hasOwn(problemAdapters, language)
      ? problemAdapters[language] ?? null
      : null;
  return {
    blueprint: { ...blueprint, availableLanguages: cachedLanguages },
    adapter,
    cachedLanguages,
  };
}

export function saveAlgoBlueprintAndAdapter(
  blueprint: AlgoProblemBlueprint,
  adapter?: AlgoLanguageAdapter,
): Promise<{ blueprint: AlgoProblemBlueprint; adapter?: AlgoLanguageAdapter }> {
  return withAlgoStoreLock((data) => {
    const existing = Object.hasOwn(data.problems, blueprint.id)
      ? data.problems[blueprint.id]
      : undefined;
    const existingAdapters = Object.hasOwn(data.adapters, blueprint.id)
      ? data.adapters[blueprint.id]
      : {};
    if (adapter) {
      existingAdapters[adapter.language] = adapter;
      data.adapters[blueprint.id] = existingAdapters;
    }

    const availableLanguages = Array.from(
      new Set<LanguageId>([
        ...(existing?.availableLanguages ?? []),
        ...blueprint.availableLanguages,
        ...(Object.keys(existingAdapters) as LanguageId[]),
      ]),
    );

    const savedBlueprint: AlgoProblemBlueprint = existing
      ? { ...existing, availableLanguages }
      : { ...blueprint, availableLanguages };

    data.problems[blueprint.id] = savedBlueprint;
    pruneAlgoStoreIfNeeded(data);
    return { blueprint: savedBlueprint, adapter };
  });
}

export function saveAlgoLanguageAdapter(
  adapter: AlgoLanguageAdapter,
  fallbackBlueprint?: AlgoProblemBlueprint,
): Promise<AlgoLanguageAdapter> {
  return withAlgoStoreLock((data) => {
    if (!Object.hasOwn(data.problems, adapter.problemId) && fallbackBlueprint) {
      data.problems[adapter.problemId] = {
        ...fallbackBlueprint,
        availableLanguages: Array.from(
          new Set<LanguageId>([
            ...fallbackBlueprint.availableLanguages,
            adapter.language,
          ]),
        ),
      };
    }

    const existingAdapters = Object.hasOwn(data.adapters, adapter.problemId)
      ? data.adapters[adapter.problemId]
      : {};
    existingAdapters[adapter.language] = adapter;
    data.adapters[adapter.problemId] = existingAdapters;

    const bp = Object.hasOwn(data.problems, adapter.problemId)
      ? data.problems[adapter.problemId]
      : undefined;
    if (bp && !bp.availableLanguages.includes(adapter.language)) {
      data.problems[adapter.problemId] = {
        ...bp,
        availableLanguages: [...bp.availableLanguages, adapter.language],
      };
    }

    pruneAlgoStoreIfNeeded(data);
    return adapter;
  });
}
