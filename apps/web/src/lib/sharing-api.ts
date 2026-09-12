import { AuthError } from "@lyricscloud/auth";
import { SharingConflictError, SharingInputError } from "@lyricscloud/database";
import { RequestAuthError } from "./auth-context.js";
import { errorResponse, privateResponseHeaders } from "./http-response.js";

export function sharingResponseHeaders(renewalCookie?: string): Record<string, string> {
  return { ...privateResponseHeaders, "X-Robots-Tag": "noindex, nofollow, noarchive",
    ...(renewalCookie ? { "Set-Cookie": renewalCookie } : {}) };
}

export function parseShareGrantInput(value: unknown): { sharingId: string; requestId: string; expiresAt: Date | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SharingInputError();
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["sharingId", "requestId", "expiresAt"].includes(key))) throw new SharingInputError();
  if (typeof input.sharingId !== "string" || typeof input.requestId !== "string") throw new SharingInputError();
  if (input.expiresAt !== undefined && input.expiresAt !== null && typeof input.expiresAt !== "string") throw new SharingInputError();
  const expiresAt = typeof input.expiresAt === "string" ? new Date(input.expiresAt) : null;
  if (expiresAt && !Number.isFinite(expiresAt.getTime())) throw new SharingInputError();
  return { sharingId: input.sharingId, requestId: input.requestId, expiresAt };
}

export function sharingApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof AuthError) return errorResponse(error.code, 401);
  if (error instanceof SharingInputError || error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  if (error instanceof SharingConflictError) return errorResponse("CONFLICT", 409);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}
