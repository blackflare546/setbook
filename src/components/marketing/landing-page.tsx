"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardPaste,
  ListMusic,
  MonitorCog,
  Music2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsRepository } from "@/data/repositories/settings-repository";

const benefits = [
  {
    title: "Organize Your Songs",
    description:
      "Keep chord charts and song information together in one organized library.",
    icon: BookOpen,
  },
  {
    title: "Build Setlists",
    description:
      "Arrange songs in performance order and prepare the charts your team needs.",
    icon: ListMusic,
  },
  {
    title: "Stay on the Same Chart",
    description:
      "Give musicians a consistent chord chart and arrangement to work from.",
    icon: Users,
  },
  {
    title: "Perform With Confidence",
    description:
      "Use a focused performance view designed for quick reading on stage.",
    icon: MonitorCog,
  },
  {
    title: "Smart Paste",
    description:
      "Paste an existing chord sheet and detect chords, lyrics, sections, and positions with deterministic parsing.",
    icon: ClipboardPaste,
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
    <div
      data-testid="landing-page"
      className="min-h-dvh overflow-x-hidden bg-white text-slate-950"
      style={{ colorScheme: "light" }}
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/welcome" className="flex items-center gap-2 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-indigo-700 text-white">
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
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-[.16em] text-indigo-700">
                Song charts for teams
              </p>
              <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
                One place for your songs and chord charts.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Keep your worship team or band on the same chord charts.
                Organize songs, build setlists, and perform from a consistent
                chart without switching between different apps and chord sheets.
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
                  className="min-h-12 dark:border-slate-300 dark:bg-white dark:text-slate-800 dark:hover:bg-slate-50"
                >
                  <a href="#benefits">See How It Works</a>
                </Button>
              </div>
              <p className="mt-7 text-sm leading-6 text-slate-500">
                For worship teams, church musicians, bands, singers, and
                instrumentalists.
              </p>
            </div>

            <div
              className="border border-slate-300 bg-white shadow-sm"
              aria-label="SetBook chart preview"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                    Sunday Setlist
                  </p>
                  <p className="mt-1 text-sm text-slate-500">1 of 4 songs</p>
                </div>
                <span className="border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold">
                  Key G
                </span>
              </div>
              <div className="p-5 sm:p-7">
                <h2 className="text-2xl font-bold">How Great Is Our God</h2>
                <p className="mt-1 text-sm text-slate-500">Chris Tomlin</p>
                <div className="mt-7 space-y-6 font-mono text-sm sm:text-base">
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-indigo-700">
                      Verse 1
                    </p>
                    <p className="font-bold text-indigo-700">
                      G&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      Em7
                    </p>
                    <p className="mt-1">
                      The splendor of a King, clothed in majesty
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-indigo-700">
                      C2&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      D
                    </p>
                    <p className="mt-1">Let all the earth rejoice</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-12 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Stop searching through different versions of the same song.
            </h2>
            <p className="text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Chord apps, screenshots, files, and printed sheets can leave each
              musician using something different. SetBook gives your group one
              organized place for the chart and arrangement you plan to use.
            </p>
          </div>
        </section>

        <section id="benefits" className="scroll-mt-8 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-700">
                Practical tools for rehearsal and performance
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Keep the music organized
              </h2>
            </div>
            <div className="mt-9 grid border-l border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-5">
              {benefits.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="border-b border-r border-slate-200 p-5 sm:p-6"
                >
                  <Icon className="text-indigo-700" size={21} />
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">
              A simple workflow
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {[
                [
                  "1",
                  "Create",
                  "Create a song or paste the chord sheet you already use.",
                ],
                [
                  "2",
                  "Organize",
                  "Build your library and arrange songs into setlists.",
                ],
                [
                  "3",
                  "Perform",
                  "Open the focused chart and move through the set.",
                ],
              ].map(([number, title, description]) => (
                <div key={number} className="border-l-2 border-indigo-700 pl-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                    Step {number}
                  </p>
                  <h3 className="mt-1 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 text-center sm:px-6 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Keep your next set in one place.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Start with the song your team needs next.
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

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500 sm:px-6">
        <div className="mx-auto max-w-7xl">
          Developed by:{" "}
          <a
            href="https://www.facebook.com/glennmark5466/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-700 hover:text-indigo-700 hover:underline"
          >
            Glenn Mark L. Flores
          </a>
        </div>
      </footer>
    </div>
  );
}
