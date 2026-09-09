import { isResourceId } from "./lyric-contract.js";
import { RHYME_LIMITS, RhymeValidationError } from "./rhyme-contract.js";

export const RHYME_INSERTION_CONTRACT_VERSION = 1 as const;
export const RHYME_INSERTION_UNAVAILABLE_REASONS = ["no_open_target", "target_deleted", "target_changed"] as const;
export type RhymeInsertionUnavailableReason = (typeof RHYME_INSERTION_UNAVAILABLE_REASONS)[number];

export interface CrdtTextSelectionReference {
  readonly resourceId: string;
  readonly documentKey: string;
  readonly anchorRelativePosition: string;
  readonly headRelativePosition: string;
}

export interface CrdtTextCursorReference {
  readonly resourceId: string;
  readonly documentKey: string;
  readonly relativePosition: string;
}

export interface RhymeInsertionRequest {
  readonly version: typeof RHYME_INSERTION_CONTRACT_VERSION;
  readonly requestId: string;
  readonly source: CrdtTextSelectionReference;
  readonly target: CrdtTextCursorReference;
  readonly text: string;
}

export function parseRhymeInsertionRequest(value: unknown): RhymeInsertionRequest {
  const input = record(value, "body");
  if (input.version !== RHYME_INSERTION_CONTRACT_VERSION) invalid("version", "unsupported_value");
  const source = record(input.source, "source");
  const target = record(input.target, "target");
  const text = exactText(input.text);
  return {
    version: RHYME_INSERTION_CONTRACT_VERSION,
    requestId: uuid(input.requestId, "requestId"),
    source: {
      resourceId: uuid(source.resourceId, "source.resourceId"),
      documentKey: uuid(source.documentKey, "source.documentKey"),
      anchorRelativePosition: relativePosition(source.anchorRelativePosition, "source.anchorRelativePosition"),
      headRelativePosition: relativePosition(source.headRelativePosition, "source.headRelativePosition")
    },
    target: {
      resourceId: uuid(target.resourceId, "target.resourceId"),
      documentKey: uuid(target.documentKey, "target.documentKey"),
      relativePosition: relativePosition(target.relativePosition, "target.relativePosition")
    },
    text
  };
}

function exactText(value: unknown): string {
  if (typeof value !== "string") invalid("text", "string_required");
  const normalized = value.replace(/\r\n?/g, "\n");
  if (!normalized || normalized.includes("\u0000") || hasUnpairedSurrogate(normalized)) invalid("text", "invalid_text");
  if ([...normalized].length > RHYME_LIMITS.body) invalid("text", "too_long");
  return normalized;
}

function relativePosition(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 4_096) invalid(field, "invalid_relative_position");
  return value;
}

function uuid(value: unknown, field: string): string {
  if (!isResourceId(value)) invalid(field, "uuid_required");
  return value;
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(field, "object_required");
  return value as Record<string, unknown>;
}

function hasUnpairedSurrogate(value: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
}

function invalid(field: string, code: string): never {
  throw new RhymeValidationError([{ field, code }]);
}
