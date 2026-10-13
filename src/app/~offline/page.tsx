import Link from "next/link";
import { BookOpen, ListMusic, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="px-4 py-16 pb-32 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)] sm:p-9 dark:border-slate-800 dark:bg-slate-900">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <WifiOff size={26} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
          You’re offline
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600 dark:text-slate-300">
          This page has not been saved on this device yet. Your local songs and
          setlists are still safe and available from the workspace.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg">
            <Link href="/library">
              <BookOpen size={18} aria-hidden="true" />
              Open library
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/setlists">
              <ListMusic size={18} aria-hidden="true" />
              Open setlists
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
