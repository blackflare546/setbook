import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { KeySelector } from "@/components/ui/key-selector";

function inputRect(top: number, bottom: number): DOMRect {
  return {
    x: 100,
    y: top,
    left: 100,
    top,
    right: 260,
    bottom,
    width: 160,
    height: bottom - top,
    toJSON: () => ({}),
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("KeySelector positioning", () => {
  it("opens below when space is available and repositions above near the viewport bottom", async () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    const onChange = vi.fn();
    render(
      React.createElement(KeySelector, {
        value: "G",
        onChange,
        ariaLabel: "Performance key",
      }),
    );
    const input = screen.getByRole("combobox", { name: "Performance key" });
    let rect = inputRect(100, 140);
    input.getBoundingClientRect = vi.fn(() => rect);

    fireEvent.focus(input);
    const list = await screen.findByRole("listbox", {
      name: "Performance key options",
    });
    await waitFor(() => expect(list).toHaveAttribute("data-side", "bottom"));
    expect(list.style.top).toBe("144px");
    expect(list.style.bottom).toBe("");

    rect = inputRect(700, 740);
    fireEvent.scroll(window);
    await waitFor(() => expect(list).toHaveAttribute("data-side", "top"));
    expect(list.style.top).toBe("");
    expect(list.style.bottom).toBe("104px");
    expect(list.style.maxHeight).toBe("256px");

    fireEvent.change(input, { target: { value: "E minor" } });
    fireEvent.click(screen.getByRole("option", { name: "E Minor" }));
    expect(onChange).toHaveBeenCalledWith("Em");
  });
});
