import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresExportStore } from "./export.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const store = enabled ? new PostgresExportStore(databaseUrl, 1) : null;
const owners: string[] = [];

async function fixture(pending: boolean) {
  const owner = randomUUID(), resource = randomUUID();
  owners.push(owner);
  const client = await pool!.connect();
  try {
    // Parent and subtype foreign keys are deferred until this same connection commits.
    await client.query("begin");
    await client.query("insert into app_users(id,status) values($1,'active')", [owner]);
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'rhyme_note','P6 synthetic')", [resource, owner]);
    await client.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,'before-projection')", [resource, owner]);
    await client.query(`insert into sync_documents(resource_id,owner_id,resource_type,snapshot,projection_error_code)
      values($1,$2,'rhyme_note',decode('0000','hex'),$3)`, [resource, owner, pending ? "SYNC_PROJECTION_FAILED" : null]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
  return { owner, resource };
}

describe.runIf(enabled)("P6 export safety with real PostgreSQL", () => {
  beforeAll(() => {
    if (!pool || new URL(databaseUrl).pathname !== "/lyricscloud_test") throw new Error("requires isolated lyricscloud_test");
  });

  it("rejects pending projections, releases the connection and allows export after repair", async () => {
    const f = await fixture(true);
    await expect(store!.openSnapshot(f.owner)).rejects.toThrow("EXPORT_PROJECTION_PENDING");
    await expect(store!.openSnapshot(f.owner)).rejects.toThrow("EXPORT_PROJECTION_PENDING");
    // Simulate the projector's atomic data/flag update, not a CRDT replay test.
    const client = await pool!.connect();
    try {
      await client.query("begin");
      await client.query("update rhyme_notes set body='after-projection' where resource_id=$1", [f.resource]);
      await client.query("update sync_documents set projection_error_code=null where resource_id=$1", [f.resource]);
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
    const snapshot = await store!.openSnapshot(f.owner);
    try {
      const rows = [];
      for await (const row of snapshot.readableResources()) rows.push(row);
      expect(rows.find(row => row.id === f.resource)?.body).toBe("after-projection");
    } finally { await snapshot.close(); }
  });

  it("another owner's pending projection does not block or enter this export", async () => {
    const blocked = await fixture(true), ready = await fixture(false);
    const snapshot = await store!.openSnapshot(ready.owner);
    try {
      const rows = [];
      for await (const row of snapshot.readableResources()) rows.push(row);
      expect(rows.map(row => row.id)).toEqual([ready.resource]);
      expect(rows.some(row => row.id === blocked.resource)).toBe(false);
    } finally { await snapshot.close(); }
  });

  it("preserves a real timestamptz deletion date in the readable export", async () => {
    const f = await fixture(false);
    const deletion = await pool!.query<{ deleted_at: Date }>(`update resources
      set deleted_at=statement_timestamp(),purge_at=statement_timestamp()+interval '30 days',deletion_batch_id=$2
      where id=$1 returning deleted_at`, [f.resource, randomUUID()]);
    const deletedAt = deletion.rows[0]!.deleted_at;
    expect(deletedAt).toBeInstanceOf(Date);
    const snapshot = await store!.openSnapshot(f.owner);
    try {
      const rows = [];
      for await (const row of snapshot.readableResources()) rows.push(row);
      expect(rows.find(row => row.id === f.resource)?.deletedAt).toBe(deletedAt.toISOString());
    } finally { await snapshot.close(); }
  });

  afterAll(async () => {
    if (pool && owners.length) await pool.query("delete from app_users where id=any($1::uuid[])", [owners]);
    await Promise.all([pool?.end(), store?.close()]);
  });
});
