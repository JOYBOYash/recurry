import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AlgoConceptId,
  AlgoDifficulty,
  AlgoLanguageAdapter,
  AlgoLogicStep,
  AlgoProblemBlueprint,
  AlgoStepLanguageHint,
  ResolvedAlgoConceptId,
} from '../src/types/algo.ts';
import type {
  CodeEvaluationResult,
  CurriculumTrack,
  DeepDiveExpansion,
  LanguageId,
  LearningFocus,
  PersonalizationRequest,
  ReferenceEntry,
  ReferenceGenerateRequest,
  ReferenceSnippet,
  SkillLevel,
  TutorMessage,
} from '../src/types/curriculum.ts';
import {
  ALGO_CONCEPT_LABELS,
  ALLOWED_RESOLVED_CONCEPTS,
  buildProblemIdFromFingerprint,
  computeProblemFingerprint,
} from '../src/utils/algoLogic.ts';

export const PRIMARY_MODEL_NAME = 'gemini-3.1-flash-lite';
export const FALLBACK_MODEL_NAME = 'gemini-4-hydrogen';
const MODEL_CANDIDATES = [
  PRIMARY_MODEL_NAME,
  PRIMARY_MODEL_NAME,
  FALLBACK_MODEL_NAME,
  PRIMARY_MODEL_NAME,
] as const;

export function getThinkingConfig(modelName: string): {
  thinkingLevel: ThinkingLevel;
} {
  // gemini-3.1-flash-lite defaults to MINIMAL (sub-second TTFT, no thinking stall).
  // gemini-4-* does not support MINIMAL (returns 400), so use LOW for lowest latency.
  if (modelName.startsWith('gemini-3.1-flash-lite')) {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  return { thinkingLevel: ThinkingLevel.LOW };
}

const LANGUAGE_LABELS: Record<LanguageId, string> = {
  sql: 'SQL (ANSI SQL / PostgreSQL 16)',
  java: 'Java (Java 21 LTS)',
  cpp: 'C++ (Modern C++20)',
  python: 'Python (Python 3.12)',
  javascript: 'JavaScript (ECMAScript 2024)',
  ruby: 'Ruby (Ruby 3.3)',
};

const SKILL_LEVEL_PROMPTS: Record<SkillLevel, string> = {
  noob: 'Noob — absolute beginner, zero assumed syntax knowledge; explain primitives step by step',
  intern: 'Intern — knows basic programming flow, needs clean idioms and standard library syntax',
  expert: 'Expert — experienced developer targeting production idioms, type systems, and edge cases',
  master: 'Master — deep semantic fluency, concurrency/memory/query optimization, and subtle corner cases',
  legend: 'Legend — specification-grade mastery, zero-overhead abstractions, advanced compiler/engine semantics',
};

const FOCUS_PROMPTS: Record<LearningFocus, string> = {
  syntax: 'Syntax Mastery — complete grammar forms, declarations, control flow, data modeling, and idiomatic syntax usage',
  problem_solving: 'Problem Solving — applied coding challenges, algorithmic patterns, data transformations, and edge-case reasoning',
};

const PACE_COUNTS = {
  essentials: 4,
  comprehensive: 6,
  complete: 8,
} as const;

export class GeminiConfigError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = 'GeminiConfigError';
    this.status = status;
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiConfigError(
      'Gemini service is not configured on the server.',
      503,
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(error: unknown): { status: number; message: string } {
  if (error instanceof GeminiConfigError) {
    return { status: error.status, message: error.message };
  }

  const raw = error instanceof Error ? error.message : String(error);
  console.error('[geminiService] Upstream AI error:', raw);

  if (
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('403') ||
    raw.includes('API_KEY_INVALID')
  ) {
    return {
      status: 503,
      message: 'The server AI configuration was rejected. Contact the site administrator.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'AI rate limit reached. Wait a moment and try again.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 502,
      message: 'AI model endpoint unavailable. Please try again shortly.',
    };
  }
  if (
    raw.includes('timed out') ||
    raw.includes('DEADLINE_EXCEEDED') ||
    raw.includes('504')
  ) {
    return {
      status: 504,
      message: 'AI generation timed out. Please try again.',
    };
  }
  if (
    raw.includes('UNAVAILABLE') ||
    raw.includes('503') ||
    raw.includes('high demand')
  ) {
    return {
      status: 503,
      message: 'AI service is temporarily busy. Please try again in a moment.',
    };
  }
  return {
    status: 502,
    message: 'AI request failed. Please try again shortly.',
  };
}

export function isTransientGeminiError(error: unknown): boolean {
  if (error instanceof GeminiConfigError && error.status === 503) {
    // Missing/invalid API key config should fail fast
    return false;
  }
  const raw = error instanceof Error ? error.message : String(error);
  if (
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('403')
  ) {
    return false;
  }
  return (
    error instanceof SyntaxError ||
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('high demand') ||
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('500') ||
    raw.includes('INTERNAL') ||
    raw.includes('DEADLINE_EXCEEDED') ||
    raw.includes('504') ||
    raw.includes('ECONNRESET') ||
    raw.includes('ETIMEDOUT') ||
    raw.includes('timed out') ||
    raw.includes('fetch failed') ||
    raw.includes('Empty AI response') ||
    raw.includes('aborted')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AttemptContext {
  signal: AbortSignal;
  markFirstToken: () => void;
}

function runAttemptWithDeadlines<T>(
  runner: (ctx: AttemptContext) => Promise<T>,
  options: {
    firstTokenTimeoutMs: number;
    maxTotalTimeoutMs: number;
    label: string;
    externalSignal?: AbortSignal;
  },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    let firstTokenReceived = false;

    const cleanup = () => {
      clearTimeout(firstTokenTimer);
      clearTimeout(totalTimer);
      options.externalSignal?.removeEventListener('abort', onExternalAbort);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      controller.abort(err);
      reject(err);
    };

    const onExternalAbort = () => {
      fail(new Error(`${options.label} aborted by caller`));
    };

    if (options.externalSignal?.aborted) {
      fail(new Error(`${options.label} aborted by caller`));
      return;
    }
    options.externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    const firstTokenTimer = setTimeout(() => {
      if (!firstTokenReceived) {
        fail(
          new Error(
            `${options.label} timed out waiting for first token after ${options.firstTokenTimeoutMs}ms`,
          ),
        );
      }
    }, options.firstTokenTimeoutMs);

    const totalTimer = setTimeout(() => {
      fail(
        new Error(`${options.label} timed out after ${options.maxTotalTimeoutMs}ms`),
      );
    }, options.maxTotalTimeoutMs);

    runner({
      signal: controller.signal,
      markFirstToken: () => {
        if (!firstTokenReceived) {
          firstTokenReceived = true;
          clearTimeout(firstTokenTimer);
        }
      },
    }).then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        controller.abort();
        reject(err);
      },
    );
  });
}

