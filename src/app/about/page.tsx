import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Coffee } from "lucide-react";
import { SetBookMark } from "@/components/brand/setbook-logo";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "About" };

const capabilities = [
  "Create and organize song charts",
  "Paste existing chord sheets with Smart Paste",
  "Edit chords and lyrics separately",
  "Transpose songs for different keys",
  "Build and manage setlists",
  "Use a dedicated performance view",
  "Share read-only setlists with other musicians",
];

export default function AboutPage() {
  return (
    <div className="px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:py-12 lg:pb-16">
      <main className="mx-auto max-w-5xl">
        <PageHeader
          title="SetBook"
          description="A local-first song chart and setlist workspace for worship teams and bands."
          actions={
            <SetBookMark className="h-12 w-12 text-slate-950 dark:text-white" />
          }
        />

        <section
          aria-labelledby="support-setbook-title"
          className="mb-9 flex flex-col gap-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-[0_16px_40px_-32px_rgba(120,80,0,0.5)] sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-amber-700 dark:bg-amber-950/35"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-200 text-amber-950 dark:bg-amber-400 dark:text-amber-950">
              <Coffee size={23} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="support-setbook-title"
                className="text-xl font-semibold tracking-[-0.025em] text-slate-950 dark:text-white"
              >
                Enjoying SetBook?
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-700 dark:text-amber-100/90">
                Support continued improvements and help keep SetBook useful for
                worship teams and musicians.
              </p>
            </div>
          </div>
          <a
            href="https://buymeacoffee.com/glennmark"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#d6aa00] bg-[#ffdd00] px-5 text-sm font-bold text-[#111] shadow-sm transition-[background-color,border-color,transform,box-shadow] hover:border-[#bd9500] hover:bg-[#f2c900] hover:shadow-md active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            <Coffee size={18} aria-hidden="true" />
            Buy me a coffee
          </a>
        </section>

        <section className="grid gap-8 border-b border-slate-200 pb-9 md:grid-cols-[0.8fr_1.2fr] dark:border-slate-800">
          <h2 className="text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">
            A simple song chart and setlist tool for worship teams and bands.
          </h2>
          <p className="leading-7 text-slate-600 dark:text-slate-300">
            Organize songs, chord charts, and setlists in one place so musicians
            can work from a consistent version of each song. Instead of
            switching between different chord apps, files, and chord sheets,
            teams can prepare and perform from the same organized charts.
          </p>
        </section>

        <section className="py-9">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">
            What you can do
          </h2>
          <ul className="mt-5 grid overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-2 dark:border-slate-800">
            {capabilities.map((capability) => (
              <li
                key={capability}
                className="flex min-h-14 items-center gap-3 border-b border-slate-200 px-4 py-3 text-sm leading-6 sm:odd:border-r dark:border-slate-800"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                {capability}
              </li>
            ))}
          </ul>
        </section>

        <Button asChild variant="secondary" className="min-h-11">
          <Link href="/welcome">
            <BookOpen size={17} /> View Welcome Page
          </Link>
        </Button>
      </main>

      <footer className="mx-auto mt-12 max-w-5xl border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Developed by:{" "}
        <a
          href="https://www.facebook.com/glennmark5466/"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-slate-700 hover:text-indigo-600 hover:underline dark:text-slate-300 dark:hover:text-indigo-400"
        >
          Glenn Mark L. Flores
        </a>
      </footer>
    </div>
  );
}
