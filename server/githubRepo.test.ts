import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatGitHubStars,
  parseGitHubRepoSlug,
} from './githubRepo';

test('parseGitHubRepoSlug defaults safely and accepts valid owner/repo slugs', () => {
  assert.equal(parseGitHubRepoSlug(), 'JOYBOYash/recurry');
  assert.equal(parseGitHubRepoSlug('invalid slug!'), 'JOYBOYash/recurry');
  assert.equal(parseGitHubRepoSlug('octocat/Hello-World'), 'octocat/Hello-World');
});

test('formatGitHubStars formats raw counts and compact thousands cleanly', () => {
  assert.equal(formatGitHubStars(null), null);
  assert.equal(formatGitHubStars(0), '0');
  assert.equal(formatGitHubStars(42), '42');
  assert.equal(formatGitHubStars(999), '999');
  assert.equal(formatGitHubStars(1200), '1.2k');
  assert.equal(formatGitHubStars(1000), '1k');
  assert.equal(formatGitHubStars(12400), '12k');
});
