import type { RhymeNoteRecord } from "@lyricscloud/domain";

const fields = ["title", "isFavorite", "isPinned", "pinOrder", "color"] as const;
export type RhymeMetadataDraft = Pick<RhymeNoteRecord, typeof fields[number]>;

// CRDT body projection can advance rowVersion independently. Rebase metadata
// only while no other tab changed the same metadata field.
export function createRhymeMetadataSaver(resourceId: string, initial: RhymeMetadataDraft) {
  let baseline = initial;
  return async (draft: RhymeMetadataDraft) => {
    const changed = fields.filter((field) => draft[field] !== baseline[field]);
    for (let attempt = 0; attempt < 2; attempt++) {
      const read = await fetch(`/api/rhymes/${resourceId}`, { cache: "no-store" });
      if (!read.ok) throw new Error("SAVE_FAILED");
      const { rhyme: current } = await read.json() as { rhyme: RhymeNoteRecord };
      if (changed.some((field) => current[field] !== baseline[field] && current[field] !== draft[field])) {
        throw new Error("VERSION_CONFLICT");
      }
      if (!changed.length) return { rowVersion: current.rowVersion };
      const response = await fetch(`/api/rhymes/${resourceId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ rowVersion: current.rowVersion, ...Object.fromEntries(changed.map((field) => [field, draft[field]])) })
      });
      if (response.status === 409 && attempt === 0) continue;
      if (!response.ok) throw new Error(response.status === 409 ? "VERSION_CONFLICT" : "SAVE_FAILED");
      const { rhyme } = await response.json() as { rhyme: RhymeNoteRecord };
      baseline = draft;
      return { rowVersion: rhyme.rowVersion };
    }
    throw new Error("VERSION_CONFLICT");
  };
}
