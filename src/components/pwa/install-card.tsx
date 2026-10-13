"use client";

import { useState } from "react";
import { Download, HardDrive, Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwa } from "@/components/pwa/pwa-provider";

export function InstallCard() {
  const { installMode, persistenceState, install, requestPersistence } = usePwa();
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [showBrowserInstructions, setShowBrowserInstructions] = useState(false);

  async function handleInstall() {
    const result = await install();
    if (result === "instructions") setShowIosInstructions(true);
    if (result === "unavailable") setShowBrowserInstructions(true);
  }

  return (
    <section
      aria-labelledby="install-setbook-card-title"
      className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.5)] sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Download size={22} aria-hidden="true" />
        </span>
        <div>
          <h2
            id="install-setbook-card-title"
            className="text-xl font-semibold tracking-[-0.025em] text-slate-950 dark:text-white"
          >
            Install SetBook
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Open SetBook like an app and keep recently used screens available
            when the connection drops.
          </p>
          {showIosInstructions ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-100">
              <Share2 className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
              In the browser, tap Share and choose Add to Home Screen.
            </p>
          ) : null}
          {showBrowserInstructions ? (
            <p
              className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm leading-6 text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-100"
              role="status"
            >
              Chrome has not made its native prompt available yet. Use the
              install icon in the address bar, or open the browser menu and
              choose its install-app option.
            </p>
          ) : null}
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
            Local data can still be erased by clearing app or site storage.
            Download backups regularly.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        {installMode === "installed" ? (
          <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200">
            <HardDrive size={17} aria-hidden="true" />
            Installed
          </span>
        ) : installMode === "available" || installMode === "ios" ? (
          <Button type="button" onClick={() => void handleInstall()}>
            {installMode === "ios" ? (
              <Share2 size={17} aria-hidden="true" />
            ) : (
              <Download size={17} aria-hidden="true" />
            )}
            {installMode === "ios" ? "How to install" : "Install SetBook"}
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => void handleInstall()}>
            Show install options
          </Button>
        )}
        {installMode === "installed" && persistenceState !== "granted" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void requestPersistence()}
          >
            Protect offline data
          </Button>
        ) : null}
      </div>
    </section>
  );
}
