import type { LocalSyncState, SaveStatus } from "@lyricscloud/editor";

/** States that still exist only in memory or whose local persistence failed. */
export function hasVolatilePendingInput(saveStatus: SaveStatus, syncState: LocalSyncState): boolean {
  return saveStatus !== "saved" || syncState === "saving-local" || syncState === "error";
}

export function serviceWorkerScriptUrl(buildId: string): string {
  return `/sw.js?build=${encodeURIComponent(buildId)}`;
}
