import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
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

const PRIMARY_MODEL_NAME = 'gemini-4-hydrogen';
const FALLBACK_MODEL_NAME = 'gemini-3.1-flash-lite';
const MODEL_CANDIDATES = [
  PRIMARY_MODEL_NAME,
  PRIMARY_MODEL_NAME,
  FALLBACK_MODEL_NAME,
] as const;

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
    raw.includes('fetch failed') ||
    raw.includes('Empty AI response')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeWithModelFallback<T>(
  operationName: string,
  runner: (modelName: string, attempt: number) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < MODEL_CANDIDATES.length; i += 1) {
    const modelName = MODEL_CANDIDATES[i];
    try {
      return await runner(modelName, i + 1);
    } catch (error) {
      lastError = error;
      if (!isTransientGeminiError(error) || i === MODEL_CANDIDATES.length - 1) {
        throw error;
      }
      const nextModel = MODEL_CANDIDATES[i + 1];
      console.warn(
        `[geminiService] ${operationName} attempt ${i + 1} (${modelName}) transient failure; retrying with ${nextModel}:`,
        error instanceof Error ? error.message : String(error),
      );
      await sleep(700 * (i + 1));
    }
  }
  throw lastError;
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
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
    '- Include 1-2 concise code examples per module (4-8 lines each) with 1-sentence explanation and usageNote.',
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
      async (modelName) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are an authoritative programming language curriculum architect for recurry. Build Duolingo-style active-recall coding tracks. Output strictly valid JSON matching the requested schema.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

        let rawText = '';
        for await (const chunk of stream) {
          if (chunk.text) {
            rawText += chunk.text;
            onProgress?.(rawText.length);
          }
        }

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
    );

    const timestamp = Date.now();
    const trackId = `track-${req.language}-${timestamp}`;

    return stripUndefinedDeep({
      id: trackId,
      language: req.language,
      title: parsed.title,
      subtitle: parsed.subtitle,
      skillLevel: req.skillLevel,
      learningFocus: req.learningFocus,
      paceDepth: req.paceDepth,
      priorBackground: req.priorBackground.trim(),
      bridgingStrategy: parsed.bridgingStrategy,
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
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a programming language instructor for recurry. Return crisp, accurate syntax deep-dives in JSON.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

        return JSON.parse(extractJsonText(response.text ?? '{}')) as Omit<
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
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a strict yet constructive code reviewer for recurry. Check exact language syntax and requirements.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

        return JSON.parse(extractJsonText(response.text ?? '{}')) as {
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
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are the recurry Syntax Tutor. Answer directly in 2-4 concise sentences and optionally include a short clean codeSnippet illustrating the syntax.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

        return JSON.parse(extractJsonText(response.text ?? '{}')) as {
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
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a programming language specification editor for recurry. Output accurate syntax comparisons in JSON.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

        return JSON.parse(extractJsonText(response.text ?? '{}')) as {
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
