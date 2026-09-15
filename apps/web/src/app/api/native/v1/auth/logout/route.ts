import { getAuthContext } from "../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
    if (!match) return Response.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401, headers: nativeResponseHeaders });
    await getAuthContext().nativeService.logout(match[1]!);
    return Response.json({ revoked: true }, { headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
