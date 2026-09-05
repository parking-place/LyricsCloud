import type { ValidationIssue } from "./result.js";

export const LYRIC_STATUSES = ["draft", "revising", "final", "on_hold"] as const;
export type LyricStatus = (typeof LYRIC_STATUSES)[number];
export const LYRIC_STATUS_LABELS: Readonly<Record<LyricStatus, string>> = {
  draft: "초안", revising: "수정 중", final: "최종본", on_hold: "보류"
};
export const LYRIC_LIMITS = { title: 200, body: 100_000, memo: 10_000 } as const;

export interface LyricRecord {
  readonly id: string;
  readonly songId: string;
  readonly title: string;
  readonly body: string;
  readonly memo: string;
  readonly status: LyricStatus;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly rowVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface CreateLyricInput {
  readonly songId: string;
  readonly requestId: string;
  readonly title: string;
  readonly body: string;
  readonly memo: string;
  readonly status: LyricStatus;
}
export interface UpdateLyricInput {
  readonly rowVersion: number;
  readonly title?: string;
  readonly body?: string;
  readonly memo?: string;
  readonly status?: LyricStatus;
  readonly isFavorite?: boolean;
  readonly isPinned?: boolean;
  readonly pinOrder?: number | null;
}
export class LyricValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) { super("VALIDATION_FAILED"); this.name = "LyricValidationError"; }
}
export class LyricConflictError extends Error {
  constructor() { super("VERSION_CONFLICT"); this.name = "LyricConflictError"; }
}
export function isResourceId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LyricValidationError([{ field: "body", code: "object_required" }]);
  return value as Record<string, unknown>;
}
function text(value: unknown, field: "title" | "body" | "memo"): string {
  if (typeof value !== "string") throw new LyricValidationError([{ field, code: "string_required" }]);
  const result = field === "title" ? value.trim() : value;
  if ((field === "title" && !result) || result.includes("\u0000") || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(result)) {
    throw new LyricValidationError([{ field, code: "invalid_text" }]);
  }
  if ([...result].length > LYRIC_LIMITS[field]) throw new LyricValidationError([{ field, code: "too_long" }]);
  return result;
}
function status(value: unknown): LyricStatus {
  if (!LYRIC_STATUSES.includes(value as LyricStatus)) throw new LyricValidationError([{ field: "status", code: "unsupported_value" }]);
  return value as LyricStatus;
}
export function parseLyricRequestId(value: unknown): string {
  const input = object(value);
  if (!isResourceId(input.requestId)) throw new LyricValidationError([{ field: "requestId", code: "uuid_required" }]);
  return input.requestId;
}
export function parseCreateLyricInput(value: unknown, songId: string): CreateLyricInput {
  const input = object(value);
  if (!isResourceId(songId)) throw new LyricValidationError([{ field: "songId", code: "uuid_required" }]);
  return { songId, requestId: parseLyricRequestId(input), title: text(input.title, "title"), body: text(input.body === undefined ? "" : input.body, "body"), memo: text(input.memo === undefined ? "" : input.memo, "memo"), status: status(input.status === undefined ? "draft" : input.status) };
}
export function parseUpdateLyricInput(value: unknown): UpdateLyricInput {
  const input = object(value);
  if (!Number.isSafeInteger(input.rowVersion) || Number(input.rowVersion) < 1) throw new LyricValidationError([{ field: "rowVersion", code: "positive_integer_required" }]);
  const result: { rowVersion: number; title?: string; body?: string; memo?: string; status?: LyricStatus; isFavorite?: boolean; isPinned?: boolean; pinOrder?: number | null } = { rowVersion: Number(input.rowVersion) };
  for (const field of ["title", "body", "memo"] as const) if (field in input) result[field] = text(input[field], field);
  if ("status" in input) result.status = status(input.status);
  for (const field of ["isFavorite", "isPinned"] as const) if (field in input) {
    if (typeof input[field] !== "boolean") throw new LyricValidationError([{ field, code: "boolean_required" }]);
    result[field] = input[field];
  }
  if ("isPinned" in result) {
    const order = result.isPinned ? input.pinOrder ?? 0 : null;
    if (order !== null && (!Number.isInteger(order) || Number(order) < 0 || Number(order) > 2_147_483_647)) throw new LyricValidationError([{ field: "pinOrder", code: "non_negative_integer_required" }]);
    result.pinOrder = order as number | null;
  } else if ("pinOrder" in input) throw new LyricValidationError([{ field: "isPinned", code: "required" }]);
  if (Object.keys(result).length === 1) throw new LyricValidationError([{ field: "body", code: "at_least_one_field" }]);
  return result;
}
