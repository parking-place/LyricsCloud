import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveNativeRequestAuth } from "../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ rhymeId: string }> }): Promise<Response> {
  try {
    const auth = await resolveNativeRequestAuth(request); const { rhymeId } = await params;
    const rhyme = isResourceId(rhymeId) ? await getAuthContext().rhymes.getRhymeNote(auth.userId, rhymeId) : null;
    return rhyme ? Response.json({ rhyme }, { headers: nativeResponseHeaders })
      : Response.json({ error: { code: "NOT_FOUND" } }, { status: 404, headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