export async function executeWithModelFallbackForCandidates<T>(
  operationName: string,
  candidates: readonly string[],
  runner: (modelName: string, attempt: number, ctx: AttemptContext) => Promise<T>,
  options?: {
    primaryFirstTokenMs?: number;
    primaryMaxTotalMs?: number;
    fallbackFirstTokenMs?: number;
    fallbackMaxTotalMs?: number;
    retryBaseDelayMs?: number;
    externalSignal?: AbortSignal;
  },
): Promise<T> {
  const primaryFirstTokenMs = options?.primaryFirstTokenMs ?? 15_000;
  const primaryMaxTotalMs = options?.primaryMaxTotalMs ?? 45_000;
  const fallbackFirstTokenMs = options?.fallbackFirstTokenMs ?? 25_000;
  const fallbackMaxTotalMs = options?.fallbackMaxTotalMs ?? 60_000;
  const retryBaseDelayMs = options?.retryBaseDelayMs ?? 650;

  let lastError: unknown;
  for (let i = 0; i < candidates.length; i += 1) {
    const modelName = candidates[i];
    const isPrimary = i === 0;
    try {
      return await runAttemptWithDeadlines(
        (ctx) => runner(modelName, i + 1, ctx),
        {
          firstTokenTimeoutMs: isPrimary ? primaryFirstTokenMs : fallbackFirstTokenMs,
          maxTotalTimeoutMs: isPrimary ? primaryMaxTotalMs : fallbackMaxTotalMs,
          label: `${operationName}:${modelName}`,
          externalSignal: options?.externalSignal,
        },
      );
    } catch (error) {
      lastError = error;
      if (
        options?.externalSignal?.aborted ||
        !isTransientGeminiError(error) ||
        i === candidates.length - 1
      ) {
        throw error;
      }
      const nextModel = candidates[i + 1];
      const delayMs = Math.min(2500, retryBaseDelayMs * (i + 1));
      console.warn(
        `[geminiService] ${operationName} attempt ${i + 1} (${modelName}) transient failure; switching to ${nextModel} after ${delayMs}ms:`,
        error instanceof Error ? error.message : String(error),
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
}

async function executeWithModelFallback<T>(
  operationName: string,
  runner: (modelName: string, attempt: number, ctx: AttemptContext) => Promise<T>,
  options?: {
    primaryFirstTokenMs?: number;
    primaryMaxTotalMs?: number;
    fallbackFirstTokenMs?: number;
    fallbackMaxTotalMs?: number;
    retryBaseDelayMs?: number;
    externalSignal?: AbortSignal;
  },
): Promise<T> {
  return executeWithModelFallbackForCandidates(
    operationName,
    MODEL_CANDIDATES,
    runner,
    options,
  );
}

async function collectStreamText(
  stream: AsyncIterable<{ text?: string }>,
  ctx: AttemptContext,
  onProgress?: (charsGenerated: number) => void,
): Promise<string> {
  let rawText = '';
  for await (const chunk of stream) {
    if (ctx.signal.aborted) break;
    if (chunk.text) {
      ctx.markFirstToken();
      rawText += chunk.text;
      onProgress?.(rawText.length);
    }
  }
  return rawText;
}

export function extractJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1).trim();
    }
  }
  return cleaned;
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        out[key] = stripUndefinedDeep(val);
      }
    }
    return out as T;
  }
  return value;
}

