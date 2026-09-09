import { AuthError } from "@lyricscloud/auth";
import { PromptConflictError, PromptValidationError } from "@lyricscloud/domain";
import { PromptCursorError } from "@lyricscloud/database";
import { RequestAuthError } from "./auth-context.js";
import { errorResponse, privateResponseHeaders } from "./http-response.js";

export function promptResponseHeaders(renewalCookie?: string): Record<string, string> {
  return { ...privateResponseHeaders, ...(renewalCookie ? { "Set-Cookie": renewalCookie } : {}) };
}

export function promptApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof AuthError) return errorResponse(error.code, 401);
  if (error instanceof PromptValidationError) return errorResponse("VALIDATION_FAILED", 400, undefined, error.issues);
  if (error instanceof PromptCursorError) return errorResponse("VALIDATION_FAILED", 400, undefined, [{ field: "cursor", code: "invalid" }]);
  if (error instanceof PromptConflictError) return errorResponse(error.code === "VERSION_CONFLICT" ? "VERSION_CONFLICT" : "CONFLICT", 409);
  if (error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}
