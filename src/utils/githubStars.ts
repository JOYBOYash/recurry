export const DEFAULT_GITHUB_REPO = 'JOYBOYash/recurry';

export interface GitHubStarsSnapshot {
  repo: string;
  url: string;
  stars: number | null;
  formattedStars: string | null;
}

export function parseRepoSlug(raw?: string | null): string {
  const trimmed = raw?.trim() ?? '';
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_GITHUB_REPO;
}

export function formatStargazerCount(count: number | null | undefined): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
    return null;
  }
  if (count >= 1000) {
    const compact = (count / 1000).toFixed(count >= 10_000 ? 0 : 1);
    return `${compact.replace(/\.0$/, '')}k`;
  }
  return String(Math.round(count));
}

export function parseStargazersFromGitHubPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const raw =
    typeof record.stargazers_count === 'number'
      ? record.stargazers_count
      : typeof record.stars === 'number'
        ? record.stars
        : null;

  if (raw === null || !Number.isFinite(raw) || raw < 0) {
    return null;
  }
  return Math.round(raw);
}

export async function fetchRealtimeGitHubStars(
  repo: string = DEFAULT_GITHUB_REPO,
  signal?: AbortSignal,
): Promise<GitHubStarsSnapshot> {
  const slug = parseRepoSlug(repo);
  const repoUrl = `https://github.com/${slug}`;

  try {
    const proxyResponse = await fetch(
      `/api/github/repo?repo=${encodeURIComponent(slug)}`,
      {
        cache: 'no-store',
        signal,
      },
    );
    if (proxyResponse.ok) {
      const data = (await proxyResponse.json()) as {
        repo?: unknown;
        url?: unknown;
        stars?: unknown;
        formattedStars?: unknown;
      };
      const stars = parseStargazersFromGitHubPayload(data);
      const formattedStars =
        typeof data.formattedStars === 'string'
          ? data.formattedStars
          : formatStargazerCount(stars);
      if (stars !== null) {
        const resolvedSlug =
          typeof data.repo === 'string' ? parseRepoSlug(data.repo) : slug;
        return {
          repo: resolvedSlug,
          url: `https://github.com/${resolvedSlug}`,
          stars,
          formattedStars,
        };
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
  }

  try {
    const directResponse = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
      signal,
    });
    if (directResponse.ok) {
      const payload = (await directResponse.json()) as unknown;
      const stars = parseStargazersFromGitHubPayload(payload);
      return {
        repo: slug,
        url: repoUrl,
        stars,
        formattedStars: formatStargazerCount(stars),
      };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
  }

  return {
    repo: slug,
    url: repoUrl,
    stars: null,
    formattedStars: null,
  };
}
