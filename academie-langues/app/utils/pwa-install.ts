type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: DeferredInstallPrompt | null = null;
let listening = false;

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mql || iosStandalone);
}

/** Capture early so the profile button can prompt later. */
export function initPwaInstallCapture() {
  if (typeof window === "undefined" || listening) return;
  listening = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as DeferredInstallPrompt;
    window.dispatchEvent(new Event("nexa-pwa-install-ready"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event("nexa-pwa-install-ready"));
  });
}

export function canPromptPwaInstall() {
  return Boolean(deferredPrompt) && !isStandaloneMode();
}

export function isPwaInstalled() {
  return isStandaloneMode();
}

export function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

/** Opens the native install dialog when available. No instruction alerts. */
export async function promptPwaInstall(): Promise<"prompted" | "unavailable" | "installed"> {
  if (isStandaloneMode()) return "installed";
  if (!deferredPrompt) return "unavailable";

  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  await promptEvent.userChoice;
  return "prompted";
}
