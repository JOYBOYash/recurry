import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

test('firestore.rules enforces global deny-by-default and rules_version 2', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2'/);
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;\s*\}/);
});

test('firestore.rules enforces ID poisoning guard and temporal integrity', () => {
  assert.match(rulesContent, /function isValidId\(id\)/);
  assert.match(rulesContent, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesContent, /incoming\(\)\.updatedAt == request\.time/);
});

test('firestore.rules enforces action-based updates, 1/day quota cap, and certificate immutability', () => {
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly/);
  assert.match(rulesContent, /data\.dailyGenerationCount <= 1/);
  assert.match(rulesContent, /data\.stars >= 1\s*&&\s*data\.stars <= 5/);
  assert.match(rulesContent, /match \/certificates\/\{certId\}[\s\S]*allow update, delete:\s*if false;/);
});

test('firestore.rules enforces owner-scoped list queries without client delegation', () => {
  assert.match(rulesContent, /allow list:\s*if isOwner\(userId\)\s*&&\s*existing\(\)\.uid == request\.auth\.uid;/);
});
