import assert from 'node:assert/strict';
import test from 'node:test';
import { ThinkingLevel } from '@google/genai';
import {
  executeWithModelFallbackForCandidates,
  extractJsonText,
  FALLBACK_MODEL_NAME,
  GeminiConfigError,
  getThinkingConfig,
  isTransientGeminiError,
  PRIMARY_MODEL_NAME,
  stripUndefinedDeep,
} from './geminiService';

test('isTransientGeminiError retries transient 503/429/JSON errors and skips auth config errors', () => {
  assert.equal(
    isTransientGeminiError(new Error('503 Service Unavailable high demand')),
    true,
  );
  assert.equal(
    isTransientGeminiError(new Error('429 RESOURCE_EXHAUSTED')),
    true,
  );
  assert.equal(isTransientGeminiError(new SyntaxError('Unexpected end of JSON')), true);

  assert.equal(
    isTransientGeminiError(new GeminiConfigError('Not configured', 503)),
    false,
  );
  assert.equal(
    isTransientGeminiError(new Error('403 PERMISSION_DENIED API_KEY_INVALID')),
    false,
  );
});

test('getThinkingConfig selects MINIMAL for gemini-3.1-flash-lite and LOW for gemini-4-hydrogen', () => {
  assert.deepEqual(getThinkingConfig(PRIMARY_MODEL_NAME), {
    thinkingLevel: ThinkingLevel.MINIMAL,
  });
  assert.deepEqual(getThinkingConfig(FALLBACK_MODEL_NAME), {
    thinkingLevel: ThinkingLevel.LOW,
  });
});

test('extractJsonText strips markdown code fences and surrounding prose safely', () => {
  assert.equal(extractJsonText('```json\n{"ok":true}\n```'), '{"ok":true}');
  assert.equal(
    extractJsonText('Here is the result:\n{"title":"Python","modules":[]}\nDone.'),
    '{"title":"Python","modules":[]}',
  );
  assert.equal(extractJsonText('  [1, 2, 3]  '), '[1, 2, 3]');
});

test('stripUndefinedDeep removes nested undefined properties for Firestore compatibility', () => {
  const cleaned = stripUndefinedDeep({
    id: 'track-1',
    nested: {
      keep: 'ok',
      drop: undefined,
    },
    items: [
      { type: 'multiple_choice', codeSnippet: undefined, options: ['a', 'b'] },
    ],
  });

  assert.equal('drop' in cleaned.nested, false);
  assert.equal(cleaned.nested.keep, 'ok');
  assert.equal('codeSnippet' in cleaned.items[0], false);
  assert.deepEqual(cleaned.items[0].options, ['a', 'b']);
});

test('executeWithModelFallbackForCandidates aborts hung primary and finishes on fallback', async () => {
  let primaryAborted = false;
  const result = await executeWithModelFallbackForCandidates(
    'testOp',
    ['slow-primary', 'fast-fallback'],
    async (model, _attempt, ctx) => {
      if (model === 'slow-primary') {
        await new Promise((_resolve, reject) => {
          ctx.signal.addEventListener(
            'abort',
            () => {
              primaryAborted = true;
              reject(new Error('aborted'));
            },
            { once: true },
          );
        });
      }
      ctx.markFirstToken();
      return `ok:${model}`;
    },
    {
      primaryFirstTokenMs: 40,
      primaryMaxTotalMs: 200,
      fallbackFirstTokenMs: 200,
      fallbackMaxTotalMs: 400,
      retryBaseDelayMs: 5,
    },
  );

  assert.equal(primaryAborted, true);
  assert.equal(result, 'ok:fast-fallback');
});

test('executeWithModelFallbackForCandidates retries transient 503 with configured backoff', async () => {
  const attempts: Array<{ model: string; attempt: number }> = [];
  const start = Date.now();
  const result = await executeWithModelFallbackForCandidates(
    'retryOp',
    ['model-a', 'model-a', 'model-b'],
    async (model, attempt, ctx) => {
      attempts.push({ model, attempt });
      if (attempt < 3) {
        throw new Error('503 Service Unavailable');
      }
      ctx.markFirstToken();
      return `recovered:${model}`;
    },
    {
      retryBaseDelayMs: 10,
    },
  );

  assert.equal(result, 'recovered:model-b');
  assert.deepEqual(attempts, [
    { model: 'model-a', attempt: 1 },
    { model: 'model-a', attempt: 2 },
    { model: 'model-b', attempt: 3 },
  ]);
  assert.ok(Date.now() - start >= 20);
});

test('executeWithModelFallbackForCandidates allows primary to finish once first token arrives', async () => {
  const result = await executeWithModelFallbackForCandidates(
    'testStreamOp',
    ['streaming-primary', 'fallback'],
    async (model, _attempt, ctx) => {
      await new Promise((r) => setTimeout(r, 15));
      ctx.markFirstToken();
      await new Promise((r) => setTimeout(r, 60));
      return `completed:${model}`;
    },
    {
      primaryFirstTokenMs: 40,
      primaryMaxTotalMs: 300,
    },
  );

  assert.equal(result, 'completed:streaming-primary');
});
