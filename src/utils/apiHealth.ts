export type ApiHealthStatus = 'checking' | 'reachable' | 'unreachable';

export interface ApiHealthResult {
  reachable: boolean;
  status: number | null;
  reason?: string;
  latencyMs: number;
}

export interface CheckApiHealthOptions {
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export const DEFAULT_GENERATION_ENDPOINT = '/api/curriculum/generate';
const DEFAULT_HEALTH_TIMEOUT_MS = 5000;

export function evaluateApiHealthResponse(
  status: number,
  bodyText: string,
  contentType: string,
  latencyMs = 0,
): ApiHealthResult {
  const trimmed = bodyText.trim();
  const normalizedType = contentType.toLowerCase();
  const looksLikeHtml =
    normalizedType.includes('text/html') ||
    /^<!doctype|^<html|^</i.test(trimmed);

  if (looksLikeHtml) {
    return {
      reachable: false,
      status,
      latencyMs,
      reason: 'Generation endpoint returned HTML instead of API JSON.',
    };
  }

  if (status === 404) {
    return {
      reachable: false,
      status: 404,
      latencyMs,
      reason: 'Generation endpoint not found (404). Ensure the API server is running.',
    };
  }

  let parsed: {
    ok?: unknown;
    geminiConfigured?: unknown;
    error?: unknown;
  } | null = null;

  if (trimmed) {
    try {
      parsed = JSON.parse(trimmed) as {
        ok?: unknown;
        geminiConfigured?: unknown;
        error?: unknown;
      };
    } catch {
      return {
        reachable: false,
        status,
        latencyMs,
        reason: `Generation endpoint returned invalid JSON (HTTP ${status}).`,
      };
    }
  }

  if (status >= 500 || status < 200) {
    const serverError =
      typeof parsed?.error === 'string' && parsed.error.trim()
        ? parsed.error.trim()
        : parsed?.geminiConfigured === false
          ? 'AI generation service is not configured on the server.'
          : `Generation service unavailable (HTTP ${status}).`;
    return {
      reachable: false,
      status,
      latencyMs,
      reason: serverError,
    };
  }

  if (!parsed) {
    return {
      reachable: false,
      status,
      latencyMs,
      reason: 'Generation endpoint returned an empty health response.',
    };
  }

  if (parsed.ok === false || parsed.geminiConfigured === false) {
    return {
      reachable: false,
      status,
      latencyMs,
      reason:
        typeof parsed.error === 'string' && parsed.error.trim()
          ? parsed.error.trim()
          : 'AI generation service is not ready on the server.',
    };
  }

  if (status >= 200 && status < 300) {
    return {
      reachable: true,
      status,
      latencyMs,
    };
  }

  return {
    reachable: false,
    status,
    latencyMs,
    reason: `Unexpected response from generation endpoint (HTTP ${status}).`,
  };
}

export async function checkApiHealth(
  options?: CheckApiHealthOptions,
): Promise<ApiHealthResult> {
  const endpoint = options?.endpoint ?? DEFAULT_GENERATION_ENDPOINT;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const startedAt = Date.now();
  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    const latencyMs = Math.max(0, Date.now() - startedAt);
    const contentType = response.headers.get('content-type') ?? '';
    const bodyText = await response.text();
    return evaluateApiHealthResponse(
      response.status,
      bodyText,
      contentType,
      latencyMs,
    );
  } catch {
    const latencyMs = Math.max(0, Date.now() - startedAt);
    return {
      reachable: false,
      status: null,
      latencyMs,
      reason: timedOut
        ? 'Generation endpoint timed out. Check your connection or try again.'
        : 'Unable to reach the generation endpoint. Ensure the API server is running.',
    };
  } finally {
    clearTimeout(timer);
  }
}
