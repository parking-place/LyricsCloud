import { LyricConflictError, LyricValidationError } from "@lyricscloud/domain";
import { errorResponse } from "./http-response.js";
import { songApiError } from "./song-api.js";

export function lyricApiError(error: unknown): Response {
  if (error instanceof LyricValidationError) return errorResponse("VALIDATION_FAILED", 400, undefined, error.issues);
  if (error instanceof LyricConflictError) return errorResponse("VERSION_CONFLICT", 409);
  return songApiError(error);
}
