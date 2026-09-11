import { AuthError } from "@lyricscloud/auth";
import { SunoWorkspaceValidationError } from "@lyricscloud/domain";
import {
  SunoWorkspaceConflictError,
  SunoWorkspaceDuplicateUrlError,
  SunoWorkspaceLimitError,
  SunoWorkspaceNotFoundError,
  SunoWorkspaceOrderSetError,
  SunoWorkspaceRequestReuseError
} from "@lyricscloud/database";
import { RequestAuthError } from "./auth-context.js";
import { errorResponse } from "./http-response.js";

export function sunoWorkspaceApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof AuthError) return errorResponse(error.code, 401);
  if (error instanceof SunoWorkspaceValidationError) {
    return errorResponse("VALIDATION_FAILED", 400, undefined, error.issues);
  }
  if (error instanceof SunoWorkspaceConflictError) {
    return errorResponse("VERSION_CONFLICT", 409, undefined, undefined, { currentVersion: error.currentVersion });
  }
  if (error instanceof SunoWorkspaceNotFoundError) return errorResponse("NOT_FOUND", 404);
  if (error instanceof SunoWorkspaceDuplicateUrlError
      || error instanceof SunoWorkspaceLimitError
      || error instanceof SunoWorkspaceOrderSetError
      || error instanceof SunoWorkspaceRequestReuseError) return errorResponse("CONFLICT", 409);
  if (error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}
