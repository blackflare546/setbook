"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ListMusic,
  Maximize2,
  Music2,
  Play,
} from "lucide-react";
import { SetBookLogo } from "@/components/brand/setbook-logo";
import { Button } from "@/components/ui/button";
import { settingsRepository } from "@/data/repositories/settings-repository";

const benefits = [
  {
    title: "A chart library your team can trust",
    description:
      "Keep chords, lyrics, song details, and the arrangement you actually play in one searchable place.",
    icon: BookOpen,
    className: "lg:col-span-7",
  },
  {
    title: "Setlists ready before rehearsal",
    description:
      "Put songs in order, confirm every key, and prepare the whole set without chasing files or screenshots.",
    icon: ListMusic,
    className: "lg:col-span-5",
  },
  {
    title: "Paste a chart",
    description: "Turn the chord sheet you already use into an organized song.",
    icon: Music2,
    className: "lg:col-span-4",
  },
  {
    title: "Keep one arrangement",
    description:
      "Give every musician the same lyrics, chords, sections, and key.",
    icon: Check,
    className: "lg:col-span-4",
  },
  {
    title: "Perform without clutter",
    description: "Move through the set in a focused view made for the stage.",
    icon: Maximize2,
    className: "lg:col-span-4",
  },
];

function WorkspacePreview() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#d9d9d9] bg-[#ececec] p-2 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.45)] sm:p-3"
      aria-label="SetBook workspace preview"
    >
      <div className="overflow-hidden rounded-xl border border-[#dedede] bg-white">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#111] text-white">
              <ListMusic size={15} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#111827]">
                Sunday Gathering
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6b7280]">
                4 songs · ready
              </p>
            </div>
          </div>
          <span className="rounded-md border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4b5563]">
            Oct 11
          </span>
        </div>

        <div className="grid min-h-[360px] grid-cols-[minmax(108px,0.42fr)_minmax(0,1fr)] sm:grid-cols-[minmax(160px,0.42fr)_minmax(0,1fr)]">
          <div className="border-r border-[#e5e7eb] bg-[#fafafa] p-2.5 sm:p-4">
            <p className="mb-2.5 hidden font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b7280] sm:block">
              Set order
            </p>
            <ol className="space-y-1.5">
              {[
                ["01", "This Is Amazing Grace", "G"],
                ["02", "How Great Is Our God", "G"],
                ["03", "Goodness of God", "A"],
                ["04", "Build My Life", "D"],
              ].map(([number, title, key], index) => (
                <li
                  key={title}
                  className={`rounded-lg border p-2.5 sm:p-3 ${
                    index === 1
                      ? "border-[#c8c8c8] bg-white shadow-sm"
                      : "border-transparent text-[#6b7280]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="hidden font-mono text-[9px] sm:inline">
                      {number}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">
                      {title}
                    </p>
                    <span className="font-mono text-[10px] font-bold text-[#5656d8]">
                      {key}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5656d8]">
                  Now preparing
                </p>
                <h2 className="mt-2 truncate text-lg font-semibold tracking-[-0.025em] text-[#111827] sm:text-2xl">
                  How Great Is Our God
                </h2>
                <p className="mt-1 text-xs text-[#6b7280] sm:text-sm">
                  Chris Tomlin
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-[#111] px-2.5 py-2 font-mono text-xs font-semibold text-white">
                Key G
              </span>
            </div>

            <div className="mt-7 space-y-6 font-mono text-[11px] leading-6 text-[#374151] sm:text-sm sm:leading-7">
              <div>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
                  Verse 1
                </p>
                <p className="font-semibold text-[#5656d8]">
                  G&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Em7
                </p>
                <p>The splendor of a King, clothed in majesty</p>
              </div>
              <div>
                <p className="font-semibold text-[#5656d8]">
                  C2&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; D
                </p>
                <p>Let all the earth rejoice</p>
              </div>
              <div className="hidden sm:block">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
                  Chorus
                </p>
                <p className="font-semibold text-[#5656d8]">
                  G&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Em7
                </p>
                <p>How great is our God, sing with me</p>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between border-t border-[#e5e7eb] pt-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#6b7280] sm:text-[10px]">
                Chart 2 of 4
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f3f4f6] px-2.5 py-2 text-[10px] font-semibold text-[#111827] sm:text-xs">
                <Play size={12} fill="currentColor" aria-hidden="true" />
                Performance
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      className="min-h-dvh w-full max-w-full overflow-x-hidden bg-white text-[#111827]"
      style={{ colorScheme: "light" }}
    >
      <header className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link
            href="/welcome"
            aria-label="SetBook home"
            className="rounded-lg text-[#111827] outline-none focus-visible:ring-2 focus-visible:ring-[#5656d8] focus-visible:ring-offset-4"
          >
            <SetBookLogo />
          </Link>
          <nav
            className="ml-auto hidden items-center gap-1 md:flex"
            aria-label="Landing page"
          >
            <a
              href="#benefits"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#4b5563] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5656d8]"
            >
              Why SetBook
            </a>
            <a
              href="#workflow"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#4b5563] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5656d8]"
            >
              Workflow
            </a>
          </nav>
          <Button
            className="ml-auto h-11 rounded-lg bg-[#111] px-4 text-white hover:bg-[#2b2b2b] active:translate-y-px md:ml-3"
            onClick={openApp}
            disabled={opening}
          >
            {opening ? "Opening…" : "Open App"}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-[#e5e7eb] bg-[#fafafa]">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(500px,1.1fr)] lg:items-center lg:gap-16 lg:px-8 lg:py-24 xl:min-h-[calc(100svh-4rem)]">
            <div className="max-w-3xl">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#5656d8]">
                Built for the whole band
              </p>
              <h1 className="mt-5 max-w-3xl text-[clamp(2.75rem,5.2vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[#111]">
                One place for your songs and chord charts.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-[#4b5563] sm:text-lg sm:leading-8">
                Organize the music your worship team actually plays, prepare
                every set together, and step on stage with the right chart in
                front of everyone.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="min-h-12 rounded-lg bg-[#111] px-6 text-white hover:bg-[#2b2b2b] active:translate-y-px"
                  onClick={openApp}
                  disabled={opening}
                >
                  Open Song Library
                  <ArrowRight size={18} aria-hidden="true" />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="min-h-12 rounded-lg border-[#d1d5db] bg-white text-[#111827] hover:border-[#9ca3af] hover:bg-[#f3f4f6] active:translate-y-px dark:border-[#d1d5db] dark:bg-white dark:text-[#111827]"
                >
                  <a href="#benefits">See how it works</a>
                </Button>
              </div>
              <p className="mt-7 flex items-start gap-2 text-sm leading-6 text-[#6b7280]">
                <Check
                  size={16}
                  className="mt-1 shrink-0 text-[#5656d8]"
                  aria-hidden="true"
                />
                Local-first. Your library stays available when the venue Wi-Fi
                does not.
              </p>
            </div>

            <WorkspacePreview />
          </div>
        </section>

        <section
          id="benefits"
          className="scroll-mt-20 bg-white py-20 sm:py-24 lg:py-28"
        >
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(420px,1.25fr)] lg:items-end">
              <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#111] sm:text-5xl">
                Less searching. More time making music.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-[#4b5563] sm:text-lg sm:leading-8 lg:justify-self-end">
                Replace scattered screenshots, mismatched arrangements, and
                last-minute messages with one clear workspace from first chord
                to final song.
              </p>
            </div>

            <div className="mt-12 grid auto-rows-fr grid-flow-dense gap-3 md:grid-cols-2 lg:grid-cols-12">
              {benefits.map(
                ({ title, description, icon: Icon, className }, index) => (
                  <article
                    key={title}
                    className={`group min-h-56 rounded-2xl border border-[#e5e7eb] p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[#c6c6c6] hover:shadow-[0_18px_50px_-38px_rgba(0,0,0,0.6)] focus-within:border-[#5656d8] sm:p-7 ${className} ${
                      index === 0
                        ? "bg-[#111] text-white"
                        : "bg-[#fafafa] text-[#111827]"
                    }`}
                  >
                    <div className="flex h-full flex-col">
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-lg ${
                          index === 0
                            ? "bg-white/10 text-white"
                            : "bg-white text-[#5656d8] shadow-sm"
                        }`}
                      >
                        <Icon size={19} aria-hidden="true" />
                      </span>
                      <div className="mt-auto pt-10">
                        <h3 className="text-xl font-semibold tracking-[-0.025em]">
                          {title}
                        </h3>
                        <p
                          className={`mt-3 max-w-xl text-sm leading-6 ${
                            index === 0 ? "text-[#d1d5db]" : "text-[#4b5563]"
                          }`}
                        >
                          {description}
                        </p>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="scroll-mt-20 border-y border-[#e5e7eb] bg-[#fafafa] py-20 sm:py-24 lg:py-28"
        >
          <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)] lg:gap-20 lg:px-8">
            <div>
              <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#111] sm:text-5xl">
                From chord sheet to stage, one connected workflow.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#4b5563]">
                SetBook keeps the practical details visible at the moment your
                team needs them, without turning preparation into another admin
                system.
              </p>
            </div>

            <ol className="overflow-hidden rounded-2xl border border-[#dedede] bg-white">
              {[
                [
                  "01",
                  "Capture the song",
                  "Paste an existing chart or build it section by section. Keep lyrics and chords aligned.",
                ],
                [
                  "02",
                  "Prepare the set",
                  "Choose the order, confirm keys, and make one arrangement the source of truth.",
                ],
                [
                  "03",
                  "Lead the room",
                  "Open performance mode and move through readable charts with fewer distractions.",
                ],
              ].map(([number, title, description], index) => (
                <li
                  key={number}
                  className={`group grid gap-4 p-6 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center sm:p-7 ${
                    index ? "border-t border-[#e5e7eb]" : ""
                  }`}
                >
                  <span className="font-mono text-xs font-semibold text-[#9ca3af]">
                    {number}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111827] sm:text-xl">
                      {title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b5563]">
                      {description}
                    </p>
                  </div>
                  <ChevronRight
                    className="hidden text-[#9ca3af] transition-transform duration-300 group-hover:translate-x-1 sm:block"
                    size={20}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#111] px-4 py-20 text-white sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-9 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="max-w-3xl text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-6xl">
                Your next set is already complicated enough.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#d1d5db] sm:text-lg">
                Keep the songs, charts, and order simple for everyone on the
                team.
              </p>
            </div>
            <Button
              size="lg"
              className="min-h-12 shrink-0 rounded-lg bg-white px-6 text-[#111] hover:bg-[#e5e7eb] active:translate-y-px"
              onClick={openApp}
              disabled={opening}
            >
              Open SetBook <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2f2f2f] bg-[#111] px-4 py-8 text-sm text-[#9ca3af] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SetBookLogo className="text-white" />
          <p>
            Developed by:{" "}
            <a
              href="https://www.facebook.com/glennmark5466/"
              target="_blank"
              rel="noreferrer"
              className="rounded-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Glenn Mark L. Flores
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
