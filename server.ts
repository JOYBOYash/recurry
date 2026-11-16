import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'node:http';
import path from 'node:path';
import { createApiApp } from './server/createApp.ts';
import {
  buildNoHmrViteClientModule,
  shouldEnableViteHmr,
} from './server/viteClientShim.ts';

async function startServer() {
  const { app, config, projectRoot } = createApiApp();
  const httpServer = http.createServer(app);

  if (!config.isProduction) {
    const hmrEnabled = shouldEnableViteHmr(process.env);
    if (!hmrEnabled) {
      const noHmrClient = buildNoHmrViteClientModule();
      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(noHmrClient);
      });
    }

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrEnabled ? { server: httpServer } : false,
        ws: hmrEnabled ? undefined : false,
        watch: hmrEnabled ? {} : null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(projectRoot, 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '1y',
        immutable: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server] Unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  httpServer.listen(config.port, config.host, () => {
    console.log(
      `recurry server listening on http://${config.host}:${config.port} (${config.isProduction ? 'production' : 'development'})`,
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
