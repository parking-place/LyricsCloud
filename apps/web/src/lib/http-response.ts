import { randomUUID } from "node:crypto";
import type { ErrorCode, ValidationIssue } from "@lyricscloud/domain";

export const privateResponseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache"
} as const;

export function errorResponse(
  code: ErrorCode,
  status: number,
  requestId: string = randomUUID(),
  issues?: readonly ValidationIssue[]
): Response {
  return Response.json(
    { error: { code, requestId, ...(issues?.length ? { issues } : {}) } },
    { status, headers: privateResponseHeaders }
  );
}
