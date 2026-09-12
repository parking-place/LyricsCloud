import { createPublicShareToken, publicShareTokenDigest } from "@lyricscloud/auth";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { parsePublicLinkInput, publicSharingApiError, publicSharingResponseHeaders, withinPublicRateLimit } from "../../../../../lib/public-sharing-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ lyricId: string }> }): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request); const { lyricId } = await context.params;
    const items = await getAuthContext().publicLyricSharing.list(auth.userId, lyricId);
    return items ? Response.json({ items }, { headers: { ...publicSharingResponseHeaders,
      ...(auth.renewalCookie ? { "Set-Cookie": auth.renewalCookie } : {}) } }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return publicSharingApiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ lyricId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { lyricId } = await context.params;
    if (!withinPublicRateLimit(`owner:${auth.userId}:${lyricId}`, 10, Date.now(), 3_600_000)) {
      return Response.json({ error: { code: "RATE_LIMITED" } }, { status: 429, headers: publicSharingResponseHeaders });
    }
    const input = parsePublicLinkInput(await request.json());
    const token = createPublicShareToken();
    const result = await getAuthContext().publicLyricSharing.issue(auth.userId, lyricId, {
      requestId: input.requestId, tokenDigest: publicShareTokenDigest(token), fields: input.fields,
      expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000)
    });
    if (!result) return errorResponse("NOT_FOUND", 404);
    return Response.json({ link: result.link, replayed: result.replayed,
      url: result.replayed ? null : `${getAuthContext().config.appOrigin}/shared/public#${token}` }, {
      status: result.replayed ? 200 : 201, headers: { ...publicSharingResponseHeaders,
        ...(auth.renewalCookie ? { "Set-Cookie": auth.renewalCookie } : {}) }
    });
  } catch (error) { return publicSharingApiError(error); }
}
