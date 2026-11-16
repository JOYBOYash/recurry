import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_GITHUB_REPO,
  formatStargazerCount,
  parseRepoSlug,
  parseStargazersFromGitHubPayload,
} from './githubStars';

test('parseRepoSlug validates owner/repo format and defaults to JOYBOYash/recurry', () => {
  assert.equal(DEFAULT_GITHUB_REPO, 'JOYBOYash/recurry');
  assert.equal(parseRepoSlug(), 'JOYBOYash/recurry');
  assert.equal(parseRepoSlug('  '), 'JOYBOYash/recurry');
  assert.equal(parseRepoSlug('not-valid'), 'JOYBOYash/recurry');
  assert.equal(parseRepoSlug('JOYBOYash/recurry'), 'JOYBOYash/recurry');
  assert.equal(parseRepoSlug('vercel/next.js'), 'vercel/next.js');
});

test('formatStargazerCount formats numbers including zero and thousands', () => {
  assert.equal(formatStargazerCount(null), null);
  assert.equal(formatStargazerCount(undefined), null);
  assert.equal(formatStargazerCount(-1), null);
  assert.equal(formatStargazerCount(0), '0');
  assert.equal(formatStargazerCount(8), '8');
  assert.equal(formatStargazerCount(1250), '1.3k');
  assert.equal(formatStargazerCount(2000), '2k');
  assert.equal(formatStargazerCount(14800), '15k');
});

test('parseStargazersFromGitHubPayload reads both GitHub API and proxy payloads', () => {
  assert.equal(parseStargazersFromGitHubPayload({ stargazers_count: 17 }), 17);
  assert.equal(parseStargazersFromGitHubPayload({ stargazers_count: 0 }), 0);
  assert.equal(parseStargazersFromGitHubPayload({ stars: 42 }), 42);
  assert.equal(parseStargazersFromGitHubPayload({ stargazers_count: -5 }), null);
  assert.equal(parseStargazersFromGitHubPayload(null), null);
});
