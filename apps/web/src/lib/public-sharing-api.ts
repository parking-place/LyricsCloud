import { PublicShareTokenError, parsePublicShareToken } from "@lyricscloud/auth";
import { isResourceId } from "@lyricscloud/domain";
import { PublicLinkConflictError, PublicLinkInputError, SharingConflictError, SharingInputError } from "@lyricscloud/database";
import { RequestAuthError } from "./auth-context.js";
import { errorResponse } from "./http-response.js";

export interface PublicLinkFieldsInput {
  readonly ownerDisplayName: boolean;
  readonly status: boolean;
  readonly updatedAt: boolean;
}

export const publicSharingResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer"
} as const;

export class PublicSharingInputError extends Error {
  readonly code = "PUBLIC_SHARING_INPUT_INVALID" as const;
  constructor() { super("PUBLIC_SHARING_INPUT_INVALID"); this.name = "PublicSharingInputError"; }
}

export function parsePublicLinkInput(value: unknown): {
  requestId: string;
  expiresInDays: 1 | 7 | 30;
  fields: PublicLinkFieldsInput;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PublicSharingInputError();
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["requestId", "expiresInDays", "fields"].includes(key))
    || typeof input.requestId !== "string" || !isResourceId(input.requestId)
    || (input.expiresInDays !== 1 && input.expiresInDays !== 7 && input.expiresInDays !== 30)) {
    throw new PublicSharingInputError();
  }
  const fields = input.fields ?? {};
  if (!fields || typeof fields !== "object" || Array.isArray(fields)
    || Object.keys(fields).some((key) => !["ownerDisplayName", "status", "updatedAt"].includes(key))) {
    throw new PublicSharingInputError();
  }
  const candidate = fields as Record<string, unknown>;
  for (const value of Object.values(candidate)) if (typeof value !== "boolean") throw new PublicSharingInputError();
  return { requestId: input.requestId, expiresInDays: input.expiresInDays,
    fields: { ownerDisplayName: candidate.ownerDisplayName === true,
      status: candidate.status === true, updatedAt: candidate.updatedAt === true } };
}

export function parsePublicReadInput(text: string): { token: string } {
  if (Buffer.byteLength(text, "utf8") > 4_096) throw new PublicSharingInputError();
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new PublicSharingInputError();
    const input = value as Record<string, unknown>;
    if (Object.keys(input).length !== 1 || !("token" in input)) throw new PublicSharingInputError();
    return { token: parsePublicShareToken(input.token) };
  } catch (error) {
    if (error instanceof PublicSharingInputError) throw error;
    throw new PublicSharingInputError();
  }
}

export function publicSharingApiError(error: unknown): Response {
  if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
  if (error instanceof PublicShareTokenError || error instanceof PublicSharingInputError
    || error instanceof SharingInputError || error instanceof PublicLinkInputError
    || error instanceof SyntaxError) return errorResponse("VALIDATION_FAILED", 400);
  if (error instanceof SharingConflictError || error instanceof PublicLinkConflictError) return errorResponse("CONFLICT", 409);
  return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
}

export async function readBoundedPublicBody(request: Request): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4_096) throw new PublicSharingInputError();
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const merged = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder("utf-8", { fatal: true }).decode(merged); }
  catch { throw new PublicSharingInputError(); }
}

const rateWindows = new Map<string, { startedAt: number; count: number }>();

export function withinPublicRateLimit(key: string, limit: number, now = Date.now(), windowMs = 60_000): boolean {
  const current = rateWindows.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    rateWindows.set(key, { startedAt: now, count: 1 });
    if (rateWindows.size > 10_000) for (const [candidate, window] of rateWindows) {
      if (now - window.startedAt >= windowMs) rateWindows.delete(candidate);
    }
    return true;
  }
  current.count++;
  return current.count <= limit;
}
