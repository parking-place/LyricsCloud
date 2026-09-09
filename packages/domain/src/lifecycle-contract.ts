export const TRASH_RETENTION_DAYS = 30;
export const WITHDRAWAL_GRACE_DAYS = 7;
export const WITHDRAWAL_REAUTH_MINUTES = 10;

export const trashTypes = ["all", "song", "lyrics", "rhyme_note", "prompt", "template"] as const;
export type TrashTypeFilter = (typeof trashTypes)[number];
export type TrashReferenceKind = "resource" | "template";

export interface TrashReference {
  readonly kind: TrashReferenceKind;
  readonly id: string;
}

export interface TrashItem extends TrashReference {
  readonly type: Exclude<TrashTypeFilter, "all">;
  readonly title: string;
  readonly originalLocation: string;
  readonly parentSongId: string | null;
  readonly parentDeleted: boolean;
  readonly deletedAt: string;
  readonly purgeAt: string;
  readonly affectedLyrics: number;
  readonly preservedLinks: number;
}

export type LyricRestoreStrategy = "restore_parent" | "move_to_song";

export interface TrashMutationInput {
  readonly items: readonly TrashReference[];
  readonly confirmedTitles: readonly { readonly kind: TrashReferenceKind; readonly id: string; readonly title: string }[];
  readonly lyricStrategy?: LyricRestoreStrategy;
  readonly destinationSongId?: string;
}

export class LifecycleValidationError extends Error {
  constructor(readonly issues: readonly { field: string; code: string }[]) {
    super("LIFECYCLE_VALIDATION_FAILED");
    this.name = "LifecycleValidationError";
  }
}

export function parseTrashType(value: string | null): TrashTypeFilter {
  return trashTypes.includes(value as TrashTypeFilter) ? value as TrashTypeFilter : "all";
}

export function parseTrashMutationInput(value: unknown): TrashMutationInput {
  const input = value as Partial<TrashMutationInput> | null;
  const issues: { field: string; code: string }[] = [];
  const items = Array.isArray(input?.items) ? input.items : [];
  const confirmations = Array.isArray(input?.confirmedTitles) ? input.confirmedTitles : [];
  if (!items.length || items.length > 100) issues.push({ field: "items", code: "count" });
  for (const [index, item] of items.entries()) {
    if (!item || (item.kind !== "resource" && item.kind !== "template") || !isUuid(item.id)) {
      issues.push({ field: `items.${index}`, code: "invalid" });
    }
  }
  for (const [index, item] of confirmations.entries()) {
    if (!item || (item.kind !== "resource" && item.kind !== "template") || !isUuid(item.id)
      || typeof item.title !== "string" || !item.title.length || item.title.length > 200) {
      issues.push({ field: `confirmedTitles.${index}`, code: "invalid" });
    }
  }
  if (input?.lyricStrategy !== undefined && input.lyricStrategy !== "restore_parent" && input.lyricStrategy !== "move_to_song") {
    issues.push({ field: "lyricStrategy", code: "invalid" });
  }
  if (input?.destinationSongId !== undefined && !isUuid(input.destinationSongId)) {
    issues.push({ field: "destinationSongId", code: "invalid" });
  }
  if (input?.lyricStrategy === "move_to_song" && !input.destinationSongId) {
    issues.push({ field: "destinationSongId", code: "required" });
  }
  if (issues.length) throw new LifecycleValidationError(issues);
  return {
    items: uniqueReferences(items as TrashReference[]),
    confirmedTitles: confirmations as TrashMutationInput["confirmedTitles"],
    ...(input?.lyricStrategy ? { lyricStrategy: input.lyricStrategy } : {}),
    ...(input?.destinationSongId ? { destinationSongId: input.destinationSongId } : {})
  };
}

export function remainingTrashDays(purgeAt: string, now = new Date()): number {
  const remaining = new Date(purgeAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / 86_400_000));
}

function uniqueReferences(items: readonly TrashReference[]): TrashReference[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
