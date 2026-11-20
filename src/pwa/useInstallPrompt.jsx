import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const InstallContext = createContext(null);

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari's own flag for an installed home-screen app
    window.navigator.standalone === true
  );
}

export function InstallPromptProvider({ children }) {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return null;
    deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredEvent(null);
    return outcome;
  }, [deferredEvent]);

  const value = {
    canInstall: !!deferredEvent && !installed,
    installed,
    dismissed,
    dismiss: () => setDismissed(true),
    promptInstall,
  };

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function useInstallPrompt() {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error('useInstallPrompt must be used within an InstallPromptProvider');
  return ctx;
}
