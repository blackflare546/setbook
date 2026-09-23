"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AppSettings } from "@/core/setlists/types";
import { settingsRepository } from "@/data/repositories/settings-repository";

type Theme = AppSettings["theme"];

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
}>({ theme: "system", setTheme: async () => undefined });

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    void settingsRepository.get().then((settings) => {
      setThemeState(settings.theme);
      applyTheme(settings.theme);
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(theme);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);

  async function setTheme(nextTheme: Theme) {
    const current = await settingsRepository.get();
    await settingsRepository.save({ ...current, theme: nextTheme });
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
