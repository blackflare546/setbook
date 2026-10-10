import { describe, expect, it } from "vitest";
import {
  canExtendPublication,
  formatPublicationDate,
} from "@/lib/sharing/publication-lifecycle";

describe("publication lifecycle presentation", () => {
  it("formats expiration dates for people rather than storage", () => {
    expect(formatPublicationDate("2026-01-01T23:00:00.000Z")).toBe(
      "January 01, 2026",
    );
  });

  it("offers extension only in the final five days or after expiration", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(canExtendPublication(undefined, now)).toBe(false);
    expect(
      canExtendPublication("2026-01-06T00:00:00.001Z", now),
    ).toBe(false);
    expect(canExtendPublication("2026-01-06T00:00:00.000Z", now)).toBe(true);
    expect(canExtendPublication("2025-12-31T00:00:00.000Z", now)).toBe(true);
  });
});
