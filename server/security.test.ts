import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAllowedOrigins,
  parseTrustProxy,
  resolveServerConfig,
} from './config.ts';
import {
  buildContentSecurityPolicy,
  clampString,
  hashOpaqueUserId,
  isAllowedOrigin,
  sanitizeDateKey,
  sanitizeReferenceCategory,
  sanitizeStringArray,
  sanitizeTutorHistory,
  SlidingWindowRateLimiter,
  validateImageMagicBytes,
} from './security.ts';
import {
  releaseUserDailyQuota,
  reserveUserDailyQuota,
} from './store.ts';
import { resolveFirebaseClientConfig } from '../src/utils/firebaseConfig.ts';

test('resolveFirebaseClientConfig prefers VITE_FIREBASE_* env vars over fallback JSON', () => {
  const resolved = resolveFirebaseClientConfig(
    {
      VITE_FIREBASE_API_KEY: 'env-api-key',
      VITE_FIREBASE_PROJECT_ID: 'my-prod-project',
      VITE_FIREBASE_APP_ID: '1:999:web:abc',
    },
    {
      apiKey: 'fallback-key',
      projectId: 'fallback-project',
      appId: '1:111:web:xyz',
      firestoreDatabaseId: 'ai-studio-named-db',
    },
  );

  assert.equal(resolved.source, 'env');
  assert.equal(resolved.firebaseConfig.apiKey, 'env-api-key');
  assert.equal(resolved.firebaseConfig.projectId, 'my-prod-project');
  assert.equal(resolved.firebaseConfig.authDomain, 'my-prod-project.firebaseapp.com');
  assert.equal(resolved.databaseId, undefined);
});

test('resolveFirebaseClientConfig uses fallback config cleanly when env vars are unset', () => {
  const resolved = resolveFirebaseClientConfig(
    {},
    {
      apiKey: 'fallback-key',
      projectId: 'fallback-project',
      appId: '1:111:web:xyz',
      firestoreDatabaseId: 'ai-studio-named-db',
    },
  );

  assert.equal(resolved.source, 'fallback');
  assert.equal(resolved.firebaseConfig.apiKey, 'fallback-key');
  assert.equal(resolved.databaseId, 'ai-studio-named-db');
});

test('resolveFirebaseClientConfig treats "(default)" database ID as undefined', () => {
  const resolved = resolveFirebaseClientConfig({
    VITE_FIREBASE_API_KEY: 'env-api-key',
    VITE_FIREBASE_PROJECT_ID: 'my-prod-project',
    VITE_FIREBASE_APP_ID: '1:999:web:abc',
    VITE_FIREBASE_DATABASE_ID: '(default)',
  });
  assert.equal(resolved.databaseId, undefined);
});

test('resolveServerConfig prefers process.env over fallback JSON and rejects placeholder keys', () => {
  const cfg = resolveServerConfig(
    {
      NODE_ENV: 'production',
      PORT: '8080',
      GEMINI_API_KEY: 'MY_GEMINI_API_KEY',
      FIREBASE_API_KEY: 'prod-firebase-key',
      APP_URL: 'https://recurry.example.com/dashboard',
      CORS_ORIGIN: 'https://admin.example.com, invalid-url',
    },
    { apiKey: 'fallback-key', projectId: 'fallback-proj' },
  );

  assert.equal(cfg.isProduction, true);
  assert.equal(cfg.port, 8080);
  assert.equal(cfg.geminiApiKey, '');
  assert.equal(cfg.firebaseApiKey, 'prod-firebase-key');
  assert.equal(cfg.firebaseProjectId, 'fallback-proj');
  assert.deepEqual(cfg.allowedOrigins, [
    'https://admin.example.com',
    'https://recurry.example.com',
  ]);
  assert.equal(cfg.trustProxy, 1);
});

test('parseAllowedOrigins and parseTrustProxy handle edge inputs safely', () => {
  assert.deepEqual(
    parseAllowedOrigins('javascript:alert(1), https://app.test:3000/path', 'MY_APP_URL'),
    ['https://app.test:3000'],
  );
  assert.equal(parseTrustProxy('false', true), false);
  assert.equal(parseTrustProxy('2', false), 2);
  assert.equal(parseTrustProxy(undefined, false), false);
});