export async function generatePersonalizedCurriculum(
  req: PersonalizationRequest,
  onProgress?: (charsGenerated: number) => void,
  signal?: AbortSignal,
): Promise<CurriculumTrack> {
  const ai = getGeminiClient();
  const moduleCount = PACE_COUNTS[req.paceDepth] ?? 6;
  const languageLabel = LANGUAGE_LABELS[req.language];
  const skillDesc = SKILL_LEVEL_PROMPTS[req.skillLevel] ?? SKILL_LEVEL_PROMPTS.intern;
  const focusDesc = FOCUS_PROMPTS[req.learningFocus] ?? FOCUS_PROMPTS.syntax;
  const plannedTopics = Array.isArray(req.plannedTopics)
    ? req.plannedTopics.slice(0, moduleCount)
    : [];

  const prompt = [
    `Create a personalized, Duolingo-style progression curriculum for ${languageLabel}.`,
    `Learner Skill Level: ${skillDesc}.`,
    `Learning Focus: ${focusDesc}.`,
    `Module Count: exactly ${moduleCount} ordered modules progressing from foundation -> applied -> mastery.`,
    plannedTopics.length > 0
      ? `Follow this planned topic sequence closely:\n${plannedTopics.map((t, i) => `  Module ${i + 1}: ${t}`).join('\n')}`
      : '',
    req.priorBackground.trim()
      ? `Prior Background to bridge from: ${req.priorBackground.trim()}`
      : 'Prior Background: None specified.',
    req.focusNotes.trim()
      ? `Specific focus areas: ${req.focusNotes.trim()}`
      : 'Focus: Complete syntax grammar, control structures, data structures, error handling, and real usage.',
    'Pedagogy & Active Recall Requirements (generate ALL of this in one concise pass):',
    '- Group modules into clear units using unitTitle (e.g., "Unit 1 · Core Foundations", "Unit 2 · Structured Patterns", "Unit 3 · Applied Mastery").',
    '- Every code example and starterCode must be syntactically valid, clean, and idiomatic.',
    '- Keep track subtitle under 10 words, bridgingStrategy to 1 crisp sentence, and module summaries to 1 short sentence.',
    '- Include 1 concise code example per module (4-8 lines) with a 1-sentence explanation and usageNote.',
    '- Include exactly 3 concise progressive recallDrills per module ordered by difficulty: (1) foundation, (2) applied, (3) mastery.',
    '- Mix recallDrills types across "multiple_choice", "predict_output", "fill_blank", and "bug_fix" so the learner uses active recall before coding.',
    '- For "multiple_choice", "predict_output", and "bug_fix", provide 3 concise options and set answer to the exact matching option string.',
    '- For "fill_blank", include a codeSnippet with "____" and set answer to the exact missing syntax token.',
    '- Design each practice challenge with clear acceptance criteria and concise starterCode/sampleSolution calibrated to the learner skill level.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const parsed = await executeWithModelFallback(
      'generatePersonalizedCurriculum',
      async (modelName, _attempt, ctx) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            abortSignal: ctx.signal,
            systemInstruction:
              'You are an authoritative programming language curriculum architect for recurry. Build Duolingo-style active-recall coding tracks. Output strictly valid JSON matching the requested schema.',
            thinkingConfig: getThinkingConfig(modelName),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                bridgingStrategy: { type: Type.STRING },
                modules: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      unitTitle: { type: Type.STRING },
                      title: { type: Type.STRING },
                      estimatedMinutes: { type: Type.INTEGER },
                      xpReward: { type: Type.INTEGER },
                      summary: { type: Type.STRING },
                      syntaxGrammar: { type: Type.STRING },
                      syntaxTopics: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      examples: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            code: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            usageNote: { type: Type.STRING },
                          },
                          required: ['title', 'code', 'explanation', 'usageNote'],
                        },
                      },
                      commonPitfalls: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      recallDrills: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            type: {
                              type: Type.STRING,
                              enum: [
                                'multiple_choice',
                                'predict_output',
                                'fill_blank',
                                'bug_fix',
                              ],
                            },
                            difficulty: {
                              type: Type.STRING,
                              enum: ['foundation', 'applied', 'mastery'],
                            },
                            prompt: { type: Type.STRING },
                            codeSnippet: { type: Type.STRING },
                            options: {
                              type: Type.ARRAY,
                              items: { type: Type.STRING },
                            },
                            answer: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            conceptTag: { type: Type.STRING },
                          },
                          required: [
                            'type',
                            'difficulty',
                            'prompt',
                            'answer',
                            'explanation',
                            'conceptTag',
                          ],
                        },
                      },
                      challenge: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          prompt: { type: Type.STRING },
                          starterCode: { type: Type.STRING },
                          expectedConcepts: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          hint: { type: Type.STRING },
                          sampleSolution: { type: Type.STRING },
                        },
                        required: [
                          'title',
                          'prompt',
                          'starterCode',
                          'expectedConcepts',
                          'hint',
                          'sampleSolution',
                        ],
                      },
                    },
                    required: [
                      'unitTitle',
                      'title',
                      'estimatedMinutes',
                      'xpReward',
                      'summary',
                      'syntaxGrammar',
                      'syntaxTopics',
                      'examples',
                      'commonPitfalls',
                      'recallDrills',
                      'challenge',
                    ],
                  },
                },
              },
              required: ['title', 'subtitle', 'bridgingStrategy', 'modules'],
            },
          },
        });

        const rawText = await collectStreamText(stream, ctx, onProgress);

        const cleanJson = extractJsonText(rawText);
        if (!cleanJson) {
          throw new Error('Empty AI response while generating curriculum.');
        }

        const candidate = JSON.parse(cleanJson) as {
          title?: string;
          subtitle?: string;
          bridgingStrategy?: string;
          modules?: Array<Omit<CurriculumTrack['modules'][number], 'id' | 'order'>>;
        };

        if (!candidate.title || !Array.isArray(candidate.modules) || candidate.modules.length === 0) {
          throw new SyntaxError('Incomplete curriculum JSON structure.');
        }

        return {
          title: candidate.title,
          subtitle: candidate.subtitle ?? '',
          bridgingStrategy: candidate.bridgingStrategy ?? '',
          modules: candidate.modules,
        };
      },
      {
        primaryFirstTokenMs: 30_000,
        primaryMaxTotalMs: 65_000,
        fallbackFirstTokenMs: 40_000,
        fallbackMaxTotalMs: 85_000,
        externalSignal: signal,
      },
    );

    const timestamp = Date.now();
    const trackId = `track-${req.language}-${timestamp}`;

    return stripUndefinedDeep({
      id: trackId,
      language: req.language,
      title: String(parsed.title).trim().slice(0, 160),
      subtitle: String(parsed.subtitle ?? '').trim().slice(0, 280),
      skillLevel: req.skillLevel,
      learningFocus: req.learningFocus,
      paceDepth: req.paceDepth,
      priorBackground: req.priorBackground.trim().slice(0, 320),
      bridgingStrategy: String(parsed.bridgingStrategy ?? '').trim().slice(0, 400),
      createdAt: new Date(timestamp).toISOString(),
      redoCount: 0,
      modules: parsed.modules.slice(0, moduleCount).map((mod, idx) => {
        const modId = `${trackId}-m${idx + 1}`;
        return {
          ...mod,
          id: modId,
          order: idx + 1,
          unitTitle: mod.unitTitle || `Unit ${Math.floor(idx / 2) + 1}`,
          estimatedMinutes: Math.max(
            10,
            Math.min(45, Number(mod.estimatedMinutes) || 20),
          ),
          xpReward: Math.max(20, Math.min(80, Number(mod.xpReward) || 35)),
          recallDrills: Array.isArray(mod.recallDrills)
            ? mod.recallDrills.slice(0, 4).map((drill, dIdx) => ({
                ...drill,
                id: `${modId}-d${dIdx + 1}`,
              }))
            : [],
        };
      }),
    });
  } catch (error) {
    const mapped = mapGeminiError(error);
    throw new GeminiConfigError(mapped.message, mapped.status);
  }
}

