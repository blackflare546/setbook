"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Coffee,
  ListChecks,
  ListMusic,
  Maximize2,
  Music2,
  Share2,
} from "lucide-react";
import performanceDesktop from "@/assets/landing/perform-desktop-tablet-view.jpeg";
import performanceMobile from "@/assets/landing/perform-mobile-view.jpeg";
import { SetBookLogo } from "@/components/brand/setbook-logo";
import { Button } from "@/components/ui/button";
import { settingsRepository } from "@/data/repositories/settings-repository";

const benefits = [
  {
    title: "Turn the chart you have into the chart you need",
    description:
      "Paste an existing chord sheet, keep lyrics and chords aligned, and organize every section without rebuilding the song from scratch.",
    detail: "Smart Paste · sections · chord alignment",
    icon: Music2,
    className: "lg:col-span-7",
    tone: "dark",
  },
  {
    title: "Prepare one clear running order",
    description:
      "Build the set, confirm each performance key, and keep the arrangement the whole team expects.",
    detail: "Song order · keys · arrangement cues",
    icon: ListChecks,
    className: "lg:col-span-5",
    tone: "coral",
  },
  {
    title: "Share without rebuilding",
    description:
      "Publish a read-only setlist or move a song directly between devices when the team needs it.",
    detail: "Public setlists · QR transfer · local library",
    icon: Share2,
    className: "lg:col-span-5",
    tone: "light",
  },
  {
    title: "Perform from a view built for the room",
    description:
      "Move through the set with readable charts, fast transposition, and the controls you need without the editor getting in the way.",
    detail: "Performance mode · responsive charts · transpose",
    icon: Maximize2,
    className: "lg:col-span-7",
    tone: "indigo",
  },
] as const;

const workflow = [
  {
    title: "Capture the song",
    description:
      "Paste the chart, review its sections, and save a clean master arrangement to the local library.",
    icon: BookOpen,
  },
  {
    title: "Shape the set",
    description:
      "Choose the running order, set performance keys, and keep rehearsal details attached to the music.",
    icon: ListMusic,
  },
  {
    title: "Lead with confidence",
    description:
      "Open a focused performance view and move through the set from any screen size.",
    icon: Maximize2,
  },
] as const;

