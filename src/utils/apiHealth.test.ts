import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkApiHealth,
  DEFAULT_GENERATION_ENDPOINT,
  evaluateApiHealthResponse,
} from './apiHealth';

test('evaluateApiHealthResponse accepts valid 200 JSON health payload', () => {
  const result = evaluateApiHealthResponse(
    200,
    JSON.stringify({
      ok: true,
      endpoint: '/api/curriculum/generate',
      geminiConfigured: true,
      firebaseConfigured: true,
    }),
    'application/json; charset=utf-8',
    24,
  );
  assert.equal(result.reachable, true);
  assert.equal(result.status, 200);
  assert.equal(result.latencyMs, 24);
});

test('evaluateApiHealthResponse rejects 404, HTML fallback, 503, invalid JSON, and unconfigured Gemini', () => {
  const notFound = evaluateApiHealthResponse(404, '{"error":"Not found"}', 'application/json');
  assert.equal(notFound.reachable, false);
  assert.equal(notFound.status, 404);
  assert.match(notFound.reason ?? '', /404/);

  const htmlFallback = evaluateApiHealthResponse(
    200,
    '<!doctype html><html><body>SPA</body></html>',
    'text/html',
  );
  assert.equal(htmlFallback.reachable, false);
  assert.match(htmlFallback.reason ?? '', /HTML/i);

  const serverDown = evaluateApiHealthResponse(
    503,
    JSON.stringify({ ok: false, geminiConfigured: false }),
    'application/json',
  );
  assert.equal(serverDown.reachable, false);
  assert.equal(serverDown.status, 503);
  assert.match(serverDown.reason ?? '', /not configured/i);

  const badJson = evaluateApiHealthResponse(200, 'not-json', 'application/json');
  assert.equal(badJson.reachable, false);

  const okFalse = evaluateApiHealthResponse(
    200,
    JSON.stringify({ ok: false, geminiConfigured: false }),
    'application/json',
  );
  assert.equal(okFalse.reachable, false);
});

test('checkApiHealth pings generation endpoint cleanly and handles network failures and timeouts', async () => {
  let requestedUrl = '';
  let requestedMethod = '';
  const okResult = await checkApiHealth({
    fetchImpl: (async (input, init) => {
      requestedUrl = String(input);
      requestedMethod = init?.method ?? 'GET';
      return new Response(
        JSON.stringify({ ok: true, geminiConfigured: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch,
  });

  assert.equal(requestedUrl, DEFAULT_GENERATION_ENDPOINT);
  assert.equal(requestedMethod, 'GET');
  assert.equal(okResult.reachable, true);
  assert.equal(okResult.status, 200);

  const offlineResult = await checkApiHealth({
    fetchImpl: (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch,
  });
  assert.equal(offlineResult.reachable, false);
  assert.equal(offlineResult.status, null);
  assert.match(offlineResult.reason ?? '', /Unable to reach/i);

  const timeoutResult = await checkApiHealth({
    timeoutMs: 25,
    fetchImpl: ((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      })) as typeof fetch,
  });
  assert.equal(timeoutResult.reachable, false);
  assert.equal(timeoutResult.status, null);
  assert.match(timeoutResult.reason ?? '', /timed out/i);
});
