import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GeminiConfigError,
  isTransientGeminiError,
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
