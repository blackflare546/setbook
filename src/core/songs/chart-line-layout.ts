import type { SongLine } from "@/core/songs/types";

export type DisplayChord = SongLine["chords"][number] & {
  displaySymbol: string;
};

export interface ChartLineFragmentChord extends DisplayChord {
  renderedPosition: number;
}

export interface ChartLineFragment {
  startColumn: number;
  endColumn: number;
  lyrics: string;
  chords: ChartLineFragmentChord[];
  columns: number;
  overflows: boolean;
}

function chordWidth(chord: DisplayChord, chordToLyricScale: number) {
  return Math.max(
    1,
    Math.ceil(chord.displaySymbol.length * chordToLyricScale),
  );
}

function lineExtent(
  line: SongLine,
  chords: DisplayChord[],
  chordToLyricScale: number,
) {
  return Math.max(
    1,
    line.lyrics.length,
    ...chords.map(
      (chord) => chord.position + chordWidth(chord, chordToLyricScale),
    ),
  );
}

function hasVisibleContentBefore(
  lyrics: string,
  chords: DisplayChord[],
  start: number,
  end: number,
) {
  return (
    /\S/u.test(lyrics.slice(start, end)) ||
    chords.some((chord) => chord.position >= start && chord.position < end)
  );
}

function preferredBoundary(
  lyrics: string,
  chords: DisplayChord[],
  start: number,
  limit: number,
) {
  const lyricLimit = Math.min(limit, lyrics.length);
  for (let index = lyricLimit; index > start; index -= 1) {
    if (
      index < lyrics.length &&
      /\s/u.test(lyrics[index - 1] ?? "") &&
      /\S/u.test(lyrics[index] ?? "") &&
      hasVisibleContentBefore(lyrics, chords, start, index)
    ) {
      return index;
    }
  }
  return limit;
}

function avoidSplittingChord(
  lyrics: string,
  chords: DisplayChord[],
  chordToLyricScale: number,
  start: number,
  proposedEnd: number,
) {
  let end = proposedEnd;
  while (end > start) {
    const crossingChord = chords.find(
      (chord) =>
        chord.position >= start &&
        chord.position < end &&
        chord.position + chordWidth(chord, chordToLyricScale) > end,
    );
    if (!crossingChord) break;
    if (crossingChord.position <= start) {
      return Math.max(
        end,
        crossingChord.position +
          chordWidth(crossingChord, chordToLyricScale),
      );
    }
    end = preferredBoundary(
      lyrics,
      chords,
      start,
      crossingChord.position,
    );
  }
  return Math.max(start + 1, end);
}

function createFragment(
  line: SongLine,
  chords: DisplayChord[],
  chordToLyricScale: number,
  maxColumns: number,
  startColumn: number,
  endColumn: number,
): ChartLineFragment {
  const fragmentChords = chords
    .filter(
      (chord) =>
        chord.position >= startColumn && chord.position < endColumn,
    )
    .map((chord) => ({
      ...chord,
      renderedPosition: chord.position - startColumn,
    }));
  const lyrics = line.lyrics.slice(startColumn, endColumn);
  const columns = Math.max(
    1,
    lyrics.length,
    ...fragmentChords.map(
      (chord) =>
        chord.renderedPosition + chordWidth(chord, chordToLyricScale),
    ),
  );

  return {
    startColumn,
    endColumn,
    lyrics,
    chords: fragmentChords,
    columns,
    overflows: columns > maxColumns,
  };
}

export function layoutChartLine(
  line: SongLine,
  displayedChords: DisplayChord[],
  chordToLyricScale: number,
  availableColumns: number,
): ChartLineFragment[] {
  const chords = [...displayedChords].sort(
    (first, second) => first.position - second.position,
  );
  const maxColumns = Math.max(1, Math.floor(availableColumns));
  const extent = lineExtent(line, chords, chordToLyricScale);

  if (extent <= maxColumns) {
    return [
      createFragment(
        line,
        chords,
        chordToLyricScale,
        maxColumns,
        0,
        extent,
      ),
    ];
  }

  const fragments: ChartLineFragment[] = [];
  let start = 0;
  while (start < extent) {
    const limit = Math.min(extent, start + maxColumns);
    let end =
      limit === extent
        ? extent
        : preferredBoundary(line.lyrics, chords, start, limit);
    end = avoidSplittingChord(
      line.lyrics,
      chords,
      chordToLyricScale,
      start,
      end,
    );
    end = Math.min(extent, end);
    fragments.push(
      createFragment(
        line,
        chords,
        chordToLyricScale,
        maxColumns,
        start,
        end,
      ),
    );
    start = end;
  }

  return fragments;
}
