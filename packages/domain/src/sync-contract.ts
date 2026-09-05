export type SyncDocumentKey = string & { readonly __syncDocumentKey: unique symbol };
export type SyncUpdateId = string & { readonly __syncUpdateId: unique symbol };

export const SYNC_LIMITS = {
  updateBytes: 1_048_576,
  documentTextBytes: 400_000,
  authenticationRefreshMs: 5 * 60 * 1_000
} as const;

export type SyncDocumentAccess =
  | { readonly allowed: true; readonly ownerId: string; readonly resourceId: string; readonly documentKey: SyncDocumentKey }
  | { readonly allowed: false; readonly code: "SYNC_DOCUMENT_UNAVAILABLE" };

export interface SyncAccessCandidate {
  readonly authenticatedOwnerId: string | null;
  readonly resourceOwnerId: string;
  readonly resourceId: string;
  readonly documentKey: string;
  readonly sessionExpiresAt: Date;
  readonly deletedAt: Date | null;
}

export function authorizeSyncDocument(candidate: SyncAccessCandidate, now = new Date()): SyncDocumentAccess {
  if (!candidate.authenticatedOwnerId || candidate.authenticatedOwnerId !== candidate.resourceOwnerId
    || candidate.sessionExpiresAt <= now || candidate.deletedAt) {
    return { allowed: false, code: "SYNC_DOCUMENT_UNAVAILABLE" };
  }
  return {
    allowed: true,
    ownerId: candidate.resourceOwnerId,
    resourceId: candidate.resourceId,
    documentKey: candidate.documentKey as SyncDocumentKey
  };
}

export function parseSyncUpdateEnvelope(value: unknown): { updateId: SyncUpdateId; payload: Uint8Array } {
  if (!value || typeof value !== "object") throw new Error("SYNC_UPDATE_INVALID");
  const input = value as { updateId?: unknown; payload?: unknown };
  if (typeof input.updateId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(input.updateId)) throw new Error("SYNC_UPDATE_INVALID");
  if (!(input.payload instanceof Uint8Array) || input.payload.byteLength === 0 || input.payload.byteLength > SYNC_LIMITS.updateBytes) throw new Error("SYNC_UPDATE_INVALID");
  return { updateId: input.updateId as SyncUpdateId, payload: input.payload };
}
