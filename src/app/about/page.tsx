import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="px-4 py-10 pb-28 sm:px-6 sm:py-14 lg:pb-14">
      <main className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">
          About
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-600 text-white">
            <Music2 size={22} />
          </span>
          <h1 className="text-4xl font-black tracking-tight">SetBook</h1>
        </div>

        <section className="mt-8 border-y border-slate-200 py-8 dark:border-slate-800">
          <h2 className="text-2xl font-bold tracking-tight">
            A simple song chart and setlist tool for worship teams and bands.
          </h2>
          <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
            Organize songs, chord charts, and setlists in one place so musicians
            can work from a consistent version of each song. Instead of
            switching between different chord apps, files, and chord sheets,
            teams can prepare and perform from the same organized charts.
          </p>
        </section>

        <section className="py-8">
          <h2 className="text-xl font-bold">What you can do</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <li
                key={capability}
                className="flex items-start gap-3 text-sm leading-6"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
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

      <footer className="mx-auto mt-12 max-w-3xl border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
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
