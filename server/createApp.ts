import 'dotenv/config';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readFallbackFirebaseJson,
  resolveServerConfig,
  type ServerConfig,
} from './config.ts';
import {
  askSyntaxTutor,
  decomposeAlgoProblem,
  evaluatePracticeCode,
  FALLBACK_MODEL_NAME,
  GeminiConfigError,
  generateAlgoLanguageAdapter,
  generateLessonDeepDive,
  generatePersonalizedCurriculum,
  generateSyntaxReferenceEntry,
  PRIMARY_MODEL_NAME,
} from './geminiService.ts';
import {
  findAlgoProblemByFingerprint,
  getAlgoProblemWithAdapter,
  listAlgoProblems,
  saveAlgoBlueprintAndAdapter,
  saveAlgoLanguageAdapter,
} from './algoStore.ts';
import { getGitHubRepoSummary } from './githubRepo.ts';
import {
  listLeaderboardEntries,
  maskLeaderboardEntriesForViewer,
  upsertLeaderboardEntry,
} from './leaderboardStore.ts';
import {
  ALLOWED_FOCUSES,
  ALLOWED_LANGUAGES,
  ALLOWED_PACES,
  ALLOWED_SKILL_LEVELS,
  apiCorsMiddleware,
  clampString,
  sanitizeDateKey,
  sanitizeReferenceCategory,
  sanitizeStringArray,
  sanitizeTutorHistory,
  securityHeadersMiddleware,
  SlidingWindowRateLimiter,
  validateImageMagicBytes,
} from './security.ts';
import {
  consumeUserDailyQuota,
  getUserDailyQuota,
  releaseUserDailyQuota,
  reserveUserDailyQuota,
} from './store.ts';
import type {
  AlgoConceptId,
  AlgoDifficulty,
  AlgoLogicStep,
  AlgoProblemBlueprint,
  ResolvedAlgoConceptId,
} from '../src/types/algo.ts';
import type {
  LanguageId,
  LearningFocus,
  PaceDepth,
  PersonalizationRequest,
  ReferenceGenerateRequest,
  SkillLevel,
} from '../src/types/curriculum.ts';
import {
  ALLOWED_ALGO_CONCEPTS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_RESOLVED_CONCEPTS,
  buildProblemIdFromFingerprint,
  computeProblemFingerprint,
  MAX_IMAGE_FILE_BYTES,
  MAX_PROBLEM_TEXT_LENGTH,
  MIN_PROBLEM_TEXT_LENGTH,
} from '../src/utils/algoLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function respondWithSafeError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  if (error instanceof GeminiConfigError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error('[server] Unexpected API error:', error);
  res.status(500).json({ error: fallbackMessage });
}

function enforceRateLimit(
  limiter: SlidingWindowRateLimiter,
  key: string,
  res: Response,
): boolean {
  const result = limiter.check(key);
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds));
    res.status(429).json({
      error: `Too many requests. Please retry in ${result.retryAfterSeconds}s.`,
    });
    return false;
  }
  return true;
}

export const ADMIN_DIAGNOSTIC_EMAIL = 'kickstartnetworks@gmail.com';

const ALLOWED_ALGO_DIFFICULTIES = new Set<AlgoDifficulty>([
  'foundation',
  'intermediate',
  'advanced',
]);

