"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CircleHelp,
  Home,
  Info,
  ListMusic,
  Music2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

const nav = [
  { href: "/welcome", label: "Welcome", icon: Home },
  { href: "/library", label: "Song library", icon: BookOpen },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/help", label: "Help", icon: CircleHelp },
  { href: "/about", label: "About", icon: Info },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const songView =
    pathname !== "/songs/new" && /^\/songs\/[^/]+$/.test(pathname);
  const immersive =
    pathname === "/" ||
    pathname === "/welcome" ||
    pathname.startsWith("/performance/") ||
    pathname.startsWith("/s/") ||
    songView;
  if (immersive) return <>{children}</>;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-3 py-2 sm:gap-6 sm:px-6">
          <Link
            href="/library"
            className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white">
              <Music2 size={19} />
            </span>
            <span className="hidden min-[360px]:inline">SetBook</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  pathname.startsWith(href)
                    ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Button asChild size="sm">
              <Link href="/songs/new">
                <Plus size={16} />
                <span className="hidden min-[430px]:inline">Add song</span>
              </Link>
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] font-medium min-[390px]:text-xs",
              pathname.startsWith(href) ? "text-indigo-600" : "text-slate-500",
            )}
          >
            <Icon size={20} />
            <span className="max-w-full truncate">
              {label === "Song library" ? "Library" : label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
