export type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_CANCELLED"
  | "AUTH_STATE_INVALID"
  | "AUTH_CALLBACK_REPLAYED"
  | "AUTH_NOT_ALLOWED"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_PROVIDER_UNAVAILABLE"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "VERSION_CONFLICT"
  | "DEPENDENCY_UNAVAILABLE";
export interface ValidationIssue { readonly field: string; readonly code: string; }
export type CommandResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: ErrorCode; readonly issues?: readonly ValidationIssue[] };
