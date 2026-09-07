import { parseTrashMutationInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { lifecycleApiError, lifecycleResponseHeaders } from "../../../../lib/lifecycle-api.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const input = parseTrashMutationInput(await request.json());
    const restored = await getAuthContext().lifecycle.restore(auth.userId, input.items, input.lyricStrategy, input.destinationSongId);
    return Response.json({ restored }, { headers: lifecycleResponseHeaders(auth.renewalCookie) });
  } catch (error) { return lifecycleApiError(error); }
}
