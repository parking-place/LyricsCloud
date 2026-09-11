import type { ValidationIssue } from "./result.js";

export interface LibraryMoveInput {
  readonly requestId: string;
  readonly itemId: string;
  readonly beforeId: string | null;
  readonly afterId: string | null;
  readonly expectedVersion: number;
}

export class LibraryOrderValidationError extends Error {
  readonly code = "VALIDATION_FAILED" as const;
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "LibraryOrderValidationError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseLibraryMoveInput(value: unknown): LibraryMoveInput {
  const issues: ValidationIssue[] = [];
  const input = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  if (input !== value) issues.push({ field: "body", code: "object_required" });
  const allowed = new Set(["requestId", "itemId", "beforeId", "afterId", "expectedVersion"]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) issues.push({ field: key, code: "unsupported_field" });
  }
  const requestId = uuid(input.requestId, "requestId", issues);
  const itemId = uuid(input.itemId, "itemId", issues);
  const beforeId = nullableUuid(input.beforeId, "beforeId", issues);
  const afterId = nullableUuid(input.afterId, "afterId", issues);
  const expectedVersion = input.expectedVersion;
  if (!Number.isSafeInteger(expectedVersion) || (expectedVersion as number) < 0) {
    issues.push({ field: "expectedVersion", code: "non_negative_safe_integer_required" });
  }
  if (beforeId === null && afterId === null) issues.push({ field: "anchors", code: "at_least_one_required" });
  if (beforeId === itemId || afterId === itemId) issues.push({ field: "anchors", code: "item_cannot_be_anchor" });
  if (beforeId !== null && beforeId === afterId) issues.push({ field: "anchors", code: "distinct_values_required" });
  if (issues.length) throw new LibraryOrderValidationError(issues);
  return { requestId, itemId, beforeId, afterId, expectedVersion: expectedVersion as number };
}

function uuid(value: unknown, field: string, issues: ValidationIssue[]): string {
  if (typeof value !== "string" || !UUID.test(value)) {
    issues.push({ field, code: "uuid_required" });
    return "00000000-0000-4000-8000-000000000000";
  }
  return value.toLowerCase();
}

function nullableUuid(value: unknown, field: string, issues: ValidationIssue[]): string | null {
  if (value === null) return null;
  return uuid(value, field, issues);
}
