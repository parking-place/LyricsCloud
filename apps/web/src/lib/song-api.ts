import { AuthError } from "@lyricscloud/auth";
import { SongValidationError } from "@lyricscloud/domain";
import { SongCursorError } from "@lyricscloud/database";
import { getAuthContext, RequestAuthError } from "./auth-context.js";
import { errorResponse, privateResponseHeaders } from "./http-response.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function songResponseHeaders(renewalCookie?: string): Record<string, string> {
  return { ...privateResponseHeaders, ...(renewalCookie ? { "Set-Cookie": renewalCookie } : {}) };
}

export function songApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof AuthError) return errorResponse(error.code, 401);
  if (error instanceof SongValidationError) return errorResponse("VALIDATION_FAILED", 400, undefined, error.issues);
  if (error instanceof SongCursorError) {
    return errorResponse("VALIDATION_FAILED", 400, undefined, [{ field: "cursor", code: "invalid" }]);
  }
  if (error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}

export function mutationOriginAllowed(request: Request): boolean {
  return request.headers.get("origin") === getAuthContext().config.appOrigin;
}

export function validSongId(value: string): boolean { return UUID.test(value); }
