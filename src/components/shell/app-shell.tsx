"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ListMusic, Music2, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/library", label: "Song library", icon: BookOpen },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive =
    pathname.startsWith("/performance/") || pathname.startsWith("/s/");
  if (immersive) return <>{children}</>;
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link
            href="/library"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white">
              <Music2 size={19} />
            </span>
            SetBook
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  pathname.startsWith(href)
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/songs/new">
                <Plus size={16} />
                Add song
              </Link>
            </Button>
            <Button asChild size="icon" variant="ghost">
              <Link href="/library?settings=1" aria-label="Settings">
                <Settings size={18} />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white p-2 md:hidden">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium",
              pathname.startsWith(href) ? "text-indigo-600" : "text-slate-500",
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
