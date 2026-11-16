import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consumeNdjsonStream,
  friendlyGatewayError,
  parseJsonSafely,
} from './apiResponse';

test('parseJsonSafely handles non-JSON gateway text without throwing SyntaxError', () => {
  const result = parseJsonSafely(
    'The page could not be loaded cleanly',
    504,
    'Could not generate curriculum.',
  );
  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    'Request timed out while waiting for the AI server. Please try again.',
  );
});

test('parseJsonSafely extracts server JSON errors and successful payloads cleanly', () => {
  const errResult = parseJsonSafely(
    JSON.stringify({ error: 'Daily limit reached.' }),
    429,
    'Fallback',
  );
  assert.equal(errResult.ok, false);
  assert.equal(errResult.error, 'Daily limit reached.');

  const okResult = parseJsonSafely<{ ok: boolean }>(
    JSON.stringify({ ok: true }),
    200,
    'Fallback',
  );
  assert.equal(okResult.ok, true);
  assert.equal(okResult.data?.ok, true);
});

test('friendlyGatewayError maps proxy status codes cleanly', () => {
  assert.match(friendlyGatewayError(404, 'Err'), /404/);
  assert.match(friendlyGatewayError(502, 'Err'), /timed out/i);
  assert.match(friendlyGatewayError(401, 'Err'), /session expired/i);
  assert.equal(friendlyGatewayError(400, 'Custom error'), 'Custom error');
});

test('parseJsonSafely surfaces 404 diagnostics on plain-text 404 body', () => {
  const result = parseJsonSafely(
    'The page could not be found',
    404,
    'Could not generate curriculum.',
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.match(result.error ?? '', /404/);
});

test('consumeNdjsonStream processes keepalive pings, stages, and final result across chunk boundaries', async () => {
  const encoder = new TextEncoder();
  const payload = [
    JSON.stringify({ type: 'stage', stage: 1 }),
    JSON.stringify({ type: 'ping' }),
    JSON.stringify({ type: 'stage', stage: 2 }),
    JSON.stringify({ type: 'result', track: { id: 'track-1', title: 'JS' } }),
  ].join('\n') + '\n';

  const midpoint = Math.floor(payload.length / 2);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload.slice(0, midpoint)));
      controller.enqueue(encoder.encode(payload.slice(midpoint)));
      controller.close();
    },
  });

  const response = new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  });

  const stages: number[] = [];
  const result = await consumeNdjsonStream<{ id: string; title: string }>(
    response,
    'Fallback error',
    (stage) => stages.push(stage),
  );

  assert.deepEqual(stages, [1, 2]);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.track, { id: 'track-1', title: 'JS' });
});

test('parseJsonSafely detects HTML fallback returned with status 200', () => {
  const result = parseJsonSafely(
    '<!doctype html><html><body>SPA</body></html>',
    200,
    'Could not generate curriculum.',
  );
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /HTML page instead of JSON/i);
});

test('consumeNdjsonStream reports interrupted stream if 200 closes without result', async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'stage', stage: 1 })}\n`));
      controller.close();
    },
  });

  const response = new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  });

  const result = await consumeNdjsonStream<{ id: string }>(
    response,
    'Could not generate curriculum.',
  );
  assert.match(result.error ?? '', /ended before completion/i);
});
