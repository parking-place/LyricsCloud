import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import * as Y from "yjs";
import {
  normalizePromptToken, projectUniquePromptTokens, REVISION_POLICY, serializePromptTokens, validatePromptSentenceText,
  type CheckpointReason, type PromptMode, type PromptTokenValue, type RestoreRevisionInput
} from "@lyricscloud/domain";
import { bodyHash, captureRevision, pruneRevisions, summarize, type RevisionRow } from "./revisions.js";
import { createDatabasePool } from "@lyricscloud/database";

type EditableResourceType = "lyrics" | "rhyme_note" | "prompt";

interface DocumentRows {
  document_key: string; resource_id: string; owner_id: string; resource_type: EditableResourceType;
  snapshot: Buffer; snapshot_sequence: string; projection_error_code?: string | null;
}

export interface DocumentAccess {
  readonly ownerId: string;
  readonly actorId: string;
  readonly accessMode: "owner" | "read" | "write";
  readonly permissionEpoch: number;
  readonly grantId?: string;
  readonly writeEpoch?: number;
  readonly displayName: string;
}

export interface PublicDocumentAccess {
  readonly documentKey: string;
  readonly resourceId: string;
  readonly ownerId: string;
  readonly snapshot: Uint8Array;
  readonly updates: readonly Uint8Array[];
  readonly permissionEpoch: number;
}

