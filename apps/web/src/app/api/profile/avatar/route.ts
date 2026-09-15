import { AuthError } from "@lyricscloud/auth";
import { getAuthContext, RequestAuthError, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../../lib/http-response.js";
import { processProfileAvatar } from "../../../../lib/profile-avatar.js";
import { ProfileInputError } from "../../../../lib/profile-input.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const photoId = new URL(request.url).searchParams.get("photo");
    const photo = await getAuthContext().ownedData.getCurrentAvatarPhoto(auth.userId);
    if (!photo || photo.id !== photoId) return errorResponse("NOT_FOUND", 404);
    return new Response(new Uint8Array(photo.bytes), { headers: {
      ...privateResponseHeaders, "Content-Type": "image/webp", "Content-Length": String(photo.bytes.length),
      "X-Content-Type-Options": "nosniff",
      ...(auth.renewalCookie ? { "Set-Cookie": auth.renewalCookie } : {})
    } });
  } catch (error) { return avatarError(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > 2 * 1024 * 1024 + 50 * 1024)
      return errorResponse("VALIDATION_FAILED", 400);
    const form = await request.formData();
    const file = form.get("avatar");
    const version = Number(form.get("expectedRowVersion"));
    if (!(file instanceof File) || !Number.isSafeInteger(version) || version < 1)
      throw new ProfileInputError(["avatar", "expectedRowVersion"]);
    const processed = await processProfileAvatar(file);
    const result = await getAuthContext().ownedData.replaceAvatarPhoto(auth.userId, version,
      processed.bytes, processed.sha256);
    if (result.state === "missing") return errorResponse("NOT_FOUND", 404);
    if (result.state === "conflict") return errorResponse("VERSION_CONFLICT", 409, undefined, undefined,
      { profile: result.profile });
    return Response.json({ profile: result.profile }, { headers: {
      ...privateResponseHeaders, ...(auth.renewalCookie ? { "Set-Cookie": auth.renewalCookie } : {})
    } });
  } catch (error) { return avatarError(error); }
}

function avatarError(error: unknown): Response {
  if (error instanceof RequestAuthError || error instanceof AuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof ProfileInputError || error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}
