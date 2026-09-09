import { createHash } from "node:crypto";
import { REVISION_POLICY, type RevisionReason, type RevisionSummary } from "@lyricscloud/domain";
import type { PoolClient } from "pg";

export const bodyHash = (body: string) => createHash("sha256").update(body).digest("hex");
export interface RevisionRow { id: string; body: string; body_sha256: string; reason: RevisionReason; created_at: Date }
export function summarize(row: RevisionRow): RevisionSummary {
  return { id: row.id, createdAt: row.created_at.toISOString(), reason: row.reason,
    preview: [...row.body].slice(0, 100).join(""), characters: [...row.body].length };
}

// The caller holds the same document lock as CRDT writes and restores.
export async function captureRevision(client: PoolClient, owner: string, key: string, body: string, reason: RevisionReason, now: Date) {
  const state = (await client.query<{ revision_checked_at: Date; revision_body_sha256: string }>(
    "select revision_checked_at,revision_body_sha256 from sync_documents where document_key=$1", [key])).rows[0]!;
  const hash = bodyHash(body);
  if (reason === "interval") {
    if (now.getTime() - state.revision_checked_at.getTime() < REVISION_POLICY.intervalMs) return null;
    await client.query("update sync_documents set revision_checked_at=$2 where document_key=$1", [key, now]);
    if (hash === state.revision_body_sha256) return null;
  }
  const latest = (await client.query<RevisionRow>("select * from lyric_revisions where document_key=$1 order by created_at desc,sequence desc limit 1", [key])).rows[0];
  if (reason !== "before_restore" && latest?.body_sha256 === hash) return summarize(latest);
  const result = await client.query<RevisionRow>(`insert into lyric_revisions(document_key,owner_id,body,body_sha256,reason,created_at)
    values($1,$2,$3,$4,$5,$6) returning *`, [key, owner, body, hash, reason, now]);
  await client.query("update sync_documents set revision_checked_at=$2,revision_body_sha256=$3 where document_key=$1", [key, now, hash]);
  return summarize(result.rows[0]!);
}

export async function pruneRevisions(client: PoolClient, key: string, now: Date, protectedIds: string[] = []) {
  const expires = new Date(now.getTime() - REVISION_POLICY.retentionDays * 86_400_000);
  await client.query(`delete from lyric_revisions where document_key=$1 and (created_at<$2 or id in
    (select id from lyric_revisions where document_key=$1 order by (id=any($4::uuid[])) desc,created_at desc,sequence desc offset $3))`, [key, expires, REVISION_POLICY.maximumCount, protectedIds]);
}
