import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';
import {
  API_ENDPOINTS,
  evaluateProbeOutcome,
  formatDiagnosticReportText,
  isDiagnosticAdminEmail,
  type DiagnosticLogEntry,
  type EndpointProbeResult,
} from '../utils/adminDiagnostics';

interface DiagnosticsServerResponse {
  ok: boolean;
  adminEmail: string;
  timestamp: string;
  runtime: {
    nodeVersion: string;
    environment: string;
    vercel: boolean;
    geminiConfigured: boolean;
    firebaseConfigured: boolean;
    primaryModel: string;
    fallbackModel: string;
  };
  registeredRoutes: Array<{ path: string; methods: string[] }>;
}

export function DiagnosticsPage() {
  const { user, getIdToken } = useAppAuth();
  const isAdmin = isDiagnosticAdminEmail(user?.email);

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<EndpointProbeResult[]>([]);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [serverInfo, setServerInfo] = useState<DiagnosticsServerResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const hasRunRef = useRef(false);

  const runProbes = useCallback(async () => {
    if (!isAdmin) return;
    setRunning(true);
    const nextLogs: DiagnosticLogEntry[] = [];
    const pushLog = (level: DiagnosticLogEntry['level'], message: string) => {
      nextLogs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
      });
    };

    pushLog('ok', `Starting API route diagnostic sweep (${API_ENDPOINTS.length} endpoints).`);

    let token = '';
    try {
      token = await getIdToken();
      pushLog('ok', 'Acquired Firebase ID token for authenticated route verification.');
    } catch (err) {
      pushLog(
        'error',
        `Unable to acquire Firebase ID token: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    const probeResults: EndpointProbeResult[] = [];
    let nextServerInfo: DiagnosticsServerResponse | null = null;

    for (const endpoint of API_ENDPOINTS) {
      const started = performance.now();
      try {
        const headers: Record<string, string> = {};
        let body: string | undefined;

        if (
          endpoint.probeMode === 'auth_get' ||
          endpoint.probeMode === 'auth_post_validation'
        ) {
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
        }
        if (endpoint.method === 'POST') {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({});
        }

        const response = await fetch(endpoint.probePath, {
          method: endpoint.method,
          headers,
          body,
        });
        const latencyMs = Math.round(performance.now() - started);
        const contentType = response.headers.get('content-type') ?? '';
        const text = await response.text();

        if (endpoint.id === 'diagnostics' && response.ok) {
          try {
            nextServerInfo = JSON.parse(text) as DiagnosticsServerResponse;
          } catch {
            // Handled below by evaluateProbeOutcome
          }
        }

        const outcome = evaluateProbeOutcome(
          endpoint,
          response.status,
          text,
          contentType,
        );

        probeResults.push({
          endpoint,
          state: outcome.state,
          status: response.status,
          latencyMs,
          detail: outcome.detail,
        });

        pushLog(
          outcome.state === 'healthy' ? 'ok' : outcome.state === 'unmapped' ? 'error' : 'warn',
          `${endpoint.method} ${endpoint.path} -> ${response.status} (${latencyMs}ms) — ${outcome.detail}`,
        );
      } catch (err) {
        const latencyMs = Math.round(performance.now() - started);
        const msg = err instanceof Error ? err.message : 'Network error';
        probeResults.push({
          endpoint,
          state: 'error',
          status: null,
          latencyMs,
          detail: msg,
        });
        pushLog('error', `${endpoint.method} ${endpoint.path} failed (${latencyMs}ms): ${msg}`);
      }
    }

    // Verify unmatched /api fallback returns 404 JSON instead of HTML
    const fallbackStart = performance.now();
    try {
      const fallbackRes = await fetch('/api/__diagnostic_nonexistent_route');
      const fallbackMs = Math.round(performance.now() - fallbackStart);
      const ct = fallbackRes.headers.get('content-type') ?? '';
      if (fallbackRes.status === 404 && ct.includes('application/json')) {
        pushLog(
          'ok',
          `Fallback check GET /api/__diagnostic_nonexistent_route -> 404 JSON (${fallbackMs}ms).`,
        );
      } else {
        pushLog(
          'warn',
          `Fallback check returned HTTP ${fallbackRes.status} (${ct || 'unknown content-type'}).`,
        );
      }
    } catch (err) {
      pushLog(
        'error',
        `Fallback route check error: ${err instanceof Error ? err.message : 'Network error'}`,
      );
    }

    setServerInfo(nextServerInfo);
    setResults(probeResults);
    setLogs(nextLogs);
    setRunning(false);
  }, [isAdmin, getIdToken]);

  useEffect(() => {
    if (isAdmin && !hasRunRef.current) {
      hasRunRef.current = true;
      void runProbes();
    }
  }, [isAdmin, runProbes]);

  if (!isAdmin) {
    return <Navigate to="/app/curriculums" replace />;
  }

  const healthyCount = results.filter((r) => r.state === 'healthy').length;
  const unmappedCount = results.filter((r) => r.state === 'unmapped').length;
  const errorCount = results.filter((r) => r.state === 'error').length;

  const handleCopyLog = async () => {
    const report = formatDiagnosticReportText(results, logs, serverInfo?.runtime);
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            API Diagnostics
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Endpoint mapping, auth gates, and live runtime health checks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyLog}
            disabled={logs.length === 0}
            className="btn-juice inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-200 dark:hover:bg-[#202020]"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{copied ? 'Copied' : 'Copy Log'}</span>
          </button>

          <button
            type="button"
            onClick={() => void runProbes()}
            disabled={running}
            className="btn-juice inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{running ? 'Probing...' : 'Run Checks'}</span>
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#181818]">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Mapped Endpoints
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-950 tabular-nums dark:text-white">
            {healthyCount}/{API_ENDPOINTS.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            {unmappedCount > 0
              ? `${unmappedCount} unmapped`
              : errorCount > 0
                ? `${errorCount} returned errors`
                : 'All routes reachable'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#181818]">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Runtime Environment
          </div>
          <div className="mt-1.5 font-mono text-lg font-bold text-slate-950 dark:text-white">
            {serverInfo
              ? `${serverInfo.runtime.environment}${serverInfo.runtime.vercel ? ' · Vercel' : ''}`
              : running
                ? 'Checking...'
                : 'Unavailable'}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500 dark:text-neutral-400">
            {serverInfo
              ? `${serverInfo.runtime.nodeVersion} · ${serverInfo.runtime.primaryModel}`
              : 'Waiting for /api/diagnostics'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#181818]">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Server Configuration
          </div>
          <div className="mt-1.5 font-mono text-lg font-bold text-slate-950 dark:text-white">
            {serverInfo
              ? serverInfo.runtime.geminiConfigured && serverInfo.runtime.firebaseConfigured
                ? 'Ready'
                : 'Partial'
              : running
                ? 'Checking...'
                : 'Unknown'}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500 dark:text-neutral-400">
            {serverInfo
              ? `Gemini: ${serverInfo.runtime.geminiConfigured ? 'OK' : 'Missing'} · Firebase: ${serverInfo.runtime.firebaseConfigured ? 'OK' : 'Missing'}`
              : 'Admin verified via Bearer token'}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>API Endpoint Matrix</span>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
            {API_ENDPOINTS.length} routes
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
          {(results.length > 0
            ? results
            : API_ENDPOINTS.map((endpoint) => ({
                endpoint,
                state: 'healthy' as const,
                status: null,
                latencyMs: 0,
                detail: 'Pending probe...',
              }))
          ).map(({ endpoint, state, status, latencyMs, detail }) => {
            const isHealthy = status !== null && state === 'healthy';
            const isUnmapped = state === 'unmapped';
            return (
              <div
                key={endpoint.id}
                className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200">
                      {endpoint.method}
                    </span>
                    <code className="font-mono text-xs font-semibold text-slate-950 dark:text-white">
                      {endpoint.path}
                    </code>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {endpoint.purpose}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {status !== null && (
                    <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
                      {latencyMs}ms
                    </span>
                  )}

                  {status === null ? (
                    <span className="font-mono text-xs text-slate-400 dark:text-neutral-500">
                      {detail}
                    </span>
                  ) : isHealthy ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>HTTP {status}</span>
                    </span>
                  ) : isUnmapped ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-red-700 tabular-nums dark:text-red-400">
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Unmapped ({status})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>HTTP {status}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-neutral-800">
          <span className="text-sm font-bold text-slate-950 dark:text-white">
            Diagnostic Log
          </span>
          <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
            {logs.length} entries
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto bg-slate-50/50 p-4 font-mono text-xs leading-relaxed dark:bg-[#141414]">
          {logs.length === 0 ? (
            <div className="text-slate-500 dark:text-neutral-500">
              {running ? 'Running live endpoint probes...' : 'No diagnostic entries yet.'}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {logs.map((entry, idx) => (
                <li
                  key={`${entry.timestamp}-${idx}`}
                  className={
                    entry.level === 'error'
                      ? 'text-red-700 dark:text-red-400'
                      : entry.level === 'warn'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-700 dark:text-neutral-300'
                  }
                >
                  <span className="text-slate-400 dark:text-neutral-500">
                    {entry.timestamp.slice(11, 19)}
                  </span>{' '}
                  {entry.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