function sanitizeFallbackAlgoBlueprint(
  raw: unknown,
  expectedProblemId: string,
  uid: string,
): AlgoProblemBlueprint | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;
  if (candidate.id !== expectedProblemId) return null;

  const fingerprint = clampString(candidate.fingerprint, 64).toLowerCase();
  if (!/^[a-f0-9]{12,64}$/.test(fingerprint)) return null;
  if (buildProblemIdFromFingerprint(fingerprint) !== expectedProblemId) return null;

  const title = clampString(candidate.title, 140);
  const problemSummary = clampString(candidate.problemSummary, 400);
  const canonicalPrompt = clampString(candidate.canonicalPrompt, MAX_PROBLEM_TEXT_LENGTH);
  if (title.length < 2 || problemSummary.length < 4 || canonicalPrompt.length < MIN_PROBLEM_TEXT_LENGTH) {
    return null;
  }

  const conceptCategory: ResolvedAlgoConceptId =
    typeof candidate.conceptCategory === 'string' &&
    ALLOWED_RESOLVED_CONCEPTS.has(candidate.conceptCategory as ResolvedAlgoConceptId)
      ? (candidate.conceptCategory as ResolvedAlgoConceptId)
      : 'foundations_io';

  const difficulty: AlgoDifficulty =
    typeof candidate.difficulty === 'string' &&
    ALLOWED_ALGO_DIFFICULTIES.has(candidate.difficulty as AlgoDifficulty)
      ? (candidate.difficulty as AlgoDifficulty)
      : 'foundation';

  if (!Array.isArray(candidate.steps) || candidate.steps.length < 3 || candidate.steps.length > 12) {
    return null;
  }

  const steps: AlgoLogicStep[] = [];
  for (let i = 0; i < candidate.steps.length; i += 1) {
    const rawStep = candidate.steps[i];
    if (!rawStep || typeof rawStep !== 'object' || Array.isArray(rawStep)) return null;
    const s = rawStep as Record<string, unknown>;
    const stepId = clampString(s.id, 32) || `step-${i + 1}`;
    if (!/^[a-zA-Z0-9_-]+$/.test(stepId)) return null;
    const stepTitle = clampString(s.title, 120);
    const goal = clampString(s.goal, 260);
    const logicCue = clampString(s.logicCue, 300);
    const checkCriteria = clampString(s.checkCriteria, 220);
    const pitfall = clampString(s.pitfall, 220);
    if (!stepTitle || !goal) return null;
    steps.push({ id: stepId, title: stepTitle, goal, logicCue, checkCriteria, pitfall });
  }

  const availableLanguages = Array.isArray(candidate.availableLanguages)
    ? Array.from(
        new Set(
          candidate.availableLanguages.filter(
            (l): l is LanguageId =>
              typeof l === 'string' && ALLOWED_LANGUAGES.has(l as LanguageId),
          ),
        ),
      )
    : [];

  return {
    id: expectedProblemId,
    fingerprint,
    title,
    problemSummary,
    canonicalPrompt,
    conceptCategory,
    difficulty,
    timeComplexity: clampString(candidate.timeComplexity, 48) || 'O(n)',
    spaceComplexity: clampString(candidate.spaceComplexity, 48) || 'O(1)',
    edgeCases: sanitizeStringArray(candidate.edgeCases, 8, 160),
    steps,
    availableLanguages,
    createdByUid: uid,
    createdAt: new Date().toISOString(),
  };
}

async function verifyFirebaseUser(
  req: Request,
  firebaseApiKey: string,
): Promise<{ uid: string; email: string | null; emailVerified: boolean }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new GeminiConfigError('Sign in required to access this endpoint.', 401);
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken || idToken.length > 4096) {
    throw new GeminiConfigError('Invalid authentication token.', 401);
  }
  if (!firebaseApiKey) {
    throw new GeminiConfigError(
      'Firebase authentication is not configured on the server.',
      503,
    );
  }

  let response: globalThis.Response;
  try {
    response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch {
    throw new GeminiConfigError(
      'Authentication service is temporarily unreachable.',
      503,
    );
  }

  if (!response.ok) {
    throw new GeminiConfigError(
      'Invalid or expired session. Please sign in again.',
      401,
    );
  }

  const data = (await response.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
      disabled?: boolean;
    }>;
  };
  const verifiedUser = data.users?.[0];
  if (!verifiedUser?.localId) {
    throw new GeminiConfigError('Unable to verify Firebase user identity.', 401);
  }
  if (verifiedUser.disabled) {
    throw new GeminiConfigError('This user account has been disabled.', 403);
  }
  return {
    uid: verifiedUser.localId,
    email: verifiedUser.email?.trim().toLowerCase() ?? null,
    emailVerified: Boolean(verifiedUser.emailVerified),
  };
}

export interface CreatedApiApp {
  app: Express;
  config: ServerConfig;
  projectRoot: string;
}

