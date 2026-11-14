import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Lock, Mail } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { ScenicBackdrop } from '../components/ScenicBackdrop';
import { useAppAuth } from '../context/AppAuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, authReady, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAppAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authReady && user) {
    return <Navigate to="/auth/signing-in" replace />;
  }

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
    <ScenicBackdrop>
      <div className="mx-auto flex h-full w-full max-w-md flex-col justify-between px-4 py-4 sm:px-6 sm:py-6">
        <div className="shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-blue-950/20 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-blue-950/35"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to recurry</span>
          </Link>
        </div>

        <main className="my-auto w-full rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_28px_70px_-18px_rgba(15,23,42,0.34)] backdrop-blur-xl sm:p-7">
          <div className="space-y-1.5">
            <BrandLogo size="md" />
            <h1 className="font-display text-xl font-bold text-slate-900">
              {mode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}
            </h1>
          </div>

          <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
              className="btn-juice flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
            >
              <FcGoogle className="h-5 w-5" aria-hidden="true" />
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t border-slate-200" />
              <span className="mx-3 font-mono text-[11px] font-semibold text-slate-400">
                OR EMAIL
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Email
                </label>
                <div className="relative mt-1">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="min-h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                    className="min-h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
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

            <div className="border-t border-slate-100 pt-3 text-center text-xs text-slate-600">
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-800"
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
                  className="font-semibold text-blue-600 hover:text-blue-800"
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </div>
        </main>

        <div className="shrink-0 text-center">
          <span className="inline-block rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 font-mono text-[11px] font-medium text-white/95 backdrop-blur-sm">
            Firebase Auth · Owner-isolated Firestore
          </span>
        </div>
      </div>
    </ScenicBackdrop>
  );
}
