import { AuthError } from "@lyricscloud/auth";
import { LibraryOrderValidationError, RhymeConflictError, RhymeValidationError, SongValidationError } from "@lyricscloud/domain";
import {
  LibraryOrderConflictError, LibraryOrderNotFoundError, LibraryOrderPinGroupError,
  LibraryOrderRequestReuseError, RhymeCursorError
} from "@lyricscloud/database";
import { RequestAuthError } from "./auth-context.js";
import { errorResponse, privateResponseHeaders } from "./http-response.js";

export function rhymeResponseHeaders(renewalCookie?: string): Record<string, string> {
  return { ...privateResponseHeaders, ...(renewalCookie ? { "Set-Cookie": renewalCookie } : {}) };
}

export function rhymeApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof AuthError) return errorResponse(error.code, 401);
  if (error instanceof RhymeValidationError || error instanceof SongValidationError || error instanceof LibraryOrderValidationError) {
    return errorResponse("VALIDATION_FAILED", 400, undefined, error.issues);
  }
  if (error instanceof RhymeCursorError) return errorResponse("VALIDATION_FAILED", 400, undefined, [{ field: "cursor", code: "invalid" }]);
  if (error instanceof LibraryOrderConflictError) return errorResponse("VERSION_CONFLICT", 409);
  if (error instanceof LibraryOrderNotFoundError) return errorResponse("NOT_FOUND", 404);
  if (error instanceof LibraryOrderPinGroupError || error instanceof LibraryOrderRequestReuseError) return errorResponse("CONFLICT", 409);
  if (error instanceof RhymeConflictError) return errorResponse(error.code === "VERSION_CONFLICT" ? "VERSION_CONFLICT" : "CONFLICT", 409);
  if (error instanceof Error && error.message === "RHYME_TAG_LIMIT") {
    return errorResponse("VALIDATION_FAILED", 400, undefined, [{ field: "tag", code: "maximum_30" }]);
  }
  if (error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}
