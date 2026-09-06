import { parseSongLinkListInput, parseSongLinkMutationInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed, songApiError, songResponseHeaders, validSongId } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ songId: string }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { songId } = await params;
    if (!validSongId(songId)) return errorResponse("NOT_FOUND", 404);
    const result = await getAuthContext().songs.listSongLinks(
      auth.userId, songId, parseSongLinkListInput(new URL(request.url).searchParams)
    );
    if (!result) return errorResponse("NOT_FOUND", 404);
    return Response.json(result, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return songApiError(error); }
}

export async function POST(request: Request, { params }: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { songId } = await params;
    if (!validSongId(songId)) return errorResponse("NOT_FOUND", 404);
    const result = await getAuthContext().songs.changeSongLinks(auth.userId, songId, parseSongLinkMutationInput(await request.json()));
    if (!result) return errorResponse("NOT_FOUND", 404);
    return Response.json(result, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return songApiError(error); }
}
