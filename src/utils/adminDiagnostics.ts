export const ADMIN_DIAGNOSTIC_EMAIL = 'kickstartnetworks@gmail.com';

export function isDiagnosticAdminEmail(email?: string | null): boolean {
  if (typeof email !== 'string') return false;
  return email.trim().toLowerCase() === ADMIN_DIAGNOSTIC_EMAIL;
}

export type ProbeMode =
  | 'public_get'
  | 'auth_get'
  | 'auth_post_validation'
  | 'unauth_post_401';

export interface ApiEndpointDefinition {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  probePath: string;
  probeMode: ProbeMode;
  expectedStatuses: number[];
  purpose: string;
}

export const API_ENDPOINTS: ApiEndpointDefinition[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/api/health',
    probePath: '/api/health',
    probeMode: 'public_get',
    expectedStatuses: [200],
    purpose: 'Public server readiness & env key status',
  },
  {
    id: 'diagnostics',
    method: 'GET',
    path: '/api/diagnostics',
    probePath: '/api/diagnostics',
    probeMode: 'auth_get',
    expectedStatuses: [200],
    purpose: 'Admin-only runtime & Express route inspector',
  },
  {
    id: 'github-repo',
    method: 'GET',
    path: '/api/github/repo',
    probePath: '/api/github/repo',
    probeMode: 'public_get',
    expectedStatuses: [200],
    purpose: 'GitHub repository stargazer proxy',
  },
  {
    id: 'quota',
    method: 'GET',
    path: '/api/quota',
    probePath: '/api/quota',
    probeMode: 'auth_get',
    expectedStatuses: [200],
    purpose: 'Daily curriculum quota lookup',
  },
  {
    id: 'leaderboard',
    method: 'GET',
    path: '/api/leaderboard',
    probePath: '/api/leaderboard',
    probeMode: 'auth_get',
    expectedStatuses: [200],
    purpose: 'Weekly streak & module leaderboard read',
  },
  {
    id: 'leaderboard-sync',
    method: 'POST',
    path: '/api/leaderboard/sync',
    probePath: '/api/leaderboard/sync',
    probeMode: 'unauth_post_401',
    expectedStatuses: [401],
    purpose: 'Leaderboard write gate (verified unauthenticated)',
  },
  {
    id: 'curriculum-generate',
    method: 'POST',
    path: '/api/curriculum/generate',
    probePath: '/api/curriculum/generate',
    probeMode: 'auth_post_validation',
    expectedStatuses: [400],
    purpose: 'NDJSON curriculum generator (validation check)',
  },
  {
    id: 'lesson-expand',
    method: 'POST',
    path: '/api/lesson/expand',
    probePath: '/api/lesson/expand',
    probeMode: 'auth_post_validation',
    expectedStatuses: [400],
    purpose: 'Deep-dive lesson expansion (validation check)',
  },
  {
    id: 'code-evaluate',
    method: 'POST',
    path: '/api/code/evaluate',
    probePath: '/api/code/evaluate',
    probeMode: 'auth_post_validation',
    expectedStatuses: [400],
    purpose: 'AI challenge evaluator (validation check)',
  },
  {
    id: 'tutor-ask',
    method: 'POST',
    path: '/api/tutor/ask',
    probePath: '/api/tutor/ask',
    probeMode: 'auth_post_validation',
    expectedStatuses: [400],
    purpose: 'AI syntax tutor (validation check)',
  },
  {
    id: 'reference-generate',
    method: 'POST',
    path: '/api/reference/generate',
    probePath: '/api/reference/generate',
    probeMode: 'auth_post_validation',
    expectedStatuses: [400],
    purpose: 'Cross-language reference generator (validation check)',
  },
  {
    id: 'algo-problems',
    method: 'GET',
    path: '/api/algo/problems',
    probePath: '/api/algo/problems',
    probeMode: 'auth_get',
    expectedStatuses: [200],
    purpose: 'Algo Mode shared canonical logic library read',
  },
  {
    id: 'algo-decompose',
    method: 'POST',
    path: '/api/algo/decompose',
    probePath: '/api/algo/decompose',
    probeMode: 'auth_post_validation',
    expectedStatuses: [400],
    purpose: 'Algo Mode problem decomposition (validation check)',
  },
  {
    id: 'algo-adapt',
    method: 'POST',
    path: '/api/algo/adapt',
    probePath: '/api/algo/adapt',
    probeMode: 'auth_post_validation',
    expectedStatuses: [400],
    purpose: 'Algo Mode per-language syntax adapter (validation check)',
  },
];

