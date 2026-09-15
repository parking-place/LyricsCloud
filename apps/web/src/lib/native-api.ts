import { AuthError, NativeAuthError } from "@lyricscloud/auth";
import { RequestAuthError } from "./auth-context.js";
import { errorResponse, privateResponseHeaders } from "./http-response.js";

export const nativeResponseHeaders = {
  ...privateResponseHeaders,
  "x-lyricscloud-native-contract": "lyricscloud.native.read.v1"
};

export function nativeApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof NativeAuthError || error instanceof AuthError) {
    const status = error.code === "VALIDATION_FAILED" ? 400 : 401;
    return errorResponse(error.code, status);
  }
  if (error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}
