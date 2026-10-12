import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

const repository = vi.hoisted(() => ({
  get: vi.fn(),
  saveTheme: vi.fn(),
}));

vi.mock("@/data/repositories/settings-repository", () => ({
  settingsRepository: repository,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.removeProperty("color-scheme");
});

describe("ThemeProvider", () => {
  it("does not overwrite a user choice when stored settings finish loading", async () => {
    let resolveSettings: (settings: { theme: "light" }) => void = () => {};
    repository.get.mockReturnValue(
      new Promise((resolve) => {
        resolveSettings = resolve;
      }),
    );
    repository.saveTheme.mockResolvedValue({});
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(ThemeSwitcher),
      ),
    );

    fireEvent.change(screen.getByLabelText("Theme"), {
      target: { value: "dark" },
    });
    resolveSettings({ theme: "light" });

    await waitFor(() => {
      expect(screen.getByLabelText("Theme")).toHaveValue("dark");
      expect(document.documentElement).toHaveClass("dark");
    });
    expect(repository.saveTheme).toHaveBeenCalledWith("dark");
  });
});