export class CollaborationStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string) { this.#pool = createDatabasePool(databaseUrl, 10); }
  close() { return this.#pool.end(); }

  async ensureDocument(ownerId: string, resourceId: string, promptModeCapable = false) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [resourceId]);
      const editable = await client.query<{ resource_type: EditableResourceType; title: string; body: string | null;
        prompt_tokens: unknown; prompt_mode: PromptMode | null; sentence_text: string | null }>(`select r.type resource_type,r.title,
        case r.type when 'lyrics' then l.body when 'rhyme_note' then n.body else null end body,
        p.mode prompt_mode,p.sentence_text,
        coalesce((select jsonb_agg(jsonb_build_object('displayValue',pt.display_value) order by pt.ordinal)
          from prompt_tokens pt where pt.owner_id=r.owner_id and pt.prompt_resource_id=r.id),'[]'::jsonb) prompt_tokens
        from resources r left join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
        left join rhyme_notes n on n.resource_id=r.id and n.owner_id=r.owner_id
        left join prompts p on p.resource_id=r.id and p.owner_id=r.owner_id
        where r.id=$1 and r.owner_id=$2 and r.type in ('lyrics','rhyme_note','prompt') and r.deleted_at is null
          and ((r.type='lyrics' and l.resource_id is not null) or (r.type='rhyme_note' and n.resource_id is not null)
            or (r.type='prompt' and p.resource_id is not null))
        for update of r`, [resourceId, ownerId]);
      if (!editable.rowCount) return null;
      const resource = editable.rows[0]!;
      if (resource.resource_type === "prompt" && resource.prompt_mode === "sentence" && !promptModeCapable) {
        throw new Error("PROMPT_MODE_CAPABILITY_REQUIRED");
      }
      const existing = await client.query<DocumentRows>("select document_key,resource_id,resource_type,snapshot,snapshot_sequence::text from sync_documents where resource_id=$1", [resourceId]);
      if (existing.rows[0]) return existing.rows[0];
      const document = new Y.Doc();
      if (resource.resource_type === "prompt") {
        if (resource.title) document.getText("prompt-title").insert(0, resource.title);
        document.getMap<PromptMode>("prompt-mode").set("value", resource.prompt_mode ?? "tags");
        if (resource.sentence_text) document.getText("prompt-sentence").insert(0, resource.sentence_text);
        const tokens = Array.isArray(resource.prompt_tokens) ? resource.prompt_tokens as Array<{ displayValue?: unknown }> : [];
        const items = tokens.map((token, index) => ({ occurrenceId: `seed-${index}`, displayValue: normalizePromptToken(token.displayValue as string).displayValue }));
        if (items.length) document.getArray("prompt-tokens").insert(0, items);
      } else {
        const body = (resource.body ?? "").replace(/\r\n?/g, "\n");
        if (body) document.getText("body").insert(0, body);
      }
      const content = documentContent(document, resource.resource_type);
      const created = await client.query<DocumentRows>(`insert into sync_documents(resource_id,owner_id,resource_type,snapshot,projected_at,revision_body_sha256)
        values($1,$2,$3,$4,statement_timestamp(),$5)
        returning document_key,resource_id,resource_type,snapshot,snapshot_sequence::text`,
        [resourceId, ownerId, resource.resource_type, Buffer.from(Y.encodeStateAsUpdate(document)), bodyHash(content)]);
      if (resource.resource_type !== "prompt" && content !== resource.body) {
        await projectDocument(client, resource.resource_type, resourceId, ownerId, document);
      }
      document.destroy(); return created.rows[0]!;
    });
  }

  async loadDocument(ownerId: string, documentKey: string) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [documentKey]);
      return this.#loadLocked(client, ownerId, documentKey, false);
    });
  }

  async loadDocumentForActor(actorId: string, documentKey: string) {
    return this.#owned(actorId, async (client) => {
      const result = await client.query<DocumentRows & { deleted_at: Date | null; prompt_mode: PromptMode | null;
        access_mode: "owner" | "read" | "write"; permission_epoch: string; grant_id: string | null;
        write_epoch: string | null; display_name: string }>(`select
        d.document_key,d.resource_id,d.owner_id,d.resource_type,d.snapshot,d.snapshot_sequence::text,
        d.projection_error_code,r.deleted_at,p.mode prompt_mode,
        case when d.owner_id=$2 then 'owner' when g.write_enabled then 'write' else 'read' end access_mode,
        coalesce(g.permission_epoch,0)::text permission_epoch,g.id grant_id,g.write_epoch::text,identity.display_name
        from sync_documents d join resources r on r.id=d.resource_id and r.owner_id=d.owner_id
        left join prompts p on p.resource_id=r.id and p.owner_id=r.owner_id
        left join lyric_read_grants g on g.resource_id=d.resource_id and g.owner_id=d.owner_id
          and g.grantee_id=$2 and g.state='active'
          and (g.expires_at is null or g.expires_at>statement_timestamp())
        cross join lateral app_sharing_identity($2) identity
        where d.document_key=$1 and r.deleted_at is null
          and (d.owner_id=$2 or g.id is not null)`, [documentKey, actorId]);
      const row = result.rows[0]; if (!row) return null;
      const updates = await client.query<{ payload: Buffer }>(
        "select payload from sync_updates where document_key=$1 and sequence>$2 order by sequence",
        [documentKey, row.snapshot_sequence]);
      return { documentKey: row.document_key, resourceId: row.resource_id, resourceType: row.resource_type, promptMode: row.prompt_mode,
        snapshot: new Uint8Array(row.snapshot), updates: updates.rows.map((item) => new Uint8Array(item.payload)),
        projectionPending: row.projection_error_code !== null,
        access: { ownerId: row.owner_id, actorId, accessMode: row.access_mode,
          permissionEpoch: Number(row.permission_epoch), grantId: row.grant_id ?? undefined,
          writeEpoch: row.write_epoch === null ? undefined : Number(row.write_epoch),
          displayName: row.display_name } satisfies DocumentAccess };
    });
  }

  async findSharedDocument(actorId: string, resourceId: string) {
    return this.#owned(actorId, async (client) => {
      const row = (await client.query<{ document_key: string }>(`select d.document_key
        from sync_documents d join lyric_read_grants g on g.resource_id=d.resource_id and g.owner_id=d.owner_id
        where d.resource_id=$1 and g.grantee_id=$2 and g.state='active'
          and (g.expires_at is null or g.expires_at>statement_timestamp())`, [resourceId, actorId])).rows[0];
      return row ? this.loadDocumentForActor(actorId, row.document_key) : null;
    });
  }

  async loadPublicDocument(tokenDigest: string, linkId: string): Promise<PublicDocumentAccess | null> {
    if (!/^[0-9a-f]{64}$/.test(tokenDigest) || !/^[0-9a-f-]{36}$/i.test(linkId)) return null;
    return this.#public(async (client) => {
      const row = (await client.query<{ document_key: string; resource_id: string; owner_id: string;
        snapshot: Buffer; snapshot_sequence: string; permission_epoch: string }>(
        "select * from app_public_lyric_document($1,$2)", [tokenDigest, linkId])).rows[0];
      if (!row) return null;
      const updates = await client.query<{ payload: Buffer }>(
        "select payload from app_public_lyric_updates($1,$2,$3) where sequence>$4 order by sequence",
        [tokenDigest, linkId, row.document_key, row.snapshot_sequence]);
      const valid = (await client.query<{ allowed: boolean }>(
        "select app_public_lyric_access($1,$2,$3,$4) allowed",
        [tokenDigest, linkId, row.document_key, row.permission_epoch])).rows[0]?.allowed;
      return valid ? { documentKey: row.document_key, resourceId: row.resource_id, ownerId: row.owner_id,
        snapshot: new Uint8Array(row.snapshot), updates: updates.rows.map((item) => new Uint8Array(item.payload)),
        permissionEpoch: Number(row.permission_epoch) } : null;
    });
  }

  async hasPublicAccess(tokenDigest: string, linkId: string, documentKey: string, permissionEpoch: number): Promise<boolean> {
    if (!/^[0-9a-f]{64}$/.test(tokenDigest) || !/^[0-9a-f-]{36}$/i.test(linkId)
      || !/^[0-9a-f-]{36}$/i.test(documentKey) || !Number.isSafeInteger(permissionEpoch)) return false;
    return this.#public(async (client) => Boolean((await client.query<{ allowed: boolean }>(
      "select app_public_lyric_access($1,$2,$3,$4) allowed",
      [tokenDigest, linkId, documentKey, permissionEpoch])).rows[0]?.allowed));
  }

  async applyUpdate(ownerId: string, documentKey: string, updateId: string, payload: Uint8Array) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [documentKey]);
      const loaded = await this.#loadLocked(client, ownerId, documentKey, true);
      if (!loaded) return null;
      return this.#applyUpdateLocked(client, loaded, ownerId, documentKey, updateId, payload,
        { actorId: ownerId, accessMode: "owner" });
    });
  }

  async applyUpdateForActor(access: DocumentAccess, documentKey: string, updateId: string, payload: Uint8Array) {
    if (access.accessMode === "owner") return this.applyUpdate(access.actorId, documentKey, updateId, payload);
    if (access.accessMode !== "write" || !access.grantId || !access.writeEpoch) return null;
    return this.#owned(access.actorId, async (client) => {
      const payloadSha256 = createHash("sha256").update(payload).digest("hex");
      const receipt = (await client.query<{ authorized_owner_id: string; authorized_resource_id: string;
        payload_sha256: string; accepted_sequence: string }>(
        "select authorized_owner_id,authorized_resource_id,payload_sha256,accepted_sequence::text from app_selected_lyric_write_receipt($1,$2,$3,$4,$5)",
        [documentKey, updateId, access.grantId, access.permissionEpoch, access.writeEpoch])).rows[0];
      if (receipt) {
        if (receipt.payload_sha256 !== payloadSha256) throw new Error("SYNC_UPDATE_ID_REUSED");
        await client.query("select set_config('app.user_id',$1,true)", [receipt.authorized_owner_id]);
        await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [documentKey]);
        const loaded = await this.#loadLocked(client, receipt.authorized_owner_id, documentKey, true);
        if (!loaded || loaded.resourceId !== receipt.authorized_resource_id) return null;
        return { duplicate: true, sequence: Number(receipt.accepted_sequence),
          snapshot: loaded.snapshot, projectionPending: loaded.projectionPending };
      }
      const authorized = (await client.query<{ authorized_owner_id: string; authorized_resource_id: string }>(
        "select * from app_authorize_selected_lyric_write($1,$2,$3,$4)",
        [documentKey, access.grantId, access.permissionEpoch, access.writeEpoch])).rows[0];
      if (!authorized || authorized.authorized_owner_id !== access.ownerId) return null;
      await client.query("select set_config('app.user_id',$1,true)", [authorized.authorized_owner_id]);
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [documentKey]);
      const loaded = await this.#loadLocked(client, authorized.authorized_owner_id, documentKey, true);
      if (!loaded || loaded.resourceId !== authorized.authorized_resource_id || loaded.resourceType !== "lyrics") return null;
      return this.#applyUpdateLocked(client, loaded, authorized.authorized_owner_id, documentKey, updateId, payload,
        { actorId: access.actorId, accessMode: "write", grantId: access.grantId,
          permissionEpoch: access.permissionEpoch, writeEpoch: access.writeEpoch });
    });
  }

  async #applyUpdateLocked(client: PoolClient, loaded: NonNullable<Awaited<ReturnType<CollaborationStore["loadDocument"]>>>,
    ownerId: string, documentKey: string, updateId: string, payload: Uint8Array,
    audit: { actorId: string; accessMode: "owner" | "write"; grantId?: string; permissionEpoch?: number; writeEpoch?: number }) {
    const hash = createHash("sha256").update(payload).digest("hex");
    const receipt = await client.query<{ payload_sha256: string; accepted_sequence: string | null }>(
      "select payload_sha256,accepted_sequence::text from sync_update_receipts where document_key=$1 and update_id=$2",
      [documentKey, updateId]);
    if (receipt.rows[0]) {
      if (receipt.rows[0].payload_sha256 !== hash) throw new Error("SYNC_UPDATE_ID_REUSED");
      return { duplicate: true, sequence: Number(receipt.rows[0].accepted_sequence ?? 0),
        snapshot: loaded.snapshot, projectionPending: loaded.projectionPending };
    }
    const document = materialize(loaded.snapshot, loaded.updates);
    Y.applyUpdate(document, payload);
    const content = documentContent(document, loaded.resourceType);
    if ([...content].length > 100_000) { document.destroy(); throw new Error("SYNC_DOCUMENT_TOO_LARGE"); }
    const inserted = await client.query<{ sequence: string }>(`insert into sync_updates
      (document_key,update_id,payload,actor_id,access_mode,grant_id,permission_epoch,write_epoch)
      values($1,$2,$3,$4,$5,$6,$7,$8) returning sequence::text`,
    [documentKey, updateId, Buffer.from(payload), audit.actorId, audit.accessMode,
      audit.grantId ?? null, audit.permissionEpoch ?? null, audit.writeEpoch ?? null]);
    const sequence = Number(inserted.rows[0]!.sequence);
    await client.query(`insert into sync_update_receipts
      (document_key,update_id,payload_sha256,accepted_sequence,actor_id,access_mode,grant_id,permission_epoch,write_epoch)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [documentKey, updateId, hash, sequence, audit.actorId,
      audit.accessMode, audit.grantId ?? null, audit.permissionEpoch ?? null, audit.writeEpoch ?? null]);
    let projectionPending = false;
    await client.query("savepoint project_plaintext");
    try {
      await projectDocument(client, loaded.resourceType, loaded.resourceId, ownerId, document);
      await client.query(`update sync_documents set projected_at=statement_timestamp(),projection_error_code=null,
        last_actor_id=$2,last_access_mode=$3,updated_at=statement_timestamp() where document_key=$1`,
      [documentKey, audit.actorId, audit.accessMode]);
      await client.query("release savepoint project_plaintext");
    } catch {
      await client.query("rollback to savepoint project_plaintext");
      await client.query(`update sync_documents set projection_error_code='SYNC_PROJECTION_FAILED',
        last_actor_id=$2,last_access_mode=$3,updated_at=statement_timestamp() where document_key=$1`,
      [documentKey, audit.actorId, audit.accessMode]);
      projectionPending = true;
    }
    const stats = await client.query<{ count: string; bytes: string; sequence: string }>(`select count(*)::text count,
      coalesce(sum(octet_length(payload)),0)::text bytes,coalesce(max(sequence),0)::text sequence
      from sync_updates where document_key=$1`, [documentKey]);
    const compact = Number(stats.rows[0]!.count) >= 100 || Number(stats.rows[0]!.bytes) >= 1_048_576;
    const snapshot = Y.encodeStateAsUpdate(document);
    if (compact) {
      await client.query("update sync_documents set snapshot=$2,snapshot_sequence=$3,updated_at=statement_timestamp() where document_key=$1",
        [documentKey, Buffer.from(snapshot), stats.rows[0]!.sequence]);
      await client.query("delete from sync_updates where document_key=$1 and sequence <= $2", [documentKey, stats.rows[0]!.sequence]);
    }
    document.destroy();
    return { duplicate: false, sequence, snapshot, projectionPending };
  }

  async retryProjection(ownerId: string, documentKey: string) {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [documentKey]);
      const loaded = await this.#loadLocked(client, ownerId, documentKey, true);
      if (!loaded) return false;
      const document = materialize(loaded.snapshot, loaded.updates);
      await projectDocument(client, loaded.resourceType, loaded.resourceId, ownerId, document); document.destroy();
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
      const content = documentContent(document, loaded.resourceType);
      return { current: { body: content, hash: bodyHash(content) }, items: rows.rows.map(summarize) };
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
      const result = await captureRevision(client, ownerId, key, documentContent(document, _loaded.resourceType), reason, now);
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
      const content = documentContent(document, loaded.resourceType);
      if (bodyHash(content) !== input.expectedHash) throw new Error("REVISION_CURRENT_CHANGED");
      const now = new Date();
      const preserved = await captureRevision(client, ownerId, key, content, "before_restore", now);
      replaceDocumentContent(document, loaded.resourceType, target.body);
      const snapshot = Y.encodeStateAsUpdate(document);
      // Compact into the existing Yjs history. Never replace the document with a
      // fresh Y.Doc: offline clients must still merge against the old identities.
      const sequence = (await client.query<{ sequence: string }>("select coalesce(max(sequence),0)::text sequence from sync_updates where document_key=$1", [key])).rows[0]!.sequence;
      await client.query(`update sync_documents set snapshot=$2,snapshot_sequence=greatest(snapshot_sequence,$3),
        projected_at=statement_timestamp(),projection_error_code=null,updated_at=statement_timestamp() where document_key=$1`, [key, Buffer.from(snapshot), sequence]);
      await client.query("delete from sync_updates where document_key=$1", [key]);
      await projectDocument(client, loaded.resourceType, loaded.resourceId, ownerId, document);
      await client.query("insert into lyric_restore_requests(document_key,owner_id,request_id,request_sha256) values($1,$2,$3,$4)", [key, ownerId, input.requestId, requestHash]);
      await pruneRevisions(client, key, now, [target.id, preserved!.id]);
      return { duplicate: false, snapshot };
    });
  }

  async maintainRevisions(limit = 20, now = new Date()) {
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
    const result = await client.query<DocumentRows & { deleted_at: Date | null; prompt_mode: PromptMode | null }>(`select d.document_key,d.resource_id,d.resource_type,d.snapshot,d.snapshot_sequence::text,d.projection_error_code,r.deleted_at,p.mode prompt_mode
      from sync_documents d join resources r on r.id=d.resource_id and r.owner_id=d.owner_id
      left join prompts p on p.resource_id=r.id and p.owner_id=r.owner_id
      where d.document_key=$1 and d.owner_id=$2 ${lock ? "for update of r,d" : ""}`, [key, ownerId]);
    const row = result.rows[0]; if (!row || row.deleted_at) return null;
    const updates = await client.query<{ payload: Buffer }>("select payload from sync_updates where document_key=$1 and sequence>$2 order by sequence", [key, row.snapshot_sequence]);
      return { documentKey: row.document_key, resourceId: row.resource_id, resourceType: row.resource_type, promptMode: row.prompt_mode,
      snapshot: new Uint8Array(row.snapshot), updates: updates.rows.map((item) => new Uint8Array(item.payload)), projectionPending: row.projection_error_code !== null };
  }

  async #owned<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect();
    try { await client.query("begin"); await client.query("set local role lyricscloud_app"); await client.query("select set_config('app.user_id',$1,true)",[ownerId]); const value=await work(client); await client.query("commit"); return value; }
    catch(error){ await client.query("rollback").catch(()=>undefined); throw error; } finally { client.release(); }
  }

  async #public<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect();
    try { await client.query("begin"); await client.query("set local role lyricscloud_app"); const value=await work(client); await client.query("commit"); return value; }
    catch(error){ await client.query("rollback").catch(()=>undefined); throw error; } finally { client.release(); }
  }
}

export function materialize(snapshot: Uint8Array, updates: readonly Uint8Array[]) {
  const document = new Y.Doc(); Y.applyUpdate(document, snapshot); for (const update of updates) Y.applyUpdate(document, update); return document;
}

export function newUpdateId() { return randomUUID(); }

async function projectDocument(client: PoolClient, resourceType: EditableResourceType, resourceId: string, ownerId: string, document: Y.Doc): Promise<void> {
  if (resourceType !== "prompt") {
    const table = resourceType === "lyrics" ? "lyrics" : "rhyme_notes";
    const result = await client.query(`update ${table} set body=$3 where resource_id=$1 and owner_id=$2`, [resourceId, ownerId, document.getText("body").toString()]);
    if (result.rowCount !== 1) throw new Error("SYNC_DOCUMENT_UNAVAILABLE");
    return;
  }
  const state = readPromptState(document);
  const tokens = projectUniquePromptTokens(state.tokens);
  const previous = await client.query<{ normalized_value: string }>(
    "select normalized_value from prompt_tokens where owner_id=$1 and prompt_resource_id=$2", [ownerId, resourceId]);
  const oldNormalized = new Set(previous.rows.map(({ normalized_value }) => normalized_value));
  const resource = await client.query(`update resources set title=$3 where id=$1 and owner_id=$2 and type='prompt' and deleted_at is null returning id`,
    [resourceId, ownerId, state.title]);
  if (resource.rowCount !== 1) throw new Error("SYNC_DOCUMENT_UNAVAILABLE");
  await client.query("delete from prompt_tokens where owner_id=$1 and prompt_resource_id=$2", [ownerId, resourceId]);
  for (const [ordinal, token] of tokens.entries()) {
    const increment = oldNormalized.has(token.normalizedValue) ? 0 : 1;
    const dictionary = await client.query<{ id: string }>(`insert into prompt_token_dictionary
      (id,owner_id,display_value,normalized_value,usage_count,last_used_at) values($1,$2,$3,$4,$5,clock_timestamp())
      on conflict(owner_id,normalized_value) do update set
        usage_count=prompt_token_dictionary.usage_count+$5,last_used_at=clock_timestamp()
      returning id`, [randomUUID(), ownerId, token.displayValue, token.normalizedValue, increment]);
    await client.query(`insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value)
      values($1,$2,$3,$4,$5,$6)`, [ownerId, resourceId, ordinal, dictionary.rows[0]!.id, token.displayValue, token.normalizedValue]);
  }
  const prompt = await client.query(`update prompts set mode=$3,plain_text=$4,
    sentence_text=case when $3='sentence' or $5<>'' then $5 else sentence_text end
    where resource_id=$1 and owner_id=$2 returning resource_id`,
    [resourceId, ownerId, state.mode, serializePromptTokens(tokens), state.sentenceText]);
  if (prompt.rowCount !== 1) throw new Error("SYNC_DOCUMENT_UNAVAILABLE");
}

function documentContent(document: Y.Doc, resourceType: EditableResourceType): string {
  if (resourceType !== "prompt") return document.getText("body").toString();
  const state = readPromptState(document);
  return JSON.stringify({ version: 2, title: state.title, mode: state.mode, tokens: state.items, sentenceText: state.sentenceText });
}

function readPromptState(document: Y.Doc): { title: string; mode: PromptMode; items: Array<{ occurrenceId: string; displayValue: string }>;
  tokens: PromptTokenValue[]; sentenceText: string } {
  const seen = new Set<string>();
  const items = document.getArray<unknown>("prompt-tokens").toArray().map((value) => {
    if (!value || typeof value !== "object") throw new Error("SYNC_PROMPT_INVALID");
    const candidate = value as { occurrenceId?: unknown; displayValue?: unknown };
    if (typeof candidate.occurrenceId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(candidate.occurrenceId)
      || seen.has(candidate.occurrenceId) || typeof candidate.displayValue !== "string") throw new Error("SYNC_PROMPT_INVALID");
    seen.add(candidate.occurrenceId);
    return { occurrenceId: candidate.occurrenceId, displayValue: normalizePromptToken(candidate.displayValue).displayValue };
  });
  const modeValue = document.getMap<unknown>("prompt-mode").get("value");
  if (modeValue !== undefined && modeValue !== "tags" && modeValue !== "sentence") throw new Error("SYNC_PROMPT_INVALID");
  const mode: PromptMode = modeValue === "sentence" ? "sentence" : "tags";
  const sentenceText = validatePromptSentenceText(document.getText("prompt-sentence").toString());
  return { title: document.getText("prompt-title").toString().normalize("NFC").trim(), mode, items,
    tokens: items.map(({ displayValue }) => normalizePromptToken(displayValue)), sentenceText };
}

function replaceDocumentContent(document: Y.Doc, resourceType: EditableResourceType, content: string): void {
  if (resourceType !== "prompt") {
    const body = document.getText("body");
    document.transact(() => { body.delete(0, body.length); if (content) body.insert(0, content); });
    return;
  }
  let parsed: { version?: unknown; title?: unknown; mode?: unknown; tokens?: unknown; sentenceText?: unknown };
  try { parsed = JSON.parse(content) as typeof parsed; } catch { throw new Error("REVISION_CONTENT_INVALID"); }
  if ((parsed.version !== 1 && parsed.version !== 2) || typeof parsed.title !== "string" || !Array.isArray(parsed.tokens)) throw new Error("REVISION_CONTENT_INVALID");
  const restoredTitle = parsed.title;
  const restoredTokens = parsed.tokens;
  const restoredMode: PromptMode = parsed.version === 2 && parsed.mode === "sentence" ? "sentence" : "tags";
  const restoredSentence = parsed.version === 2 ? validatePromptSentenceText(parsed.sentenceText) : "";
  const title = document.getText("prompt-title");
  const tokens = document.getArray("prompt-tokens");
  const sentence = document.getText("prompt-sentence");
  document.transact(() => {
    title.delete(0, title.length); if (restoredTitle) title.insert(0, restoredTitle);
    tokens.delete(0, tokens.length); if (restoredTokens.length) tokens.insert(0, restoredTokens);
    sentence.delete(0, sentence.length); if (restoredSentence) sentence.insert(0, restoredSentence);
    document.getMap<PromptMode>("prompt-mode").set("value", restoredMode);
  });
  readPromptState(document);
}
