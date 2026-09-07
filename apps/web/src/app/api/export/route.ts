import { exportArchiveFilename } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { createExportArchive } from "../../../lib/export-archive.js";
import { lifecycleApiError, lifecycleResponseHeaders } from "../../../lib/lifecycle-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const snapshot = await getAuthContext().exports.openSnapshot(auth.userId);
    const iterator = createExportArchive(snapshot);
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const result = await iterator.next();
          if (result.done) controller.close(); else controller.enqueue(result.value);
        } catch (error) { controller.error(error); }
      },
      async cancel() { await iterator.return(undefined); }
    });
    return new Response(body, { headers: {
      ...lifecycleResponseHeaders(auth.renewalCookie),
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exportArchiveFilename(snapshot.exportedAt)}"`,
      "X-Content-Type-Options": "nosniff"
    } });
  } catch (error) { return lifecycleApiError(error); }
}