export function createApiApp(): CreatedApiApp {
  const config = resolveServerConfig(
    process.env,
    readFallbackFirebaseJson(PROJECT_ROOT),
  );

  const apiIpRateLimiter = new SlidingWindowRateLimiter(60, 60_000);
  const aiUserRateLimiter = new SlidingWindowRateLimiter(20, 5 * 60_000);
  const algoUserRateLimiter = new SlidingWindowRateLimiter(15, 10 * 60_000);
  const generateUserRateLimiter = new SlidingWindowRateLimiter(5, 10 * 60_000);
  const leaderboardUserRateLimiter = new SlidingWindowRateLimiter(15, 5 * 60_000);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(
    securityHeadersMiddleware({
      isProduction: config.isProduction,
      frameAncestors: config.frameAncestors,
    }),
  );

  app.use(
    '/api',
    apiCorsMiddleware(config.allowedOrigins, { trustProxy: config.trustProxy }),
  );
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api', (req, res, next) => {
    if (req.path === '/health') {
      next();
      return;
    }
    const ipKey = `ip:${getClientIp(req)}`;
    if (!enforceRateLimit(apiIpRateLimiter, ipKey, res)) return;
    next();
  });

  const standardJsonParser = express.json({ limit: '128kb' });
  const algoDecomposeJsonParser = express.json({ limit: '6mb' });
  app.use((req, res, next) => {
    if (req.path === '/api/algo/decompose') {
      algoDecomposeJsonParser(req, res, next);
      return;
    }
    standardJsonParser(req, res, next);
  });
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }
    if (
      err &&
      typeof err === 'object' &&
      'type' in err &&
      (err as { type?: string }).type === 'entity.too.large'
    ) {
      res.status(413).json({ error: 'Uploaded problem payload exceeds the 4 MB image limit.' });
      return;
    }
    next(err);
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(config.geminiApiKey),
      firebaseConfigured: Boolean(config.firebaseApiKey),
    });
  });

  app.get('/api/diagnostics', async (req, res) => {
    try {
      const verified = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (
        verified.email !== ADMIN_DIAGNOSTIC_EMAIL ||
        !verified.emailVerified
      ) {
        res.status(403).json({
          error: 'Diagnostics access is restricted to the verified administrator account.',
        });
        return;
      }

      const routerStack =
        (
          app as unknown as {
            _router?: {
              stack?: Array<{
                route?: { path?: string; methods?: Record<string, boolean> };
              }>;
            };
          }
        )._router?.stack ?? [];

      const registeredRoutes = routerStack
        .filter((layer) => layer.route?.path)
        .map((layer) => ({
          path: String(layer.route?.path),
          methods: Object.keys(layer.route?.methods ?? {})
            .filter((m) => layer.route?.methods?.[m])
            .map((m) => m.toUpperCase()),
        }));

      res.json({
        ok: true,
        adminEmail: verified.email,
        timestamp: new Date().toISOString(),
        runtime: {
          nodeVersion: process.version,
          environment: config.isProduction ? 'production' : 'development',
          vercel: Boolean(process.env.VERCEL),
          geminiConfigured: Boolean(config.geminiApiKey),
          firebaseConfigured: Boolean(config.firebaseApiKey),
          primaryModel: PRIMARY_MODEL_NAME,
          fallbackModel: FALLBACK_MODEL_NAME,
        },
        registeredRoutes,
      });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to load server diagnostics.');
    }
  });

  app.get('/api/github/repo', async (_req, res) => {
    // Locked strictly to the server-configured repository to prevent proxy abuse or token probing
    const summary = await getGitHubRepoSummary(process.env);
    res.json(summary);
  });

  app.get('/api/quota', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      const clientDateKey = sanitizeDateKey(req.query.dateKey);
      const quota = await getUserDailyQuota(uid, clientDateKey);
      res.json(quota);
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to check daily quota.');
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      const entries = maskLeaderboardEntriesForViewer(
        await listLeaderboardEntries(50),
        uid,
      );
      res.json({ entries });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to load leaderboard.');
    }
  });

  app.post('/api/leaderboard/sync', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (!enforceRateLimit(leaderboardUserRateLimiter, `lb:${uid}`, res)) return;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const entry = await upsertLeaderboardEntry(uid, {
        username: body.username,
        preferredLanguage: body.preferredLanguage,
        rank: body.rank,
        weeklyActiveDays: body.weeklyActiveDays,
        currentStreak: body.currentStreak,
        weeklyModulesCompleted: body.weeklyModulesCompleted,
        totalModulesCompleted: body.totalModulesCompleted,
        completedCurriculaCount: body.completedCurriculaCount,
      });
      const entries = maskLeaderboardEntriesForViewer(
        await listLeaderboardEntries(50),
        uid,
      );
      res.json({ entry, entries });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to sync leaderboard progress.');
    }
  });

  app.get('/api/curriculum/generate', (_req, res) => {
    const geminiConfigured = Boolean(config.geminiApiKey);
    const firebaseConfigured = Boolean(config.firebaseApiKey);
    const ok = geminiConfigured && firebaseConfigured;
    res.status(ok ? 200 : 503).json({
      ok,
      endpoint: '/api/curriculum/generate',
      geminiConfigured,
      firebaseConfigured,
    });
  });

  app.post('/api/curriculum/generate', async (req, res) => {
    res.setTimeout?.(120_000);
    const wantsStream =
      req.headers.accept?.includes('application/x-ndjson') ||
      req.query.stream === '1';
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    let streamStarted = false;
    const requestAbortController = new AbortController();

    const clearKeepalive = () => {
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
    };

    res.on('close', () => {
      clearKeepalive();
      if (!res.writableFinished) {
        requestAbortController.abort();
      }
    });

    const sendNdjson = (payload: Record<string, unknown>) => {
      if (!res.writableEnded && !res.destroyed) {
        res.write(`${JSON.stringify(payload)}\n`);
      }
    };

    let reservedQuota: { uid: string; todayKey: string } | null = null;

    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (!enforceRateLimit(generateUserRateLimiter, `gen:${uid}`, res)) return;

      const body = req.body as Partial<PersonalizationRequest>;
      const clientDateKey = sanitizeDateKey(body.clientDateKey);

      if (!body.language || !ALLOWED_LANGUAGES.has(body.language)) {
        res.status(400).json({
          error: 'Select a valid language (sql, java, cpp, python, javascript, ruby).',
        });
        return;
      }

      const reservation = await reserveUserDailyQuota(uid, clientDateKey);
      if (!reservation.reserved) {
        if (reservation.inFlight) {
          res.status(409).json({
            error: 'A curriculum generation is already in progress for your account.',
          });
          return;
        }
        res.status(429).json({
          error: 'Daily limit reached: 1 personalized curriculum per day. Resets tomorrow.',
          quotaReached: true,
          quota: {
            allowed: false,
            remainingToday: 0,
            todayKey: reservation.todayKey,
          },
        });
        return;
      }
      reservedQuota = { uid, todayKey: reservation.todayKey };

      const skillLevel: SkillLevel =
        body.skillLevel && ALLOWED_SKILL_LEVELS.has(body.skillLevel)
          ? body.skillLevel
          : 'intern';
      const learningFocus: LearningFocus =
        body.learningFocus && ALLOWED_FOCUSES.has(body.learningFocus)
          ? body.learningFocus
          : 'syntax';
      const paceDepth: PaceDepth =
        body.paceDepth && ALLOWED_PACES.has(body.paceDepth)
          ? body.paceDepth
          : 'comprehensive';

      let lastStage = 1;
      if (wantsStream) {
        streamStarted = true;
        res.status(200);
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        sendNdjson({ type: 'stage', stage: 1 });
        keepaliveTimer = setInterval(() => {
          sendNdjson({ type: 'ping' });
        }, 2000);
      }

      const track = await generatePersonalizedCurriculum(
        {
          language: body.language,
          skillLevel,
          learningFocus,
          paceDepth,
          priorBackground: clampString(body.priorBackground, 320),
          focusNotes: clampString(body.focusNotes, 400),
          plannedTopics: sanitizeStringArray(body.plannedTopics, 8, 120),
        },
        (charsGenerated) => {
          if (!wantsStream) return;
          const nextStage =
            charsGenerated > 2200 ? 3 : charsGenerated > 600 ? 2 : 1;
          if (nextStage > lastStage) {
            lastStage = nextStage;
            sendNdjson({ type: 'stage', stage: nextStage });
          }
        },
        requestAbortController.signal,
      );

      clearKeepalive();

      const updatedQuota = await consumeUserDailyQuota(uid, reservation.todayKey);
      reservedQuota = null;
      const responsePayload = {
        track: { ...track, uid },
        quota: {
          allowed: updatedQuota.remainingToday > 0,
          remainingToday: updatedQuota.remainingToday,
          todayKey: updatedQuota.dateKey,
        },
      };

      if (wantsStream) {
        sendNdjson({ type: 'result', ...responsePayload });
        if (!res.writableEnded) {
          res.end();
        }
      } else {
        res.json(responsePayload);
      }
    } catch (error) {
      clearKeepalive();
      if (reservedQuota) {
        releaseUserDailyQuota(reservedQuota.uid, reservedQuota.todayKey);
      }
      if (streamStarted) {
        console.error('[server] Curriculum generation stream error:', error);
        const message =
          error instanceof GeminiConfigError
            ? error.message
            : 'Unable to generate curriculum.';
        sendNdjson({ type: 'error', error: message });
        if (!res.writableEnded) {
          res.end();
        }
      } else {
        respondWithSafeError(res, error, 'Unable to generate curriculum.');
      }
    }
  });

  app.post('/api/lesson/expand', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (!enforceRateLimit(aiUserRateLimiter, `ai:${uid}`, res)) return;

      const body = req.body as {
        language?: LanguageId;
        moduleTitle?: string;
        syntaxGrammar?: string;
        skillLevel?: string;
        priorBackground?: string;
      };
      const moduleTitle = clampString(body.moduleTitle, 160);
      if (
        !body.language ||
        !ALLOWED_LANGUAGES.has(body.language) ||
        !moduleTitle
      ) {
        res.status(400).json({ error: 'language and moduleTitle are required.' });
        return;
      }
      const deepDive = await generateLessonDeepDive({
        language: body.language,
        moduleTitle,
        syntaxGrammar: clampString(body.syntaxGrammar, 800),
        skillLevel: clampString(body.skillLevel, 40) || 'intern',
        priorBackground: clampString(body.priorBackground, 320),
      });
      res.json({ deepDive });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to expand lesson.');
    }
  });

  app.post('/api/code/evaluate', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (!enforceRateLimit(aiUserRateLimiter, `ai:${uid}`, res)) return;

      const body = req.body as {
        language?: LanguageId;
        challengeTitle?: string;
        challengePrompt?: string;
        expectedConcepts?: string[];
        userCode?: string;
      };
      const userCode = clampString(body.userCode, 12_000);
      if (
        !body.language ||
        !ALLOWED_LANGUAGES.has(body.language) ||
        !userCode
      ) {
        res
          .status(400)
          .json({ error: 'language and non-empty userCode are required.' });
        return;
      }
      const evaluation = await evaluatePracticeCode({
        language: body.language,
        challengeTitle: clampString(body.challengeTitle, 160) || 'Syntax Exercise',
        challengePrompt: clampString(body.challengePrompt, 2000),
        expectedConcepts: sanitizeStringArray(body.expectedConcepts, 12, 80),
        userCode,
      });
      res.json({ evaluation });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to evaluate code.');
    }
  });

  app.post('/api/tutor/ask', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (!enforceRateLimit(aiUserRateLimiter, `ai:${uid}`, res)) return;

      const body = req.body as {
        language?: LanguageId;
        moduleTitle?: string;
        currentCode?: string;
        question?: string;
        history?: unknown;
      };
      const question = clampString(body.question, 1000);
      if (
        !body.language ||
        !ALLOWED_LANGUAGES.has(body.language) ||
        !question
      ) {
        res.status(400).json({ error: 'language and question are required.' });
        return;
      }
      const reply = await askSyntaxTutor({
        language: body.language,
        moduleTitle: clampString(body.moduleTitle, 160),
        currentCode: clampString(body.currentCode, 12_000),
        question,
        history: sanitizeTutorHistory(body.history),
      });
      res.json(reply);
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to reach syntax tutor.');
    }
  });

  app.post('/api/reference/generate', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (!enforceRateLimit(aiUserRateLimiter, `ai:${uid}`, res)) return;

      const body = req.body as Partial<ReferenceGenerateRequest>;
      const topic = clampString(body.topic, 140);
      const languages = Array.from(
        new Set(
          (Array.isArray(body.languages) ? body.languages : []).filter((l) =>
            ALLOWED_LANGUAGES.has(l),
          ),
        ),
      );
      if (topic.length < 2 || languages.length === 0) {
        res.status(400).json({
          error: 'A syntax topic (2-140 chars) and at least one language are required.',
        });
        return;
      }
      const entry = await generateSyntaxReferenceEntry({
        topic,
        category: sanitizeReferenceCategory(body.category),
        languages,
      });
      res.json({ entry: { ...entry, uid } });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to generate syntax reference.');
    }
  });

  app.get('/api/algo/problems', async (req, res) => {
    try {
      await verifyFirebaseUser(req, config.firebaseApiKey);
      const problems = await listAlgoProblems(60);
      res.json({ problems });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to load saved Algo Mode library.');
    }
  });

  app.get('/api/algo/problems/:problemId', async (req, res) => {
    try {
      await verifyFirebaseUser(req, config.firebaseApiKey);
      const problemId = clampString(req.params.problemId, 80);
      if (!/^[a-zA-Z0-9_-]+$/.test(problemId)) {
        res.status(400).json({ error: 'Invalid problem ID.' });
        return;
      }
      const rawLang =
        typeof req.query.language === 'string' ? req.query.language : undefined;
      const language =
        rawLang && ALLOWED_LANGUAGES.has(rawLang as LanguageId)
          ? (rawLang as LanguageId)
          : undefined;
      const found = await getAlgoProblemWithAdapter(problemId, language);
      if (!found.blueprint) {
        res.status(404).json({ error: 'Problem breakdown not found.' });
        return;
      }
      res.json(found);
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to load problem breakdown.');
    }
  });

  app.post('/api/algo/decompose', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (!enforceRateLimit(algoUserRateLimiter, `algo:${uid}`, res)) return;

      const body = (req.body ?? {}) as {
        language?: LanguageId;
        concept?: AlgoConceptId;
        problemText?: string;
        imageBase64?: string;
        imageMimeType?: string;
      };

      if (!body.language || !ALLOWED_LANGUAGES.has(body.language)) {
        res.status(400).json({
          error: 'Select a valid language (sql, java, cpp, python, javascript, ruby).',
        });
        return;
      }

      const concept: AlgoConceptId =
        body.concept && ALLOWED_ALGO_CONCEPTS.has(body.concept)
          ? body.concept
          : 'auto';

      const problemText = clampString(body.problemText, MAX_PROBLEM_TEXT_LENGTH);
      const hasImage =
        typeof body.imageBase64 === 'string' && body.imageBase64.trim().length > 0;

      if (!hasImage && problemText.length < MIN_PROBLEM_TEXT_LENGTH) {
        res.status(400).json({
          error: `Provide a problem statement (${MIN_PROBLEM_TEXT_LENGTH}+ chars) or upload a screenshot.`,
        });
        return;
      }

      let cleanBase64: string | undefined;
      let cleanMimeType: string | undefined;
      if (hasImage) {
        cleanMimeType =
          typeof body.imageMimeType === 'string'
            ? body.imageMimeType.trim().toLowerCase()
            : '';
        if (!ALLOWED_IMAGE_MIME_TYPES.has(cleanMimeType)) {
          res.status(400).json({
            error: 'Only PNG, JPEG, or WebP screenshots are supported.',
          });
          return;
        }
        const stripped = body.imageBase64!.replace(/^data:[^;]+;base64,/, '').trim();
        const imageCheck = validateImageMagicBytes(
          stripped,
          cleanMimeType,
          MAX_IMAGE_FILE_BYTES,
        );
        if (!imageCheck.valid) {
          res.status(400).json({
            error: imageCheck.error ?? 'Uploaded screenshot is invalid.',
          });
          return;
        }
        cleanBase64 = stripped;
      }

      // Cache-first check for text inputs before invoking Gemini
      if (!hasImage && problemText) {
        const fp = computeProblemFingerprint(problemText, concept);
        const cachedBp = await findAlgoProblemByFingerprint(fp);
        if (cachedBp) {
          const existing = await getAlgoProblemWithAdapter(cachedBp.id, body.language);
          if (existing.blueprint && existing.adapter) {
            res.json({
              blueprint: existing.blueprint,
              adapter: existing.adapter,
              cacheHit: 'full',
            });
            return;
          }
          if (existing.blueprint) {
            const generatedAdapter = await generateAlgoLanguageAdapter({
              blueprint: existing.blueprint,
              language: body.language,
            });
            await saveAlgoLanguageAdapter(generatedAdapter, existing.blueprint);
            const refreshed = await getAlgoProblemWithAdapter(
              existing.blueprint.id,
              body.language,
            );
            res.json({
              blueprint: refreshed.blueprint ?? existing.blueprint,
              adapter: generatedAdapter,
              cacheHit: 'logic_only',
            });
            return;
          }
        }
      }

      const generated = await decomposeAlgoProblem({
        uid,
        language: body.language,
        concept,
        problemText: problemText || undefined,
        imageBase64: cleanBase64,
        imageMimeType: cleanMimeType,
      });

      // Deduplicate against shared library even when extracted from screenshot
      const existingByFp = await findAlgoProblemByFingerprint(
        generated.blueprint.fingerprint,
      );
      if (existingByFp) {
        const existingWithLang = await getAlgoProblemWithAdapter(
          existingByFp.id,
          body.language,
        );
        if (existingWithLang.blueprint && existingWithLang.adapter) {
          res.json({
            blueprint: existingWithLang.blueprint,
            adapter: existingWithLang.adapter,
            cacheHit: 'full',
          });
          return;
        }
        const remappedAdapter = {
          ...generated.adapter,
          problemId: existingByFp.id,
          stepHints: existingByFp.steps.map((step, idx) => {
            const hint = generated.adapter.stepHints[idx];
            return {
              stepId: step.id,
              syntaxCue: hint?.syntaxCue || step.logicCue,
              idiomNote: hint?.idiomNote || '',
              stepSnippet: hint?.stepSnippet || '',
            };
          }),
        };
        await saveAlgoLanguageAdapter(remappedAdapter, existingByFp);
        const refreshed = await getAlgoProblemWithAdapter(existingByFp.id, body.language);
        res.json({
          blueprint: refreshed.blueprint ?? existingByFp,
          adapter: remappedAdapter,
          cacheHit: 'logic_only',
        });
        return;
      }

      const saved = await saveAlgoBlueprintAndAdapter(
        generated.blueprint,
        generated.adapter,
      );
      res.json({
        blueprint: saved.blueprint,
        adapter: generated.adapter,
        cacheHit: 'none',
      });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to break down this problem.');
    }
  });

  app.post('/api/algo/adapt', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      if (!enforceRateLimit(algoUserRateLimiter, `algo:${uid}`, res)) return;

      const body = (req.body ?? {}) as {
        problemId?: string;
        language?: LanguageId;
        blueprint?: AlgoProblemBlueprint;
      };
      const problemId = clampString(body.problemId, 80);
      if (
        !problemId ||
        !/^[a-zA-Z0-9_-]+$/.test(problemId) ||
        !body.language ||
        !ALLOWED_LANGUAGES.has(body.language)
      ) {
        res.status(400).json({
          error: 'Valid problemId and target language are required.',
        });
        return;
      }

      const cached = await getAlgoProblemWithAdapter(problemId, body.language);
      if (cached.adapter) {
        res.json({ adapter: cached.adapter, cacheHit: true });
        return;
      }

      const targetBlueprint =
        cached.blueprint ??
        sanitizeFallbackAlgoBlueprint(body.blueprint, problemId, uid);

      if (!targetBlueprint) {
        res.status(404).json({
          error: 'Canonical logic blueprint not found for this problem.',
        });
        return;
      }

      const adapter = await generateAlgoLanguageAdapter({
        blueprint: targetBlueprint,
        language: body.language,
      });
      // Only persist the blueprint fallback if it was already in the server store or verified above
      await saveAlgoLanguageAdapter(adapter, targetBlueprint);
      res.json({ adapter, cacheHit: false });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to adapt problem to the selected language.');
    }
  });

  app.use('/api', (req, res) => {
    console.warn(`[server] Unmatched API route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return { app, config, projectRoot: PROJECT_ROOT };
}
