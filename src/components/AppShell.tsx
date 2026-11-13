import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';
import {
  computeDailyGoalProgress,
  computeLearningStats,
} from '../utils/curriculumLogic';
import { AppNavigation } from './AppNavigation';

export function AppShell() {
  const {
    user,
    authReady,
    dataLoading,
    profile,
    tracks,
    certificates,
    quota,
    activeTrack,
    signOutUser,
  } = useAppAuth();

  if (!authReady || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || !profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  const stats = computeLearningStats(
    tracks,
    profile.completedModuleIds,
    profile.moduleCompletedAt,
  );
  const dailyGoal = computeDailyGoalProgress(
    profile.moduleCompletedAt,
    profile.dailyModuleGoal,
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A]">
      <AppNavigation
        username={profile.username}
        activeTrack={activeTrack}
        stats={stats}
        dailyGoal={dailyGoal}
        quota={quota}
        certificatesCount={certificates.length}
        onSignOut={signOutUser}
      />

      <main className="pb-24 lg:pl-64 lg:pb-12">
        <div className="animate-view-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
