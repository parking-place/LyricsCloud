import type { ResourceColor } from "./resource-contract.js";
import { RESOURCE_COLORS } from "./resource-contract.js";
import { isResourceId } from "./lyric-contract.js";
import type { ValidationIssue } from "./result.js";

export const PROMPT_LIMITS = {
  title: 200,
  token: 200,
  tokensPerPrompt: 200,
  serialized: 40_398
} as const;

export const PROMPT_SORTS = ["favorite_first", "recent_used", "updated_desc", "created_desc", "created_asc", "title_asc"] as const;
export type PromptSort = (typeof PROMPT_SORTS)[number];
export const PROMPT_LIST_LIMITS = { default: 20, maximum: 50 } as const;

export interface PromptListInput {
  readonly search?: string;
  readonly songId?: string;
  readonly favoriteOnly: boolean;
  readonly recentlyUsedOnly: boolean;
  readonly sort: PromptSort;
  readonly cursor?: string;
  readonly limit: number;
}

export interface PromptSuggestionInput {
  readonly search: string;
  readonly limit: number;
}

export interface PromptSongSearchInput {
  readonly search?: string;
  readonly limit: number;
}

export interface PromptTokenValue {
  readonly displayValue: string;
  readonly normalizedValue: string;
}

export interface PromptDuplicate {
  readonly normalizedValue: string;
  readonly firstIndex: number;
  readonly duplicateIndexes: readonly number[];
}

export interface PromptRecord {
  readonly id: string;
  readonly title: string;
  readonly tokens: readonly PromptTokenValue[];
  readonly plainText: string;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly color: ResourceColor | null;
  readonly rowVersion: number;
  readonly linkedSongIds: readonly string[];
  readonly useCount: number;
  readonly lastUsedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePromptInput {
  readonly requestId: string;
  readonly title: string;
  readonly tokens: readonly PromptTokenValue[];
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly color: ResourceColor | null;
}

export interface UpdatePromptInput {
  readonly requestId: string;
  readonly rowVersion: number;
  readonly title?: string;
  readonly tokens?: readonly PromptTokenValue[];
  readonly isFavorite?: boolean;
  readonly isPinned?: boolean;
  readonly pinOrder?: number | null;
  readonly color?: ResourceColor | null;
}

export class PromptValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "PromptValidationError";
  }
}

export class PromptConflictError extends Error {
  constructor(readonly code: "VERSION_CONFLICT" | "REQUEST_REUSED" = "VERSION_CONFLICT") {
    super(code);
    this.name = "PromptConflictError";
  }
}

/** A comma is always a delimiter. Empty fields are discarded; display spacing inside a token is preserved. */
export function parsePromptText(value: string): readonly PromptTokenValue[] {
  if (typeof value !== "string") fail("tokens", "string_required");
  return validatePromptTokens(value.split(",").map((part) => part.trim()).filter(Boolean));
}

/** Comparison normalization never replaces the display value stored for the occurrence. */
export function normalizePromptToken(value: string): PromptTokenValue {
  if (typeof value !== "string") fail("token", "string_required");
  const displayValue = value.trim();
  if (!displayValue || displayValue.includes("\u0000") || hasUnpairedSurrogate(displayValue)) {
    fail("token", "invalid_text");
  }
  if ([...displayValue].length > PROMPT_LIMITS.token) fail("token", "too_long");
  const normalizedValue = displayValue.normalize("NFKC").replace(/\s+/gu, " ").toLowerCase();
  return { displayValue, normalizedValue };
}

export function serializePromptTokens(tokens: readonly Pick<PromptTokenValue, "displayValue">[]): string {
  const validated = validatePromptTokens(tokens.map((token) => token.displayValue));
  const serialized = validated.map((token) => token.displayValue).join(", ");
  if ([...serialized].length > PROMPT_LIMITS.serialized) fail("tokens", "too_long");
  return serialized;
}

export function findPromptDuplicates(tokens: readonly PromptTokenValue[]): readonly PromptDuplicate[] {
  const positions = new Map<string, number[]>();
  tokens.forEach((token, index) => {
    const normalized = normalizePromptToken(token.displayValue).normalizedValue;
    const indexes = positions.get(normalized) ?? [];
    indexes.push(index);
    positions.set(normalized, indexes);
  });
  return [...positions.entries()].filter(([, indexes]) => indexes.length > 1).map(([normalizedValue, indexes]) => ({
    normalizedValue,
    firstIndex: indexes[0]!,
    duplicateIndexes: indexes.slice(1)
  }));
}

/** PostgreSQL read projection keeps the first displayed occurrence and its stable order. */
export function projectUniquePromptTokens(tokens: readonly PromptTokenValue[]): readonly PromptTokenValue[] {
  const seen = new Set<string>();
  const result: PromptTokenValue[] = [];
  for (const token of tokens) {
    const normalized = normalizePromptToken(token.displayValue);
    if (seen.has(normalized.normalizedValue)) continue;
    seen.add(normalized.normalizedValue);
    result.push(normalized);
  }
  return result;
}

export function parseCreatePromptInput(value: unknown): CreatePromptInput {
  const input = object(value);
  if (!isResourceId(input.requestId)) fail("requestId", "uuid_required");
  const pinned = booleanValue(input.isPinned ?? false, "isPinned");
  return {
    requestId: input.requestId as string,
    title: title(input.title),
    tokens: tokens(input.tokens ?? []),
    isFavorite: booleanValue(input.isFavorite ?? false, "isFavorite"),
    isPinned: pinned,
    pinOrder: parsePinOrder(input.pinOrder, pinned),
    color: parseColor(input.color ?? null)
  };
}