export async function generateLessonDeepDive(params: {
  language: LanguageId;
  moduleTitle: string;
  syntaxGrammar: string;
  skillLevel: string;
  priorBackground: string;
}): Promise<DeepDiveExpansion> {
  const ai = getGeminiClient();
  const languageLabel = LANGUAGE_LABELS[params.language];

  const prompt = [
    `Generate a targeted syntax deep-dive for ${languageLabel}.`,
    `Module: ${params.moduleTitle}`,
    `Grammar Pattern: ${params.syntaxGrammar}`,
    `Learner Level: ${params.skillLevel}`,
    params.priorBackground
      ? `Learner Background: ${params.priorBackground}`
      : 'Learner Background: General programming.',
    'Provide: (1) a concise mentalModelBridge, (2) 2-3 subtle syntax edgeCases, and (3) 2 practical additionalExamples with clean code and crisp usage notes.',
  ].join('\n');

  try {
    const parsed = await executeWithModelFallback(
      'generateLessonDeepDive',
      async (modelName, _attempt, ctx) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            abortSignal: ctx.signal,
            systemInstruction:
              'You are a programming language instructor for recurry. Return crisp, accurate syntax deep-dives in JSON.',
            thinkingConfig: getThinkingConfig(modelName),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mentalModelBridge: { type: Type.STRING },
                edgeCases: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                additionalExamples: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      code: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      usageNote: { type: Type.STRING },
                    },
                    required: ['title', 'code', 'explanation', 'usageNote'],
                  },
                },
              },
              required: ['mentalModelBridge', 'edgeCases', 'additionalExamples'],
            },
          },
        });

        const rawText = await collectStreamText(stream, ctx);
        return JSON.parse(extractJsonText(rawText || '{}')) as Omit<
          DeepDiveExpansion,
          'generatedAt'
        >;
      },
    );

    return stripUndefinedDeep({
      ...parsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const mapped = mapGeminiError(error);
    throw new GeminiConfigError(mapped.message, mapped.status);
  }
}

