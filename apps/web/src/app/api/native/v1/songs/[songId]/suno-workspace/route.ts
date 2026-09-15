import { getAuthContext, resolveNativeRequestAuth } from "../../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../../lib/native-api.js";
import { validSongId } from "../../../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ songId: string }> }): Promise<Response> {
  try {
    const auth = await resolveNativeRequestAuth(request); const { songId } = await params;
    const workspace = validSongId(songId) ? await getAuthContext().sunoWorkspaces.getWorkspace(auth.userId, songId) : null;
    return workspace ? Response.json({ workspace }, { headers: nativeResponseHeaders })
      : Response.json({ error: { code: "NOT_FOUND" } }, { status: 404, headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
