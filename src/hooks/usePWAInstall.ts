import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const standaloneMatch = window.matchMedia?.('(display-mode: standalone)').matches;
    const iosStandalone = Boolean((navigator as { standalone?: boolean }).standalone);
    return Boolean(standaloneMatch || iosStandalone);
  });

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  useEffect(() => {
    const media = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayChange = () => {
      const iosStandalone = Boolean((navigator as { standalone?: boolean }).standalone);
      setIsInstalled(Boolean(media?.matches || iosStandalone));
    };

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    media?.addEventListener?.('change', handleDisplayChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      media?.removeEventListener?.('change', handleDisplayChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function promptInstall(): Promise<boolean> {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      return true;
    }
    return false;
  }

  return {
    canInstall: Boolean(installPrompt) && !isInstalled,
    isInstalled,
    isIOS,
    promptInstall,
  };
}
