"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Download, Share2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsRepository } from "@/data/repositories/settings-repository";
import { TUTORIAL_VERSIONS } from "@/core/tutorials/types";
import {
  TUTORIAL_COMPLETED_EVENT,
  type TutorialCompletedDetail,
} from "@/core/tutorials/events";
import { BackupReminder } from "@/components/pwa/backup-reminder";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __setbookInstallCaptureReady?: boolean;
    __setbookInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

type InstallMode = "installed" | "available" | "ios" | "unavailable";
type PersistenceState = "unknown" | "granted" | "denied" | "unsupported";

interface PwaContextValue {
  installMode: InstallMode;
  persistenceState: PersistenceState;
  install(): Promise<"accepted" | "dismissed" | "instructions" | "unavailable">;
  requestPersistence(): Promise<PersistenceState>;
}

const PwaContext = createContext<PwaContextValue | null>(null);
const DAY = 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installMode, setInstallMode] = useState<InstallMode>("unavailable");
  const [persistenceState, setPersistenceState] =
    useState<PersistenceState>("unknown");
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);
  const [showAutomaticPrompt, setShowAutomaticPrompt] = useState(false);
  const shownThisSession = useRef(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      type: "module",
      updateViaCache: "none",
    });
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !navigator.onLine ||
      !navigator.serviceWorker?.controller
    ) {
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: "CACHE_URLS",
      payload: { urlsToCache: [pathname] },
    });
  }, [pathname]);

  const requestPersistence = useCallback(async (): Promise<PersistenceState> => {
    if (!navigator.storage?.persist) {
      setPersistenceState("unsupported");
      return "unsupported";
    }
    try {
      const alreadyPersistent = await navigator.storage.persisted?.();
      const granted = alreadyPersistent || (await navigator.storage.persist());
      const next = granted ? "granted" : "denied";
      setPersistenceState(next);
      return next;
    } catch {
      setPersistenceState("denied");
      return "denied";
    }
  }, []);

  useEffect(() => {
    let active = true;
    const standalone = isStandalone();
    queueMicrotask(() => {
      if (active) {
        setInstallMode(
          standalone
            ? "installed"
            : window.__setbookInstallPrompt
              ? "available"
              : isIosDevice()
                ? "ios"
                : "unavailable",
        );
      }
    });

    void settingsRepository.get().then((settings) => {
      if (!active) return;
      setTutorialComplete(
        (settings.tutorialVersions.library ?? 0) >= TUTORIAL_VERSIONS.library,
      );
      setSnoozedUntil(
        settings.installPromptSnoozedUntil
          ? Date.parse(settings.installPromptSnoozedUntil)
          : 0,
      );
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      window.__setbookInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      if (!isStandalone()) setInstallMode("available");
    };
    const handleCapturedInstallPrompt = () => {
      const promptEvent = window.__setbookInstallPrompt;
      if (!promptEvent || isStandalone()) return;
      setDeferredPrompt(promptEvent);
      setInstallMode("available");
    };
    const handleInstalled = () => {
      window.__setbookInstallPrompt = null;
      setDeferredPrompt(null);
      setInstallMode("installed");
      setShowAutomaticPrompt(false);
      void requestPersistence();
    };
    const handleTutorialCompleted = (event: Event) => {
      const { id, forced } = (event as CustomEvent<TutorialCompletedDetail>).detail;
      if (id === "library" && !forced) setTutorialComplete(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener(
      "setbook:install-prompt-available",
      handleCapturedInstallPrompt,
    );
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener(TUTORIAL_COMPLETED_EVENT, handleTutorialCompleted);
    handleCapturedInstallPrompt();
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener(
        "setbook:install-prompt-available",
        handleCapturedInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(
        TUTORIAL_COMPLETED_EVENT,
        handleTutorialCompleted,
      );
    };
  }, [requestPersistence]);

  useEffect(() => {
    if (
      pathname !== "/library" ||
      !tutorialComplete ||
      shownThisSession.current ||
      snoozedUntil > Date.now() ||
      (installMode !== "available" && installMode !== "ios")
    ) {
      return;
    }
    const timeout = window.setTimeout(() => {
      shownThisSession.current = true;
      setShowAutomaticPrompt(true);
    }, 1_200);
    return () => window.clearTimeout(timeout);
  }, [installMode, pathname, snoozedUntil, tutorialComplete]);

  const snooze = useCallback(async (days: number) => {
    const until = new Date(Date.now() + days * DAY);
    setSnoozedUntil(until.getTime());
    setShowAutomaticPrompt(false);
    await settingsRepository.snoozeInstallPrompt(until);
  }, []);

  const install = useCallback(async () => {
    if (installMode === "ios") return "instructions" as const;
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    window.__setbookInstallPrompt = null;
    setDeferredPrompt(null);
    if (choice.outcome === "dismissed") {
      await snooze(30);
      return "dismissed" as const;
    }
    setShowAutomaticPrompt(false);
    void requestPersistence();
    return "accepted" as const;
  }, [deferredPrompt, installMode, requestPersistence, snooze]);

  const value = useMemo(
    () => ({ installMode, persistenceState, install, requestPersistence }),
    [install, installMode, persistenceState, requestPersistence],
  );

  return (
    <PwaContext.Provider value={value}>
      {children}
      {showAutomaticPrompt ? (
        <InstallPromptPanel onDismiss={() => void snooze(14)} />
      ) : null}
      <BackupReminder installed={installMode === "installed"} />
    </PwaContext.Provider>
  );
}

function InstallPromptPanel({ onDismiss }: { onDismiss: () => void }) {
  const { installMode, install } = usePwa();
  return (
    <aside
      aria-labelledby="install-setbook-title"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.55)] lg:bottom-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label="Dismiss install suggestion"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="flex items-start gap-4 pr-9">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
          {installMode === "ios" ? (
            <Share2 size={21} aria-hidden="true" />
          ) : (
            <Download size={21} aria-hidden="true" />
          )}
        </span>
        <div>
          <h2
            id="install-setbook-title"
            className="text-lg font-semibold tracking-[-0.02em] text-slate-950 dark:text-white"
          >
            Keep SetBook ready for the stage
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {installMode === "ios"
              ? "Tap Share, then Add to Home Screen to install SetBook."
              : "Install SetBook for a focused app window and reliable offline access."}
          </p>
        </div>
      </div>
      <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100">
        <ShieldCheck className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
        Songs stay on this device. Clearing app or site data can remove them, so
        keep a recent backup.
      </p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDismiss}>
          Not now
        </Button>
        {installMode === "available" ? (
          <Button type="button" onClick={() => void install()}>
            <Download size={17} aria-hidden="true" />
            Install SetBook
          </Button>
        ) : (
          <Button type="button" onClick={onDismiss}>
            Got it
          </Button>
        )}
      </div>
    </aside>
  );
}

export function usePwa() {
  const value = useContext(PwaContext);
  if (!value) throw new Error("usePwa must be used inside PwaProvider");
  return value;
}
