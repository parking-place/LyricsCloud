import { isResourceId, type LyricStatus } from "./lyric-contract.js";
import type { SearchResourceType } from "./search-contract.js";
import type { SongStatus } from "./resource-contract.js";
import type { ValidationIssue } from "./result.js";

export const SAVED_RESOURCE_TYPES = ["all", "song", "lyrics", "rhyme_note", "prompt"] as const;
export const SAVED_RESOURCE_SCOPES = ["all", "favorites", "pinned"] as const;
export const SAVED_RESOURCE_STATUSES = ["all", "idea", "writing_lyrics", "revising", "suno_generating", "mixing", "completed", "on_hold", "draft", "final"] as const;
export type SavedResourceTypeFilter = (typeof SAVED_RESOURCE_TYPES)[number];
export type SavedResourceScope = (typeof SAVED_RESOURCE_SCOPES)[number];
export type SavedResourceStatusFilter = (typeof SAVED_RESOURCE_STATUSES)[number];

export interface SavedResourceQuery {
  readonly type: SavedResourceTypeFilter;
  readonly scope: SavedResourceScope;
  readonly songId?: string;
  readonly status: SavedResourceStatusFilter;
}

export interface SavedResourceItem {
  readonly id: string;
  readonly type: SearchResourceType;
  readonly title: string;
  readonly status: SongStatus | LyricStatus | null;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly updatedAt: string;
  readonly lastOpenedAt: string | null;
  readonly parentSong: { readonly id: string; readonly title: string } | null;
  readonly linkedSongCount: number;
  readonly hasWorkNote: boolean;
}

export interface SavedResourceMutation {
  readonly id: string;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly rowVersion: number;
}

export class SavedResourceValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
  constructor(readonly issues: readonly ValidationIssue[]) { super("VALIDATION_FAILED"); this.name = "SavedResourceValidationError"; }
}

export function parseSavedResourceQuery(params: URLSearchParams): SavedResourceQuery {
  const issues: ValidationIssue[] = [];
  const type = member(params.get("type") ?? "all", SAVED_RESOURCE_TYPES, "type", issues);
  const scope = member(params.get("scope") ?? "all", SAVED_RESOURCE_SCOPES, "scope", issues);
  const status = member(params.get("status") ?? "all", SAVED_RESOURCE_STATUSES, "status", issues);
  const songId = params.get("song") || undefined;
  if (songId && !isResourceId(songId)) issues.push({ field: "song", code: "invalid" });
  if (issues.length) throw new SavedResourceValidationError(issues);
  return { type, scope, status, ...(songId ? { songId } : {}) };
}

export function parseSavedToggle(value: unknown): boolean {
  const input = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  if (typeof input.value !== "boolean") throw new SavedResourceValidationError([{ field: "value", code: "boolean_required" }]);
  return input.value;
}

export function parsePinOrder(value: unknown): readonly string[] {
  const input = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  if (!Array.isArray(input.ids) || input.ids.length > 100 || input.ids.some((id) => typeof id !== "string" || !isResourceId(id)) || new Set(input.ids).size !== input.ids.length) {
    throw new SavedResourceValidationError([{ field: "ids", code: "invalid" }]);
  }
  return input.ids as string[];
}

function member<const Values extends readonly string[]>(value: string, values: Values, field: string, issues: ValidationIssue[]): Values[number] {
  if ((values as readonly string[]).includes(value)) return value as Values[number];
  issues.push({ field, code: "invalid" });
  return values[0]!;
}