export type EndpointHealthState = 'healthy' | 'unmapped' | 'error';

export interface EndpointProbeResult {
  endpoint: ApiEndpointDefinition;
  state: EndpointHealthState;
  status: number | null;
  latencyMs: number;
  detail: string;
}

export interface DiagnosticLogEntry {
  timestamp: string;
  level: 'ok' | 'warn' | 'error';
  message: string;
}

export function evaluateProbeOutcome(
  endpoint: ApiEndpointDefinition,
  status: number,
  bodyText: string,
  contentType: string,
): { state: EndpointHealthState; detail: string } {
  const trimmed = bodyText.trim();
  const isHtml =
    contentType.includes('text/html') || /^<!doctype|^<html/i.test(trimmed);

  if (status === 404 || isHtml) {
    return {
      state: 'unmapped',
      detail:
        status === 404
          ? 'Returned HTTP 404 (route not mapped)'
          : 'Returned HTML fallback instead of JSON API response',
    };
  }

  let jsonMessage = '';
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; ok?: unknown };
    if (typeof parsed?.error === 'string' && parsed.error.trim()) {
      jsonMessage = parsed.error.trim();
    } else if (parsed?.ok === true) {
      jsonMessage = 'OK';
    }
  } catch {
    return {
      state: 'error',
      detail: `HTTP ${status} returned non-JSON payload`,
    };
  }

  if (endpoint.expectedStatuses.includes(status)) {
    return {
      state: 'healthy',
      detail: jsonMessage
        ? `Mapped · HTTP ${status} (${jsonMessage})`
        : `Mapped · HTTP ${status}`,
    };
  }

  if (status === 429) {
    return {
      state: 'healthy',
      detail: `Mapped · HTTP 429 (rate limiter active)`,
    };
  }

  return {
    state: 'error',
    detail: jsonMessage
      ? `Unexpected HTTP ${status}: ${jsonMessage}`
      : `Unexpected HTTP ${status}`,
  };
}

export function formatDiagnosticReportText(
  results: EndpointProbeResult[],
  logs: DiagnosticLogEntry[],
  runtime?: {
    nodeVersion?: string;
    environment?: string;
    vercel?: boolean;
    geminiConfigured?: boolean;
    firebaseConfigured?: boolean;
    primaryModel?: string;
    fallbackModel?: string;
  } | null,
): string {
  const lines: string[] = [
    `recurry API Diagnostics (${new Date().toISOString()})`,
    runtime
      ? `Runtime: node=${runtime.nodeVersion ?? '?'} env=${runtime.environment ?? '?'} vercel=${String(Boolean(runtime.vercel))} gemini=${String(Boolean(runtime.geminiConfigured))} firebase=${String(Boolean(runtime.firebaseConfigured))}`
      : 'Runtime: unavailable',
    '',
    'Endpoints:',
    ...results.map(
      (r) =>
        `[${r.state.toUpperCase()}] ${r.endpoint.method} ${r.endpoint.path} -> HTTP ${r.status ?? 'ERR'} (${r.latencyMs}ms) — ${r.detail}`,
    ),
    '',
    'Logs:',
    ...logs.map((l) => `${l.timestamp} [${l.level.toUpperCase()}] ${l.message}`),
  ];
  return lines.join('\n');
}
