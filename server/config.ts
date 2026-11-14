import fs from 'node:fs';
import path from 'node:path';

export interface ServerConfig {
  port: number;
  host: string;
  isProduction: boolean;
  geminiApiKey: string;
  firebaseApiKey: string;
  firebaseProjectId: string;
  allowedOrigins: string[];
  frameAncestors: string;
  quotaStorePath: string | null;
  trustProxy: boolean | number;
}

interface FallbackFirebaseJson {
  apiKey?: string;
  projectId?: string;
}

function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function parseAllowedOrigins(
  corsOriginEnv?: string,
  appUrlEnv?: string,
): string[] {
  const result = new Set<string>();

  if (corsOriginEnv) {
    for (const part of corsOriginEnv.split(',')) {
      const origin = normalizeOrigin(part);
      if (origin) result.add(origin);
    }
  }

  if (appUrlEnv && appUrlEnv !== 'MY_APP_URL') {
    const origin = normalizeOrigin(appUrlEnv);
    if (origin) result.add(origin);
  }

  return Array.from(result);
}

export function parseTrustProxy(
  rawValue: string | undefined,
  isProduction: boolean,
): boolean | number {
  const clean = rawValue?.trim().toLowerCase();
  if (!clean) {
    return isProduction ? 1 : false;
  }
  if (clean === 'true') return true;
  if (clean === 'false' || clean === '0') return false;
  const num = Number(clean);
  if (Number.isInteger(num) && num > 0) return num;
  return isProduction ? 1 : false;
}

export function readFallbackFirebaseJson(
  baseDir: string,
): FallbackFirebaseJson | null {
  try {
    const raw = fs.readFileSync(
      path.resolve(baseDir, 'firebase-applet-config.json'),
      'utf8',
    );
    const parsed = JSON.parse(raw) as FallbackFirebaseJson;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveServerConfig(
  env: Record<string, string | undefined>,
  fallbackJson?: FallbackFirebaseJson | null,
): ServerConfig {
  const isProduction = env.NODE_ENV === 'production';
  const parsedPort = Number(env.PORT);
  const port =
    Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
      ? parsedPort
      : 3000;

  const host = env.HOST?.trim() || '0.0.0.0';
  const rawGeminiKey = env.GEMINI_API_KEY?.trim() ?? '';
  const geminiApiKey =
    rawGeminiKey && rawGeminiKey !== 'MY_GEMINI_API_KEY' ? rawGeminiKey : '';

  const firebaseApiKey =
    env.FIREBASE_API_KEY?.trim() ||
    env.VITE_FIREBASE_API_KEY?.trim() ||
    fallbackJson?.apiKey?.trim() ||
    '';

  const firebaseProjectId =
    env.FIREBASE_PROJECT_ID?.trim() ||
    env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    fallbackJson?.projectId?.trim() ||
    '';

  const allowedOrigins = parseAllowedOrigins(env.CORS_ORIGIN, env.APP_URL);

  const frameAncestors =
    env.FRAME_ANCESTORS?.trim() ||
    "'self' https://aistudio.google.com https://*.googleusercontent.com";

  const quotaStorePath = env.QUOTA_STORE_PATH?.trim() || null;
  const trustProxy = parseTrustProxy(env.TRUST_PROXY, isProduction);

  return {
    port,
    host,
    isProduction,
    geminiApiKey,
    firebaseApiKey,
    firebaseProjectId,
    allowedOrigins,
    frameAncestors,
    quotaStorePath,
    trustProxy,
  };
}
