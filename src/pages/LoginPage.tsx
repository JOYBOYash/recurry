import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Flame,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { LanguageIcon } from '../components/LanguageIcon';
import { useAppAuth } from '../context/AppAuthContext';
import type { LanguageId } from '../types/curriculum';
import { tokenizeCode, type SyntaxTokenType } from '../utils/syntaxHighlight';

const TOKEN_COLORS: Record<SyntaxTokenType, string> = {
  keyword: 'text-sky-400 font-medium',
  type: 'text-amber-300',
  string: 'text-emerald-300',
  number: 'text-orange-300',
  comment: 'text-neutral-500 italic',
  operator: 'text-neutral-300',
  function: 'text-indigo-300',
  plain: 'text-neutral-100',
};

interface PreviewSnippet {
  id: Extract<LanguageId, 'python' | 'sql' | 'java' | 'cpp'>;
  label: string;
  filename: string;
  lines: string[];
  moduleName: string;
  accuracy: string;
  streakDays: number;
}

const PREVIEW_SNIPPETS: PreviewSnippet[] = [
  {
    id: 'python',
    label: 'Python',
    filename: 'two_sum.py',
    lines: [
      'def two_sum(nums, target):',
      '    seen = {}',
      '    for i, n in enumerate(nums):',
      '        d = target - n',
      '        if d in seen:',
      '            return [seen[d], i]',
      '        seen[n] = i',
    ],
    moduleName: 'Hash Maps & Indexing',
    accuracy: '96%',
    streakDays: 12,
  },
  {
    id: 'sql',
    label: 'SQL',
    filename: 'cohort_retention.sql',
    lines: [
      'SELECT user_id,',
      '       COUNT(*) AS sessions',
      'FROM daily_completions',
      'WHERE day >= CURRENT_DATE - 7',
      'GROUP BY user_id',
      'HAVING COUNT(*) >= 3;',
    ],
    moduleName: 'Window & Group Filters',
    accuracy: '94%',
    streakDays: 9,
  },
  {
    id: 'java',
    label: 'Java',
    filename: 'StreamFilter.java',
    lines: [
      'List<Integer> positive =',
      '    nums.stream()',
      '        .filter(n -> n > 0)',
      '        .sorted()',
      '        .toList();',
    ],
    moduleName: 'Streams & Collectors',
    accuracy: '92%',
    streakDays: 7,
  },
  {
    id: 'cpp',
    label: 'C++',
    filename: 'span_sum.cpp',
    lines: [
      'int sum_pos(std::span<int> xs) {',
      '  int total = 0;',
      '  for (int x : xs)',
      '    if (x > 0) total += x;',
      '  return total;',
      '}',
    ],
    moduleName: 'C++20 Ranges & Spans',
    accuracy: '95%',
    streakDays: 14,
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { user, authReady, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAppAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState<PreviewSnippet['id']>('python');

  if (authReady && user) {
    return <Navigate to="/auth/signing-in" replace />;
  }

  const activePreview =
    PREVIEW_SNIPPETS.find((item) => item.id === previewLang) ??
    PREVIEW_SNIPPETS[0];
  const tokenizedPreview = tokenizeCode(
    activePreview.lines.join('\n'),
    activePreview.id,
  );

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate('/auth/signing-in', { replace: true });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      navigate('/auth/signing-in', { replace: true });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Authentication failed.';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-white text-[#0F172A] dark:bg-[#121212] dark:text-neutral-100">
      <div className="mx-auto grid min-h-[100dvh] max-w-6xl grid-cols-1 items-center gap-12 px-6 py-8 sm:px-10 lg:grid-cols-12 lg:gap-16 lg:py-12">
        {/* Left Auth Column */}
        <main className="mx-auto flex w-full max-w-[380px] flex-col justify-between lg:col-span-5 lg:mx-0">
          <div>
            <div className="flex items-center justify-between gap-4">
              <Link
                to="/"
                aria-label="recurry home"
                className="inline-flex items-center transition-opacity hover:opacity-85"
              >
                <BrandLogo size="md" />
              </Link>

              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back</span>
              </Link>
            </div>

            <div className="mt-10 space-y-1.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {mode === 'signin' ? 'Sign in to recurry' : 'Create your account'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-neutral-400">
                {mode === 'signin'
                  ? 'Pick up your active curriculum, streak calendar, and drills.'
                  : 'Start one free tailored coding track every day.'}
              </p>
            </div>

            <div className="mt-7 border-t border-slate-200 pt-7 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="btn-juice flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:bg-[#202020]"
              >
                <FcGoogle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Continue with Google</span>
              </button>

              <div className="relative my-5 flex items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-neutral-800" />
                <span className="mx-3 font-mono text-xs text-slate-400 dark:text-neutral-500">
                  or
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-neutral-800" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
                  >
                    Email
                  </label>
                  <div className="relative mt-1.5">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
                      aria-hidden="true"
                    />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
                  >
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
                      aria-hidden="true"
                    />
                    <input
                      id="login-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:bg-[#181818] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-blue-500"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800/80 dark:bg-[#181818] dark:text-red-300"
                  >
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                      aria-hidden="true"
                    />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-juice flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-b-2 border-blue-800 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  )}
                </button>
              </form>

              <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                Your tracks, active-day calendar, and certificates stay synced privately to your account.
              </p>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 text-xs text-slate-600 dark:border-neutral-800 dark:text-neutral-400">
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  New to recurry? Create an account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Right Editorial Showcase Column */}
        <aside
          aria-label="Workspace preview"
          className="hidden lg:col-span-7 lg:flex lg:flex-col lg:justify-center"
        >
          <div className="space-y-2.5">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 text-balance dark:text-white xl:text-4xl">
              Practice with clarity.
              <span className="block">Keep your streak moving.</span>
            </h2>
            <p className="max-w-lg text-sm text-slate-600 dark:text-neutral-400">
              Calibrated grammar lessons, active recall drills, and instant code reviews across six languages.
            </p>
          </div>

          <div className="relative mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-[#1D4ED8] p-7 dark:border-neutral-800 xl:p-9">
            <img
              src="/assets/images/halftone-white.webp"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-50 mix-blend-screen"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(62% 72% at 50% 45%, rgba(37, 99, 235, 0.32) 0%, rgba(29, 78, 216, 0.72) 100%)',
              }}
            />

            {/* Floating Dark Product Frame */}
            <div className="relative z-10 overflow-hidden rounded-2xl border border-neutral-800 bg-[#181818] text-neutral-100 shadow-[0_28px_60px_-16px_rgba(15,23,42,0.5)]">
              <div className="grid grid-cols-12 gap-4 p-5">
                {/* Left Code Window */}
                <div className="col-span-7 flex flex-col justify-between rounded-xl border border-neutral-800 bg-[#141414] p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <LanguageIcon language={activePreview.id} className="h-4 w-4 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-neutral-200">
                          {activePreview.filename}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-neutral-500">
                        {activePreview.label}
                      </span>
                    </div>

                    <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed">
                      <code>
                        {tokenizedPreview.map((line, lineIdx) => (
                          <div key={lineIdx} className="flex">
                            <span
                              aria-hidden="true"
                              className="mr-3 w-3 shrink-0 select-none text-right text-neutral-600 tabular-nums"
                            >
                              {lineIdx + 1}
                            </span>
                            <span className="whitespace-pre">
                              {line.map((token, tokIdx) => (
                                <span key={tokIdx} className={TOKEN_COLORS[token.type]}>
                                  {token.text}
                                </span>
                              ))}
                            </span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-800 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Syntax checks passed</span>
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400 tabular-nums whitespace-nowrap">
                      {activePreview.accuracy} accuracy
                    </span>
                  </div>
                </div>

                {/* Right Progress Summary */}
                <div className="col-span-5 flex flex-col justify-between rounded-xl border border-neutral-800 bg-[#202020] p-4">
                  <div className="space-y-3.5">
                    <div className="text-xs font-semibold text-neutral-300">
                      Active Track
                    </div>

                    <div className="space-y-1">
                      <div className="font-display text-sm font-bold text-white">
                        {activePreview.moduleName}
                      </div>
                      <div className="text-xs text-neutral-400">
                        Recall drill completed
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-neutral-800 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Daily Goal</span>
                        <span className="font-mono font-semibold text-white tabular-nums">
                          2 / 2
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                        <div className="h-full w-full rounded-full bg-blue-600" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-neutral-300">
                        <Flame className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                        <span>Active Streak</span>
                      </span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {activePreview.streakDays}d
                      </span>
                    </div>
                  </div>

                  {/* Interactive Language Switcher Dock */}
                  <div
                    role="group"
                    aria-label="Preview language switcher"
                    className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-3"
                  >
                    {PREVIEW_SNIPPETS.map((item) => {
                      const active = item.id === activePreview.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreviewLang(item.id)}
                          aria-label={`Preview ${item.label} snippet`}
                          aria-pressed={active}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                            active
                              ? 'border-blue-500 bg-[#181818]'
                              : 'border-transparent bg-transparent opacity-70 hover:bg-[#181818] hover:opacity-100'
                          }`}
                        >
                          <LanguageIcon language={item.id} className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
