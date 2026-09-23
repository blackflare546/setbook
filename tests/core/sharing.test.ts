import { describe, expect, it } from "vitest";
import {
  createPublishedSnapshot,
  deserializeSnapshot,
  serializeSnapshot,
} from "@/lib/sharing/snapshot";

describe("published snapshots", () => {
  it("contains only selected public data and round-trips", () => {
    const song = {
      id: "song",
      title: "Title",
      artist: "Artist",
      originalKey: "G",
      tags: ["private"],
      sections: [],
      notes: "private song note",
      links: { audio: "https://example.com/a" },
      createdAt: "x",
      updatedAt: "x",
    };
    const setlist = {
      id: "set",
      name: "Friday",
      venue: "Club",
      notes: "band note",
      entries: [
        {
          id: "entry",
          songId: "song",
          performanceKey: "A",
          arrangementCue: "Count four",
        },
      ],
      createdAt: "x",
      updatedAt: "x",
    };
    const snapshot = createPublishedSnapshot(setlist, [song], {
      includeNotes: false,
      includeLinks: false,
    });
    expect(snapshot.notes).toBeUndefined();
    expect(snapshot.songs[0].performanceKey).toBe("A");
    expect(snapshot.songs[0].arrangementCue).toBe("Count four");
    expect(snapshot.songs[0].links).toBeUndefined();
    expect(deserializeSnapshot(serializeSnapshot(snapshot))).toEqual(snapshot);
  });
});
