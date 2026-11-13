import { useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4">
      <div className="animate-view-enter w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex justify-center">
          {user && !dataLoading ? (
            <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden="true" />
          ) : (
            <Loader2 className="h-9 w-9 animate-spin text-blue-600" aria-hidden="true" />
          )}
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-slate-950">
          Signing you in
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          {user && !dataLoading
            ? 'Session verified. Opening your workspace...'
            : 'Syncing your Firebase profile and streaks...'}
        </p>
      </div>
    </div>
  );
}
