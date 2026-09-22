export interface MetadataText {
  readonly title: string;
  readonly memo?: string;
}

export interface MetadataDraft extends MetadataText {
  readonly kind: "lyric" | "rhyme";
  readonly resourceId: string;
  readonly revision: string;
}

function prefix(ownerId: string): string { return `lc:${ownerId}:metadata:`; }
function documentPrefix(ownerId: string, kind: MetadataDraft["kind"], resourceId: string): string {
  return `${prefix(ownerId)}${kind}:${resourceId}:`;
}

export function hasOwnerMetadataDrafts(ownerId: string, storage: Storage = localStorage): boolean {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .some((key) => key?.startsWith(prefix(ownerId)));
}

export function readOwnerMetadataDrafts(ownerId: string, storage: Storage = localStorage): MetadataDraft[] {
  const drafts: MetadataDraft[] = [];
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) {
    if (!key?.startsWith(prefix(ownerId))) continue;
    const value = storage.getItem(key);
    if (value === null) continue;
    const draft = JSON.parse(value) as MetadataDraft;
    if (!draft || !["lyric", "rhyme"].includes(draft.kind) || typeof draft.resourceId !== "string"
      || typeof draft.revision !== "string" || typeof draft.title !== "string"
      || (draft.memo !== undefined && typeof draft.memo !== "string")
      || key !== `${documentPrefix(ownerId, draft.kind, draft.resourceId)}${draft.revision}`) {
      throw new Error("METADATA_DRAFT_UNREADABLE");
    }
    drafts.push(draft);
  }
  return drafts;
}

/** Each editor owns its revisions. A late ACK only removes its immutable key. */
export function createMetadataDraftStore(ownerId: string, kind: MetadataDraft["kind"], resourceId: string, storage: Storage = localStorage) {
  const scope = documentPrefix(ownerId, kind, resourceId);
  let currentRevision: string | undefined;
  function write(value: MetadataText): string {
    const revision = crypto.randomUUID();
    const draft: MetadataDraft = { kind, resourceId, revision, title: value.title,
      ...(kind === "lyric" && value.memo !== undefined ? { memo: value.memo } : {}) };
    // Persist the replacement before removing this editor's previous revision.
    storage.setItem(`${scope}${revision}`, JSON.stringify(draft));
    const previous = currentRevision;
    currentRevision = revision;
    if (previous) storage.removeItem(`${scope}${previous}`);
    return revision;
  }
  function acknowledge(revision: string | undefined) {
    if (!revision) return;
    storage.removeItem(`${scope}${revision}`);
    if (revision === currentRevision) currentRevision = undefined;
  }
  return {
    write, acknowledge,
    read(): MetadataDraft[] {
      return readOwnerMetadataDrafts(ownerId, storage)
        .filter((draft) => draft.kind === kind && draft.resourceId === resourceId && draft.revision !== currentRevision);
    },
    restore(draft: MetadataDraft): string | null {
      if (draft.kind !== kind || draft.resourceId !== resourceId || storage.getItem(`${scope}${draft.revision}`) === null) return null;
      const revision = write(draft);
      acknowledge(draft.revision);
      return revision;
    }
  };
}
