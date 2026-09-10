import { isResourceId, LYRIC_LIMITS } from "./lyric-contract.js";
import { PROMPT_LIMITS, PROMPT_MODES, normalizePromptToken, projectUniquePromptTokens, serializePromptTokens,
  validatePromptSentenceText, type PromptMode, type PromptTokenValue } from "./prompt-contract.js";
import type { ValidationIssue } from "./result.js";

export const TEMPLATE_TYPES = ["lyrics", "prompt"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];
export const TEMPLATE_SOURCES = ["all", "default", "user"] as const;
export type TemplateSourceFilter = (typeof TEMPLATE_SOURCES)[number];
export const TEMPLATE_SORTS = ["favorite_first", "recent_used", "updated_desc", "title_asc"] as const;
export type TemplateSort = (typeof TEMPLATE_SORTS)[number];

export interface TemplateRecord {
  readonly id: string;
  readonly type: TemplateType;
  readonly source: "default" | "user";
  readonly title: string;
  readonly lyricBody: string | null;
  readonly promptMode: PromptMode;
  readonly promptText: string | null;
  readonly tokens: readonly PromptTokenValue[];
  readonly isFavorite: boolean;
  readonly useCount: number;
  readonly lastUsedAt: string | null;
  readonly rowVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TemplateListInput {
  readonly type: TemplateType;
  readonly source: TemplateSourceFilter;
  readonly sort: TemplateSort;
}

export interface CreateTemplateInput {
  readonly requestId: string;
  readonly type: TemplateType;
  readonly title: string;
  readonly lyricBody: string | null;
  readonly promptMode: PromptMode;
  readonly promptText: string | null;
  readonly tokens: readonly PromptTokenValue[];
}

export interface UpdateTemplateInput {
  readonly rowVersion: number;
  readonly title?: string;
  readonly lyricBody?: string;
  readonly promptMode?: PromptMode;
  readonly promptText?: string;
  readonly tokens?: readonly PromptTokenValue[];
  readonly isFavorite?: boolean;
}

export interface ApplyTemplateInput {
  readonly requestId: string;
  readonly targetType: TemplateType;
  readonly title: string;
  readonly songId?: string;
}

export class TemplateValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) { super("VALIDATION_FAILED"); this.name = "TemplateValidationError"; }
}

export class TemplateConflictError extends Error {
  constructor(readonly code: "VERSION_CONFLICT" | "REQUEST_REUSED" = "VERSION_CONFLICT") { super(code); this.name = "TemplateConflictError"; }
}

export function parseTemplateListInput(params: URLSearchParams): TemplateListInput {
  const type = params.get("type") ?? "lyrics";
  const source = params.get("source") ?? "all";
  const sort = params.get("sort") ?? "favorite_first";
  if (!TEMPLATE_TYPES.includes(type as TemplateType)) fail("type", "unsupported_value");
  if (!TEMPLATE_SOURCES.includes(source as TemplateSourceFilter)) fail("source", "unsupported_value");
  if (!TEMPLATE_SORTS.includes(sort as TemplateSort)) fail("sort", "unsupported_value");
  return { type: type as TemplateType, source: source as TemplateSourceFilter, sort: sort as TemplateSort };
}

export function parseCreateTemplateInput(value: unknown): CreateTemplateInput {
  const input = object(value);
  if (!isResourceId(input.requestId)) fail("requestId", "uuid_required");
  const type = templateType(input.type, "type");
  return payload(type, input, { requestId: input.requestId as string, title: title(input.title), type });
}

export function parseUpdateTemplateInput(value: unknown, type: TemplateType): UpdateTemplateInput {
  const input = object(value);
  if (!Number.isSafeInteger(input.rowVersion) || Number(input.rowVersion) < 1) fail("rowVersion", "positive_integer_required");
  const result: { rowVersion: number; title?: string; lyricBody?: string; promptMode?: PromptMode; promptText?: string;
    tokens?: readonly PromptTokenValue[]; isFavorite?: boolean } = { rowVersion: Number(input.rowVersion) };
  if ("title" in input) result.title = title(input.title);
  if ("isFavorite" in input) {
    if (typeof input.isFavorite !== "boolean") fail("isFavorite", "boolean_required");
    result.isFavorite = input.isFavorite;
  }
  if (type === "lyrics" && "lyricBody" in input) result.lyricBody = lyricBody(input.lyricBody);
  if (type === "prompt" && "promptMode" in input) result.promptMode = promptMode(input.promptMode);
  if (type === "prompt" && "promptText" in input) result.promptText = validatePromptSentenceText(input.promptText);
  if (type === "prompt" && "tokens" in input) result.tokens = promptTokens(input.tokens);
  if ((type === "lyrics" && ("tokens" in input || "promptMode" in input || "promptText" in input))
    || (type === "prompt" && "lyricBody" in input)) fail("type", "payload_mismatch");
  if (Object.keys(result).length === 1) fail("body", "at_least_one_field");
  return result;
}

