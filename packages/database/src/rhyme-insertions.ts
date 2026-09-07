import { Pool, type PoolClient, type QueryResultRow } from "pg";
import * as Y from "yjs";
import {
  parseRhymeInsertionRequest,
  type RhymeInsertionRequest,
  type RhymeInsertionUnavailableReason
} from "@lyricscloud/domain";
import { createDatabasePool } from "./pool.js";

interface TextDocumentRow extends QueryResultRow {
  document_key: string;
  resource_id: string;
  resource_type: "lyrics" | "rhyme_note";
  snapshot: Buffer;
  snapshot_sequence: string;
  body: string;
}

export interface RhymeInsertionSource {
  readonly resourceId: string;
  readonly documentKey: string;
  readonly snapshot: string;
  readonly body: string;
}

export type RhymeInsertionValidation =
  | { readonly valid: true; readonly text: string }
  | { readonly valid: false; readonly reason: RhymeInsertionUnavailableReason | "source_changed" };

/** Owner-scoped, read-only validation boundary for a client-side CRDT insertion. */
export class PostgresRhymeInsertionStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string) { this.#pool = createDatabasePool(databaseUrl, 4); }

  getSource(ownerId: string, resourceId: string): Promise<RhymeInsertionSource | null> {
    return this.#owned(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [resourceId]);
      const row = await ensureTextDocument(client, ownerId, resourceId, "rhyme_note");
      if (!row) return null;
      const document = await materialize(client, row);
      try {
        return {
          resourceId: row.resource_id,
          documentKey: row.document_key,
          snapshot: Buffer.from(Y.encodeStateAsUpdate(document)).toString("base64url"),
          body: document.getText("body").toString()
        };
      } finally { document.destroy(); }
    });
  }

  validate(ownerId: string, value: unknown): Promise<RhymeInsertionValidation> {
    const request = parseRhymeInsertionRequest(value);
    return this.#owned(ownerId, async (client) => {
      const target = await readTextDocument(client, ownerId, request.target.resourceId, "lyrics");
      if (!target) return { valid: false, reason: "target_deleted" };
      if (target.document_key !== request.target.documentKey) return { valid: false, reason: "target_changed" };
      const source = await readTextDocument(client, ownerId, request.source.resourceId, "rhyme_note");
      if (!source || source.document_key !== request.source.documentKey) return { valid: false, reason: "source_changed" };
      const [sourceDocument, targetDocument] = await Promise.all([materialize(client, source), materialize(client, target)]);
      try {
        const anchor = resolve(sourceDocument, request.source.anchorRelativePosition);
        const head = resolve(sourceDocument, request.source.headRelativePosition);
        const targetPosition = resolve(targetDocument, request.target.relativePosition);
        if (anchor === null || head === null) return { valid: false, reason: "source_changed" };
        if (targetPosition === null) return { valid: false, reason: "target_changed" };
        const selected = sourceDocument.getText("body").toString().slice(Math.min(anchor, head), Math.max(anchor, head));
        if (selected !== request.text) return { valid: false, reason: "source_changed" };
        return { valid: true, text: request.text };
      } finally { sourceDocument.destroy(); targetDocument.destroy(); }
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #owned<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

async function ensureTextDocument(client: PoolClient, ownerId: string, resourceId: string, type: TextDocumentRow["resource_type"]): Promise<TextDocumentRow | null> {
  const existing = await readTextDocument(client, ownerId, resourceId, type);
  if (existing) return existing;
  const table = type === "lyrics" ? "lyrics" : "rhyme_notes";
  const source = await client.query<{ body: string }>(`select body from ${table} data join resources r on r.id=data.resource_id and r.owner_id=data.owner_id
    where data.resource_id=$1 and data.owner_id=$2 and r.type=$3 and r.deleted_at is null for update of r`, [resourceId, ownerId, type]);
  if (!source.rows[0]) return null;
  const document = new Y.Doc();
  const body = source.rows[0].body.replace(/\r\n?/g, "\n");
  if (body) document.getText("body").insert(0, body);
  try {
    const created = await client.query<TextDocumentRow>(`insert into sync_documents(resource_id,owner_id,resource_type,snapshot,projected_at)
      values($1,$2,$3,$4,statement_timestamp())
      returning document_key,resource_id,resource_type,snapshot,snapshot_sequence::text,$5::text body`,
      [resourceId, ownerId, type, Buffer.from(Y.encodeStateAsUpdate(document)), body]);
    return created.rows[0]!;
  } finally { document.destroy(); }
}

async function readTextDocument(client: PoolClient, ownerId: string, resourceId: string, type: TextDocumentRow["resource_type"]): Promise<TextDocumentRow | null> {
  const table = type === "lyrics" ? "lyrics" : "rhyme_notes";
  const result = await client.query<TextDocumentRow>(`select d.document_key,d.resource_id,d.resource_type,d.snapshot,d.snapshot_sequence::text,data.body
    from sync_documents d join resources r on r.id=d.resource_id and r.owner_id=d.owner_id
    join ${table} data on data.resource_id=r.id and data.owner_id=r.owner_id
    where d.resource_id=$1 and d.owner_id=$2 and d.resource_type=$3 and r.deleted_at is null`, [resourceId, ownerId, type]);
  return result.rows[0] ?? null;
}

async function materialize(client: PoolClient, row: TextDocumentRow): Promise<Y.Doc> {
  const document = new Y.Doc();
  Y.applyUpdate(document, new Uint8Array(row.snapshot));
  const updates = await client.query<{ payload: Buffer }>("select payload from sync_updates where document_key=$1 and sequence>$2 order by sequence", [row.document_key, row.snapshot_sequence]);
  for (const update of updates.rows) Y.applyUpdate(document, new Uint8Array(update.payload));
  return document;
}

function resolve(document: Y.Doc, encoded: string): number | null {
  try {
    const position = Y.decodeRelativePosition(Buffer.from(encoded, "base64url"));
    const absolute = Y.createAbsolutePositionFromRelativePosition(position, document);
    // Text documents expose only the body shared type from this document.
    return absolute?.type.doc === document ? absolute.index : null;
  } catch { return null; }
}
