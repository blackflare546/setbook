import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SmartPasteSectionBadges } from "@/components/songs/smart-paste-section-badges";
import { parseSectionArrangement } from "@/core/parser/section-arrangement";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Smart Paste section badges", () => {
  it("renders every instance and wraps instead of horizontally scrolling", () => {
    const arrangement = parseSectionArrangement(
      "[Verse 1]\nG\nOne\n\n[Chorus]\nC\nTwo\n\n[Chorus]\nD\nThree",
    );
    render(
      React.createElement(SmartPasteSectionBadges, {
        arrangement,
        onChange: vi.fn(),
      }),
    );

    expect(screen.getAllByText("Chorus")).toHaveLength(2);
    const list = screen.getByTestId("section-badge-list");
    expect(list).toHaveClass("flex-wrap");
    expect(list).toHaveClass("overflow-visible");
    expect(list).not.toHaveClass("overflow-x-auto");
  });

  it("toggles controls on the selected badge and keeps only one expanded", () => {
    const arrangement = parseSectionArrangement(
      "[Verse 1]\nG\nOne\n\n[Chorus]\nC\nTwo",
    );
    render(
      React.createElement(SmartPasteSectionBadges, {
        arrangement,
        onChange: vi.fn(),
      }),
    );

    const verse = screen.getByRole("button", {
      name: /Verse 1 section\. Drag to reorder or click to edit\./,
    });
    const chorus = screen.getByRole("button", {
      name: /Chorus section\. Drag to reorder or click to edit\./,
    });

    fireEvent.click(verse);
    expect(
      screen.getByRole("button", { name: "Remove Verse 1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Duplicate Verse 1" }),
    ).toBeVisible();

    fireEvent.click(chorus);
    expect(
      screen.queryByRole("button", { name: "Remove Verse 1" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Chorus" })).toBeVisible();

    fireEvent.click(chorus);
    expect(
      screen.queryByRole("button", { name: "Remove Chorus" }),
    ).not.toBeInTheDocument();
  });

  it("updates the selected section type through the badge dropdown", () => {
    const arrangement = parseSectionArrangement("[Verse 2]\nG\nKeep me");
    const onChange = vi.fn();
    render(
      React.createElement(SmartPasteSectionBadges, {
        arrangement,
        onChange,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Verse 2 section\. Drag to reorder or click to edit\./,
      }),
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Change Verse 2 section type" }),
      { target: { value: "2" } },
    );

    const changed = onChange.mock.calls[0][0];
    expect(changed.sections[0].section.title).toBe("Pre-Chorus");
    expect(changed.sections[0].source).toBe("[Pre-Chorus]\nG\nKeep me");
  });
});
