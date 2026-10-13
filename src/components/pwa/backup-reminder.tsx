"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/data/db/songbook-db";
import { settingsRepository } from "@/data/repositories/settings-repository";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function BackupReminder({ installed }: { installed: boolean }) {
  const songCount = useLiveQuery(() => db.songs.count(), [], 0);
  const [visible, setVisible] = useState(false);
  const checkedThisSession = useRef(false);

  useEffect(() => {
    if (
      checkedThisSession.current ||
      !installed ||
      songCount < 1
    ) {
      return;
    }
    checkedThisSession.current = true;
    let active = true;
    void settingsRepository.get().then((settings) => {
      if (!active) return;
      const lastSeen = settings.lastBackupReminderAt
        ? Date.parse(settings.lastBackupReminderAt)
        : 0;
      if (!Number.isFinite(lastSeen) || Date.now() - lastSeen >= THIRTY_DAYS) {
        setVisible(true);
      }
    });
    return () => {
      active = false;
    };
  }, [installed, songCount]);

  async function dismiss() {
    setVisible(false);
    await settingsRepository.markBackupReminderSeen();
  }

  if (!visible) return null;
  return (
    <aside
      aria-labelledby="backup-reminder-title"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-[0_24px_70px_-28px_rgba(120,80,0,0.45)] lg:bottom-6 dark:border-amber-700 dark:bg-amber-950"
    >
      <button
        type="button"
        onClick={() => void dismiss()}
        className="absolute right-2.5 top-2.5 grid h-10 w-10 place-items-center rounded-lg text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
        aria-label="Dismiss backup reminder"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3 pr-10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-200 text-amber-950 dark:bg-amber-400">
          <Download size={19} aria-hidden="true" />
        </span>
        <div>
          <h2 id="backup-reminder-title" className="font-semibold text-amber-950 dark:text-amber-50">
            Keep a fresh backup
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-100">
            Your songs live on this device. Export a backup before clearing app
            data or changing phones.
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => void dismiss()}>
          Remind me later
        </Button>
        <Button asChild size="sm">
          <Link href="/library#library-backup" onClick={() => void dismiss()}>
            Go to backup
          </Link>
        </Button>
      </div>
    </aside>
  );
}
