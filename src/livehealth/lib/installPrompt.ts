// PWA install plumbing shared by the InstallPrompt dialog.
//
// `beforeinstallprompt` can fire before React mounts, so the listener is
// registered at module-import time (this file is imported from src/index.tsx)
// and the event is stashed for whoever asks for it later.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function initInstallCapture() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    try {
      localStorage.setItem(INSTALL_STATE_KEY, JSON.stringify({ installed: true }));
    } catch {
      /* private mode */
    }
    listeners.forEach((fn) => fn());
  });
  // The no-op service worker only exists to satisfy installability checks.
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

/** Re-renders subscribers when the native prompt becomes available/spent. */
export function subscribeInstallPrompt(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const INSTALL_STATE_KEY = "ln-install-prompt";

/** True when already running as an installed app (don't pitch the install). */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export type Platform = "ios" | "android" | "desktop-chromium" | "mac-safari" | "other";

/** Best-effort platform detection to pick which instructions to lead with. */
export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac; the touch check separates it from real Macs.
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
  if (/Macintosh/.test(ua) && isSafari) return "mac-safari";
  if (/Chrome|Chromium|Edg/.test(ua)) return "desktop-chromium";
  return "other";
}
