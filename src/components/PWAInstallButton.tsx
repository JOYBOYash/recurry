import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
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
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-[#222222] dark:hover:text-white"
        >
          <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>Install</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="btn-juice flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-neutral-700 dark:bg-[#202020] dark:text-neutral-200 dark:hover:text-white"
        >
          <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>Install Offline App</span>
        </button>
      )}

      {showIOSGuide &&
        typeof document !== 'undefined' &&
        createPortal(
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
        </div>,
          document.body,
        )}
    </>
  );
}
