import { randomUUID } from "node:crypto";
import type { ErrorCode } from "@lyricscloud/domain";

export const privateResponseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache"
} as const;

export function errorResponse(code: ErrorCode, status: number, requestId: string = randomUUID()): Response {
  return Response.json(
    { error: { code, requestId } },
    { status, headers: privateResponseHeaders }
  );
}
