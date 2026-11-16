import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { FaGithub } from 'react-icons/fa6';
import {
  DEFAULT_GITHUB_REPO,
  fetchRealtimeGitHubStars,
  parseRepoSlug,
} from '../utils/githubStars';

export interface GitHubStarDisplayProps {
  repo?: string;
  tone?: 'light' | 'dark';
  variant?: 'inline' | 'drawer';
  refreshIntervalMs?: number;
  onNavigate?: () => void;
}

export function GitHubStarDisplay({
  repo = DEFAULT_GITHUB_REPO,
  tone = 'dark',
  variant = 'inline',
  refreshIntervalMs = 60_000,
  onNavigate,
}: GitHubStarDisplayProps) {
  const slug = parseRepoSlug(repo);
  const [repoUrl, setRepoUrl] = useState(`https://github.com/${slug}`);
  const [formattedStars, setFormattedStars] = useState<string | null>(null);
  const [rawStars, setRawStars] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let currentController = new AbortController();

    async function loadStars() {
      currentController.abort();
      currentController = new AbortController();
      try {
        const snapshot = await fetchRealtimeGitHubStars(
          slug,
          currentController.signal,
        );
        if (!active) return;
        setRepoUrl(snapshot.url);
        if (snapshot.formattedStars !== null) {
          setFormattedStars(snapshot.formattedStars);
          setRawStars(snapshot.stars);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    void loadStars();

    const intervalId =
      refreshIntervalMs > 0
        ? window.setInterval(() => {
            if (document.visibilityState === 'visible') {
              void loadStars();
            }
          }, refreshIntervalMs)
        : null;

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadStars();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      currentController.abort();
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [slug, refreshIntervalMs]);

  const starSummary =
    rawStars !== null
      ? `${rawStars.toLocaleString()} ${rawStars === 1 ? 'star' : 'stars'}`
      : formattedStars !== null
        ? `${formattedStars} stars`
        : null;

  const ariaLabel = starSummary
    ? `View ${slug} on GitHub (${starSummary})`
    : `View ${slug} on GitHub`;

  const title = starSummary ? `${slug} · ${starSummary}` : slug;

  if (variant === 'drawer') {
    return (
      <a
        href={repoUrl}
        target="_blank"
        rel="noreferrer"
        onClick={onNavigate}
        aria-label={ariaLabel}
        title={title}
        className="flex min-h-11 items-center justify-between rounded-xl px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
      >
        <span className="inline-flex items-center gap-2">
          <FaGithub className="h-4 w-4 text-slate-900" aria-hidden="true" />
          <span>{slug}</span>
        </span>
        {formattedStars !== null && (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-600 tabular-nums">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
            <span>{formattedStars}</span>
          </span>
        )}
      </a>
    );
  }

  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noreferrer"
      onClick={onNavigate}
      aria-label={ariaLabel}
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono text-xs font-semibold tabular-nums transition-colors ${
        tone === 'light'
          ? 'text-white/90 hover:text-white'
          : 'text-slate-700 hover:text-slate-950'
      }`}
    >
      <FaGithub className="h-4 w-4 shrink-0" aria-hidden="true" />
      {formattedStars !== null && (
        <span className="inline-flex items-center gap-1">
          <Star
            className={`h-3 w-3 shrink-0 ${
              tone === 'light'
                ? 'fill-amber-300 text-amber-300'
                : 'fill-amber-400 text-amber-500'
            }`}
            aria-hidden="true"
          />
          <span>{formattedStars}</span>
        </span>
      )}
    </a>
  );
}
