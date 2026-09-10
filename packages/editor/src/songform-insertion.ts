export const DEFAULT_SONG_FORM_MARKERS = [
  { label: "Intro", marker: "[Intro]" },
  { label: "Verse", marker: "[Verse]" },
  { label: "Pre-Chorus", marker: "[Pre-Chorus]" },
  { label: "Chorus", marker: "[Chorus]" },
  { label: "Hook", marker: "[Hook]" },
  { label: "Bridge", marker: "[Bridge]" },
  { label: "Outro", marker: "[Outro]" }
] as const;

export type SongFormMarkerLabel = typeof DEFAULT_SONG_FORM_MARKERS[number]["label"];

export interface SongFormInsertion {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
  readonly selection: number;
}

export function buildSongFormInsertion(document: string, position: number, label: SongFormMarkerLabel): SongFormInsertion {
  if (!Number.isInteger(position) || position < 0 || position > document.length) {
    throw new RangeError("SONGFORM_INSERT_POSITION_INVALID");
  }
  const item = DEFAULT_SONG_FORM_MARKERS.find((candidate) => candidate.label === label);
  if (!item) throw new TypeError("SONGFORM_MARKER_INVALID");
  const leadingLineFeed = position > 0 && document[position - 1] !== "\n" ? "\n" : "";
  const trailingLineFeed = position < document.length && document[position] !== "\n" ? "\n" : "";
  const insert = `${leadingLineFeed}${item.marker}${trailingLineFeed}`;
  return { from: position, to: position, insert, selection: position + insert.length };
}
