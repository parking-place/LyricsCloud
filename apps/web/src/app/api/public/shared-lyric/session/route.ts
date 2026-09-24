import { createGuestSessionToken, guestSessionTokenDigest, publicShareTokenDigest } from "@lyricscloud/auth";
import { getAuthContext } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { parsePublicGuestSessionInput, publicSharingApiError, publicSharingResponseHeaders,
  readBoundedPublicBody, withinPublicRateLimit } from "../../../../../lib/public-sharing-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";
import { requestClientKey } from "../../../../../lib/request-security.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return withPublicHeaders(errorResponse("FORBIDDEN", 403));
    const input = parsePublicGuestSessionInput(await readBoundedPublicBody(request));
    const linkDigest = publicShareTokenDigest(input.token);
    const clientKey = requestClientKey(request).slice(0, 128);
    if (!withinPublicRateLimit(`guest-session-ip:${clientKey}`, 20)
      || !withinPublicRateLimit(`guest-session-link:${linkDigest}`, 60)) {
      return withPublicHeaders(errorResponse("RATE_LIMITED", 429));
    }
    const token = createGuestSessionToken();
    const session = await getAuthContext().publicLyricSharing.issueGuestSession(linkDigest, guestSessionTokenDigest(token));
    return session ? Response.json({ session, token }, { status: 201, headers: publicSharingResponseHeaders })
      : withPublicHeaders(errorResponse("NOT_FOUND", 404));
  } catch (error) { return withPublicHeaders(publicSharingApiError(error)); }
}

function withPublicHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(publicSharingResponseHeaders)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
