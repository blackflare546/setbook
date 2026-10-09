"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AppSettings } from "@/core/setlists/types";
import { settingsRepository } from "@/data/repositories/settings-repository";

type Theme = AppSettings["theme"];
type ResolvedTheme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => Promise<void>;
}>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: async () => undefined,
});

function resolveTheme(theme: Theme): ResolvedTheme {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  return dark ? "dark" : "light";
}

function applyTheme(theme: Theme): ResolvedTheme {
  const resolvedTheme = resolveTheme(theme);
  const dark = resolvedTheme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    void settingsRepository.get().then((settings) => {
      setThemeState(settings.theme);
      setResolvedTheme(applyTheme(settings.theme));
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setResolvedTheme(applyTheme(theme));
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);

  async function setTheme(nextTheme: Theme) {
    await settingsRepository.saveTheme(nextTheme);
    setThemeState(nextTheme);
    setResolvedTheme(applyTheme(nextTheme));
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
