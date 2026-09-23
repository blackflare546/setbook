import { isChord, parseChord as parseChordToken } from "@/core/chords/chord";
import type {
  Chord,
  SectionType,
  Song,
  SongLine,
  SongSection,
} from "@/core/songs/types";
import { newId } from "@/core/songs/types";

export type LineKind =
  "blank" | "section" | "chords" | "inline" | "compact" | "lyrics";

const SECTION_NAME =
  "intro|verse|pre[ -]?chorus|chorus|bridge|interlude|instrumental|solo|break|hook|refrain|outro|ending|tag";
const BRACKETED_SECTION_RE = new RegExp(
  `^\\s*\\[(${SECTION_NAME})(?:\\s+(\\d+))?\\]\\s*:?[\\t ]*(.*)$`,
  "i",
);
const PLAIN_SECTION_RE = new RegExp(
  `^\\s*(${SECTION_NAME})(?:\\s+(\\d+))?\\s*:?[\\t ]*$`,
  "i",
);
const INLINE_RE =
  /\[([A-G](?:#|b)?(?:maj7|min7|m7|add9|sus2|sus4|dim|aug|m6|m|6|7|5|2)?(?:\/[A-G](?:#|b)?)?)\]/g;
const COMPACT_RE = new RegExp(
  `^\\s*([A-G](?:#|b)?(?:maj7|min7|m7|add9|sus2|sus4|dim|aug|m6|m|6|7|5|2)(?:\\/[A-G](?:#|b)?)?)(?=[A-Z])(.+)$`,
);

interface SectionHeading {
  label: string;
  content: string;
}

export function parseSectionHeading(line: string): SectionHeading | null {
  const bracketed = line.match(BRACKETED_SECTION_RE);
  if (bracketed) {
    const label = `${bracketed[1]}${bracketed[2] ? ` ${bracketed[2]}` : ""}`;
    const content = bracketed[3].trim();
    if (
      !content ||
      splitTokens(content).every((token) => isChord(cleanChordToken(token)))
    ) {
      return { label, content };
    }
    return null;
  }
  const plain = line.match(PLAIN_SECTION_RE);
  if (!plain) return null;
  return {
    label: `${plain[1]}${plain[2] ? ` ${plain[2]}` : ""}`,
    content: "",
  };
}

function parseCompactLine(
  line: string,
): { chord: string; lyrics: string } | null {
  const match = line.match(COMPACT_RE);
  if (!match || !isChord(match[1])) return null;
  return { chord: match[1], lyrics: match[2] };
}

function cleanChordToken(token: string): string {
  return token.replace(/[|,:()]/g, "");
}

function splitTokens(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function classifyLine(line: string): LineKind {
  if (!line.trim()) return "blank";
  if (parseSectionHeading(line)) return "section";
  INLINE_RE.lastIndex = 0;
  if (INLINE_RE.test(line)) return "inline";
  const tokens = splitTokens(line).map(cleanChordToken);
  const chordCount = tokens.filter(isChord).length;
  if (tokens.length > 0 && chordCount === tokens.length) return "chords";
  if (parseCompactLine(line)) return "compact";
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
    const cleaned = cleanChordToken(match[0]);
    if (isChord(cleaned)) {
      chords.push({
        id: newId(),
        symbol: cleaned,
        position: match.index ?? 0,
      });
    }
  }
  return { id: newId(), lyrics, chords };
}

function sectionInfo(title: string): { type: SectionType; title: string } {
  const clean = title.replace(/[\[\]:]/g, "").trim();
  const lower = clean.toLowerCase().replace("pre chorus", "pre-chorus");
  const base = lower.split(/\s+/)[0];
  const type: SectionType = ["solo", "interlude", "break"].includes(base)
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
      const heading = parseSectionHeading(line)!;
      const info = sectionInfo(heading.label);
      current = { id: newId(), ...info, lines: [] };
      if (heading.content) {
        current.lines.push(parseChordLine(heading.content, ""));
      }
    } else if (kind === "inline") {
      current.lines.push(parseInlineLine(line));
    } else if (kind === "compact") {
      const compact = parseCompactLine(line)!;
      current.lines.push({
        id: newId(),
        lyrics: compact.lyrics,
        chords: [{ id: newId(), symbol: compact.chord, position: 0 }],
      });
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
  metadata: Partial<
    Pick<Song, "title" | "artist" | "originalKey" | "capo">
  > = {},
): Song {
  const now = new Date().toISOString();
  const normalized = text.replace(/\r\n/g, "\n");
  const rows = normalized.split("\n");
  const firstContent = rows.findIndex((row) => row.trim());
  const hasLaterSection = rows
    .slice(firstContent + 1)
    .some((row) => parseSectionHeading(row));
  const hasTitlePreamble =
    firstContent >= 0 &&
    hasLaterSection &&
    !parseSectionHeading(rows[firstContent]) &&
    !["chords", "inline", "compact"].includes(
      classifyLine(rows[firstContent]),
    ) &&
    !rows[firstContent + 1]?.trim();
  const inferredTitle = hasTitlePreamble
    ? rows[firstContent].trim().replace(/[,]$/, "")
    : "";
  const chartText = hasTitlePreamble
    ? rows
        .slice(firstContent + 1)
        .join("\n")
        .trimStart()
    : normalized;
  return {
    id: newId(),
    title: metadata.title || inferredTitle || "Untitled song",
    artist: metadata.artist || "",
    originalKey: metadata.originalKey || "",
    capo: metadata.capo ?? null,
    tags: [],
    sections: parseText(chartText),
    notes: "",
    links: {},
    sourceText: text,
    createdAt: now,
    updatedAt: now,
  };
}

export function sectionsToText(sections: SongSection[]): string {
  return sections
    .map((section) => {
      const lines = section.lines.flatMap((line) => {
        if (!line.chords.length) return [line.lyrics];
        const length = Math.max(
          line.lyrics.length,
          ...line.chords.map((chord) => chord.position + chord.symbol.length),
        );
        const row = Array.from({ length }, () => " ");
        for (const chord of [...line.chords].sort(
          (a, b) => a.position - b.position,
        )) {
          for (let index = 0; index < chord.symbol.length; index += 1) {
            row[chord.position + index] = chord.symbol[index];
          }
        }
        const chordLine = row.join("").trimEnd();
        return line.lyrics ? [chordLine, line.lyrics] : [chordLine];
      });
      return [`[${section.title}]`, ...lines].join("\n");
    })
    .join("\n\n");
}
