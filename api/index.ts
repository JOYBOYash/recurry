import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../server/createApp.ts';

const { app } = createApiApp();

export function normalizeVercelApiUrl(rawUrl: string | undefined): string {
  const url = new URL(rawUrl || '/', 'http://localhost');
  const rewrittenPath = url.searchParams.get('__apiPath');
  if (rewrittenPath !== null) {
    url.searchParams.delete('__apiPath');
    const cleanPath = rewrittenPath.replace(/^\/+/, '');
    const qs = url.searchParams.toString();
    return `/api/${cleanPath}${qs ? `?${qs}` : ''}`;
  }
  return rawUrl || '/';
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  req.url = normalizeVercelApiUrl(req.url);
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res,
  );
}
