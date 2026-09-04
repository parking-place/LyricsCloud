export type ErrorCode = "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_FAILED" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE";
export interface ValidationIssue { readonly field: string; readonly code: string; }
export type CommandResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: ErrorCode; readonly issues?: readonly ValidationIssue[] };
