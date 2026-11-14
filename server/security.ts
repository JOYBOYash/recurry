import type { NextFunction, Request, Response } from 'express';
import type {
  LanguageId,
  LearningFocus,
  PaceDepth,
  ReferenceCategory,
  SkillLevel,
  TutorMessage,
} from '../src/types/curriculum.ts';

export const ALLOWED_LANGUAGES = new Set<LanguageId>([
  'sql',
  'java',
  'cpp',
  'python',
  'javascript',
  'ruby',
]);

export const ALLOWED_SKILL_LEVELS = new Set<SkillLevel>([
  'noob',
  'intern',
  'expert',
  'master',
  'legend',
]);

export const ALLOWED_FOCUSES = new Set<LearningFocus>([
  'syntax',
  'problem_solving',
]);

export const ALLOWED_PACES = new Set<PaceDepth>([
  'essentials',
  'comprehensive',
  'complete',
]);

export const ALLOWED_REFERENCE_CATEGORIES = new Set<ReferenceCategory>([
  'Types & Variables',
  'Control Flow',
  'Functions & Closures',
  'Collections & Iteration',
  'OOP & Data Modeling',
  'Errors & Safety',
  'Queries & Concurrency',
]);

export function sanitizeReferenceCategory(value: unknown): ReferenceCategory {
  if (
    typeof value === 'string' &&
    ALLOWED_REFERENCE_CATEGORIES.has(value as ReferenceCategory)
  ) {
    return value as ReferenceCategory;
  }
  return 'Types & Variables';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, number[]>();
  private opsCount = 0;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = Math.max(1, maxRequests);
    this.windowMs = Math.max(1000, windowMs);
  }

  check(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const prev = this.buckets.get(key) ?? [];
    const active = prev.filter((ts) => ts > cutoff);

    if (active.length >= this.maxRequests) {
      const oldest = active[0] ?? now;
      const retryAfterMs = Math.max(1000, oldest + this.windowMs - now);
      this.buckets.set(key, active);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    active.push(now);
    this.buckets.set(key, active);
    this.opsCount += 1;

    if (this.opsCount % 250 === 0) {
      this.prune(now);
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - active.length),
      retryAfterSeconds: 0,
    };
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    for (const [key, timestamps] of this.buckets.entries()) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, active);
      }
    }
  }
}

export function isAllowedOrigin(
  originHeader: string | undefined,
  requestHost: string | undefined,
  configuredOrigins: string[],
): boolean {
  if (!originHeader) return true;

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(originHeader);
  } catch {
    return false;
  }

  if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
    return false;
  }

  if (configuredOrigins.includes(parsedOrigin.origin)) {
    return true;
  }

  if (requestHost) {
    const cleanHost = requestHost.trim().toLowerCase();
    if (parsedOrigin.host.toLowerCase() === cleanHost) {
      return true;
    }
  }

  return false;
}

export function buildContentSecurityPolicy(frameAncestors: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `frame-ancestors ${frameAncestors}`,
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com",
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
    "form-action 'self'",
  ].join('; ');
}

export function securityHeadersMiddleware(options: {
  isProduction: boolean;
  frameAncestors: string;
}) {
  const csp = buildContentSecurityPolicy(options.frameAncestors);

  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
    // Allow Firebase Auth Google Sign-In popups while isolating opener access
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    if (options.isProduction) {
      res.setHeader('Content-Security-Policy', csp);
      const forwardedProto = req.headers['x-forwarded-proto'];
      if (req.secure || forwardedProto === 'https') {
        res.setHeader(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains',
        );
      }
    }

    next();
  };
}

export function apiCorsMiddleware(configuredOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin =
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const host =
      typeof req.headers['x-forwarded-host'] === 'string'
        ? req.headers['x-forwarded-host'].split(',')[0]
        : req.headers.host;

    if (origin) {
      if (!isAllowedOrigin(origin, host, configuredOrigins)) {
        res.status(403).json({ error: 'Origin not allowed.' });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      res.setHeader('Access-Control-Max-Age', '600');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

export function clampString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export function sanitizeStringArray(
  value: unknown,
  maxItems: number,
  maxItemLength: number,
): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      const cleaned = entry.trim().slice(0, maxItemLength);
      if (cleaned) items.push(cleaned);
    }
    if (items.length >= maxItems) break;
  }
  return items;
}

export function sanitizeTutorHistory(value: unknown): TutorMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-6)
    .filter(
      (msg): msg is TutorMessage =>
        Boolean(msg) &&
        typeof msg === 'object' &&
        (msg as TutorMessage).role !== undefined &&
        ((msg as TutorMessage).role === 'user' ||
          (msg as TutorMessage).role === 'assistant') &&
        typeof (msg as TutorMessage).content === 'string',
    )
    .map((msg, idx) => ({
      id: clampString((msg as { id?: unknown }).id, 64) || `hist-${idx}`,
      role: msg.role,
      content: msg.content.trim().slice(0, 1500),
    }))
    .filter((msg) => msg.content.length > 0);
}

export function sanitizeDateKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}
