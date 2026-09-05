import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import * as Y from "yjs";

interface DocumentRows {
  document_key: string; resource_id: string; snapshot: Buffer; snapshot_sequence: string; projection_error_code?: string | null;
}

export class CollaborationStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string) { this.#pool = new Pool({ connectionString: databaseUrl, max: 10, connectionTimeoutMillis: 2_000 }); }
  close() { return this.#pool.end(); }

  async ensureDocument(ownerId: string, resourceId: string) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [resourceId]);
      const lyric = await client.query<{ body: string }>(`select l.body from lyrics l join resources r on r.id=l.resource_id and r.owner_id=l.owner_id
        where l.resource_id=$1 and l.owner_id=$2 and r.deleted_at is null for update of r`, [resourceId, ownerId]);
      if (!lyric.rowCount) return null;
      const existing = await client.query<DocumentRows>("select document_key, resource_id, snapshot, snapshot_sequence::text from sync_documents where resource_id=$1", [resourceId]);
      if (existing.rows[0]) return existing.rows[0];
      const document = new Y.Doc(); const body = lyric.rows[0]!.body;
      if (body) document.getText("body").insert(0, body);
      const created = await client.query<DocumentRows>(`insert into sync_documents(resource_id,owner_id,snapshot,projected_at)
        values($1,$2,$3,statement_timestamp()) returning document_key,resource_id,snapshot,snapshot_sequence::text`, [resourceId, ownerId, Buffer.from(Y.encodeStateAsUpdate(document))]);
      document.destroy(); return created.rows[0]!;
    });
  }

  async loadDocument(ownerId: string, documentKey: string) {
    return this.#owned(ownerId, async (client) => this.#loadLocked(client, ownerId, documentKey, false));
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
        await client.query("update lyrics set body=$3 where resource_id=$1 and owner_id=$2", [loaded.resourceId, ownerId, body]);
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
      await client.query("update lyrics set body=$3 where resource_id=$1 and owner_id=$2", [loaded.resourceId, ownerId, body]);
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
    const result = await client.query<DocumentRows & { deleted_at: Date | null }>(`select d.document_key,d.resource_id,d.snapshot,d.snapshot_sequence::text,d.projection_error_code,r.deleted_at
      from sync_documents d join resources r on r.id=d.resource_id and r.owner_id=d.owner_id
      where d.document_key=$1 and d.owner_id=$2 ${lock ? "for update of d" : ""}`, [key, ownerId]);
    const row = result.rows[0]; if (!row || row.deleted_at) return null;
    const updates = await client.query<{ payload: Buffer }>("select payload from sync_updates where document_key=$1 and sequence>$2 order by sequence", [key, row.snapshot_sequence]);
    return { resourceId: row.resource_id, snapshot: new Uint8Array(row.snapshot), updates: updates.rows.map((item) => new Uint8Array(item.payload)), projectionPending: row.projection_error_code !== null };
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
