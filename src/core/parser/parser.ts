import { isChord, parseChord as parseChordToken } from "@/core/chords/chord";
import type {
  Chord,
  SectionType,
  Song,
  SongLine,
  SongSection,
} from "@/core/songs/types";
import { newId } from "@/core/songs/types";

export type LineKind = "blank" | "section" | "chords" | "inline" | "lyrics";

const SECTION_RE =
  /^\s*(?:\[)?(intro|verse|pre[ -]?chorus|chorus|bridge|instrumental|solo|interlude|outro|ending)(?:\s+\d+)?(?:\])?\s*:?\s*$/i;
const INLINE_RE =
  /\[([A-G](?:#|b)?(?:maj7|min7|m7|add9|sus2|sus4|dim|aug|m6|m|6|7|5)?(?:\/[A-G](?:#|b)?)?)\]/g;

function splitTokens(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function classifyLine(line: string): LineKind {
  if (!line.trim()) return "blank";
  if (SECTION_RE.test(line)) return "section";
  INLINE_RE.lastIndex = 0;
  if (INLINE_RE.test(line)) return "inline";
  const tokens = splitTokens(line).map((token) =>
    token.replace(/[|,:()]/g, ""),
  );
  const chordCount = tokens.filter(isChord).length;
  if (tokens.length > 0 && chordCount === tokens.length) return "chords";
  return "lyrics";
}

export function parseChord(value: string) {
  return parseChordToken(value);
}

export function parseInlineLine(source: string): SongLine {
  const chords: Chord[] = [];
  let lyrics = "";
  let cursor = 0;
  INLINE_RE.lastIndex = 0;
  for (const match of source.matchAll(INLINE_RE)) {
    const before = source.slice(cursor, match.index);
    lyrics += before;
    chords.push({ id: newId(), symbol: match[1], position: lyrics.length });
    cursor = (match.index ?? 0) + match[0].length;
  }
  lyrics += source.slice(cursor);
  return { id: newId(), lyrics, chords };
}

export function parseChordLine(chordLine: string, lyrics: string): SongLine {
  const chords: Chord[] = [];
  const tokenRe = /\S+/g;
  for (const match of chordLine.matchAll(tokenRe)) {
    const cleaned = match[0].replace(/[|,:()]/g, "");
    if (isChord(cleaned)) {
      chords.push({
        id: newId(),
        symbol: cleaned,
        position: Math.min(match.index ?? 0, lyrics.length),
      });
    }
  }
  return { id: newId(), lyrics, chords };
}

function sectionInfo(title: string): { type: SectionType; title: string } {
  const clean = title.replace(/[\[\]:]/g, "").trim();
  const lower = clean.toLowerCase().replace("pre chorus", "pre-chorus");
  const base = lower.split(/\s+/)[0];
  const type: SectionType =
    base === "solo" || base === "interlude"
      ? "instrumental"
      : (([
          "intro",
          "verse",
          "pre-chorus",
          "chorus",
          "bridge",
          "instrumental",
          "outro",
        ].includes(base)
          ? base
          : "other") as SectionType);
  return { type, title: clean.replace(/\b\w/g, (char) => char.toUpperCase()) };
}

export function parseText(text: string): SongSection[] {
  const rows = text.replace(/\r\n/g, "\n").split("\n");
  const sections: SongSection[] = [];
  let current: SongSection = {
    id: newId(),
    type: "verse",
    title: "Verse 1",
    lines: [],
  };
  const pushCurrent = () => {
    if (current.lines.length) sections.push(current);
  };

  for (let i = 0; i < rows.length; i += 1) {
    const line = rows[i];
    const kind = classifyLine(line);
    if (kind === "section") {
      pushCurrent();
      const info = sectionInfo(line);
      current = { id: newId(), ...info, lines: [] };
    } else if (kind === "inline") {
      current.lines.push(parseInlineLine(line));
    } else if (
      kind === "chords" &&
      classifyLine(rows[i + 1] ?? "") === "lyrics"
    ) {
      current.lines.push(parseChordLine(line, rows[i + 1]));
      i += 1;
    } else if (kind === "chords") {
      current.lines.push(parseChordLine(line, ""));
    } else if (kind === "lyrics") {
      current.lines.push({ id: newId(), lyrics: line.trimEnd(), chords: [] });
    } else if (
      kind === "blank" &&
      current.lines.length &&
      current.lines.at(-1)?.lyrics !== ""
    ) {
      current.lines.push({ id: newId(), lyrics: "", chords: [] });
    }
  }
  pushCurrent();
  return sections.length
    ? sections
    : [{ ...current, lines: [{ id: newId(), lyrics: "", chords: [] }] }];
}

export function parseSong(
  text: string,
  metadata: Partial<Pick<Song, "title" | "artist" | "originalKey">> = {},
): Song {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: metadata.title || "Untitled song",
    artist: metadata.artist || "",
    originalKey: metadata.originalKey || "",
    tags: [],
    sections: parseText(text),
    notes: "",
    links: {},
    createdAt: now,
    updatedAt: now,
  };
}
