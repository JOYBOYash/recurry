import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import handler, { normalizeVercelApiUrl } from '../api/index';
import { createApiApp } from './createApp';

test('createApiApp registers /api/health and /api/curriculum/generate without 404', async () => {
  const { app } = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = (await healthRes.json()) as { ok: boolean };
    assert.equal(healthJson.ok, true);

    const genRes = await fetch(`${baseUrl}/api/curriculum/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'javascript' }),
    });
    assert.equal(genRes.status, 401);

    const genTrailingRes = await fetch(`${baseUrl}/api/curriculum/generate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'javascript' }),
    });
    assert.equal(genTrailingRes.status, 401);

    const unknownRes = await fetch(`${baseUrl}/api/does-not-exist`, {
      method: 'POST',
    });
    assert.equal(unknownRes.status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('api/index handler normalizes rewritten Vercel /api/:path* URLs cleanly', async () => {
  assert.equal(
    normalizeVercelApiUrl('/api/index?__apiPath=curriculum/generate'),
    '/api/curriculum/generate',
  );
  assert.equal(
    normalizeVercelApiUrl('/api/index?__apiPath=github/repo&repo=JOYBOYash/recurry'),
    '/api/github/repo?repo=JOYBOYash%2Frecurry',
  );
  assert.equal(normalizeVercelApiUrl('/api/health'), '/api/health');

  const server = http.createServer((req, res) => handler(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthRes = await fetch(`${baseUrl}/api/index?__apiPath=health`);
    assert.equal(healthRes.status, 200);

    const genRes = await fetch(`${baseUrl}/api/index?__apiPath=curriculum/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'javascript' }),
    });
    assert.equal(genRes.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
