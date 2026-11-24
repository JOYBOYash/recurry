import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_DIAGNOSTIC_EMAIL,
  API_ENDPOINTS,
  evaluateProbeOutcome,
  formatDiagnosticReportText,
  isDiagnosticAdminEmail,
} from './adminDiagnostics';

test('isDiagnosticAdminEmail restricts access strictly to kickstartnetworks@gmail.com', () => {
  assert.equal(isDiagnosticAdminEmail(ADMIN_DIAGNOSTIC_EMAIL), true);
  assert.equal(isDiagnosticAdminEmail('  KickstartNetworks@gmail.com '), true);
  assert.equal(isDiagnosticAdminEmail('instinstsincbusiness@gmail.com'), false);
  assert.equal(isDiagnosticAdminEmail('admin@gmail.com'), false);
  assert.equal(isDiagnosticAdminEmail(''), false);
  assert.equal(isDiagnosticAdminEmail(null), false);
  assert.equal(isDiagnosticAdminEmail(undefined), false);
});

test('API_ENDPOINTS covers health, diagnostics, and curriculum generation endpoints', () => {
  const paths = API_ENDPOINTS.map((e) => `${e.method} ${e.path}`);
  assert.ok(paths.includes('GET /api/health'));
  assert.ok(paths.includes('GET /api/diagnostics'));
  assert.ok(paths.includes('POST /api/curriculum/generate'));
  assert.ok(paths.includes('POST /api/code/evaluate'));
  assert.ok(paths.includes('POST /api/lesson/expand'));
  assert.ok(paths.includes('POST /api/tutor/ask'));
  assert.ok(paths.includes('POST /api/reference/generate'));
  assert.ok(paths.includes('GET /api/algo/problems'));
  assert.ok(paths.includes('POST /api/algo/decompose'));
  assert.ok(paths.includes('POST /api/algo/adapt'));
});

test('evaluateProbeOutcome distinguishes mapped routes, 404/HTML unmapped routes, and 5xx errors', () => {
  const genDef = API_ENDPOINTS.find((e) => e.id === 'curriculum-generate')!;

  const healthy = evaluateProbeOutcome(
    genDef,
    400,
    JSON.stringify({ error: 'Select a valid language.' }),
    'application/json',
  );
  assert.equal(healthy.state, 'healthy');

  const unmapped404 = evaluateProbeOutcome(
    genDef,
    404,
    'The page could not be found',
    'text/plain',
  );
  assert.equal(unmapped404.state, 'unmapped');

  const unmappedHtml = evaluateProbeOutcome(
    genDef,
    200,
    '<!doctype html><html><body>App</body></html>',
    'text/html',
  );
  assert.equal(unmappedHtml.state, 'unmapped');

  const serverErr = evaluateProbeOutcome(
    genDef,
    502,
    JSON.stringify({ error: 'Upstream failed' }),
    'application/json',
  );
  assert.equal(serverErr.state, 'error');
});

test('formatDiagnosticReportText produces readable log output', () => {
  const healthDef = API_ENDPOINTS[0];
  const text = formatDiagnosticReportText(
    [
      {
        endpoint: healthDef,
        state: 'healthy',
        status: 200,
        latencyMs: 14,
        detail: 'Mapped · HTTP 200 (OK)',
      },
    ],
    [{ timestamp: '2026-11-17T00:00:00.000Z', level: 'ok', message: 'Probe complete' }],
    {
      nodeVersion: 'v22.23.2',
      environment: 'production',
      vercel: true,
      geminiConfigured: true,
      firebaseConfigured: true,
    },
  );
  assert.match(text, /GET \/api\/health -> HTTP 200/);
  assert.match(text, /vercel=true/);
});
