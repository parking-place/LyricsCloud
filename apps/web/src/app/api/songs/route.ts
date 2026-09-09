import { parseCreateSongInput, parseSongListInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { errorResponse } from "../../../lib/http-response.js";
import { mutationOriginAllowed, songApiError, songResponseHeaders } from "../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const input = parseSongListInput(new URL(request.url).searchParams);
    const result = await getAuthContext().songs.listSongs(auth.userId, input);
    return Response.json(result, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return songApiError(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const input = parseCreateSongInput(await request.json());
    const result = await getAuthContext().songs.createSong(auth.userId, input);
    return Response.json(result, {
      status: result.replayed ? 200 : 201,
      headers: songResponseHeaders(auth.renewalCookie)
    });
  } catch (error) { return songApiError(error); }
}
