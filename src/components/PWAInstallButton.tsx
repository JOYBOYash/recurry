import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'compact';
}

export function PWAInstallButton({ variant = 'sidebar' }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || (!canInstall && !isIOS)) {
    return null;
  }

  async function handleClick() {
    if (canInstall) {
      await promptInstall();
      return;
    }
    if (isIOS) {
      setShowIOSGuide(true);
    }
  }

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => void handleClick()}
          aria-label="Install recurry app for offline access"
          className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:border-neutral-700 dark:bg-[#202020] dark:text-blue-400 dark:hover:bg-[#262626]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="btn-juice flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-semibold text-blue-800 hover:border-blue-300 hover:bg-blue-50 dark:border-neutral-700 dark:bg-[#202020] dark:text-blue-400 dark:hover:border-neutral-600 dark:hover:bg-[#262626]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install Offline App</span>
        </button>
      )}

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install recurry on iOS"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs dark:bg-black/75"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-[#181818]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                  Install recurry Offline
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-neutral-300">
                  Add recurry to your Home Screen to study your active curriculum offline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Close install instructions"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ol className="mt-4 space-y-2 text-xs text-slate-700 dark:text-neutral-300">
              <li className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-[#202020]">
                <Share className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>
                  1. Tap the <strong>Share</strong> button in Safari.
                </span>
              </li>
              <li className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-[#202020]">
                2. Select <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
