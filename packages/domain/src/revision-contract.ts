import { isResourceId } from "./lyric-contract.js";

export const REVISION_POLICY = { intervalMs: 300_000, retentionDays: 180, maximumCount: 200, largePasteCharacters: 1_000 } as const;
export const REVISION_REASONS = ["interval", "leave", "duplicate", "large_paste", "before_restore"] as const;
export type RevisionReason = typeof REVISION_REASONS[number];
export type CheckpointReason = Exclude<RevisionReason, "before_restore">;
export const REVISION_REASON_LABELS: Record<RevisionReason, string> = {
  interval: "5분 자동 기록", leave: "화면 이탈 전", duplicate: "복제 전", large_paste: "대규모 붙여넣기 전", before_restore: "복원 직전 보존"
};
export interface RevisionSummary { id: string; createdAt: string; reason: RevisionReason; preview: string; characters: number }
export interface LyricRevision extends RevisionSummary { body: string }
export interface RevisionHistory { current: { body: string; hash: string }; items: RevisionSummary[] }
export interface RestoreRevisionInput { requestId: string; expectedHash: string }

export function parseRestoreRevisionInput(value: unknown): RestoreRevisionInput {
  if (!value || typeof value !== "object") throw new Error("REVISION_INPUT_INVALID");
  const input = value as Record<string, unknown>;
  if (!isResourceId(input.requestId) || typeof input.expectedHash !== "string" || !/^[0-9a-f]{64}$/.test(input.expectedHash)) throw new Error("REVISION_INPUT_INVALID");
  return { requestId: input.requestId, expectedHash: input.expectedHash };
}

export function parseCheckpointReason(value: unknown): Exclude<CheckpointReason, "interval"> {
  if (value !== "leave" && value !== "duplicate" && value !== "large_paste") throw new Error("REVISION_INPUT_INVALID");
  return value;
}
