"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="flex h-10 items-center gap-1.5 rounded-[10px] border border-slate-300 bg-white px-2.5 text-slate-600 shadow-sm hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600">
      {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
      <span className="sr-only">Theme</span>
      <select
        aria-label="Theme"
        className="max-w-[72px] bg-transparent text-xs font-semibold outline-none sm:max-w-none"
        value={theme}
        onChange={(event) => void setTheme(event.target.value as typeof theme)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
