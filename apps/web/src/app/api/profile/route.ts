import { AuthError } from "@lyricscloud/auth";
import { getAuthContext, RequestAuthError, resolveRequestAuth } from "../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../lib/http-response.js";
import { parseProfileInput, ProfileInputError } from "../../../lib/profile-input.js";
import { mutationOriginAllowed } from "../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const profile = await getAuthContext().ownedData.getProfile(auth.userId);
    if (!profile) return errorResponse("NOT_FOUND", 404);
    return Response.json({ profile }, { headers: responseHeaders(auth.renewalCookie) });
  } catch (error) { return profileError(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const input = parseProfileInput(await request.json());
    const result = await getAuthContext().ownedData.patchProfile(auth.userId, input);
    if (result.state === "missing") return errorResponse("NOT_FOUND", 404);
    if (result.state === "conflict") return errorResponse("VERSION_CONFLICT", 409, undefined, undefined,
      { profile: result.profile });
    return Response.json({ profile: result.profile }, { headers: responseHeaders(auth.renewalCookie) });
  } catch (error) { return profileError(error); }
}

function profileError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof AuthError) return errorResponse(error.code, 401);
  if (error instanceof ProfileInputError || error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}

function responseHeaders(renewalCookie?: string): Record<string, string> {
  return { ...privateResponseHeaders, ...(renewalCookie ? { "Set-Cookie": renewalCookie } : {}) };
}
