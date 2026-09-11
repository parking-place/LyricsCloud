import { parseSunoWorkspaceCommand } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed, songResponseHeaders, validSongId } from "../../../../../lib/song-api.js";
import { sunoWorkspaceApiError } from "../../../../../lib/suno-workspace-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ songId: string }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { songId } = await params;
    if (!validSongId(songId)) return errorResponse("NOT_FOUND", 404);
    const workspace = await getAuthContext().sunoWorkspaces.getWorkspace(auth.userId, songId);
    if (!workspace) return errorResponse("NOT_FOUND", 404);
    return Response.json({ workspace }, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return sunoWorkspaceApiError(error); }
}

export async function POST(request: Request, { params }: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { songId } = await params;
    if (!validSongId(songId)) return errorResponse("NOT_FOUND", 404);
    const result = await getAuthContext().sunoWorkspaces.applyCommand(
      auth.userId, songId, parseSunoWorkspaceCommand(await request.json())
    );
    return Response.json(result, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return sunoWorkspaceApiError(error); }
}
