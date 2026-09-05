import { type ChangeDesc, Text } from "@codemirror/state";

export interface SongFormSection {
  readonly id: string;
  readonly label: string;
  readonly occurrence: number;
  readonly line: number;
  readonly tagFrom: number;
  readonly tagTo: number;
  readonly from: number;
  readonly to: number;
}

interface SongFormMarker {
  readonly label: string;
  readonly tagFrom: number;
  readonly tagTo: number;
}

interface LineWindow {
  readonly from: number;
  readonly to: number;
}

/**
 * Incremental song-form index. Edits rescan only complete lines touching the
 * changed ranges and their neighbours; unchanged markers are mapped forward.
 */
export class SongFormIndex {
  readonly #markers: readonly SongFormMarker[];
  readonly scannedCharacters: number;

  private constructor(markers: readonly SongFormMarker[], scannedCharacters: number) {
    this.#markers = markers;
    this.scannedCharacters = scannedCharacters;
  }

  static create(document: Text): SongFormIndex {
    const result = scanWindows(document, [{ from: 0, to: document.length }]);
    return new SongFormIndex(result.markers, result.scannedCharacters);
  }

  update(before: Text, after: Text, changes: ChangeDesc): SongFormIndex {
    const oldWindows: LineWindow[] = [];
    const newWindows: LineWindow[] = [];
    changes.iterChangedRanges((fromA, toA, fromB, toB) => {
      oldWindows.push(expandLineWindow(before, fromA, toA));
      newWindows.push(expandLineWindow(after, fromB, toB));
    });
    const mergedOld = mergeWindows(oldWindows);
    const mergedNew = mergeWindows(newWindows);
    const retained = this.#markers
      .filter((marker) => !mergedOld.some((window) => containsPosition(window, marker.tagFrom)))
      .map((marker) => ({
        label: marker.label,
        tagFrom: changes.mapPos(marker.tagFrom, 1),
        tagTo: changes.mapPos(marker.tagTo, -1)
      }));
    const rescanned = scanWindows(after, mergedNew);
    const byOffset = new Map<number, SongFormMarker>();
    for (const marker of [...retained, ...rescanned.markers]) byOffset.set(marker.tagFrom, marker);
    return new SongFormIndex([...byOffset.values()].sort((left, right) => left.tagFrom - right.tagFrom), rescanned.scannedCharacters);
  }

  sections(document: Text): readonly SongFormSection[] {
    const occurrences = new Map<string, number>();
    return this.#markers.map((marker, index) => {
      const occurrence = (occurrences.get(marker.label) ?? 0) + 1;
      occurrences.set(marker.label, occurrence);
      return {
        id: `songform-${marker.tagFrom}-${occurrence}`,
        label: marker.label,
        occurrence,
        line: document.lineAt(marker.tagFrom).number,
        tagFrom: marker.tagFrom,
        tagTo: marker.tagTo,
        from: marker.tagFrom,
        to: this.#markers[index + 1]?.tagFrom ?? document.length
      };
    });
  }
}

export function parseSongForm(value: string): readonly SongFormSection[] {
  const document = Text.of(value.replace(/\r\n?/g, "\n").split("\n"));
  return SongFormIndex.create(document).sections(document);
}

export function findSongFormSection(sections: readonly SongFormSection[], position: number): SongFormSection | null {
  let low = 0;
  let high = sections.length - 1;
  let match: SongFormSection | null = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const section = sections[middle];
    if (!section) break;
    if (section.from <= position) {
      match = section;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return match && position <= match.to ? match : null;
}

function scanWindows(document: Text, windows: readonly LineWindow[]): { markers: SongFormMarker[]; scannedCharacters: number } {
  const markers: SongFormMarker[] = [];
  let scannedCharacters = 0;
  for (const window of windows) {
    const firstLine = document.lineAt(Math.min(window.from, document.length)).number;
    const lastPosition = Math.max(window.from, window.to - 1);
    const lastLine = document.lineAt(Math.min(lastPosition, document.length)).number;
    for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber += 1) {
      const line = document.line(lineNumber);
      scannedCharacters += line.length + (line.to < document.length ? 1 : 0);
      const label = parseTagLabel(line.text);
      if (label !== null) markers.push({ label, tagFrom: line.from, tagTo: line.to });
    }
  }
  return { markers, scannedCharacters };
}

function parseTagLabel(line: string): string | null {
  const match = /^\s*\[([^\[\]\r\n]+)\]\s*$/u.exec(line);
  if (!match?.[1] || !match[1].trim()) return null;
  return match[1];
}

function expandLineWindow(document: Text, from: number, to: number): LineWindow {
  const safeFrom = Math.max(0, Math.min(from, document.length));
  const safeTo = Math.max(safeFrom, Math.min(to, document.length));
  const startProbe = safeFrom > 0 ? safeFrom - 1 : safeFrom;
  const endProbe = safeTo < document.length ? safeTo + 1 : safeTo;
  const first = document.lineAt(startProbe);
  const last = document.lineAt(Math.min(endProbe, document.length));
  return { from: first.from, to: last.to < document.length ? last.to + 1 : last.to };
}

function mergeWindows(windows: readonly LineWindow[]): LineWindow[] {
  const sorted = [...windows].sort((left, right) => left.from - right.from);
  const merged: LineWindow[] = [];
  for (const window of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || window.from > previous.to) {
      merged.push(window);
    } else {
      merged[merged.length - 1] = { from: previous.from, to: Math.max(previous.to, window.to) };
    }
  }
  return merged;
}

function containsPosition(window: LineWindow, position: number): boolean {
  return position >= window.from && position < Math.max(window.to, window.from + 1);
}
