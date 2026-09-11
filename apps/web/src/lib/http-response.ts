import type { ErrorCode, ValidationIssue } from "@lyricscloud/domain";
import { createRequestId } from "@lyricscloud/observability";

export const privateResponseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache"
} as const;

export function errorResponse(
  code: ErrorCode,
  status: number,
  requestId?: string,
  issues?: readonly ValidationIssue[],
  details?: Readonly<Record<string, unknown>>
): Response {
  const correlationId = createRequestId(requestId);
  return Response.json(
    { error: { code, requestId: correlationId, ...(issues?.length ? { issues } : {}), ...(details ? { details } : {}) } },
    { status, headers: { ...privateResponseHeaders, "x-request-id": correlationId } }
  );
}
