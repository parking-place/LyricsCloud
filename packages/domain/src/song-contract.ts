import {
  RESOURCE_COLORS,
  RESOURCE_LIMITS,
  SONG_STATUSES,
  normalizeResourceTitle,
  type ResourceColor,
  type SongStatus
} from "./resource-contract.js";
import type { ValidationIssue } from "./result.js";

export const SONG_SORTS = [
  "updated_desc",
  "created_desc",
  "created_asc",
  "title_asc",
  "favorite_first"
] as const;
export type SongSort = (typeof SONG_SORTS)[number];

export const SONG_LIST_LIMITS = { default: 20, maximum: 50 } as const;

export interface CreateSongInput {
  readonly requestId: string;
  readonly title: string;
  readonly description: string;
  readonly workNotes: string;
  readonly status: SongStatus;
  readonly color: ResourceColor | null;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
}

export interface UpdateSongInput {
  readonly title?: string;
  readonly description?: string;
  readonly workNotes?: string;
  readonly status?: SongStatus;
}

export interface SongListInput {
  readonly search?: string;
  readonly status?: SongStatus;
  readonly sort: SongSort;
  readonly cursor?: string;
  readonly limit: number;
}

export class SongValidationError extends Error {
  readonly code = "VALIDATION_FAILED" as const;
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "SongValidationError";
  }
}

export function parseCreateSongInput(value: unknown): CreateSongInput {
  const input = objectInput(value);
  const issues: ValidationIssue[] = [];
  const requestId = uuid(input.requestId, "requestId", issues);
  const title = titleValue(input.title, issues);
  const description = textValue(input.description, "description", RESOURCE_LIMITS.songDescription, issues, "");
  const workNotes = textValue(input.workNotes, "workNotes", RESOURCE_LIMITS.songWorkNotes, issues, "");
  const status = enumValue(input.status ?? "idea", SONG_STATUSES, "status", issues, "idea");
  const color = nullableEnumValue(input.color, RESOURCE_COLORS, "color", issues);
  const isFavorite = booleanValue(input.isFavorite, "isFavorite", issues, false);
  const isPinned = booleanValue(input.isPinned, "isPinned", issues, false);
  const pinOrder = pinOrderValue(input.pinOrder, isPinned, issues);
  if (issues.length) throw new SongValidationError(issues);
  return { requestId, title, description, workNotes, status, color, isFavorite, isPinned, pinOrder };
}

export function parseUpdateSongInput(value: unknown): UpdateSongInput {
  const input = objectInput(value);
  const issues: ValidationIssue[] = [];
  const result: { title?: string; description?: string; workNotes?: string; status?: SongStatus } = {};
  if ("title" in input) result.title = titleValue(input.title, issues);
  if ("description" in input) result.description = textValue(input.description, "description", RESOURCE_LIMITS.songDescription, issues);
  if ("workNotes" in input) result.workNotes = textValue(input.workNotes, "workNotes", RESOURCE_LIMITS.songWorkNotes, issues);
  if ("status" in input) result.status = enumValue(input.status, SONG_STATUSES, "status", issues, "idea");
  if (Object.keys(result).length === 0) issues.push({ field: "body", code: "at_least_one_field" });
  if (issues.length) throw new SongValidationError(issues);
  return result;
}

export function parseFavoriteInput(value: unknown): boolean {
  const input = objectInput(value);
  const issues: ValidationIssue[] = [];
  const result = booleanValue(input.value, "value", issues);
  if (issues.length) throw new SongValidationError(issues);
  return result;
}

export function parsePinInput(value: unknown): { isPinned: boolean; pinOrder: number | null } {
  const input = objectInput(value);
  const issues: ValidationIssue[] = [];
  const isPinned = booleanValue(input.value, "value", issues);
  const pinOrder = pinOrderValue(input.pinOrder, isPinned, issues);
  if (issues.length) throw new SongValidationError(issues);
  return { isPinned, pinOrder };
}

export function parseColorInput(value: unknown): ResourceColor | null {
  const input = objectInput(value);
  const issues: ValidationIssue[] = [];
  const color = nullableEnumValue(input.value, RESOURCE_COLORS, "value", issues);
  if (issues.length) throw new SongValidationError(issues);
  return color;
}

export function parseSongListInput(params: URLSearchParams): SongListInput {
  const issues: ValidationIssue[] = [];
  const rawSearch = params.get("search")?.trim() ?? "";
  const search = rawSearch ? textValue(rawSearch, "search", 200, issues) : undefined;
  const rawStatus = params.get("status")?.trim();
  const status = rawStatus ? enumValue(rawStatus, SONG_STATUSES, "status", issues, "idea") : undefined;
  const sort = enumValue(params.get("sort") ?? "updated_desc", SONG_SORTS, "sort", issues, "updated_desc");
  const cursor = params.get("cursor")?.trim() || undefined;
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? SONG_LIST_LIMITS.default : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > SONG_LIST_LIMITS.maximum) {
    issues.push({ field: "limit", code: "integer_between_1_and_50" });
  }
  if (cursor && cursor.length > 1_024) issues.push({ field: "cursor", code: "too_long" });
  if (issues.length) throw new SongValidationError(issues);
  return { ...(search ? { search } : {}), ...(status ? { status } : {}), sort, ...(cursor ? { cursor } : {}), limit };
}

function objectInput(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SongValidationError([{ field: "body", code: "object_required" }]);
  }
  return value as Record<string, unknown>;
}

function titleValue(value: unknown, issues: ValidationIssue[]): string {
  if (typeof value !== "string") {
    issues.push({ field: "title", code: "string_required" });
    return "";
  }
  const result = normalizeResourceTitle(value);
  if (!result) issues.push({ field: "title", code: "required" });
  else if (result.length > RESOURCE_LIMITS.title) issues.push({ field: "title", code: "too_long" });
  return result;
}

function textValue(value: unknown, field: string, maximum: number, issues: ValidationIssue[], fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string") {
    issues.push({ field, code: "string_required" });
    return fallback ?? "";
  }
  if (value.length > maximum) issues.push({ field, code: "too_long" });
  return value;
}

function booleanValue(value: unknown, field: string, issues: ValidationIssue[], fallback?: boolean): boolean {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "boolean") {
    issues.push({ field, code: "boolean_required" });
    return fallback ?? false;
  }
  return value;
}

function enumValue<const Value extends string>(
  value: unknown,
  values: readonly Value[],
  field: string,
  issues: ValidationIssue[],
  fallback: Value
): Value {
  if (typeof value === "string" && (values as readonly string[]).includes(value)) return value as Value;
  issues.push({ field, code: "unsupported_value" });
  return fallback;
}

function nullableEnumValue<const Value extends string>(
  value: unknown,
  values: readonly Value[],
  field: string,
  issues: ValidationIssue[]
): Value | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && (values as readonly string[]).includes(value)) return value as Value;
  issues.push({ field, code: "unsupported_value" });
  return null;
}

function pinOrderValue(value: unknown, isPinned: boolean, issues: ValidationIssue[]): number | null {
  if (!isPinned) {
    if (value !== undefined && value !== null) issues.push({ field: "pinOrder", code: "must_be_null_when_unpinned" });
    return null;
  }
  if (value === undefined || value === null) return 0;
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 2_147_483_647) {
    issues.push({ field: "pinOrder", code: "non_negative_integer_required" });
    return 0;
  }
  return value as number;
}

function uuid(value: unknown, field: string, issues: ValidationIssue[]): string {
  if (typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value;
  issues.push({ field, code: "uuid_required" });
  return "00000000-0000-4000-8000-000000000000";
}
