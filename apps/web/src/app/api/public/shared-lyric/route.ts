import { publicShareTokenDigest } from "@lyricscloud/auth";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { parsePublicReadInput, publicSharingApiError, publicSharingResponseHeaders,
  readBoundedPublicBody, withinPublicRateLimit } from "../../../../lib/public-sharing-api.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return withPublicHeaders(errorResponse("FORBIDDEN", 403));
    const input = parsePublicReadInput(await readBoundedPublicBody(request));
    const digest = publicShareTokenDigest(input.token);
    const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim().slice(0, 128)
      ?? request.headers.get("x-real-ip")?.slice(0, 128) ?? "unknown";
    if (!withinPublicRateLimit(`ip:${forwarded}`, 30) || !withinPublicRateLimit(`link:${digest}`, 120)) {
      return withPublicHeaders(errorResponse("RATE_LIMITED", 429));
    }
    const lyric = await getAuthContext().publicLyricSharing.readProjection(digest);
    return lyric ? Response.json({ lyric }, { headers: publicSharingResponseHeaders })
      : withPublicHeaders(errorResponse("NOT_FOUND", 404));
  } catch (error) { return withPublicHeaders(publicSharingApiError(error)); }
}

function withPublicHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(publicSharingResponseHeaders)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
