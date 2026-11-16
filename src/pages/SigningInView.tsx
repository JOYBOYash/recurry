import { useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { useAppAuth } from '../context/AppAuthContext';

export function SigningInView() {
  const navigate = useNavigate();
  const { user, authReady, dataLoading, profile } = useAppAuth();

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (dataLoading) return;

    const timer = window.setTimeout(() => {
      if (!profile || !profile.onboardingCompleted) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/app/curriculums', { replace: true });
      }
    }, 550);

    return () => window.clearTimeout(timer);
  }, [authReady, user, dataLoading, profile, navigate]);

  const ready = Boolean(user && !dataLoading);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#F7F8FA] px-4 text-[#0F172A] dark:bg-[#121212] dark:text-neutral-100">
      <main className="animate-view-enter w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#181818]">
        <div className="flex justify-center">
          <BrandLogo size="md" />
        </div>

        <div className="mt-6 flex justify-center">
          {ready ? (
            <CheckCircle2
              className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          ) : (
            <Loader2
              className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
          )}
        </div>

        <h1 className="mt-4 font-display text-xl font-bold text-slate-950 dark:text-white">
          {ready ? 'Workspace ready' : 'Signing you in'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-neutral-400">
          {ready
            ? 'Session verified. Opening your dashboard...'
            : 'Syncing your profile, daily goal, and streaks...'}
        </p>

        <div
          aria-hidden="true"
          className="mt-6 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#202020]"
        >
          <div
            className={`h-full rounded-full bg-blue-600 transition-all duration-500 ease-out dark:bg-blue-500 ${
              ready ? 'w-full' : 'w-2/3'
            }`}
          />
        </div>
      </main>
    </div>
  );
}
