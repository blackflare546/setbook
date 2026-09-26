import { describe, expect, it } from "vitest";
import { duplicateSetlist, reorderEntries } from "@/core/setlists/operations";

const entries = [
  { id: "1", songId: "a", arrangementCue: "" },
  { id: "2", songId: "b", arrangementCue: "" },
  { id: "3", songId: "c", arrangementCue: "" },
];
describe("setlist operations", () => {
  it("reorders without mutating", () => {
    expect(reorderEntries(entries, 0, 2).map((e) => e.id)).toEqual([
      "2",
      "3",
      "1",
    ]);
    expect(entries[0].id).toBe("1");
  });
  it("moves the complete setlist-song entry with all of its settings", () => {
    const configuredEntries = [
      {
        id: "1",
        songId: "a",
        performanceKey: "A",
        arrangementCue: "Quiet intro",
      },
      {
        id: "2",
        songId: "b",
        performanceKey: "D",
        arrangementCue: "Cut on four",
      },
      {
        id: "3",
        songId: "c",
        performanceKey: "G",
        arrangementCue: "Repeat chorus",
      },
    ];

    const reordered = reorderEntries(configuredEntries, 2, 0);

    expect(reordered).toEqual([
      configuredEntries[2],
      configuredEntries[0],
      configuredEntries[1],
    ]);
    expect(reordered[0]).toBe(configuredEntries[2]);
  });
  it("duplicates privately without carrying publish token", () => {
    const copy = duplicateSetlist(
      {
        id: "x",
        name: "Show",
        venue: "",
        notes: "",
        entries,
        publishToken: "abc123",
        createdAt: "x",
        updatedAt: "x",
      },
      "y",
    );
    expect(copy.name).toBe("Show copy");
    expect(copy.publishToken).toBeUndefined();
    expect(copy.entries[0].id).not.toBe(entries[0].id);
  });
});