function ProductShowcase() {
  return (
    <figure
      aria-label="SetBook responsive performance screenshots"
      className="relative mx-auto w-full max-w-[760px] pb-24 sm:pb-28 lg:pb-20"
    >
      <div className="relative w-[95%] overflow-hidden rounded-2xl border border-[#dfe1e5] bg-white p-1.5 shadow-[0_32px_90px_-40px_rgba(16,17,20,0.38)] transition-transform duration-500 ease-out motion-safe:hover:-translate-y-1 sm:p-2">
        <Image
          src={performanceDesktop}
          alt="SetBook performance view showing a two-column chord chart on desktop and tablet"
          className="h-auto w-full rounded-[11px]"
          sizes="(max-width: 640px) 88vw, (max-width: 1024px) 78vw, 690px"
          preload
        />
      </div>

      <div className="absolute bottom-0 right-0 w-[29%] min-w-[96px] max-w-[180px] overflow-hidden rounded-[18px] border border-[#dfe1e5] bg-white p-1.5 shadow-[0_26px_70px_-28px_rgba(16,17,20,0.52)] transition-transform duration-500 ease-out motion-safe:hover:-translate-y-1 sm:rounded-[22px] sm:p-2">
        <Image
          src={performanceMobile}
          alt="SetBook mobile performance view showing a responsive single-column chord chart"
          className="h-auto w-full rounded-[13px] sm:rounded-[16px]"
          sizes="(max-width: 640px) 29vw, (max-width: 1024px) 21vw, 180px"
          loading="eager"
        />
      </div>
    </figure>
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
      className="min-h-dvh w-full max-w-full overflow-x-hidden bg-white text-[#17181c]"
      style={{ colorScheme: "light" }}
    >
      <header className="sticky top-0 z-30 border-b border-[#e3e5e8] bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link
            href="/welcome"
            aria-label="SetBook home"
            className="rounded-lg text-[#17181c] outline-none focus-visible:ring-2 focus-visible:ring-[#5555cf] focus-visible:ring-offset-4"
          >
            <SetBookLogo />
          </Link>
          <nav
            className="ml-auto hidden items-center gap-1 md:flex"
            aria-label="Landing page"
          >
            <a
              href="#benefits"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#5f6673] transition-colors hover:bg-[#f4f4f6] hover:text-[#17181c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5555cf]"
            >
              Why SetBook
            </a>
            <a
              href="#workflow"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#5f6673] transition-colors hover:bg-[#f4f4f6] hover:text-[#17181c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5555cf]"
            >
              Workflow
            </a>
            <a
              href="https://buymeacoffee.com/glennmark"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#d6aa00] bg-[#ffdd00] px-3 py-2 text-sm font-semibold text-[#111] shadow-sm transition-[background-color,border-color,transform] hover:border-[#bd9500] hover:bg-[#f2c900] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5555cf] focus-visible:ring-offset-2"
            >
              <Coffee size={16} aria-hidden="true" />
              Buy me a coffee
            </a>
          </nav>
          <Button
            className="ml-auto h-11 rounded-[10px] bg-[#101114] px-4 text-white hover:bg-[#292b31] active:translate-y-px md:ml-3 dark:bg-[#101114] dark:text-white dark:hover:bg-[#292b31]"
            onClick={openApp}
            disabled={opening}
          >
            {opening ? "Opening…" : "Open App"}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="w-full max-w-full overflow-x-hidden">
        <section className="relative overflow-hidden border-b border-[#e3e5e8] bg-[#fbfbfc]">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 82% 12%, rgba(85,85,207,0.11), transparent 30%), radial-gradient(circle at 8% 88%, rgba(239,126,105,0.07), transparent 25%)",
            }}
          />
          <div className="relative mx-auto grid max-w-[1440px] gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(560px,1.18fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-24 xl:min-h-[calc(100svh-4rem)] xl:gap-20">
            <div className="relative z-10 max-w-5xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-[#5555cf] sm:text-xs">
                Charts that move with the band
              </p>
              <h1 className="mt-5 max-w-5xl text-[clamp(2.75rem,4.6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.052em] text-[#101114]">
                Your whole set, ready for the stage.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-[#555c68] sm:text-[17px] sm:leading-8">
                Build a trusted song library, prepare every key, and perform
                from the same clear chart on desktop, tablet, or phone.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="min-h-12 rounded-[10px] bg-[#101114] px-6 text-white shadow-sm hover:bg-[#292b31] active:translate-y-px dark:bg-[#101114] dark:text-white dark:hover:bg-[#292b31]"
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
                  className="min-h-12 rounded-[10px] border-[#d4d7dc] bg-white text-[#17181c] shadow-sm hover:border-[#aeb3bb] hover:bg-[#f5f5f7] active:translate-y-px dark:border-[#d4d7dc] dark:bg-white dark:text-[#17181c] dark:hover:bg-[#f5f5f7]"
                >
                  <a href="#benefits">See how it works</a>
                </Button>
              </div>
              <p className="mt-7 flex max-w-lg items-start gap-2 text-sm leading-6 text-[#666d79]">
                <Check
                  size={16}
                  className="mt-1 shrink-0 text-[#5555cf]"
                  aria-hidden="true"
                />
                Local-first for the music you keep private, with deliberate
                sharing when the band needs it.
              </p>
            </div>

            <div className="relative xl:-mr-6">
              <ProductShowcase />
            </div>
          </div>
        </section>

        <section
          id="benefits"
          className="scroll-mt-20 bg-white py-20 sm:py-24 lg:py-28"
        >
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(420px,1.2fr)] lg:items-end">
              <h2 className="max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#101114] sm:text-[2.75rem]">
                One calm workspace from first chord to final song.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-[#555c68] sm:text-[17px] sm:leading-8 lg:justify-self-end">
                Replace scattered screenshots, mismatched arrangements, and
                last-minute messages with a workflow made around the way
                musicians actually prepare.
              </p>
            </div>

            <div className="mt-12 grid grid-flow-dense gap-3 md:grid-cols-2 lg:grid-cols-12">
              {benefits.map(
                ({
                  title,
                  description,
                  detail,
                  icon: Icon,
                  className,
                  tone,
                }) => (
                  <article
                    key={title}
                    className={`group flex min-h-72 flex-col overflow-hidden rounded-2xl border p-6 transition-[border-color,box-shadow,transform] duration-300 motion-safe:hover:-translate-y-0.5 sm:p-8 ${className} ${
                      tone === "dark"
                        ? "border-[#15161a] bg-[#15161a] text-white shadow-[0_22px_60px_-42px_rgba(0,0,0,0.8)]"
                        : tone === "indigo"
                          ? "border-[#deddf6] bg-[#f5f4ff] text-[#1a1a2e]"
                          : tone === "coral"
                            ? "border-[#f0ded8] bg-[#fff8f5] text-[#241b19]"
                            : "border-[#e3e5e8] bg-[#f8f8fa] text-[#17181c] hover:border-[#c7cbd1] hover:shadow-[0_18px_50px_-40px_rgba(0,0,0,0.5)]"
                    }`}
                  >
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-xl border ${
                        tone === "dark"
                          ? "border-white/15 bg-white/10 text-white"
                          : tone === "coral"
                            ? "border-[#f0ded8] bg-white text-[#d06450] shadow-sm"
                            : "border-[#dedeea] bg-white text-[#5555cf] shadow-sm"
                      }`}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <div className="mt-auto pt-12">
                      <h3 className="max-w-2xl text-2xl font-semibold leading-[1.12] tracking-[-0.035em] sm:text-[1.75rem]">
                        {title}
                      </h3>
                      <p
                        className={`mt-4 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7 ${
                          tone === "dark" ? "text-[#d1d5db]" : "text-[#555c68]"
                        }`}
                      >
                        {description}
                      </p>
                      <p
                        className={`mt-7 border-t pt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${
                          tone === "dark"
                            ? "border-white/15 text-[#aeb6c2]"
                            : "border-[#dfe2e7] text-[#6b7280]"
                        }`}
                      >
                        {detail}
                      </p>
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="scroll-mt-20 border-y border-[#e3e5e8] bg-[#f8f8fa] py-20 sm:py-24 lg:py-28"
        >
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <h2 className="text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#101114] sm:text-[2.75rem]">
                A direct path from song idea to performance.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#555c68] sm:text-[17px] sm:leading-8">
                Each step keeps the musical details intact, so rehearsal work
                carries cleanly into the room.
              </p>
            </div>

            <ol className="relative mt-12 grid overflow-hidden rounded-2xl border border-[#dfe1e5] bg-white shadow-[0_18px_60px_-52px_rgba(16,17,20,0.55)] md:grid-cols-3">
              {workflow.map(({ title, description, icon: Icon }, index) => (
                <li
                  key={title}
                  className={`group relative flex min-h-64 flex-col p-6 sm:p-8 ${
                    index
                      ? "border-t border-[#e3e5e8] md:border-l md:border-t-0"
                      : ""
                  }`}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#deddf6] bg-[#f5f4ff] text-[#5555cf] transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div className="mt-auto pt-10">
                    <h3 className="text-xl font-semibold tracking-[-0.025em] text-[#17181c] sm:text-2xl">
                      {title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#555c68] sm:text-base sm:leading-7">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#15161a] px-4 py-20 text-white sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-9 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.048em] sm:text-[3.5rem]">
                Bring the right chart to the next song.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#d1d5db] sm:text-lg">
                Keep the library, set order, performance key, and chart in one
                dependable place.
              </p>
            </div>
            <Button
              size="lg"
              className="min-h-12 shrink-0 rounded-[10px] bg-white px-6 text-[#101114] hover:bg-[#eceef1] active:translate-y-px dark:bg-white dark:text-[#101114] dark:hover:bg-[#eceef1]"
              onClick={openApp}
              disabled={opening}
            >
              Open SetBook <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#303136] bg-[#15161a] px-4 py-8 text-sm text-[#a7adb7] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SetBookLogo className="text-white" />
          <div className="flex flex-col gap-3 sm:items-end">
            <a
              href="https://buymeacoffee.com/glennmark"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-[10px] border border-[#d6aa00] bg-[#ffdd00] px-4 font-semibold text-[#111] shadow-sm transition-[background-color,border-color,transform] hover:border-[#bd9500] hover:bg-[#f2c900] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#15161a] sm:self-end"
            >
              <Coffee size={17} aria-hidden="true" />
              Buy me a coffee
            </a>
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
        </div>
      </footer>
    </div>
  );
}