test('isAllowedOrigin permits same-host and configured origins while blocking third-party origins', () => {
  assert.equal(isAllowedOrigin(undefined, 'recurry.com', []), true);
  assert.equal(isAllowedOrigin('https://recurry.com', 'recurry.com', []), true);
  assert.equal(
    isAllowedOrigin('https://cdn.recurry.com', 'recurry.com', ['https://cdn.recurry.com']),
    true,
  );
  assert.equal(isAllowedOrigin('https://evil.example', 'recurry.com', []), false);
  assert.equal(isAllowedOrigin('not-a-url', 'recurry.com', []), false);
});

test('SlidingWindowRateLimiter enforces limits and recovers after window expires', () => {
  const limiter = new SlidingWindowRateLimiter(2, 10_000);

  const r1 = limiter.check('u1', 1_000);
  const r2 = limiter.check('u1', 2_000);
  const r3 = limiter.check('u1', 3_000);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 1);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 0);
  assert.equal(r3.allowed, false);
  assert.ok(r3.retryAfterSeconds >= 8);

  const r4 = limiter.check('u1', 12_000);
  assert.equal(r4.allowed, true);
});

test('input sanitizers bound strings, arrays, tutor history, dates, and CSP', () => {
  assert.equal(clampString('  hello world  ', 5), 'hello');
  assert.equal(clampString(123, 10), '');

  assert.deepEqual(
    sanitizeStringArray(['  a ', 42, '', 'bbbbbb'], 2, 3),
    ['a', 'bbb'],
  );

  const history = sanitizeTutorHistory([
    { id: 'm1', role: 'user', content: 'hi' },
    { role: 'system', content: 'ignored' },
    { role: 'assistant', content: 'hello' },
  ]);
  assert.deepEqual(history, [
    { id: 'm1', role: 'user', content: 'hi' },
    { id: 'hist-1', role: 'assistant', content: 'hello' },
  ]);

  assert.equal(sanitizeReferenceCategory('Control Flow'), 'Control Flow');
  assert.equal(sanitizeReferenceCategory('Injected Category'), 'Types & Variables');

  assert.equal(sanitizeDateKey('2026-11-14'), '2026-11-14');
  assert.equal(sanitizeDateKey('2026/11/14'), undefined);

  const csp = buildContentSecurityPolicy("'self'");
  assert.match(csp, /frame-ancestors 'self'/);
  assert.match(csp, /object-src 'none'/);
});

test('validateImageMagicBytes accepts valid PNG/JPEG/WebP and rejects spoofed payloads', () => {
  const validPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]).toString('base64');
  assert.equal(validateImageMagicBytes(validPng, 'image/png', 1024).valid, true);

  const validJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]).toString('base64');
  assert.equal(validateImageMagicBytes(validJpeg, 'image/jpeg', 1024).valid, true);

  const validWebp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]).toString('base64');
  assert.equal(validateImageMagicBytes(validWebp, 'image/webp', 1024).valid, true);

  const spoofedHtml = Buffer.from('<script>alert(1)</script>').toString('base64');
  assert.equal(validateImageMagicBytes(spoofedHtml, 'image/png', 1024).valid, false);
  assert.equal(validateImageMagicBytes(spoofedHtml, 'image/jpeg', 1024).valid, false);
  assert.equal(validateImageMagicBytes('not!valid!base64!', 'image/png', 1024).valid, false);
  assert.equal(validateImageMagicBytes(validPng, 'image/png', 8).valid, false);
});

test('hashOpaqueUserId masks internal Firebase UIDs deterministically', () => {
  const masked = hashOpaqueUserId('real-firebase-uid-123');
  assert.ok(masked.startsWith('learner-'));
  assert.notEqual(masked, 'real-firebase-uid-123');
  assert.equal(masked, hashOpaqueUserId('real-firebase-uid-123'));
});

test('reserveUserDailyQuota prevents concurrent quota race bypass and releases cleanly on error', async () => {
  const uid = `race-test-${Date.now()}`;
  const first = await reserveUserDailyQuota(uid);
  assert.equal(first.reserved, true);
  assert.equal(first.inFlight, false);

  const concurrent = await reserveUserDailyQuota(uid);
  assert.equal(concurrent.reserved, false);
  assert.equal(concurrent.inFlight, true);

  releaseUserDailyQuota(uid, first.todayKey);
  const retry = await reserveUserDailyQuota(uid);
  assert.equal(retry.reserved, true);
  releaseUserDailyQuota(uid, retry.todayKey);
});
