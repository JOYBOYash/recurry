import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from './languages';
import {
  FAQ_ITEMS,
  REPO_CLONE_COMMAND,
  REPO_MODULES,
  getLanguageShowcase,
} from './landingContent';
import { tokenizeCode } from '../utils/syntaxHighlight';

test('every supported language (all 6 including Ruby) has a populated showcase snippet', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 6);
  assert.ok(SUPPORTED_LANGUAGES.some((l) => l.id === 'ruby'));
  for (const lang of SUPPORTED_LANGUAGES) {
    const showcase = getLanguageShowcase(lang.id);
    assert.equal(showcase.language, lang.id);
    assert.ok(showcase.filename.length > 3);
    assert.ok(showcase.headline.length > 5);
    assert.ok(showcase.code.trim().split('\n').length >= 5);

    const lines = tokenizeCode(showcase.code, lang.id);
    assert.ok(lines.length >= 5);
    assert.ok(lines.some((line) => line.some((tok) => tok.type === 'keyword')));
  }
});

test('FAQ items and repository architecture modules are concise and non-empty', () => {
  assert.ok(FAQ_ITEMS.length >= 4);
  for (const faq of FAQ_ITEMS) {
    assert.ok(faq.id.length > 0);
    assert.ok(faq.question.endsWith('?'));
    assert.ok(faq.answer.length > 20);
  }

  assert.ok(REPO_CLONE_COMMAND.startsWith('git clone https://'));
  assert.ok(REPO_MODULES.length >= 3);
  for (const mod of REPO_MODULES) {
    assert.ok(mod.path.length > 0);
    assert.ok(mod.testFile.endsWith('.test.ts'));
    assert.ok(mod.snippet.trim().length > 15);
  }
});
