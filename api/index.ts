import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../server/createApp.ts';

const { app } = createApiApp();

export function normalizeVercelApiUrl(rawUrl: string | undefined): string {
  const url = new URL(rawUrl || '/', 'http://localhost');
  const rewrittenPath = url.searchParams.get('__apiPath');
  if (rewrittenPath !== null) {
    url.searchParams.delete('__apiPath');
    const safeSegments = rewrittenPath
      .replace(/\\/g, '/')
      .split('/')
      .filter((seg) => seg.length > 0 && seg !== '.' && seg !== '..');
    const cleanPath = safeSegments.join('/');
    const qs = url.searchParams.toString();
    return `/api/${cleanPath}${qs ? `?${qs}` : ''}`;
  }
  return rawUrl || '/';
}

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  req.url = normalizeVercelApiUrl(req.url);
  return new Promise<void>((resolve) => {
    const done = () => {
      res.off('finish', done);
      res.off('close', done);
      resolve();
    };
    res.on('finish', done);
    res.on('close', done);
    (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
      req,
      res,
    );
  });
}
