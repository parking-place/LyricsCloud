import type { SongFormSection } from "./songform.js";

export const LYRIC_COPY_WARNING_LIMIT = 3_000;

export interface LyricCopyPayload {
  readonly payload: string;
  readonly codePointCount: number;
  readonly exceedsRecommendedLimit: boolean;
}

export function buildLyricCopyPayload(document: string): LyricCopyPayload {
  const payload = copyWholeLyric(document);
  const codePointCount = [...payload].length;
  return { payload, codePointCount, exceedsRecommendedLimit: codePointCount > LYRIC_COPY_WARNING_LIMIT };
}

export function copyWholeLyric(document: string): string {
  return normalizeLyricLineEndings(document).replace(/[^\n]*(?:\n|$)/gu, (line) => {
    const ending = line.endsWith("\n") ? "\n" : "";
    const content = ending ? line.slice(0, -1) : line;
    return isExtendMarkerLine(content) ? "" : line;
  });
}

export function copySongFormSections(
  document: string,
  sections: readonly SongFormSection[],
  selectedSectionIds: ReadonlySet<string> | readonly string[]
): string {
  const normalized = normalizeLyricLineEndings(document);
  const selected = new Set(selectedSectionIds);
  const slices = sections
    .filter((section) => selected.has(section.id))
    .sort((left, right) => left.from - right.from)
    .map((section) => normalized.slice(section.from, section.to));

  return slices.reduce((result, slice, index) => {
    if (index === 0 || result.endsWith("\n")) return result + slice;
    return `${result}\n${slice}`;
  }, "");
}

function normalizeLyricLineEndings(document: string): string {
  return document.replace(/\r\n?/g, "\n");
}

function isExtendMarkerLine(line: string): boolean {
  return /^[^\S\n]*\[Extend(?::[^\[\]\n]*)?\][^\S\n]*$/u.test(line);
}
