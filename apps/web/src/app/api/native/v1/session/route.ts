import { resolveNativeRequestAuth } from "../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveNativeRequestAuth(request);
    return Response.json({ authenticated: true, user: { id: auth.userId }, scope: auth.scope,
      expiresAt: auth.expiresAt }, { headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
