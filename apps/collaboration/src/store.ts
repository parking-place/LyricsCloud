import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import * as Y from "yjs";
import { REVISION_POLICY, type CheckpointReason, type RestoreRevisionInput } from "@lyricscloud/domain";
import { bodyHash, captureRevision, pruneRevisions, summarize, type RevisionRow } from "./revisions.js";
import { createDatabasePool } from "@lyricscloud/database";

interface DocumentRows {
  document_key: string; resource_id: string; resource_type: "lyrics" | "rhyme_note";
  snapshot: Buffer; snapshot_sequence: string; projection_error_code?: string | null;
}

export class CollaborationStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string) { this.#pool = createDatabasePool(databaseUrl, 10); }
  close() { return this.#pool.end(); }

  async ensureDocument(ownerId: string, resourceId: string) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [resourceId]);
      const editable = await client.query<{ resource_type: "lyrics" | "rhyme_note"; body: string }>(`select r.type resource_type,
        case r.type when 'lyrics' then l.body when 'rhyme_note' then n.body end body
        from resources r left join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
        left join rhyme_notes n on n.resource_id=r.id and n.owner_id=r.owner_id
        where r.id=$1 and r.owner_id=$2 and r.type in ('lyrics','rhyme_note') and r.deleted_at is null
          and ((r.type='lyrics' and l.resource_id is not null) or (r.type='rhyme_note' and n.resource_id is not null))
        for update of r`, [resourceId, ownerId]);
      if (!editable.rowCount) return null;
      const existing = await client.query<DocumentRows>("select document_key,resource_id,resource_type,snapshot,snapshot_sequence::text from sync_documents where resource_id=$1", [resourceId]);
      if (existing.rows[0]) return existing.rows[0];
      const resource = editable.rows[0]!;
      const document = new Y.Doc(); const body = resource.body.replace(/\r\n?/g, "\n");
      if (body) document.getText("body").insert(0, body);
      const created = await client.query<DocumentRows>(`insert into sync_documents(resource_id,owner_id,resource_type,snapshot,projected_at,revision_body_sha256)
        values($1,$2,$3,$4,statement_timestamp(),$5)
        returning document_key,resource_id,resource_type,snapshot,snapshot_sequence::text`,
        [resourceId, ownerId, resource.resource_type, Buffer.from(Y.encodeStateAsUpdate(document)), bodyHash(body)]);
      if (body !== resource.body) await projectBody(client, resource.resource_type, resourceId, ownerId, body);
      document.destroy(); return created.rows[0]!;
    });
  }

  async loadDocument(ownerId: string, documentKey: string) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [documentKey]);
      return this.#loadLocked(client, ownerId, documentKey, false);
    });
  }

  async applyUpdate(ownerId: string, documentKey: string, updateId: string, payload: Uint8Array) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [documentKey]);
      const loaded = await this.#loadLocked(client, ownerId, documentKey, true);
      if (!loaded) return null;
      const hash = createHash("sha256").update(payload).digest("hex");
      const receipt = await client.query<{ payload_sha256: string }>("select payload_sha256 from sync_update_receipts where document_key=$1 and update_id=$2", [documentKey, updateId]);
      if (receipt.rows[0]) {
        if (receipt.rows[0].payload_sha256 !== hash) throw new Error("SYNC_UPDATE_ID_REUSED");
        return { duplicate: true, snapshot: loaded.snapshot, projectionPending: loaded.projectionPending };
      }
      const document = materialize(loaded.snapshot, loaded.updates);
      Y.applyUpdate(document, payload);
      const body = document.getText("body").toString();
      if ([...body].length > 100_000) { document.destroy(); throw new Error("SYNC_DOCUMENT_TOO_LARGE"); }
      await client.query("insert into sync_update_receipts(document_key,update_id,payload_sha256) values($1,$2,$3)", [documentKey, updateId, hash]);
      await client.query("insert into sync_updates(document_key,update_id,payload) values($1,$2,$3)", [documentKey, updateId, Buffer.from(payload)]);
      let projectionPending = false;
      await client.query("savepoint project_plaintext");
      try {
        await projectBody(client, loaded.resourceType, loaded.resourceId, ownerId, body);
        await client.query("update sync_documents set projected_at=statement_timestamp(),projection_error_code=null,updated_at=statement_timestamp() where document_key=$1", [documentKey]);
        await client.query("release savepoint project_plaintext");
      } catch {
        await client.query("rollback to savepoint project_plaintext");
        await client.query("update sync_documents set projection_error_code='SYNC_PROJECTION_FAILED',updated_at=statement_timestamp() where document_key=$1", [documentKey]);
        projectionPending = true;
      }
      const stats = await client.query<{ count: string; bytes: string; sequence: string }>(`select count(*)::text count,coalesce(sum(octet_length(payload)),0)::text bytes,coalesce(max(sequence),0)::text sequence from sync_updates where document_key=$1`, [documentKey]);
      const compact = Number(stats.rows[0]!.count) >= 100 || Number(stats.rows[0]!.bytes) >= 1_048_576;
      const snapshot = Y.encodeStateAsUpdate(document);
      if (compact) {
        await client.query("update sync_documents set snapshot=$2,snapshot_sequence=$3,updated_at=statement_timestamp() where document_key=$1", [documentKey, Buffer.from(snapshot), stats.rows[0]!.sequence]);
        await client.query("delete from sync_updates where document_key=$1 and sequence <= $2", [documentKey, stats.rows[0]!.sequence]);
      }
      document.destroy(); return { duplicate: false, snapshot, projectionPending };
    });
  }

  async retryProjection(ownerId: string, documentKey: string) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [documentKey]);
      const loaded = await this.#loadLocked(client, ownerId, documentKey, true);
      if (!loaded) return false;
      const document = materialize(loaded.snapshot, loaded.updates);
      const body = document.getText("body").toString(); document.destroy();
      await projectBody(client, loaded.resourceType, loaded.resourceId, ownerId, body);
      await client.query("update sync_documents set projected_at=statement_timestamp(),projection_error_code=null,updated_at=statement_timestamp() where document_key=$1", [documentKey]);
      return true;
    });
  }

  async operationalMetrics() {
    const result = await this.#pool.query<{ documents: string; pending: string; maximum_projection_lag_ms: string }>(`select
      count(*)::text documents,
      count(*) filter(where projection_error_code is not null)::text pending,
      coalesce(max(extract(epoch from (statement_timestamp()-projected_at))*1000),0)::bigint::text maximum_projection_lag_ms
      from sync_documents`);
    const row = result.rows[0]!;
    return { documents: Number(row.documents), pendingProjections: Number(row.pending), maximumProjectionLagMs: Number(row.maximum_projection_lag_ms) };
  }

  async listRevisions(ownerId: string, key: string) {
    return this.#withDocument(ownerId, key, async (client, loaded, document) => {
      const rows = await client.query<RevisionRow>(`select * from lyric_revisions where document_key=$1 and created_at >= $2
        order by created_at desc,sequence desc limit $3`, [key, new Date(Date.now() - REVISION_POLICY.retentionDays * 86_400_000), REVISION_POLICY.maximumCount]);
      const body = document.getText("body").toString();
      return { current: { body, hash: bodyHash(body) }, items: rows.rows.map(summarize) };
    });
  }

  async getRevision(ownerId: string, key: string, revisionId: string) {
    return this.#withDocument(ownerId, key, async (client) => {
      const row = (await client.query<RevisionRow>(`select * from lyric_revisions where document_key=$1 and id=$2
        and created_at >= statement_timestamp()-interval '180 days'`, [key, revisionId])).rows[0];
      return row ? { ...summarize(row), body: row.body } : null;
    });
  }

  async checkpoint(ownerId: string, key: string, reason: CheckpointReason, now = new Date()) {
    return this.#withDocument(ownerId, key, async (client, _loaded, document) => {
      const result = await captureRevision(client, ownerId, key, document.getText("body").toString(), reason, now);
      await pruneRevisions(client, key, now);
      return result;
    });
  }

  async restoreRevision(ownerId: string, key: string, revisionId: string, input: RestoreRevisionInput) {
    return this.#withDocument(ownerId, key, async (client, loaded, document) => {
      const requestHash = bodyHash(`${revisionId}:${input.expectedHash}`);
      const receipt = (await client.query<{ request_sha256: string }>("select request_sha256 from lyric_restore_requests where document_key=$1 and request_id=$2", [key, input.requestId])).rows[0];
      if (receipt) {
        if (receipt.request_sha256 !== requestHash) throw new Error("REVISION_REQUEST_REUSED");
        return { duplicate: true, snapshot: Y.encodeStateAsUpdate(document) };
      }
      const target = (await client.query<RevisionRow>(`select * from lyric_revisions where document_key=$1 and id=$2
        and created_at >= statement_timestamp()-interval '180 days'`, [key, revisionId])).rows[0];
      if (!target) return null;
      const body = document.getText("body");
      if (bodyHash(body.toString()) !== input.expectedHash) throw new Error("REVISION_CURRENT_CHANGED");
      const now = new Date();
      const preserved = await captureRevision(client, ownerId, key, body.toString(), "before_restore", now);
      document.transact(() => { body.delete(0, body.length); body.insert(0, target.body); });
      const snapshot = Y.encodeStateAsUpdate(document);
      // Compact into the existing Yjs history. Never replace the document with a
      // fresh Y.Doc: offline clients must still merge against the old identities.
      const sequence = (await client.query<{ sequence: string }>("select coalesce(max(sequence),0)::text sequence from sync_updates where document_key=$1", [key])).rows[0]!.sequence;
      await client.query(`update sync_documents set snapshot=$2,snapshot_sequence=greatest(snapshot_sequence,$3),
        projected_at=statement_timestamp(),projection_error_code=null,updated_at=statement_timestamp() where document_key=$1`, [key, Buffer.from(snapshot), sequence]);
      await client.query("delete from sync_updates where document_key=$1", [key]);
      await projectBody(client, loaded.resourceType, loaded.resourceId, ownerId, target.body);
      await client.query("insert into lyric_restore_requests(document_key,owner_id,request_id,request_sha256) values($1,$2,$3,$4)", [key, ownerId, input.requestId, requestHash]);
      await pruneRevisions(client, key, now, [target.id, preserved!.id]);
      return { duplicate: false, snapshot };
    });
  }

  async maintainRevisions(limit = 20) {
    const now = new Date();
    const due = await this.#pool.query<{ owner_id: string; document_key: string }>(`select d.owner_id,d.document_key from sync_documents d
      join resources r on r.id=d.resource_id where r.deleted_at is null and d.revision_checked_at <= $1
      order by d.revision_checked_at limit $2`, [new Date(now.getTime() - REVISION_POLICY.intervalMs), limit]);
    const expired = await this.#pool.query<{ owner_id: string; document_key: string }>(`select owner_id,document_key from lyric_revisions
      group by owner_id,document_key having min(created_at)<$1 or count(*)>$2 limit $3`, [new Date(now.getTime() - REVISION_POLICY.retentionDays * 86_400_000), REVISION_POLICY.maximumCount, limit]);
    let failed = 0;
    for (const item of due.rows) {
      try { await this.checkpoint(item.owner_id, item.document_key, "interval", now); } catch { failed++; }
    }
    for (const item of expired.rows) {
      try { await this.#owned(item.owner_id, async (client) => {
        await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [item.document_key]);
        await pruneRevisions(client, item.document_key, now);
      }); } catch { failed++; }
    }
    return { checked: due.rows.length, prunedDocuments: expired.rows.length, failed };
  }

  async #withDocument<T>(ownerId: string, key: string, work: (client: PoolClient, loaded: NonNullable<Awaited<ReturnType<CollaborationStore["loadDocument"]>>>, document: Y.Doc) => Promise<T>) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
      const loaded = await this.#loadLocked(client, ownerId, key, true);
      if (!loaded) return null;
      const document = materialize(loaded.snapshot, loaded.updates);
      try { return await work(client, loaded, document); } finally { document.destroy(); }
    });
  }

  async retryPendingProjections(limit = 20) {
    const pending = await this.#pool.query<{ owner_id: string; document_key: string }>(`select owner_id,document_key
      from sync_documents where projection_error_code is not null order by updated_at limit $1`, [limit]);
    let recovered = 0;
    for (const item of pending.rows) {
      try { if (await this.retryProjection(item.owner_id, item.document_key)) recovered++; } catch { /* leave the retry marker in place */ }
    }
    return { attempted: pending.rowCount ?? 0, recovered };
  }

  async #loadLocked(client: PoolClient, ownerId: string, key: string, lock: boolean) {
    const result = await client.query<DocumentRows & { deleted_at: Date | null }>(`select d.document_key,d.resource_id,d.resource_type,d.snapshot,d.snapshot_sequence::text,d.projection_error_code,r.deleted_at
      from sync_documents d join resources r on r.id=d.resource_id and r.owner_id=d.owner_id
      where d.document_key=$1 and d.owner_id=$2 ${lock ? "for update of r,d" : ""}`, [key, ownerId]);
    const row = result.rows[0]; if (!row || row.deleted_at) return null;
    const updates = await client.query<{ payload: Buffer }>("select payload from sync_updates where document_key=$1 and sequence>$2 order by sequence", [key, row.snapshot_sequence]);
    return { resourceId: row.resource_id, resourceType: row.resource_type, snapshot: new Uint8Array(row.snapshot), updates: updates.rows.map((item) => new Uint8Array(item.payload)), projectionPending: row.projection_error_code !== null };
  }

  async #owned<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect();
    try { await client.query("begin"); await client.query("set local role lyricscloud_app"); await client.query("select set_config('app.user_id',$1,true)",[ownerId]); const value=await work(client); await client.query("commit"); return value; }
    catch(error){ await client.query("rollback").catch(()=>undefined); throw error; } finally { client.release(); }
  }
}

export function materialize(snapshot: Uint8Array, updates: readonly Uint8Array[]) {
  const document = new Y.Doc(); Y.applyUpdate(document, snapshot); for (const update of updates) Y.applyUpdate(document, update); return document;
}

export function newUpdateId() { return randomUUID(); }

async function projectBody(client: PoolClient, resourceType: "lyrics" | "rhyme_note", resourceId: string, ownerId: string, body: string): Promise<void> {
  const table = resourceType === "lyrics" ? "lyrics" : "rhyme_notes";
  const result = await client.query(`update ${table} set body=$3 where resource_id=$1 and owner_id=$2`, [resourceId, ownerId, body]);
  if (result.rowCount !== 1) throw new Error("SYNC_DOCUMENT_UNAVAILABLE");
}
