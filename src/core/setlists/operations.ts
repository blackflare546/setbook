import type { Setlist, SetlistSongEntry } from "./types";

export function reorderEntries(
  entries: SetlistSongEntry[],
  from: number,
  to: number,
): SetlistSongEntry[] {
  if (from < 0 || to < 0 || from >= entries.length || to >= entries.length) {
    return entries;
  }
  const next = [...entries];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function duplicateSetlist(
  source: Setlist,
  id = crypto.randomUUID(),
): Setlist {
  const now = new Date().toISOString();
  return {
    ...source,
    id,
    name: `${source.name} copy`,
    publishToken: undefined,
    entries: source.entries.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
    })),
    createdAt: now,
    updatedAt: now,
  };
}
