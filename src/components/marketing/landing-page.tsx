"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardPaste,
  LayoutList,
  MonitorCog,
  Music2,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsRepository } from "@/data/repositories/settings-repository";

const features = [
  {
    title: "Smart Paste",
    description:
      "Paste an existing chord sheet and organize its chords, lyrics, and sections.",
    icon: ClipboardPaste,
  },
  {
    title: "Song Library",
    description: "Keep your charts organized, searchable, and ready offline.",
    icon: BookOpen,
  },
  {
    title: "Setlists",
    description:
      "Arrange songs in the exact running order your performance needs.",
    icon: LayoutList,
  },
  {
    title: "Performance View",
    description: "Read clean, stage-friendly charts on your phone or tablet.",
    icon: MonitorCog,
  },
  {
    title: "Transpose",
    description: "Change the performance key without altering the master song.",
    icon: SlidersHorizontal,
  },
  {
    title: "Read-only Sharing",
    description:
      "Send bandmates a public setlist link without exposing your library.",
    icon: Share2,
  },
];

export function LandingPage() {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function openApp() {
    if (opening) return;
    setOpening(true);
    try {
      await settingsRepository.markLandingPageSeen();
    } finally {
      router.push("/library");
    }
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/welcome" className="flex items-center gap-2 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white">
              <Music2 size={19} />
            </span>
            SetBook
          </Link>
          <Button className="h-11" onClick={openApp} disabled={opening}>
            Open App
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200 dark:border-slate-800">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] lg:items-center lg:py-24">
            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">
                Built for working musicians
              </p>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Your music. Ready for the stage.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Create, organize, share, and perform your song charts with less
                hassle—online or offline.
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <Button
                  size="lg"
                  className="min-h-12"
                  onClick={openApp}
                  disabled={opening}
                >
                  Open Song Library <ArrowRight size={18} />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="min-h-12"
                >
                  <a href="#features">Learn More</a>
                </Button>
              </div>
            </div>

            <div className="border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Performance View
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    How Great Is Our God
                  </h2>
                  <p className="text-sm text-slate-500">Chris Tomlin · Key G</p>
                </div>
                <span className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950">
                  1 / 5
                </span>
              </div>
              <div className="space-y-5 font-mono">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Verse 1
                  </p>
                  <p className="font-bold text-indigo-700 dark:text-amber-300">
                    G&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    Em7
                  </p>
                  <p className="mt-1">The splendor of a King</p>
                </div>
                <div>
                  <p className="font-bold text-indigo-700 dark:text-amber-300">
                    C2
                  </p>
                  <p className="mt-1">Let all the earth rejoice</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-8 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">
                One practical workspace
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                From chord sheet to stage
              </h2>
            </div>
            <div className="mt-9 grid border-l border-t border-slate-200 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="border-b border-r border-slate-200 p-5 dark:border-slate-800 sm:p-6"
                >
                  <Icon
                    className="text-indigo-600 dark:text-indigo-400"
                    size={22}
                  />
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {description}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-8 border border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <h3 className="font-bold">Custom display</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Adjust section, chord, and lyric sizes, line height, chart
                columns, and light or dark theme for the room you are playing.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-14 dark:border-slate-800 dark:bg-slate-900/50 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {[
                [
                  "1",
                  "Create",
                  "Create a song or paste the chart you already use.",
                ],
                [
                  "2",
                  "Organize",
                  "Build your library and arrange performance setlists.",
                ],
                [
                  "3",
                  "Perform",
                  "Open Performance View and play from a clear chart.",
                ],
              ].map(([number, title, description]) => (
                <div key={number} className="border-l-2 border-indigo-600 pl-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Step {number}
                  </p>
                  <h3 className="mt-1 text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready for rehearsal?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
            Your private library stays in this browser. Start with the song you
            need next.
          </p>
          <Button
            size="lg"
            className="mt-7 min-h-12"
            onClick={openApp}
            disabled={opening}
          >
            Open App <ArrowRight size={18} />
          </Button>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Developed by Glenn Mark L. Flores</span>
          <a
            href="https://www.facebook.com/glennmark5466/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            Facebook
          </a>
        </div>
      </footer>
    </div>
  );
}
