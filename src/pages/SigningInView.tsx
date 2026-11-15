import { useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScenicBackdrop } from '../components/ScenicBackdrop';
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

  return (
    <ScenicBackdrop>
      <div className="flex h-full w-full items-center justify-center px-4">
        <div className="animate-view-enter w-full max-w-sm rounded-3xl border border-white/80 bg-white/95 p-8 text-center shadow-[0_28px_70px_-18px_rgba(15,23,42,0.34)] backdrop-blur-xl dark:border-neutral-800/90 dark:bg-[#181818]/95 dark:shadow-[0_28px_70px_-18px_rgba(0,0,0,0.75)]">
          <div className="mx-auto flex justify-center">
            {user && !dataLoading ? (
              <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <Loader2 className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
            )}
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-slate-950 dark:text-white">
            Signing you in
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-neutral-300">
            {user && !dataLoading
              ? 'Session verified. Opening your workspace...'
              : 'Syncing your Firebase profile and streaks...'}
          </p>
        </div>
      </div>
    </ScenicBackdrop>
  );
}
