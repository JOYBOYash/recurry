import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNoHmrViteClientModule,
  shouldEnableViteHmr,
} from './viteClientShim';

test('shouldEnableViteHmr disables HMR by default and only enables when DISABLE_HMR=false', () => {
  assert.equal(shouldEnableViteHmr({}), false);
  assert.equal(shouldEnableViteHmr({ DISABLE_HMR: 'true' }), false);
  assert.equal(shouldEnableViteHmr({ DISABLE_HMR: 'false' }), true);
  assert.equal(shouldEnableViteHmr({ DISABLE_HMR: ' FALSE ' }), true);
});

test('buildNoHmrViteClientModule exports expected Vite client helpers with zero WebSocket calls', async () => {
  const code = buildNoHmrViteClientModule();
  assert.equal(code.includes('WebSocket'), false);
  assert.equal(code.includes('export function updateStyle'), true);
  assert.equal(code.includes('export function removeStyle'), true);
  assert.equal(code.includes('export function createHotContext'), true);
  assert.equal(code.includes('export function injectQuery'), true);
  assert.equal(code.includes('export class ErrorOverlay'), true);

  const dataUrl = `data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`;
  const mod = (await import(dataUrl)) as {
    createHotContext: (url: string) => Record<string, unknown>;
    injectQuery: (url: string, query: string) => string;
    updateStyle: (id: string, css: string) => void;
    removeStyle: (id: string) => void;
  };

  assert.equal(
    mod.injectQuery('/src/App.tsx?foo=1#bar', 't=123'),
    '/src/App.tsx?t=123&foo=1#bar',
  );
  assert.equal(
    mod.injectQuery('https://example.com/a.js', 't=123'),
    'https://example.com/a.js',
  );

  const hot = mod.createHotContext('/src/App.tsx') as {
    accept: () => void;
    prune: () => void;
    dispose: () => void;
    invalidate: () => void;
    on: () => void;
  };
  assert.doesNotThrow(() => {
    hot.accept();
    hot.prune();
    hot.dispose();
    hot.invalidate();
    hot.on();
    mod.updateStyle('test-id', 'body {}');
    mod.removeStyle('test-id');
  });
});
