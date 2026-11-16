export interface SafeJsonResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export type NdjsonStreamEvent<T> =
  | { type: 'stage'; stage: number }
  | { type: 'ping' }
  | { type: 'result'; track: T; quota?: unknown }
  | { type: 'error'; error: string };

export function friendlyGatewayError(status: number, fallbackError: string): string {
  if (status === 404) {
    return 'Generation endpoint not found (404). Refresh the page or ensure the API server is running.';
  }
  if (status === 504 || status === 502) {
    return 'Request timed out while waiting for the AI server. Please try again.';
  }
  if (status === 503) {
    return 'Service is temporarily unavailable. Please try again shortly.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status === 401 || status === 403) {
    return 'Your session expired. Please sign in again.';
  }
  return fallbackError;
}

export function parseJsonSafely<T>(
  rawText: string,
  status: number,
  fallbackError: string,
): SafeJsonResult<T> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      ok: false,
      status,
      error: friendlyGatewayError(status, fallbackError),
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as T & { error?: unknown };
    if (status < 200 || status >= 300) {
      const serverMsg =
        typeof parsed?.error === 'string' && parsed.error.trim()
          ? parsed.error.trim()
          : friendlyGatewayError(status, fallbackError);
      return { ok: false, status, data: parsed, error: serverMsg };
    }
    return { ok: true, status, data: parsed };
  } catch {
    return {
      ok: false,
      status,
      error: friendlyGatewayError(status, fallbackError),
    };
  }
}

export async function parseApiJson<T>(
  response: Response,
  fallbackError: string,
): Promise<SafeJsonResult<T>> {
  const rawText = await response.text();
  return parseJsonSafely<T>(rawText, response.status, fallbackError);
}

export async function consumeNdjsonStream<T>(
  response: Response,
  fallbackError: string,
  onStage?: (stage: number) => void,
): Promise<{ track?: T; quota?: unknown; error?: string }> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/x-ndjson') || !response.body) {
    const parsed = await parseApiJson<{
      track?: T;
      quota?: unknown;
      error?: string;
    }>(response, fallbackError);
    if (!parsed.ok || !parsed.data) {
      return { error: parsed.error ?? fallbackError };
    }
    return {
      track: parsed.data.track,
      quota: parsed.data.quota,
      error: parsed.data.error,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let resultTrack: T | undefined;
  let resultQuota: unknown;
  let streamError: string | undefined;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const event = JSON.parse(trimmed) as NdjsonStreamEvent<T>;
      if (event.type === 'stage' && typeof event.stage === 'number') {
        onStage?.(event.stage);
      } else if (event.type === 'result') {
        resultTrack = event.track;
        resultQuota = event.quota;
      } else if (event.type === 'error') {
        streamError = event.error || fallbackError;
      }
    } catch {
      // Ignore malformed/partial keepalive lines cleanly
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIdx = buffer.indexOf('\n');
    while (newlineIdx !== -1) {
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      processLine(line);
      newlineIdx = buffer.indexOf('\n');
    }
  }

  const tail = buffer + decoder.decode();
  if (tail.trim()) {
    processLine(tail);
  }

  if (streamError) {
    return { error: streamError };
  }
  if (!resultTrack) {
    return { error: friendlyGatewayError(response.status, fallbackError) };
  }
  return { track: resultTrack, quota: resultQuota };
}
