"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CircleHelp, Info, ListMusic, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetBookLogo } from "@/components/brand/setbook-logo";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

const nav = [
  { href: "/library", label: "Song library", icon: BookOpen },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/help", label: "Help", icon: CircleHelp },
  { href: "/about", label: "About", icon: Info },
];

const keyboardInputSelector = [
  "input:not([type])",
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="url"]',
  'input[type="tel"]',
  'input[type="number"]',
  'input[type="password"]',
  "textarea",
  '[contenteditable="true"]',
].join(",");
const KEYBOARD_HEIGHT_THRESHOLD = 120;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileKeyboardActive, setMobileKeyboardActive] = useState(false);
  useEffect(() => {
    let frame = 0;
    const viewport = window.visualViewport;
    const viewportHeight = () => viewport?.height ?? window.innerHeight;
    let expandedViewportHeight = viewportHeight();

    const syncKeyboardState = () => {
      const activeElement = document.activeElement;
      const editableFocused =
        activeElement instanceof Element &&
        activeElement.matches(keyboardInputSelector);
      const currentViewportHeight = viewportHeight();
      const viewportReduction =
        expandedViewportHeight - currentViewportHeight;
      const keyboardOpen = viewportReduction >= KEYBOARD_HEIGHT_THRESHOLD;

      if (!editableFocused && !keyboardOpen) {
        expandedViewportHeight = currentViewportHeight;
      } else if (currentViewportHeight > expandedViewportHeight) {
        expandedViewportHeight = currentViewportHeight;
      }
      setMobileKeyboardActive(
        window.matchMedia("(max-width: 1023px)").matches && keyboardOpen,
      );
    };
    const handleFocusChange = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncKeyboardState);
    };

    document.addEventListener("focusin", handleFocusChange);
    document.addEventListener("focusout", handleFocusChange);
    window.addEventListener("resize", syncKeyboardState);
    viewport?.addEventListener("resize", syncKeyboardState);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("focusin", handleFocusChange);
      document.removeEventListener("focusout", handleFocusChange);
      window.removeEventListener("resize", syncKeyboardState);
      viewport?.removeEventListener("resize", syncKeyboardState);
    };
  }, []);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const songView =
    pathname !== "/songs/new" && /^\/songs\/[^/]+$/.test(pathname);
  const immersive =
    pathname === "/" ||
    pathname === "/welcome" ||
    pathname.startsWith("/performance/") ||
    /^\/shared\/[^/]+\/performance\/?$/.test(pathname) ||
    songView;
  if (immersive) return <>{children}</>;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 dark:bg-white dark:text-slate-950"
      >
        Skip to content
      </a>
      <header
        data-testid="app-header"
        className="relative z-30 border-b border-slate-200 bg-white/92 backdrop-blur-xl lg:sticky lg:top-0 dark:border-slate-800 dark:bg-slate-950/92"
      >
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-2 px-3 py-2 sm:gap-6 sm:px-6 lg:px-8">
          <Link
            href="/library"
            className="shrink-0 rounded-lg text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 dark:text-white dark:focus-visible:ring-offset-slate-950"
            aria-label="SetBook home"
          >
            <SetBookLogo compact />
          </Link>
          <nav
            aria-label="Primary navigation"
            className="hidden flex-1 items-center gap-1 lg:flex"
          >
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  isActive(href)
                    ? "bg-slate-950 text-white shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Button asChild size="sm">
              <Link href="/songs/new">
                <Plus size={16} aria-hidden="true" />
                <span className="hidden min-[430px]:inline">Add song</span>
              </Link>
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <nav
        aria-label="Primary navigation"
        data-testid="mobile-primary-navigation"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-1 pb-[max(.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-24px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden",
          mobileKeyboardActive ? "hidden" : "flex",
        )}
      >
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-0.5 text-[10px] font-semibold",
              isActive(href)
                ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="max-w-full truncate">
              {label === "Song library" ? "Library" : label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
