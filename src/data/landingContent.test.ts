import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

test('index.html includes valid Organization and FAQPage JSON-LD synced with FAQ_ITEMS and OpenGraph tags', () => {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
  assert.match(html, /rel="icon"[^>]+href="\/assets\/images\/app-logo\.png"/);
  assert.match(html, /property="og:image"[^>]+og-preview\.jpg/);
  assert.match(html, /name="twitter:card"\s+content="summary_large_image"/);

  const jsonLdMatch = html.match(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
  );
  assert.ok(jsonLdMatch, 'Expected application/ld+json script in index.html');
  const parsed = JSON.parse(jsonLdMatch[1]) as {
    '@graph': Array<Record<string, unknown>>;
  };
  const types = parsed['@graph'].map((entry) => entry['@type']);
  assert.ok(types.includes('Organization'));
  assert.ok(types.includes('WebApplication'));
  assert.ok(types.includes('FAQPage'));

  const faqSchema = parsed['@graph'].find((e) => e['@type'] === 'FAQPage') as {
    mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
  };
  assert.equal(faqSchema.mainEntity.length, FAQ_ITEMS.length);
  for (let i = 0; i < FAQ_ITEMS.length; i += 1) {
    assert.equal(faqSchema.mainEntity[i].name, FAQ_ITEMS[i].question);
    assert.equal(
      faqSchema.mainEntity[i].acceptedAnswer.text,
      FAQ_ITEMS[i].answer,
    );
  }
});