export async function evaluatePracticeCode(params: {
  language: LanguageId;
  challengeTitle: string;
  challengePrompt: string;
  expectedConcepts: string[];
  userCode: string;
}): Promise<CodeEvaluationResult> {
  const ai = getGeminiClient();
  const languageLabel = LANGUAGE_LABELS[params.language];

  const prompt = [
    `Evaluate the learner's ${languageLabel} solution for syntax accuracy and prompt adherence.`,
    `Challenge: ${params.challengeTitle}`,
    `Task: ${params.challengePrompt}`,
    `Expected Concepts: ${params.expectedConcepts.join(', ')}`,
    'Submitted Code:',
    '```',
    params.userCode,
    '```',
    'Set passed=true only if syntax is valid and the code satisfies the task.',
  ].join('\n');

  try {
    const parsed = await executeWithModelFallback(
      'evaluatePracticeCode',
      async (modelName, _attempt, ctx) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            abortSignal: ctx.signal,
            systemInstruction:
              'You are a strict yet constructive code reviewer for recurry. Check exact language syntax and requirements.',
            thinkingConfig: getThinkingConfig(modelName),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                passed: { type: Type.BOOLEAN },
                feedback: { type: Type.STRING },
                syntaxIssues: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                improvedSnippet: { type: Type.STRING },
              },
              required: [
                'passed',
                'feedback',
                'syntaxIssues',
                'strengths',
                'improvedSnippet',
              ],
            },
          },
        });

        const rawText = await collectStreamText(stream, ctx);
        return JSON.parse(extractJsonText(rawText || '{}')) as {
          passed: boolean;
          feedback: string;
          syntaxIssues: string[];
          strengths: string[];
          improvedSnippet: string;
        };
      },
    );

    return {
      passed: Boolean(parsed.passed),
      verdictLabel: parsed.passed
        ? 'Verified'
        : parsed.syntaxIssues.length > 0
          ? 'Syntax Issue'
          : 'Needs Revision',
      feedback: parsed.feedback,
      syntaxIssues: parsed.syntaxIssues ?? [],
      strengths: parsed.strengths ?? [],
      improvedSnippet: parsed.improvedSnippet ?? '',
    };
  } catch (error) {
    const mapped = mapGeminiError(error);
    throw new GeminiConfigError(mapped.message, mapped.status);
  }
}

