import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "About" };

const features = [
  "Smart Paste",
  "Song Library",
  "Setlists",
  "Performance View",
  "Transpose",
  "Setlist Sharing",
  "Custom chart display",
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
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          A simple, local-first tool for creating, organizing, sharing, and
          performing song charts.
        </p>

        <section className="mt-10 border-y border-slate-200 py-8 dark:border-slate-800">
          <h2 className="text-xl font-bold">Features</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <section className="py-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Developed by:
          </h2>
          <p className="mt-2 text-xl font-bold">Glenn Mark L. Flores</p>
          <a
            href="https://www.facebook.com/glennmark5466/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-indigo-700 hover:underline dark:text-indigo-400"
          >
            Facebook <ExternalLink size={16} />
          </a>
        </section>

        <Button asChild variant="secondary" className="min-h-11">
          <Link href="/welcome">
            <BookOpen size={17} /> View Welcome Page
          </Link>
        </Button>
      </main>

      <footer className="mx-auto mt-12 flex max-w-3xl flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:justify-between">
        <span>Developed by Glenn Mark L. Flores</span>
        <a
          href="https://www.facebook.com/glennmark5466/"
          target="_blank"
          rel="noreferrer"
          className="font-semibold hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          Facebook
        </a>
      </footer>
    </div>
  );
}