export function parseTemplateRequestId(value: unknown): string {
  const input = object(value);
  if (!isResourceId(input.requestId)) fail("requestId", "uuid_required");
  return input.requestId as string;
}

export function parseApplyTemplateInput(value: unknown): ApplyTemplateInput {
  const input = object(value);
  if (!isResourceId(input.requestId)) fail("requestId", "uuid_required");
  const targetType = templateType(input.targetType, "targetType");
  const songId = input.songId;
  if (targetType === "lyrics" && !isResourceId(songId)) fail("songId", "uuid_required");
  if (targetType === "prompt" && songId !== undefined) fail("songId", "not_allowed");
  return { requestId: input.requestId as string, targetType, title: title(input.title), ...(typeof songId === "string" ? { songId } : {}) };
}

function payload(type: TemplateType, input: Record<string, unknown>, base: { requestId: string; title: string; type: TemplateType }): CreateTemplateInput {
  if (type === "lyrics") {
    if ("tokens" in input || "promptMode" in input || "promptText" in input) fail("type", "payload_mismatch");
    return { ...base, lyricBody: lyricBody(input.lyricBody ?? ""), promptMode: "tags", promptText: null, tokens: [] };
  }
  if ("lyricBody" in input) fail("type", "payload_mismatch");
  const mode = promptMode(input.promptMode ?? "tags");
  if (mode === "tags" && "promptText" in input && input.promptText !== null) fail("promptText", "payload_mismatch");
  if (mode === "sentence" && "tokens" in input && (!Array.isArray(input.tokens) || input.tokens.length > 0)) fail("tokens", "payload_mismatch");
  if (mode === "sentence" && !("promptText" in input)) fail("promptText", "required");
  return { ...base, lyricBody: null, promptMode: mode,
    promptText: mode === "sentence" ? validatePromptSentenceText(input.promptText) : null,
    tokens: mode === "tags" ? promptTokens(input.tokens ?? []) : [] };
}

function promptMode(value: unknown): PromptMode {
  if (!PROMPT_MODES.includes(value as PromptMode)) fail("promptMode", "unsupported_value");
  return value as PromptMode;
}

function promptTokens(value: unknown): readonly PromptTokenValue[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) fail("tokens", "string_array_required");
  if (value.length > PROMPT_LIMITS.tokensPerPrompt) fail("tokens", "too_many");
  const projected = projectUniquePromptTokens(value.map((item) => normalizePromptToken(item)));
  serializePromptTokens(projected);
  return projected;
}

function lyricBody(value: unknown): string {
  if (typeof value !== "string" || value.includes("\u0000") || hasUnpairedSurrogate(value)) fail("lyricBody", "invalid_text");
  if ([...value].length > LYRIC_LIMITS.body) fail("lyricBody", "too_long");
  return value;
}

function title(value: unknown): string {
  if (typeof value !== "string") fail("title", "string_required");
  const result = value.trim();
  if (!result || result.includes("\u0000") || hasUnpairedSurrogate(result)) fail("title", "invalid_text");
  if ([...result].length > LYRIC_LIMITS.title) fail("title", "too_long");
  return result;
}

function templateType(value: unknown, field: string): TemplateType {
  if (!TEMPLATE_TYPES.includes(value as TemplateType)) fail(field, "unsupported_value");
  return value as TemplateType;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("body", "object_required");
  return value as Record<string, unknown>;
}

function hasUnpairedSurrogate(value: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
}

function fail(field: string, code: string): never { throw new TemplateValidationError([{ field, code }]); }
