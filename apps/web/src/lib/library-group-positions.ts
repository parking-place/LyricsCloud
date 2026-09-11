export interface LibraryGroupItem {
  readonly id: string;
  readonly isPinned: boolean;
}

export interface LibraryGroupPosition {
  readonly position: number;
  readonly groupSize: number;
}

export function buildPinnedGroupPositions<T extends LibraryGroupItem>(
  items: readonly T[]
): ReadonlyMap<string, LibraryGroupPosition> {
  const groupSizes: Record<"pinned" | "unpinned", number> = { pinned: 0, unpinned: 0 };
  const seen = new Set<string>();

  for (const item of items) {
    const id = item.id;
    if (seen.has(id)) throw new Error(`Duplicate library item id: ${id}`);
    seen.add(id);
    groupSizes[item.isPinned ? "pinned" : "unpinned"] += 1;
  }

  const nextPosition: Record<"pinned" | "unpinned", number> = { pinned: 0, unpinned: 0 };
  const result = new Map<string, LibraryGroupPosition>();
  for (const item of items) {
    const group = item.isPinned ? "pinned" : "unpinned";
    result.set(item.id, { position: nextPosition[group]++, groupSize: groupSizes[group] });
  }
  return result;
}
