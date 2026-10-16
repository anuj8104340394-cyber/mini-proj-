import React from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { usePWA } from '../context/PWAContext';

export default function IOSInstallModal() {
  const { showIOSPrompt, setShowIOSPrompt } = usePWA();

  if (!showIOSPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <button
          onClick={() => setShowIOSPrompt(false)}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <img
            src="/icons/apple-touch-icon.png"
            alt="Civic Twitter"
            className="w-12 h-12 rounded-2xl border border-zinc-700 shadow-md"
          />
          <div>
            <h3 className="font-bold text-white text-base leading-tight">Install Civic Twitter</h3>
            <p className="text-xs text-zinc-400">Install on your iPhone or iPad</p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
          Install this web app to your Home Screen for quick access, offline viewing, and a full-screen experience without browser toolbars.
        </p>

        <div className="space-y-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-xs text-zinc-300">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sky-400 shrink-0">
              <Share className="w-4 h-4" />
            </div>
            <span>
              1. Tap the <strong className="text-white">Share</strong> button in Safari's bottom toolbar.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sky-400 shrink-0">
              <PlusSquare className="w-4 h-4" />
            </div>
            <span>
              2. Scroll down and select <strong className="text-white">Add to Home Screen</strong>.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sky-400 shrink-0 font-bold text-sky-400">
              ✓
            </div>
            <span>
              3. Tap <strong className="text-white">Add</strong> in the top right corner.
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowIOSPrompt(false)}
          className="w-full mt-5 bg-sky-500 hover:bg-sky-400 text-white font-semibold py-2.5 rounded-full transition text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
