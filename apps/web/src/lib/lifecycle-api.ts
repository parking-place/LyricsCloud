import { AuthError } from "@lyricscloud/auth";
import { LifecycleValidationError } from "@lyricscloud/domain";
import { LifecycleConflictError } from "@lyricscloud/database";
import { RequestAuthError } from "./auth-context.js";
import { errorResponse, privateResponseHeaders } from "./http-response.js";

export function lifecycleResponseHeaders(renewalCookie?: string): Record<string, string> {
  return { ...privateResponseHeaders, ...(renewalCookie ? { "Set-Cookie": renewalCookie } : {}) };
}

export function lifecycleApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof AuthError) return errorResponse(error.code, 401);
  if (error instanceof LifecycleValidationError) return errorResponse("VALIDATION_FAILED", 400, undefined, error.issues);
  if (error instanceof LifecycleConflictError) {
    const status = error.code === "REAUTH_REQUIRED" ? 401 : 409;
    return errorResponse(status === 401 ? "AUTH_REQUIRED" : "CONFLICT", status);
  }
  if (error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}
