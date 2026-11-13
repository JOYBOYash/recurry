import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeCode, tokenizeLine } from './syntaxHighlight';

test('tokenizeLine identifies SQL keywords, types, strings, and comments', () => {
  const tokens = tokenizeLine(
    "SELECT COUNT(*) FROM users WHERE role = 'admin' -- active",
    'sql',
  );
  assert.equal(tokens[0].type, 'keyword');
  assert.equal(tokens[0].text, 'SELECT');
  assert.ok(tokens.some((t) => t.type === 'type' && t.text === 'COUNT'));
  assert.ok(tokens.some((t) => t.type === 'string' && t.text === "'admin'"));
  assert.ok(tokens.some((t) => t.type === 'comment' && t.text === '-- active'));
});

test('tokenizeLine identifies Python keywords, functions, and numbers', () => {
  const tokens = tokenizeLine('def area(r: float) -> float: return 3.14 * r', 'python');
  assert.equal(tokens[0].type, 'keyword');
  assert.equal(tokens[0].text, 'def');
  assert.ok(tokens.some((t) => t.type === 'function' && t.text === 'area'));
  assert.ok(tokens.some((t) => t.type === 'type' && t.text === 'float'));
  assert.ok(tokens.some((t) => t.type === 'number' && t.text === '3.14'));
});

test('tokenizeCode handles multi-line C++ and JavaScript snippets', () => {
  const cppLines = tokenizeCode('#include <vector>\nstd::vector<int> nums = {1, 2};', 'cpp');
  assert.equal(cppLines.length, 2);
  assert.equal(cppLines[0][0].type, 'keyword');
  assert.equal(cppLines[0][0].text, '#include');

  const jsLines = tokenizeCode('const sum = (a, b) => a + b;', 'javascript');
  assert.equal(jsLines[0][0].type, 'keyword');
  assert.equal(jsLines[0][0].text, 'const');
});

test('tokenizeLine identifies Ruby keywords, types, strings, and comments', () => {
  const tokens = tokenizeLine('def greet(name) puts "hi #{name}" # ruby', 'ruby');
  assert.equal(tokens[0].type, 'keyword');
  assert.equal(tokens[0].text, 'def');
  assert.ok(tokens.some((t) => t.type === 'function' && t.text === 'greet'));
  assert.ok(tokens.some((t) => t.type === 'type' && t.text === 'puts'));
  assert.ok(tokens.some((t) => t.type === 'comment' && t.text === '# ruby'));
});
