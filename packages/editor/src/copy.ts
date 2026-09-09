import type { SongFormSection } from "./songform.js";

export function copyWholeLyric(document: string): string {
  return document.replace(/\r\n?/g, "\n");
}

export function copySongFormSections(
  document: string,
  sections: readonly SongFormSection[],
  selectedSectionIds: ReadonlySet<string> | readonly string[]
): string {
  const normalized = copyWholeLyric(document);
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
