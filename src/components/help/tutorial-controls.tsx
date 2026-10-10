"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, ListMusic, Play, RotateCcw, WandSparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TutorialId } from "@/core/tutorials/types";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import { settingsRepository } from "@/data/repositories/settings-repository";

type TutorialAction = {
  id: TutorialId;
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  unavailable?: string;
};

export function TutorialControls() {
  const router = useRouter();
  const setlists = useLiveQuery(() => setlistRepository.list(), []);
  const [message, setMessage] = useState<string | null>(null);
  const latestSetlist = setlists?.[0];
  const latestPerformableSetlist = setlists?.find(
    (setlist) => setlist.entries.length > 0,
  );

  const actions = useMemo<TutorialAction[]>(
    () => [
      {
        id: "library",
        title: "Song Library",
        description: "Adding, finding, importing, and managing your charts.",
        icon: BookOpen,
        href: "/library?tutorial=library",
      },
      {
        id: "song-editor",
        title: "Add or Edit Song",
        description: "Smart Paste, song details, review, and saving.",
        icon: WandSparkles,
        href: "/songs/new?tutorial=song-editor",
      },
      {
        id: "setlists",
        title: "Setlists",
        description: "Creating, scanning, finding, and opening setlists.",
        icon: ListMusic,
        href: "/setlists?tutorial=setlists",
      },
      {
        id: "setlist-editor",
        title: "Setlist Editor",
        description: "Running order, performance keys, notes, and sharing.",
        icon: ListMusic,
        href: latestSetlist
          ? `/setlists/${latestSetlist.id}?tutorial=setlist-editor`
          : undefined,
        unavailable: latestSetlist
          ? undefined
          : "Create a setlist before replaying this tutorial.",
      },
      {
        id: "performance",
        title: "Performance View",
        description: "Display controls, transposition, and song navigation.",
        icon: Play,
        href: latestPerformableSetlist
          ? `/performance/${latestPerformableSetlist.id}?tutorial=performance`
          : undefined,
        unavailable: latestPerformableSetlist
          ? undefined
          : "Add at least one song to a setlist before replaying this tutorial.",
      },
    ],
    [latestPerformableSetlist, latestSetlist],
  );

  async function resetAll() {
    await settingsRepository.resetAllTutorials();
    setMessage("All tutorials will appear again when you enter each area.");
  }

  return (
    <section className="py-12 sm:py-16" aria-labelledby="tutorials-heading">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="tutorials-heading"
            className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white"
          >
            Interactive tutorials
          </h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
            Replay a guided tour without changing any songs or setlists.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void resetAll()}>
          <RotateCcw size={16} />
          Reset all tutorials
        </Button>
      </div>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100"
        >
          {message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map(({ id, title, description, icon: Icon, href, unavailable }) => (
          <Card key={id} className="flex items-start gap-4 p-4 sm:p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Icon size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {description}
              </p>
              {unavailable && (
                <p id={`${id}-tutorial-requirement`} className="mt-2 text-xs text-slate-500">
                  {unavailable}
                </p>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                disabled={!href}
                aria-describedby={unavailable ? `${id}-tutorial-requirement` : undefined}
                onClick={() => href && router.push(href)}
              >
                Start tutorial
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
