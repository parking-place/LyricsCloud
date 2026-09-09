import type { LyricStatus } from "./lyric-contract.js";
import type { SearchResourceType } from "./search-contract.js";
import type { SongStatus } from "./resource-contract.js";
import type { ValidationIssue } from "./result.js";

export const RECENT_WORK_LIMIT = 50;
export type RecentWorkTypeFilter = "all" | SearchResourceType;
export type RecentViewport = "desktop" | "mobile";

export interface LyricResumePosition {
  readonly cursorOffset: number;
  readonly songformLabel: string | null;
  readonly songformOccurrence: number | null;
  readonly scrollTop: number;
  readonly viewport: RecentViewport;
  readonly savedAt: string;
  readonly basisUpdatedAt: string;
}

export interface SaveLyricPositionInput {
  readonly cursorOffset: number;
  readonly songformLabel: string | null;
  readonly songformOccurrence: number | null;
  readonly scrollTop: number;
  readonly viewport: RecentViewport;
}

export interface RecentWorkItem {
  readonly id: string;
  readonly type: SearchResourceType;
  readonly title: string;
  readonly status: SongStatus | LyricStatus | null;
  readonly updatedAt: string;
  readonly lastOpenedAt: string | null;
  readonly activityAt: string;
  readonly activityKind: "updated" | "opened";
  readonly parentSong: { readonly id: string; readonly title: string } | null;
  readonly linkedSongCount: number;
  readonly hasWorkNote: boolean;
  readonly position: LyricResumePosition | null;
}

export interface RecentWorkQuery {
  readonly type: RecentWorkTypeFilter;
  readonly limit: number;
}

export class RecentWorkValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "RecentWorkValidationError";
  }
}

const TYPES = ["all", "song", "lyrics", "rhyme_note", "prompt"] as const;

export function parseRecentWorkQuery(params: URLSearchParams): RecentWorkQuery {
  const issues: ValidationIssue[] = [];
  const rawType = params.get("type") ?? "all";
  const type = (TYPES as readonly string[]).includes(rawType)
    ? rawType as RecentWorkTypeFilter
    : (issues.push({ field: "type", code: "invalid" }), "all" as const);
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? RECENT_WORK_LIMIT : Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > RECENT_WORK_LIMIT) {
    issues.push({ field: "limit", code: "invalid" });
  }
  if (issues.length) throw new RecentWorkValidationError(issues);
  return { type, limit };
}

export function parseSaveLyricPositionInput(value: unknown): SaveLyricPositionInput {
  const issues: ValidationIssue[] = [];
  const input = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const cursorOffset = integer(input.cursorOffset, 0, 100_000, "cursorOffset", issues);
  const scrollTop = pixelOffset(input.scrollTop, issues);
  const viewport = input.viewport === "desktop" || input.viewport === "mobile"
    ? input.viewport
    : (issues.push({ field: "viewport", code: "invalid" }), "desktop" as const);
  const rawLabel = input.songformLabel;
  const songformLabel = rawLabel === null || rawLabel === undefined
    ? null
    : typeof rawLabel === "string" && rawLabel.trim() && [...rawLabel.trim()].length <= 200
      ? rawLabel.trim()
      : (issues.push({ field: "songformLabel", code: "invalid" }), null);
  const rawOccurrence = input.songformOccurrence;
  const songformOccurrence = rawOccurrence === null || rawOccurrence === undefined
    ? null
    : integer(rawOccurrence, 1, 10_000, "songformOccurrence", issues);
  if ((songformLabel === null) !== (songformOccurrence === null)) {
    issues.push({ field: "songform", code: "incomplete" });
  }
  if (issues.length) throw new RecentWorkValidationError(issues);
  return { cursorOffset, songformLabel, songformOccurrence, scrollTop, viewport };
}

function integer(value: unknown, minimum: number, maximum: number, field: string, issues: ValidationIssue[]): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    issues.push({ field, code: "invalid" });
    return minimum;
  }
  return value as number;
}

function pixelOffset(value: unknown, issues: ValidationIssue[]): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10_000_000) {
    issues.push({ field: "scrollTop", code: "invalid" });
    return 0;
  }
  return Math.round(value);
}