export function parseUpdatePromptInput(value: unknown): UpdatePromptInput {
  const input = object(value);
  if (!isResourceId(input.requestId)) fail("requestId", "uuid_required");
  if (!Number.isSafeInteger(input.rowVersion) || Number(input.rowVersion) < 1) fail("rowVersion", "positive_integer_required");
  const result: { requestId: string; rowVersion: number; title?: string; tokens?: readonly PromptTokenValue[];
    isFavorite?: boolean; isPinned?: boolean; pinOrder?: number | null; color?: ResourceColor | null } = {
    requestId: input.requestId as string, rowVersion: Number(input.rowVersion)
  };
  if ("title" in input) result.title = title(input.title);
  if ("tokens" in input) result.tokens = tokens(input.tokens);
  if ("isFavorite" in input) result.isFavorite = booleanValue(input.isFavorite, "isFavorite");
  if ("color" in input) result.color = parseColor(input.color);
  if ("isPinned" in input) {
    result.isPinned = booleanValue(input.isPinned, "isPinned");
    result.pinOrder = parsePinOrder(input.pinOrder, result.isPinned);
  } else if ("pinOrder" in input) fail("isPinned", "required");
  if (Object.keys(result).length === 2) fail("body", "at_least_one_field");
  return result;
}

export function parsePromptRequestId(value: unknown): string {
  const input = object(value);
  if (!isResourceId(input.requestId)) fail("requestId", "uuid_required");
  return input.requestId as string;
}

export function parsePromptListInput(params: URLSearchParams): PromptListInput {
  const search = params.get("search")?.normalize("NFC").trim() || undefined;
  if (search && [...search].length > 200) fail("search", "too_long");
  const songId = params.get("song")?.trim() || undefined;
  if (songId && !isResourceId(songId)) fail("song", "uuid_required");
  const rawFavorite = params.get("favorite") ?? "false";
  const rawRecent = params.get("recent") ?? "false";
  if (rawFavorite !== "true" && rawFavorite !== "false") fail("favorite", "boolean_required");
  if (rawRecent !== "true" && rawRecent !== "false") fail("recent", "boolean_required");
  const rawSort = params.get("sort") ?? "favorite_first";
  if (!PROMPT_SORTS.includes(rawSort as PromptSort)) fail("sort", "unsupported_value");
  const cursor = params.get("cursor")?.trim() || undefined;
  if (cursor && cursor.length > 1_024) fail("cursor", "too_long");
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? PROMPT_LIST_LIMITS.default : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > PROMPT_LIST_LIMITS.maximum) fail("limit", "integer_between_1_and_50");
  return {
    ...(search ? { search } : {}), ...(songId ? { songId } : {}),
    favoriteOnly: rawFavorite === "true", recentlyUsedOnly: rawRecent === "true",
    sort: rawSort as PromptSort, ...(cursor ? { cursor } : {}), limit
  };
}

export function parsePromptSuggestionInput(params: URLSearchParams): PromptSuggestionInput {
  const raw = params.get("search") ?? "";
  const search = raw.trim() ? normalizePromptToken(raw).displayValue : "";
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? 20 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail("limit", "integer_between_1_and_50");
  return { search, limit };
}

export function parsePromptSongSearchInput(params: URLSearchParams): PromptSongSearchInput {
  const search = params.get("search")?.normalize("NFC").trim() || undefined;
  if (search && [...search].length > 200) fail("search", "too_long");
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? 20 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail("limit", "integer_between_1_and_50");
  return { ...(search ? { search } : {}), limit };
}

export function validatePromptTokens(value: unknown): readonly PromptTokenValue[] {
  if (!Array.isArray(value)) fail("tokens", "array_required");
  if (value.length > PROMPT_LIMITS.tokensPerPrompt) fail("tokens", "too_many");
  return value.map((item) => typeof item === "string"
    ? normalizePromptToken(item)
    : normalizePromptToken(object(item).displayValue as string));
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("body", "object_required");
  return value as Record<string, unknown>;
}

function title(value: unknown): string {
  if (typeof value !== "string") fail("title", "string_required");
  const normalized = value.normalize("NFC").trim();
  if (!normalized || normalized.includes("\u0000") || hasUnpairedSurrogate(normalized)) fail("title", "invalid_text");
  if ([...normalized].length > PROMPT_LIMITS.title) fail("title", "too_long");
  return normalized;
}

function tokens(value: unknown): readonly PromptTokenValue[] {
  const validated = validatePromptTokens(value);
  if ([...serializePromptTokens(validated)].length > PROMPT_LIMITS.serialized) fail("tokens", "too_long");
  return validated;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") fail(field, "boolean_required");
  return value;
}

function parseColor(value: unknown): ResourceColor | null {
  if (value === null) return null;
  if (!RESOURCE_COLORS.includes(value as ResourceColor)) fail("color", "unsupported_value");
  return value as ResourceColor;
}

function parsePinOrder(value: unknown, pinned: boolean): number | null {
  if (!pinned) return null;
  const order = value ?? 0;
  if (!Number.isInteger(order) || Number(order) < 0 || Number(order) > 2_147_483_647) fail("pinOrder", "non_negative_integer_required");
  return Number(order);
}

function hasUnpairedSurrogate(value: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
}

function fail(field: string, code: string): never {
  throw new PromptValidationError([{ field, code }]);
}
