import { AuthError } from "@lyricscloud/auth";
import { TemplateConflictError, TemplateValidationError } from "@lyricscloud/domain";
import { RequestAuthError } from "./auth-context.js";
import { errorResponse, privateResponseHeaders } from "./http-response.js";

export function templateResponseHeaders(renewalCookie?: string): Record<string, string> {
  return { ...privateResponseHeaders, ...(renewalCookie ? { "Set-Cookie": renewalCookie } : {}) };
}

export function templateApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof AuthError) return errorResponse(error.code, 401);
  if (error instanceof TemplateValidationError) return errorResponse("VALIDATION_FAILED", 400, undefined, error.issues);
  if (error instanceof TemplateConflictError) return errorResponse(error.code === "VERSION_CONFLICT" ? "VERSION_CONFLICT" : "CONFLICT", 409);
  if (error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}
