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
  evaluatePracticeCode,
  GeminiConfigError,
  generateLessonDeepDive,
  generatePersonalizedCurriculum,
  generateSyntaxReferenceEntry,
} from './geminiService.ts';
import { getGitHubRepoSummary } from './githubRepo.ts';
import {
  listLeaderboardEntries,
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
} from './security.ts';
import { consumeUserDailyQuota, getUserDailyQuota } from './store.ts';
import type {
  LanguageId,
  LearningFocus,
  PaceDepth,
  PersonalizationRequest,
  ReferenceGenerateRequest,
  SkillLevel,
} from '../src/types/curriculum.ts';

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

async function verifyFirebaseUser(
  req: Request,
  firebaseApiKey: string,
): Promise<{ uid: string }> {
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
    users?: Array<{ localId?: string; disabled?: boolean }>;
  };
  const verifiedUser = data.users?.[0];
  if (!verifiedUser?.localId) {
    throw new GeminiConfigError('Unable to verify Firebase user identity.', 401);
  }
  if (verifiedUser.disabled) {
    throw new GeminiConfigError('This user account has been disabled.', 403);
  }
  return { uid: verifiedUser.localId };
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
  const generateUserRateLimiter = new SlidingWindowRateLimiter(5, 10 * 60_000);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(
    securityHeadersMiddleware({
      isProduction: config.isProduction,
      frameAncestors: config.frameAncestors,
    }),
  );

  app.use('/api', apiCorsMiddleware(config.allowedOrigins));
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

  app.use(express.json({ limit: '128kb' }));
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON request body.' });
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

  app.get('/api/github/repo', async (req, res) => {
    const repoOverride =
      typeof req.query.repo === 'string' ? req.query.repo : undefined;
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const summary = await getGitHubRepoSummary(process.env, {
      repoOverride,
      forceRefresh,
    });
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
      await verifyFirebaseUser(req, config.firebaseApiKey);
      const entries = await listLeaderboardEntries(50);
      res.json({ entries });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to load leaderboard.');
    }
  });

  app.post('/api/leaderboard/sync', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req, config.firebaseApiKey);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const entry = await upsertLeaderboardEntry(uid, {
        username: body.username,
        preferredLanguage: body.preferredLanguage,
        rank: body.rank,
        weeklyActiveDays: body.weeklyActiveDays,
        currentStreak: body.currentStreak,
        weeklyModulesCompleted: body.weeklyModulesCompleted,
        totalModulesCompleted: body.totalModulesCompleted,
      });
      const entries = await listLeaderboardEntries(50);
      res.json({ entry, entries });
    } catch (error) {
      respondWithSafeError(res, error, 'Unable to sync leaderboard progress.');
    }
  });

  app.post('/api/curriculum/generate', async (req, res) => {
    const wantsStream =
      req.headers.accept?.includes('application/x-ndjson') ||
      req.query.stream === '1';
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    let streamStarted = false;

    const sendNdjson = (payload: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`${JSON.stringify(payload)}\n`);
      }
    };

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

      const quotaStatus = await getUserDailyQuota(uid, clientDateKey);
      if (!quotaStatus.allowed) {
        res.status(429).json({
          error: 'Daily limit reached: 1 personalized curriculum per day. Resets tomorrow.',
          quotaReached: true,
          quota: quotaStatus,
        });
        return;
      }

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
        }, 3000);
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
      );

      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }

      const updatedQuota = await consumeUserDailyQuota(uid, clientDateKey);
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
        res.end();
      } else {
        res.json(responsePayload);
      }
    } catch (error) {
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
      if (streamStarted) {
        const message =
          error instanceof GeminiConfigError
            ? error.message
            : 'Unable to generate curriculum.';
        sendNdjson({ type: 'error', error: message });
        res.end();
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

  app.use('/api', (req, res) => {
    console.warn(`[server] Unmatched API route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return { app, config, projectRoot: PROJECT_ROOT };
}
