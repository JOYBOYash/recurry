import 'dotenv/config';
import express, { type Request } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  askSyntaxTutor,
  evaluatePracticeCode,
  GeminiConfigError,
  generateLessonDeepDive,
  generatePersonalizedCurriculum,
  generateSyntaxReferenceEntry,
} from './server/geminiService.ts';
import {
  consumeUserDailyQuota,
  getUserDailyQuota,
} from './server/store.ts';
import type {
  LanguageId,
  LearningFocus,
  PersonalizationRequest,
  ReferenceGenerateRequest,
  SkillLevel,
  TutorMessage,
} from './src/types/curriculum.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_LANGUAGES = new Set<LanguageId>([
  'sql',
  'java',
  'cpp',
  'python',
  'javascript',
]);

const ALLOWED_SKILL_LEVELS = new Set<SkillLevel>([
  'noob',
  'intern',
  'expert',
  'master',
  'legend',
]);

const ALLOWED_FOCUSES = new Set<LearningFocus>(['syntax', 'problem_solving']);

let firebaseApiKey = '';
try {
  const cfgRaw = fs.readFileSync(
    path.resolve(__dirname, 'firebase-applet-config.json'),
    'utf8',
  );
  const cfg = JSON.parse(cfgRaw) as { apiKey?: string };
  firebaseApiKey = cfg.apiKey?.trim() ?? '';
} catch {
  firebaseApiKey = '';
}

async function verifyFirebaseUser(req: Request): Promise<{ uid: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new GeminiConfigError('Sign in required to access this endpoint.', 401);
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    throw new GeminiConfigError('Missing authentication token.', 401);
  }
  if (!firebaseApiKey) {
    throw new GeminiConfigError('Firebase configuration is unavailable on the server.', 500);
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!response.ok) {
    throw new GeminiConfigError('Invalid or expired session. Please sign in again.', 401);
  }

  const data = (await response.json()) as {
    users?: Array<{ localId?: string }>;
  };
  const uid = data.users?.[0]?.localId;
  if (!uid) {
    throw new GeminiConfigError('Unable to verify Firebase user identity.', 401);
  }
  return { uid };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const key = process.env.GEMINI_API_KEY?.trim();
    res.json({
      ok: true,
      geminiConfigured: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
      firebaseConfigured: Boolean(firebaseApiKey),
    });
  });

  app.get('/api/quota', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req);
      const clientDateKey =
        typeof req.query.dateKey === 'string' ? req.query.dateKey : undefined;
      const quota = await getUserDailyQuota(uid, clientDateKey);
      res.json(quota);
    } catch (error) {
      const status = error instanceof GeminiConfigError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : 'Unable to check daily quota.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/curriculum/generate', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req);
      const body = req.body as Partial<PersonalizationRequest>;

      if (!body.language || !ALLOWED_LANGUAGES.has(body.language)) {
        res.status(400).json({
          error: 'Select a valid language (sql, java, cpp, python, javascript).',
        });
        return;
      }

      const quotaStatus = await getUserDailyQuota(uid, body.clientDateKey);
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

      const track = await generatePersonalizedCurriculum({
        language: body.language,
        skillLevel,
        learningFocus,
        paceDepth: body.paceDepth ?? 'comprehensive',
        priorBackground: String(body.priorBackground ?? ''),
        focusNotes: String(body.focusNotes ?? ''),
      });

      const updatedQuota = await consumeUserDailyQuota(uid, body.clientDateKey);
      res.json({
        track: { ...track, uid },
        quota: {
          allowed: updatedQuota.remainingToday > 0,
          remainingToday: updatedQuota.remainingToday,
          todayKey: updatedQuota.dateKey,
        },
      });
    } catch (error) {
      const status = error instanceof GeminiConfigError ? error.status : 500;
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to generate curriculum.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/lesson/expand', async (req, res) => {
    try {
      await verifyFirebaseUser(req);
      const body = req.body as {
        language?: LanguageId;
        moduleTitle?: string;
        syntaxGrammar?: string;
        skillLevel?: string;
        priorBackground?: string;
      };
      if (
        !body.language ||
        !ALLOWED_LANGUAGES.has(body.language) ||
        !body.moduleTitle
      ) {
        res.status(400).json({ error: 'language and moduleTitle are required.' });
        return;
      }
      const deepDive = await generateLessonDeepDive({
        language: body.language,
        moduleTitle: body.moduleTitle,
        syntaxGrammar: body.syntaxGrammar ?? '',
        skillLevel: body.skillLevel ?? 'intern',
        priorBackground: body.priorBackground ?? '',
      });
      res.json({ deepDive });
    } catch (error) {
      const status = error instanceof GeminiConfigError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : 'Unable to expand lesson.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/code/evaluate', async (req, res) => {
    try {
      await verifyFirebaseUser(req);
      const body = req.body as {
        language?: LanguageId;
        challengeTitle?: string;
        challengePrompt?: string;
        expectedConcepts?: string[];
        userCode?: string;
      };
      if (
        !body.language ||
        !ALLOWED_LANGUAGES.has(body.language) ||
        !body.userCode?.trim()
      ) {
        res
          .status(400)
          .json({ error: 'language and non-empty userCode are required.' });
        return;
      }
      const evaluation = await evaluatePracticeCode({
        language: body.language,
        challengeTitle: body.challengeTitle ?? 'Syntax Exercise',
        challengePrompt: body.challengePrompt ?? '',
        expectedConcepts: Array.isArray(body.expectedConcepts)
          ? body.expectedConcepts
          : [],
        userCode: body.userCode,
      });
      res.json({ evaluation });
    } catch (error) {
      const status = error instanceof GeminiConfigError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : 'Unable to evaluate code.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/tutor/ask', async (req, res) => {
    try {
      await verifyFirebaseUser(req);
      const body = req.body as {
        language?: LanguageId;
        moduleTitle?: string;
        currentCode?: string;
        question?: string;
        history?: TutorMessage[];
      };
      if (
        !body.language ||
        !ALLOWED_LANGUAGES.has(body.language) ||
        !body.question?.trim()
      ) {
        res.status(400).json({ error: 'language and question are required.' });
        return;
      }
      const reply = await askSyntaxTutor({
        language: body.language,
        moduleTitle: body.moduleTitle ?? '',
        currentCode: body.currentCode ?? '',
        question: body.question.trim(),
        history: Array.isArray(body.history) ? body.history : [],
      });
      res.json(reply);
    } catch (error) {
      const status = error instanceof GeminiConfigError ? error.status : 500;
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to reach syntax tutor.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/reference/generate', async (req, res) => {
    try {
      const { uid } = await verifyFirebaseUser(req);
      const body = req.body as Partial<ReferenceGenerateRequest>;
      const languages = (body.languages ?? []).filter((l) =>
        ALLOWED_LANGUAGES.has(l),
      );
      if (!body.topic?.trim() || languages.length === 0) {
        res.status(400).json({
          error: 'A syntax topic and at least one language are required.',
        });
        return;
      }
      const entry = await generateSyntaxReferenceEntry({
        topic: body.topic.trim(),
        category: body.category ?? 'Types & Variables',
        languages,
      });
      res.json({ entry: { ...entry, uid } });
    } catch (error) {
      const status = error instanceof GeminiConfigError ? error.status : 500;
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to generate syntax reference.';
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`recurry server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
