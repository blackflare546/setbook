import { parseSectionHeading, parseSong } from "@/core/parser/parser";
import type { SectionType, SongSection } from "@/core/songs/types";
import { newId } from "@/core/songs/types";

export interface ArrangedSection {
  id: string;
  section: SongSection;
  source: string;
  hasHeading: boolean;
}

export interface SectionArrangement {
  prefix: string;
  newline: string;
  sections: ArrangedSection[];
}

interface SourceLine {
  start: number;
  contentEnd: number;
  end: number;
  content: string;
}

export const SECTION_TYPE_OPTIONS: ReadonlyArray<{
  type: SectionType;
  title: string;
}> = [
  { type: "intro", title: "Intro" },
  { type: "verse", title: "Verse" },
  { type: "pre-chorus", title: "Pre-Chorus" },
  { type: "chorus", title: "Chorus" },
  { type: "bridge", title: "Bridge" },
  { type: "instrumental", title: "Instrumental" },
  { type: "outro", title: "Outro" },
  { type: "other", title: "Other" },
];

function sourceLines(source: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let start = 0;
  while (start < source.length) {
    let contentEnd = start;
    while (
      contentEnd < source.length &&
      source[contentEnd] !== "\n" &&
      source[contentEnd] !== "\r"
    ) {
      contentEnd += 1;
    }
    let end = contentEnd;
    if (source.slice(end, end + 2) === "\r\n") end += 2;
    else if (source[end] === "\n" || source[end] === "\r") end += 1;
    lines.push({
      start,
      contentEnd,
      end,
      content: source.slice(start, contentEnd),
    });
    start = end;
  }
  return lines;
}

export function parseSectionArrangement(source: string): SectionArrangement {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  if (!source.trim()) return { prefix: source, newline, sections: [] };

  const headings = sourceLines(source).filter((line) =>
    parseSectionHeading(line.content),
  );
  const parsedSections = parseSong(source).sections;
  const hasImplicitFirstSection = parsedSections.length > headings.length;
  const starts = hasImplicitFirstSection
    ? [0, ...headings.map((heading) => heading.start)]
    : headings.map((heading) => heading.start);
  const prefixEnd = hasImplicitFirstSection ? 0 : (starts[0] ?? 0);

  return {
    prefix: source.slice(0, prefixEnd),
    newline,
    sections: parsedSections.map((section, index) => {
      const start = starts[index] ?? prefixEnd;
      const end = starts[index + 1] ?? source.length;
      return {
        id: section.id,
        section,
        source: source.slice(start, end),
        hasHeading: !(hasImplicitFirstSection && index === 0),
      };
    }),
  };
}

export function arrangementToText(arrangement: SectionArrangement): string {
  return arrangement.sections.reduce((result, item) => {
    if (
      result &&
      item.source &&
      !/[\r\n]$/.test(result) &&
      !/^[\r\n]/.test(item.source)
    ) {
      return `${result}${arrangement.newline}${arrangement.newline}${item.source}`;
    }
    return result + item.source;
  }, arrangement.prefix);
}

function withMaterializedHeading(
  item: ArrangedSection,
  newline: string,
): ArrangedSection {
  if (item.hasHeading) return item;
  return {
    ...item,
    source: `[${item.section.title}]${newline}${item.source}`,
    hasHeading: true,
  };
}

function cloneSection(section: SongSection): SongSection {
  return {
    ...section,
    id: newId(),
    lines: section.lines.map((line) => ({
      ...line,
      id: newId(),
      chords: line.chords.map((chord) => ({ ...chord, id: newId() })),
    })),
  };
}

export function reorderArrangement(
  arrangement: SectionArrangement,
  activeId: string,
  overId: string,
): SectionArrangement {
  const from = arrangement.sections.findIndex((item) => item.id === activeId);
  const to = arrangement.sections.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return arrangement;
  const sections = arrangement.sections.map((item) =>
    withMaterializedHeading(item, arrangement.newline),
  );
  const [moved] = sections.splice(from, 1);
  sections.splice(to, 0, moved);
  return { ...arrangement, sections };
}

function renameHeadingSource(
  item: ArrangedSection,
  title: string,
  newline: string,
): string {
  if (!item.hasHeading) return `[${title}]${newline}${item.source}`;
  const newlineIndex = item.source.search(/[\r\n]/);
  const lineEnd = newlineIndex < 0 ? item.source.length : newlineIndex;
  const line = item.source.slice(0, lineEnd);
  const rest = item.source.slice(lineEnd);
  const openingBracket = line.indexOf("[");
  const closingBracket = line.indexOf("]", openingBracket + 1);
  if (openingBracket >= 0 && closingBracket > openingBracket) {
    return `${line.slice(0, openingBracket + 1)}${title}${line.slice(closingBracket)}${rest}`;
  }

  const leading = line.match(/^\s*/)?.[0] ?? "";
  const trailing = line.match(/\s*$/)?.[0] ?? "";
  const colon = line.lastIndexOf(":");
  const suffix = colon >= leading.length ? line.slice(colon) : trailing;
  return `${leading}${title}${suffix}${rest}`;
}

export function renameArrangementSection(
  arrangement: SectionArrangement,
  id: string,
  type: SectionType,
  title: string,
): SectionArrangement {
  return {
    ...arrangement,
    sections: arrangement.sections.map((item) =>
      item.id === id
        ? {
            ...item,
            section: { ...item.section, type, title },
            source: renameHeadingSource(item, title, arrangement.newline),
            hasHeading: true,
          }
        : item,
    ),
  };
}

export function removeArrangementSection(
  arrangement: SectionArrangement,
  id: string,
): SectionArrangement {
  return {
    ...arrangement,
    sections: arrangement.sections.filter((item) => item.id !== id),
  };
}

export function duplicateArrangementSection(
  arrangement: SectionArrangement,
  id: string,
): SectionArrangement {
  const index = arrangement.sections.findIndex((item) => item.id === id);
  if (index < 0) return arrangement;
  const sections = [...arrangement.sections];
  const original = withMaterializedHeading(
    sections[index],
    arrangement.newline,
  );
  const duplicateSection = cloneSection(original.section);
  sections[index] = original;
  sections.splice(index + 1, 0, {
    ...original,
    id: duplicateSection.id,
    section: duplicateSection,
  });
  return { ...arrangement, sections };
}