export async function askSyntaxTutor(params: {
  language: LanguageId;
  moduleTitle: string;
  currentCode: string;
  question: string;
  history: TutorMessage[];
}): Promise<{ answer: string; codeSnippet?: string }> {
  const ai = getGeminiClient();
  const languageLabel = LANGUAGE_LABELS[params.language];

  const recentHistory = params.history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`)
    .join('\n');

  const prompt = [
    `Language: ${languageLabel}`,
    `Current Module: ${params.moduleTitle}`,
    params.currentCode.trim()
      ? `Learner's Editor Code:\n${params.currentCode}`
      : '',
    recentHistory ? `Recent Conversation:\n${recentHistory}` : '',
    `Question: ${params.question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const parsed = await executeWithModelFallback(
      'askSyntaxTutor',
      async (modelName, _attempt, ctx) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            abortSignal: ctx.signal,
            systemInstruction:
              'You are the recurry Syntax Tutor. Answer directly in 2-4 concise sentences and optionally include a short clean codeSnippet illustrating the syntax.',
            thinkingConfig: getThinkingConfig(modelName),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                answer: { type: Type.STRING },
                codeSnippet: { type: Type.STRING },
              },
              required: ['answer'],
            },
          },
        });

        const rawText = await collectStreamText(stream, ctx);
        return JSON.parse(extractJsonText(rawText || '{}')) as {
          answer: string;
          codeSnippet?: string;
        };
      },
    );

    const snippet = parsed.codeSnippet?.trim();
    return {
      answer: parsed.answer || 'No explanation returned.',
      ...(snippet ? { codeSnippet: snippet } : {}),
    };
  } catch (error) {
    const mapped = mapGeminiError(error);
    throw new GeminiConfigError(mapped.message, mapped.status);
  }
}

export async function generateSyntaxReferenceEntry(
  req: ReferenceGenerateRequest,
): Promise<ReferenceEntry> {
  const ai = getGeminiClient();
  const langDescriptions = req.languages
    .map((id) => `${id} (${LANGUAGE_LABELS[id]})`)
    .join(', ');

  const prompt = [
    `Generate a complete, idiomatic syntax & usage reference comparison for: "${req.topic}".`,
    `Category: ${req.category}.`,
    `Languages to include: ${langDescriptions}.`,
    'For each requested language, provide a concise, idiomatic, syntactically accurate code snippet and a crisp 1-sentence usage note.',
  ].join('\n');

  const snippetSchema = {
    type: Type.OBJECT,
    properties: {
      syntax: { type: Type.STRING },
      usage: { type: Type.STRING },
    },
    required: ['syntax', 'usage'],
  };

  try {
    const parsed = await executeWithModelFallback(
      'generateSyntaxReferenceEntry',
      async (modelName, _attempt, ctx) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            abortSignal: ctx.signal,
            systemInstruction:
              'You are a programming language specification editor for recurry. Output accurate syntax comparisons in JSON.',
            thinkingConfig: getThinkingConfig(modelName),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                concept: { type: Type.STRING },
                description: { type: Type.STRING },
                entries: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      language: { type: Type.STRING },
                      snippet: snippetSchema,
                    },
                    required: ['language', 'snippet'],
                  },
                },
              },
              required: ['concept', 'description', 'entries'],
            },
          },
        });

        const rawText = await collectStreamText(stream, ctx);
        return JSON.parse(extractJsonText(rawText || '{}')) as {
          concept: string;
          description: string;
          entries: Array<{ language: LanguageId; snippet: ReferenceSnippet }>;
        };
      },
    );

    const snippets: Partial<Record<LanguageId, ReferenceSnippet>> = {};
    const requestedSet = new Set(req.languages);
    for (const item of parsed.entries ?? []) {
      if (requestedSet.has(item.language) && item.snippet?.syntax) {
        snippets[item.language] = item.snippet;
      }
    }

    const timestamp = Date.now();
    return stripUndefinedDeep({
      id: `ref-${timestamp}`,
      category: req.category,
      concept: parsed.concept || req.topic.trim(),
      description:
        parsed.description ||
        `Cross-language comparison for ${req.topic.trim()}.`,
      createdAt: new Date(timestamp).toISOString(),
      snippets,
    });
  } catch (error) {
    const mapped = mapGeminiError(error);
    throw new GeminiConfigError(mapped.message, mapped.status);
  }
}

function resolveAlgoConcept(
  requested: AlgoConceptId,
  modelDetected?: string,
): ResolvedAlgoConceptId {
  if (requested !== 'auto' && ALLOWED_RESOLVED_CONCEPTS.has(requested)) {
    return requested;
  }
  if (
    modelDetected &&
    ALLOWED_RESOLVED_CONCEPTS.has(modelDetected as ResolvedAlgoConceptId)
  ) {
    return modelDetected as ResolvedAlgoConceptId;
  }
  return 'foundations_io';
}

function resolveAlgoDifficulty(raw?: string): AlgoDifficulty {
  if (raw === 'foundation' || raw === 'intermediate' || raw === 'advanced') {
    return raw;
  }
  return 'foundation';
}

export async function decomposeAlgoProblem(params: {
  uid: string;
  language: LanguageId;
  concept: AlgoConceptId;
  problemText?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<{
  blueprint: AlgoProblemBlueprint;
  adapter: AlgoLanguageAdapter;
}> {
  const ai = getGeminiClient();
  const languageLabel = LANGUAGE_LABELS[params.language];
  const conceptHint =
    params.concept === 'auto'
      ? 'Auto-detect the best matching concept category from the allowed enum.'
      : `Target Concept Focus: ${ALGO_CONCEPT_LABELS[params.concept]} (${params.concept}).`;

  const textPrompt = [
    'Analyze the attached programming problem or code snippet and split it into 4 to 7 small, concrete, sequential sub-problems that build incrementally into a complete output-ready program.',
    conceptHint,
    `Initial Language Adapter Target: ${languageLabel}.`,
    params.problemText?.trim()
      ? `Problem Statement or Code:\n${params.problemText.trim()}`
      : 'Extract the problem statement accurately from the attached image first.',
    'CRITICAL TWO-LAYER SEPARATION RULES:',
    '1. The `steps` array MUST be 100% LANGUAGE-AGNOSTIC (pure algorithmic logic, variable concepts, I/O flow, edge-case checks — NEVER mention Python/Java/C++/JS/Ruby/SQL syntax inside `steps`).',
    '2. Keep each step atomic, ordered, and progressively buildable so a learner writes Step 1 in an editor and augments each next step onto their previous code until they have a complete working program.',
    '3. Keep `problemSummary`, step `goal`, `logicCue`, `checkCriteria`, and `pitfall` to 1 crisp sentence each.',
    `4. In \`languageAdapter\`, map 1-to-1 to the exact same step order using \`stepIndex\` (0-based) with idiomatic ${languageLabel} syntax cues, idiomNote, and a concise 1-6 line stepSnippet for ONLY that sub-problem that composes cleanly with previous steps.`,
  ].join('\n');

  const contents =
    params.imageBase64 && params.imageMimeType
      ? {
          parts: [
            {
              inlineData: {
                mimeType: params.imageMimeType,
                data: params.imageBase64,
              },
            },
            { text: textPrompt },
          ],
        }
      : textPrompt;

  try {
    const parsed = await executeWithModelFallback(
      'decomposeAlgoProblem',
      async (modelName, _attempt, ctx) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            abortSignal: ctx.signal,
            systemInstruction:
              'You are an algorithmic problem decomposition architect for recurry Algo Mode. Produce reusable language-agnostic sub-problem checklists plus a separate concise language adapter in strict JSON.',
            thinkingConfig: getThinkingConfig(modelName),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                problemSummary: { type: Type.STRING },
                canonicalPrompt: { type: Type.STRING },
                conceptCategory: {
                  type: Type.STRING,
                  enum: [
                    'foundations_io',
                    'control_flow',
                    'functions_scope',
                    'arrays_strings',
                    'hash_maps',
                    'two_pointers',
                    'recursion_trees',
                    'sorting_searching',
                    'dynamic_programming',
                    'queries_data',
                  ],
                },
                difficulty: {
                  type: Type.STRING,
                  enum: ['foundation', 'intermediate', 'advanced'],
                },
                timeComplexity: { type: Type.STRING },
                spaceComplexity: { type: Type.STRING },
                edgeCases: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      goal: { type: Type.STRING },
                      logicCue: { type: Type.STRING },
                      checkCriteria: { type: Type.STRING },
                      pitfall: { type: Type.STRING },
                    },
                    required: ['title', 'goal', 'logicCue', 'checkCriteria', 'pitfall'],
                  },
                },
                languageAdapter: {
                  type: Type.OBJECT,
                  properties: {
                    setupNote: { type: Type.STRING },
                    stepHints: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          stepIndex: { type: Type.INTEGER },
                          syntaxCue: { type: Type.STRING },
                          idiomNote: { type: Type.STRING },
                          stepSnippet: { type: Type.STRING },
                        },
                        required: ['stepIndex', 'syntaxCue', 'idiomNote', 'stepSnippet'],
                      },
                    },
                  },
                  required: ['setupNote', 'stepHints'],
                },
              },
              required: [
                'title',
                'problemSummary',
                'canonicalPrompt',
                'conceptCategory',
                'difficulty',
                'timeComplexity',
                'spaceComplexity',
                'edgeCases',
                'steps',
                'languageAdapter',
              ],
            },
          },
        });

        const rawText = await collectStreamText(stream, ctx);
        const raw = extractJsonText(rawText || '{}');
        const candidate = JSON.parse(raw) as {
          title?: string;
          problemSummary?: string;
          canonicalPrompt?: string;
          conceptCategory?: string;
          difficulty?: string;
          timeComplexity?: string;
          spaceComplexity?: string;
          edgeCases?: string[];
          steps?: Array<Omit<AlgoLogicStep, 'id'>>;
          languageAdapter?: {
            setupNote?: string;
            stepHints?: Array<{
              stepIndex: number;
              syntaxCue: string;
              idiomNote: string;
              stepSnippet: string;
            }>;
          };
        };

        if (!candidate.title || !Array.isArray(candidate.steps) || candidate.steps.length === 0) {
          throw new SyntaxError('Incomplete Algo Mode breakdown JSON.');
        }

        return candidate;
      },
      {
        primaryFirstTokenMs: 15_000,
        primaryMaxTotalMs: 40_000,
        fallbackFirstTokenMs: 25_000,
        fallbackMaxTotalMs: 55_000,
      },
    );

    const resolvedConcept = resolveAlgoConcept(params.concept, parsed.conceptCategory);
    const canonicalPrompt =
      (parsed.canonicalPrompt?.trim() || params.problemText?.trim() || parsed.title || '')
        .slice(0, 2000);
    const fingerprintSource = params.problemText?.trim() || canonicalPrompt;
    const fingerprint = computeProblemFingerprint(fingerprintSource, resolvedConcept);
    const problemId = buildProblemIdFromFingerprint(fingerprint);
    const nowIso = new Date().toISOString();

    const steps: AlgoLogicStep[] = (parsed.steps ?? []).slice(0, 8).map((step, idx) => ({
      id: `step-${idx + 1}`,
      title: String(step.title || `Step ${idx + 1}`).slice(0, 120),
      goal: String(step.goal || '').slice(0, 260),
      logicCue: String(step.logicCue || '').slice(0, 260),
      checkCriteria: String(step.checkCriteria || '').slice(0, 220),
      pitfall: String(step.pitfall || '').slice(0, 220),
    }));

    const hintByIndex = new Map<
      number,
      { syntaxCue: string; idiomNote: string; stepSnippet: string }
    >();
    for (const h of parsed.languageAdapter?.stepHints ?? []) {
      if (typeof h.stepIndex === 'number') {
        hintByIndex.set(h.stepIndex, h);
      }
    }

    const stepHints: AlgoStepLanguageHint[] = steps.map((step, idx) => {
      const matched = hintByIndex.get(idx) ?? parsed.languageAdapter?.stepHints?.[idx];
      return {
        stepId: step.id,
        syntaxCue: String(matched?.syntaxCue || step.logicCue).slice(0, 260),
        idiomNote: String(matched?.idiomNote || '').slice(0, 220),
        stepSnippet: String(matched?.stepSnippet || '').slice(0, 800),
      };
    });

    const blueprint: AlgoProblemBlueprint = stripUndefinedDeep({
      id: problemId,
      fingerprint,
      title: String(parsed.title || 'Problem Breakdown').slice(0, 120),
      problemSummary: String(parsed.problemSummary || '').slice(0, 320),
      canonicalPrompt,
      conceptCategory: resolvedConcept,
      difficulty: resolveAlgoDifficulty(parsed.difficulty),
      timeComplexity: String(parsed.timeComplexity || 'O(n)').slice(0, 40),
      spaceComplexity: String(parsed.spaceComplexity || 'O(1)').slice(0, 40),
      edgeCases: Array.isArray(parsed.edgeCases)
        ? parsed.edgeCases
            .map((e) => String(e).trim().slice(0, 180))
            .filter(Boolean)
            .slice(0, 5)
        : [],
      steps,
      availableLanguages: [params.language],
      createdByUid: params.uid,
      createdAt: nowIso,
    });

    const adapter: AlgoLanguageAdapter = stripUndefinedDeep({
      problemId,
      language: params.language,
      setupNote: String(parsed.languageAdapter?.setupNote || '').slice(0, 260),
      stepHints,
      createdAt: nowIso,
    });

    return { blueprint, adapter };
  } catch (error) {
    const mapped = mapGeminiError(error);
    throw new GeminiConfigError(mapped.message, mapped.status);
  }
}

