import { WifiOff } from 'lucide-react';
import { useAppAuth } from '../context/AppAuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { activeTrack } = useAppAuth();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-16 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-950 shadow-sm dark:border-amber-600/70 dark:bg-[#181818] dark:text-amber-200 lg:bottom-4 lg:right-4 lg:left-auto"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
      <span>
        {activeTrack
          ? 'Offline mode · Active curriculum & recall drills cached locally'
          : "You're offline · Reconnect to generate new curriculums"}
      </span>
    </div>
  );
}
