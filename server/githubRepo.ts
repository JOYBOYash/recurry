export function parseGitHubRepoSlug(raw?: string | null): string {
  const trimmed = raw?.trim() ?? '';
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return trimmed;
  }
  return 'JOYBOYash/recurry';
}

export function formatGitHubStars(count: number | null): string | null {
  if (count === null || !Number.isFinite(count) || count < 0) return null;
  if (count >= 1000) {
    const compact = (count / 1000).toFixed(count >= 10_000 ? 0 : 1);
    return `${compact.replace(/\.0$/, '')}k`;
  }
  return String(Math.round(count));
}

export interface GitHubRepoSummary {
  repo: string;
  url: string;
  stars: number | null;
  formattedStars: string | null;
}

interface CacheEntry {
  summary: GitHubRepoSummary;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 1000;
const cachedRepos = new Map<string, CacheEntry>();

export async function getGitHubRepoSummary(
  env: Record<string, string | undefined> = process.env,
  options?: { repoOverride?: string | null; forceRefresh?: boolean },
): Promise<GitHubRepoSummary> {
  const repo = parseGitHubRepoSlug(options?.repoOverride ?? env.GITHUB_REPO);
  const url = `https://github.com/${repo}`;
  const now = Date.now();
  const cached = cachedRepos.get(repo);

  if (!options?.forceRefresh && cached && cached.expiresAt > now) {
    return cached.summary;
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'recurry-app',
  };
  const token = env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }
    const payload = (await response.json()) as { stargazers_count?: unknown };
    const stars =
      typeof payload.stargazers_count === 'number' && Number.isFinite(payload.stargazers_count)
        ? Math.max(0, Math.round(payload.stargazers_count))
        : null;

    const summary: GitHubRepoSummary = {
      repo,
      url,
      stars,
      formattedStars: formatGitHubStars(stars),
    };
    cachedRepos.set(repo, {
      summary,
      expiresAt: now + CACHE_TTL_MS,
    });
    return summary;
  } catch {
    if (cached) {
      return cached.summary;
    }
    return {
      repo,
      url,
      stars: null,
      formattedStars: null,
    };
  }
}

export function resetGitHubRepoCacheForTests(): void {
  cachedRepos.clear();
}
