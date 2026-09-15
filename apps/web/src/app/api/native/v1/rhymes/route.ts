import { parseRhymeListInput } from "@lyricscloud/domain";
import { getAuthContext, resolveNativeRequestAuth } from "../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveNativeRequestAuth(request);
    return Response.json(await getAuthContext().rhymes.listRhymeNotes(auth.userId,
      parseRhymeListInput(new URL(request.url).searchParams)), { headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
