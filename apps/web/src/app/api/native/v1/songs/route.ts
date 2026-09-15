import { parseSongListInput } from "@lyricscloud/domain";
import { getAuthContext, resolveNativeRequestAuth } from "../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveNativeRequestAuth(request);
    const result = await getAuthContext().songs.listSongs(auth.userId, parseSongListInput(new URL(request.url).searchParams));
    return Response.json(result, { headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
