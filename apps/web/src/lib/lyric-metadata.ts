import type { LyricRecord } from "@lyricscloud/domain";

const fields = ["title", "memo", "status", "isFavorite", "isPinned", "pinOrder"] as const;
export type LyricMetadataDraft = Pick<LyricRecord, typeof fields[number]>;

// Body projection advances rowVersion independently. Rebase only metadata
// whose previous value still matches; a concurrent metadata edit stays a 409.
export function createLyricMetadataSaver(resourceId: string, initial: LyricMetadataDraft) {
  let baseline = initial;
  return async (draft: LyricMetadataDraft) => {
    const changed = fields.filter((field) => draft[field] !== baseline[field]);
    for (let attempt = 0; attempt < 2; attempt++) {
      const read = await fetch(`/api/lyrics/${resourceId}`, { cache: "no-store" });
      if (!read.ok) throw new Error("SAVE_FAILED");
      const { lyric: current } = await read.json() as { lyric: LyricRecord };
      if (changed.some((field) => current[field] !== baseline[field] && current[field] !== draft[field])) throw new Error("VERSION_CONFLICT");
      if (!changed.length) return { rowVersion: current.rowVersion };
      const response = await fetch(`/api/lyrics/${resourceId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ rowVersion: current.rowVersion, ...Object.fromEntries(changed.map((field) => [field, draft[field]])) })
      });
      if (response.status === 409 && attempt === 0) continue;
      if (!response.ok) throw new Error(response.status === 409 ? "VERSION_CONFLICT" : "SAVE_FAILED");
      const { lyric } = await response.json() as { lyric: LyricRecord };
      baseline = draft;
      return { rowVersion: lyric.rowVersion };
    }
    throw new Error("VERSION_CONFLICT");
  };
}