export async function generateAlgoLanguageAdapter(params: {
  blueprint: Pick<
    AlgoProblemBlueprint,
    'id' | 'title' | 'problemSummary' | 'conceptCategory' | 'steps'
  >;
  language: LanguageId;
}): Promise<AlgoLanguageAdapter> {
  const ai = getGeminiClient();
  const languageLabel = LANGUAGE_LABELS[params.language];

  const compactSteps = params.blueprint.steps
    .map((s) => `- ${s.id}: ${s.title} | Goal: ${s.goal} | Logic: ${s.logicCue}`)
    .join('\n');

  const prompt = [
    `Adapt this existing language-agnostic algorithmic breakdown to ${languageLabel}.`,
    `Problem: ${params.blueprint.title} — ${params.blueprint.problemSummary}`,
    `Concept: ${ALGO_CONCEPT_LABELS[params.blueprint.conceptCategory]}`,
    'Canonical Steps (preserve every stepId verbatim):',
    compactSteps,
    'Rules:',
    `- Provide a concise 1-sentence setupNote for ${languageLabel}.`,
    `- For every stepId above, return a targeted ${languageLabel} syntaxCue, a crisp 1-sentence idiomNote, and a minimal 1-6 line stepSnippet for ONLY that step.`,
  ].join('\n');

  try {
    const parsed = await executeWithModelFallback(
      'generateAlgoLanguageAdapter',
      async (modelName, _attempt, ctx) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            abortSignal: ctx.signal,
            systemInstruction:
              'You are a programming language syntax adapter for recurry Algo Mode. Map existing canonical logic steps onto idiomatic syntax hints in strict JSON.',
            thinkingConfig: getThinkingConfig(modelName),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                setupNote: { type: Type.STRING },
                stepHints: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stepId: { type: Type.STRING },
                      syntaxCue: { type: Type.STRING },
                      idiomNote: { type: Type.STRING },
                      stepSnippet: { type: Type.STRING },
                    },
                    required: ['stepId', 'syntaxCue', 'idiomNote', 'stepSnippet'],
                  },
                },
              },
              required: ['setupNote', 'stepHints'],
            },
          },
        });

        const rawText = await collectStreamText(stream, ctx);
        const raw = extractJsonText(rawText || '{}');
        const candidate = JSON.parse(raw) as {
          setupNote?: string;
          stepHints?: AlgoStepLanguageHint[];
        };
        if (!Array.isArray(candidate.stepHints) || candidate.stepHints.length === 0) {
          throw new SyntaxError('Incomplete Algo language adapter JSON.');
        }
        return candidate;
      },
      {
        primaryFirstTokenMs: 15_000,
        primaryMaxTotalMs: 35_000,
        fallbackFirstTokenMs: 25_000,
        fallbackMaxTotalMs: 45_000,
      },
    );

    const byId = new Map<string, AlgoStepLanguageHint>();
    for (const h of parsed.stepHints ?? []) {
      if (h?.stepId) byId.set(h.stepId, h);
    }

    const stepHints: AlgoStepLanguageHint[] = params.blueprint.steps.map(
      (step, idx) => {
        const matched = byId.get(step.id) ?? parsed.stepHints?.[idx];
        return {
          stepId: step.id,
          syntaxCue: String(matched?.syntaxCue || step.logicCue).slice(0, 260),
          idiomNote: String(matched?.idiomNote || '').slice(0, 220),
          stepSnippet: String(matched?.stepSnippet || '').slice(0, 800),
        };
      },
    );

    return stripUndefinedDeep({
      problemId: params.blueprint.id,
      language: params.language,
      setupNote: String(parsed.setupNote || '').slice(0, 260),
      stepHints,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const mapped = mapGeminiError(error);
    throw new GeminiConfigError(mapped.message, mapped.status);
  }
}
