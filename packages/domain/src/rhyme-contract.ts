import type { ResourceColor } from "./resource-contract.js";
import { RESOURCE_COLORS } from "./resource-contract.js";
import type { ValidationIssue } from "./result.js";
import { isResourceId } from "./lyric-contract.js";

export const RHYME_LIMITS = {
  title: 200,
  body: 100_000,
  tag: 50,
  tagsPerNote: 30
} as const;

export const RHYME_SORTS = ["updated_desc", "created_desc", "created_asc", "title_asc", "favorite_first"] as const;
export type RhymeSort = (typeof RHYME_SORTS)[number];
export const RHYME_LIST_LIMITS = { default: 20, maximum: 50 } as const;

export interface RhymeListInput {
  readonly search?: string;
  readonly tagId?: string;
  readonly songId?: string;
  readonly sort: RhymeSort;
  readonly cursor?: string;
  readonly limit: number;
}

export interface RhymeTagRecord {
  readonly id: string;
  readonly displayValue: string;
  readonly normalizedValue: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RhymeNoteRecord {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly color: ResourceColor | null;
  readonly rowVersion: number;
  readonly tags: readonly RhymeTagRecord[];
  readonly linkedSongIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateRhymeNoteInput {
  readonly requestId: string;
  readonly title: string;
  readonly body: string;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly color: ResourceColor | null;
}

export interface UpdateRhymeNoteInput {
  readonly rowVersion: number;
  readonly title?: string;
  readonly body?: string;
  readonly isFavorite?: boolean;
  readonly isPinned?: boolean;
  readonly pinOrder?: number | null;
  readonly color?: ResourceColor | null;
}

export class RhymeValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "RhymeValidationError";
  }
}

export class RhymeConflictError extends Error {
  constructor(readonly code: "VERSION_CONFLICT" | "REQUEST_REUSED" = "VERSION_CONFLICT") {
    super(code);
    this.name = "RhymeConflictError";
  }
}

export function normalizeRhymeTag(value: string): { displayValue: string; normalizedValue: string } {
  const displayValue = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!displayValue || displayValue.includes("\u0000") || hasUnpairedSurrogate(displayValue)) {
    throw new RhymeValidationError([{ field: "tag", code: "invalid_text" }]);
  }
  if ([...displayValue].length > RHYME_LIMITS.tag) {
    throw new RhymeValidationError([{ field: "tag", code: "too_long" }]);
  }
  return { displayValue, normalizedValue: displayValue.toLowerCase() };
}

export function parseCreateRhymeNoteInput(value: unknown): CreateRhymeNoteInput {
  const input = object(value);
  if (!isResourceId(input.requestId)) issue("requestId", "uuid_required");
  const isPinned = booleanValue(input.isPinned ?? false, "isPinned");
  return {
    requestId: input.requestId as string,
    title: text(input.title, "title"),
    body: text(input.body ?? "", "body"),
    isFavorite: booleanValue(input.isFavorite ?? false, "isFavorite"),
    isPinned,
    pinOrder: pinOrder(input.pinOrder, isPinned),
    color: color(input.color ?? null)
  };
}

export function parseUpdateRhymeNoteInput(value: unknown): UpdateRhymeNoteInput {
  const input = object(value);
  if (!Number.isSafeInteger(input.rowVersion) || Number(input.rowVersion) < 1) issue("rowVersion", "positive_integer_required");
  const result: {
    rowVersion: number; title?: string; body?: string; isFavorite?: boolean;
    isPinned?: boolean; pinOrder?: number | null; color?: ResourceColor | null;
  } = { rowVersion: Number(input.rowVersion) };
  if ("title" in input) result.title = text(input.title, "title");
  if ("body" in input) result.body = text(input.body, "body");
  if ("isFavorite" in input) result.isFavorite = booleanValue(input.isFavorite, "isFavorite");
  if ("color" in input) result.color = color(input.color);
  if ("isPinned" in input) {
    result.isPinned = booleanValue(input.isPinned, "isPinned");
    result.pinOrder = pinOrder(input.pinOrder, result.isPinned);
  } else if ("pinOrder" in input) issue("isPinned", "required");
  if (Object.keys(result).length === 1) issue("body", "at_least_one_field");
  return result;
}

export function parseRhymeRequestId(value: unknown): string {
  const input = object(value);
  if (!isResourceId(input.requestId)) issue("requestId", "uuid_required");
  return input.requestId as string;
}

export function parseRhymeListInput(params: URLSearchParams): RhymeListInput {
  const search = params.get("search")?.normalize("NFC").trim() || undefined;
  if (search && [...search].length > 200) issue("search", "too_long");
  const tagId = params.get("tag")?.trim() || undefined;
  const songId = params.get("song")?.trim() || undefined;
  if (tagId && !isResourceId(tagId)) issue("tag", "uuid_required");
  if (songId && !isResourceId(songId)) issue("song", "uuid_required");
  const rawSort = params.get("sort") ?? "updated_desc";
  if (!RHYME_SORTS.includes(rawSort as RhymeSort)) issue("sort", "unsupported_value");
  const cursor = params.get("cursor")?.trim() || undefined;
  if (cursor && cursor.length > 1_024) issue("cursor", "too_long");
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? RHYME_LIST_LIMITS.default : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > RHYME_LIST_LIMITS.maximum) issue("limit", "integer_between_1_and_50");
  return {
    ...(search ? { search } : {}), ...(tagId ? { tagId } : {}), ...(songId ? { songId } : {}),
    sort: rawSort as RhymeSort, ...(cursor ? { cursor } : {}), limit
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) issue("body", "object_required");
  return value as Record<string, unknown>;
}

function text(value: unknown, field: "title" | "body"): string {
  if (typeof value !== "string") issue(field, "string_required");
  const normalized = field === "title" ? value.normalize("NFC").trim() : value.replace(/\r\n?/g, "\n");
  if ((field === "title" && !normalized) || normalized.includes("\u0000") || hasUnpairedSurrogate(normalized)) issue(field, "invalid_text");
  if ([...normalized].length > RHYME_LIMITS[field]) issue(field, "too_long");
  return normalized;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") issue(field, "boolean_required");
  return value;
}

function color(value: unknown): ResourceColor | null {
  if (value === null) return null;
  if (!RESOURCE_COLORS.includes(value as ResourceColor)) issue("color", "unsupported_value");
  return value as ResourceColor;
}

function pinOrder(value: unknown, pinned: boolean): number | null {
  if (!pinned) return null;
  const order = value ?? 0;
  if (!Number.isInteger(order) || Number(order) < 0 || Number(order) > 2_147_483_647) issue("pinOrder", "non_negative_integer_required");
  return Number(order);
}

function hasUnpairedSurrogate(value: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
}

function issue(field: string, code: string): never {
  throw new RhymeValidationError([{ field, code }]);
}
