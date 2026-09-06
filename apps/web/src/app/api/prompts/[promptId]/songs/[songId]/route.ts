import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../../lib/http-response.js";
import { promptApiError, promptResponseHeaders } from "../../../../../../lib/prompt-api.js";
import { mutationOriginAllowed } from "../../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ promptId: string; songId: string }> };

export async function PUT(request: Request, { params }: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { promptId, songId } = await params;
    if (!isResourceId(promptId) || !isResourceId(songId)) return errorResponse("NOT_FOUND", 404);
    const [prompt, song] = await Promise.all([
      getAuthContext().prompts.getPrompt(auth.userId, promptId),
      getAuthContext().songs.getSong(auth.userId, songId)
    ]);
    if (!prompt || !song) return errorResponse("NOT_FOUND", 404);
    await getAuthContext().prompts.linkSong(auth.userId, promptId, songId);
    return Response.json({ linked: true }, { headers: promptResponseHeaders(auth.renewalCookie) });
  } catch (error) { return promptApiError(error); }
}

export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { promptId, songId } = await params;
    if (!isResourceId(promptId) || !isResourceId(songId)) return errorResponse("NOT_FOUND", 404);
    const prompt = await getAuthContext().prompts.getPrompt(auth.userId, promptId);
    if (!prompt) return errorResponse("NOT_FOUND", 404);
    const removed = await getAuthContext().prompts.unlinkSong(auth.userId, promptId, songId);
    return Response.json({ removed }, { headers: promptResponseHeaders(auth.renewalCookie) });
  } catch (error) { return promptApiError(error); }
}
