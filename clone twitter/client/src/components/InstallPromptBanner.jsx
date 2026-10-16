import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, Smartphone } from 'lucide-react';
import { usePWA } from '../context/PWAContext';

export default function InstallPromptBanner() {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    installApp,
    needRefresh,
    updateApp
  } = usePWA();

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedTime = localStorage.getItem('civic_pwa_banner_dismissed');
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime, 10);
      // Suppress for 3 days after dismiss
      if (elapsed < 3 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('civic_pwa_banner_dismissed', Date.now().toString());
  };

  // If app update available
  if (needRefresh) {
    return (
      <div className="fixed top-16 md:top-18 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-sky-950/90 border border-sky-500/50 text-white rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-white">App update available!</p>
            <p className="text-sky-200/80 text-[11px]">Reload to get the latest version</p>
          </div>
        </div>
        <button
          onClick={updateApp}
          className="bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 transition"
        >
          Update
        </button>
      </div>
    );
  }

  // If already installed or dismissed, hide banner
  if (isInstalled || dismissed) return null;

  // Show banner if Chrome/Android installable or iOS browser
  if (!isInstallable && !isIOS) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md bg-zinc-950/95 border border-sky-500/40 text-white rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center space-x-3 min-w-0">
        <img
          src="/icons/icon-192x192.png"
          alt="Civic Twitter"
          className="w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-900 shrink-0 object-cover shadow-sm"
        />
        <div className="min-w-0">
          <h4 className="font-semibold text-xs text-white leading-tight flex items-center gap-1.5">
            <span>Install Civic Twitter</span>
            <span className="text-[9px] bg-sky-500/20 text-sky-400 font-mono px-1.5 py-0.2 rounded border border-sky-500/30">
              App
            </span>
          </h4>
          <p className="text-[11px] text-zinc-400 truncate">
            {isIOS ? 'Add to Home Screen for fast access' : 'Install for offline access & full-screen'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={installApp}
          className="bg-sky-500 hover:bg-sky-400 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition shadow flex items-center space-x-1.5"
        >
          {isIOS ? <Smartphone className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-white p-1 rounded-full transition"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
