import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl, max: 4 }) : null;
const users: string[] = [];

describe.runIf(enabled)("resource and song PostgreSQL contract", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) {
      throw new Error("resource integration requires lyricscloud_test");
    }
    const result = await pool.query<{ id: string }>("insert into app_users default values returning id");
    const second = await pool.query<{ id: string }>("insert into app_users default values returning id");
    users.push(result.rows[0]!.id, second.rows[0]!.id);
  });

  it("requires a deferred, type-matched 1:1 resource/song pair", async () => {
    const [alice] = users as [string, string];
    const orphanResource = randomUUID();
    await expectDatabaseError(rootTransaction(async (client) => {
      await client.query("insert into resources(id, owner_id, type, title) values ($1, $2, 'song', 'orphan')", [orphanResource, alice]);
    }), "23503", "resources_song_subtype_fk");

    await expectDatabaseError(rootTransaction(async (client) => {
      await client.query("insert into songs(resource_id, owner_id) values ($1, $2)", [randomUUID(), alice]);
    }), "23503", "songs_resource_owner_type_fk");

    const wrongType = randomUUID();
    await expectDatabaseError(rootTransaction(async (client) => {
      await client.query("insert into resources(id, owner_id, type, title) values ($1, $2, 'prompt', 'not a song')", [wrongType, alice]);
      await client.query("insert into prompts(resource_id, owner_id) values ($1, $2)", [wrongType, alice]);
      await client.query("insert into songs(resource_id, owner_id) values ($1, $2)", [wrongType, alice]);
    }), "23503", "songs_resource_owner_type_fk");

    const valid = await createSong(alice, { title: "  trimmed title  " });
    const stored = await pool!.query<{ title: string }>("select title from resources where id = $1", [valid]);
    expect(stored.rows[0]?.title).toBe("trimmed title");
  });

  it("rejects invalid status, title, lengths, color, and pin state", async () => {
    const [alice] = users as [string, string];
    await expectDatabaseError(createSong(alice, { status: "unknown" }), "23514", "songs_status_value");
    await expectDatabaseError(createSong(alice, { title: " \t\n " }), "23514", "resources_title_length");
    await expectDatabaseError(createSong(alice, { title: "가".repeat(201) }), "23514", "resources_title_length");
    await expectDatabaseError(createSong(alice, { description: "d".repeat(2_001) }), "23514", "songs_description_length");
    await expectDatabaseError(createSong(alice, { workNotes: "n".repeat(10_001) }), "23514", "songs_work_notes_length");
    await expectDatabaseError(createSong(alice, { color: "purple" }), "23514", "resources_color_value");
    await expectDatabaseError(createSong(alice, { isPinned: true, pinOrder: null }), "23514", "resources_pin_order");
  });

  it("uses database time and bumps updated_at only for business changes", async () => {
    const [alice] = users as [string, string];
    const resourceId = await createSong(alice, { title: "Time contract" });
    const initial = await readVersion(resourceId);

    await withUser(alice, (client) => client.query("update resources set title = title where id = $1", [resourceId]));
    expect(await readVersion(resourceId)).toEqual(initial);

    await withUser(alice, (client) => client.query(
      "update resources set updated_at = statement_timestamp() + interval '1 day' where id = $1", [resourceId]
    ));
    expect(await readVersion(resourceId)).toEqual(initial);

    await withUser(alice, (client) => client.query("update resources set title = 'Time contract updated' where id = $1", [resourceId]));
    const resourceChanged = await readVersion(resourceId);
    expect(resourceChanged.rowVersion).toBe(initial.rowVersion + 1);
    expect(resourceChanged.updatedAt.getTime()).toBeGreaterThan(initial.updatedAt.getTime());

    await withUser(alice, (client) => client.query("update songs set work_notes = '업무 메모 변경' where resource_id = $1", [resourceId]));
    const songChanged = await readVersion(resourceId);
    expect(songChanged.rowVersion).toBe(resourceChanged.rowVersion + 1);
    expect(songChanged.updatedAt.getTime()).toBeGreaterThan(resourceChanged.updatedAt.getTime());

    await expectDatabaseError(withUser(alice, (client) => client.query(
      "update resources set created_at = statement_timestamp() where id = $1",
      [resourceId]
    )), "42501");
  });

  it("enforces owner RLS, defaults to deny, and rejects blocked owners", async () => {
    const [alice, bob] = users as [string, string];
    const aliceSong = await createSong(alice, { title: "Alice private song" });
    const bobSong = await createSong(bob, { title: "Bob private song" });

    const bobView = await withUser(bob, (client) => client.query(
      "select r.id from resources r join songs s on s.resource_id = r.id where r.id = any($1::uuid[])",
      [[aliceSong, bobSong]]
    ));
    expect(bobView.rows).toEqual([{ id: bobSong }]);

    const crossResource = await withUser(bob, (client) => client.query(
      "update resources set title = 'forged' where id = $1 returning id",
      [aliceSong]
    ));
    const crossSong = await withUser(bob, (client) => client.query(
      "update songs set status = 'completed' where resource_id = $1 returning resource_id",
      [aliceSong]
    ));
    expect(crossResource.rowCount).toBe(0);
    expect(crossSong.rowCount).toBe(0);
    await expectDatabaseError(withUser(bob, (client) => client.query(
      "insert into resources(id, owner_id, type, title) values ($1, $2, 'prompt', 'forged owner')",
      [randomUUID(), alice]
    )), "42501");
    expect(await withUser(bob, async (client) => (await client.query<{ changed: boolean }>(
      "select soft_delete_song($1) as changed", [aliceSong]
    )).rows[0]?.changed)).toBe(false);

    await expectDatabaseError(withUser(bob, (client) => client.query("delete from resources where id = $1", [aliceSong])), "42501");

    const noContext = await rootTransaction(async (client) => {
      await client.query("set local role lyricscloud_app");
      return client.query("select id from resources");
    });
    expect(noContext.rowCount).toBe(0);

    await pool!.query("update app_users set status = 'blocked' where id = $1", [bob]);
    expect((await withUser(bob, (client) => client.query("select id from resources"))).rowCount).toBe(0);
    await expectDatabaseError(createSong(bob, { title: "Blocked create" }), "42501");
    await pool!.query("update app_users set status = 'active' where id = $1", [bob]);
  });

  it("soft-deletes the resource atomically while retaining both rows", async () => {
    const [alice] = users as [string, string];
    const resourceId = await createSong(alice, { title: "Trash candidate" });

    const changed = await withUser(alice, async (client) => (await client.query<{ changed: boolean }>(
      "select soft_delete_song($1) as changed", [resourceId]
    )).rows[0]?.changed);
    expect(changed).toBe(true);

    const active = await withUser(alice, (client) => client.query(
      "select id from resources where type = 'song' and deleted_at is null and id = $1", [resourceId]
    ));
    expect(active.rowCount).toBe(0);

    const retained = await pool!.query<{ deleted_at: Date; subtype_count: string }>(`
      select r.deleted_at, (select count(*) from songs s where s.resource_id = r.id) as subtype_count
      from resources r where r.id = $1
    `, [resourceId]);
    expect(retained.rows[0]?.deleted_at).toBeInstanceOf(Date);
    expect(retained.rows[0]?.subtype_count).toBe("1");
    await expectDatabaseError(withUser(alice, (client) => client.query(
      "delete from resources where id = $1", [resourceId]
    )), "42501");
    expect(await withUser(alice, async (client) => (await client.query<{ changed: boolean }>(
      "select soft_delete_song($1) as changed", [resourceId]
    )).rows[0]?.changed)).toBe(false);
  });

  it("matches the three active-song sorting queries to their indexes", async () => {
    const [alice] = users as [string, string];
    await createSong(alice, { title: "Index fixture", color: "green" });
    const client = await pool!.connect();
    try {
      await client.query("set enable_seqscan = off");
      await client.query("set enable_sort = off");
      const recent = await explain(client, `
        select id from resources
        where owner_id = $1 and type = 'song' and deleted_at is null
        order by updated_at desc, id desc limit 20
      `, [alice]);
      const title = await explain(client, `
        select id from resources
        where owner_id = $1 and type = 'song' and deleted_at is null
        order by title, id limit 20
      `, [alice]);
      const pinned = await explain(client, `
        select id from resources
        where owner_id = $1 and type = 'song' and deleted_at is null
        order by is_pinned desc, pin_order, updated_at desc, id desc limit 20
      `, [alice]);
      expect(recent).toContain("resources_owner_active_updated_idx");
      expect(title).toContain("resources_owner_active_title_idx");
      expect(pinned).toContain("resources_owner_active_pin_idx");
    } finally {
      client.release();
    }
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id = any($1::uuid[])", [users]);
  await pool?.end();
});

interface SongFixture {
  readonly title?: string;
  readonly status?: string;
  readonly description?: string;
  readonly workNotes?: string;
  readonly color?: string | null;
  readonly isPinned?: boolean;
  readonly pinOrder?: number | null;
}

async function createSong(ownerId: string, fixture: SongFixture): Promise<string> {
  const resourceId = randomUUID();
  await withUser(ownerId, async (client) => {
    await client.query(`
      insert into resources(id, owner_id, type, title, color, is_pinned, pin_order)
      values ($1, $2, 'song', $3, $4, $5, $6)
    `, [resourceId, ownerId, fixture.title ?? "Synthetic song", fixture.color ?? null, fixture.isPinned ?? false, fixture.pinOrder ?? null]);
    await client.query(`
      insert into songs(resource_id, owner_id, status, description, work_notes)
      values ($1, $2, $3, $4, $5)
    `, [resourceId, ownerId, fixture.status ?? "idea", fixture.description ?? "", fixture.workNotes ?? ""]);
  });
  return resourceId;
}

async function withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  return rootTransaction(async (client) => {
    await client.query("set local role lyricscloud_app");
    await client.query("select set_config('app.user_id', $1, true)", [ownerId]);
    return work(client);
  });
}

async function rootTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool!.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function expectDatabaseError(promise: Promise<unknown>, code: string, constraint?: string): Promise<void> {
  try {
    await promise;
    throw new Error(`expected PostgreSQL error ${code}`);
  } catch (error) {
    const databaseError = error as { code?: string; constraint?: string };
    expect(databaseError.code).toBe(code);
    if (constraint) expect(databaseError.constraint).toBe(constraint);
  }
}

async function readVersion(resourceId: string): Promise<{ updatedAt: Date; rowVersion: number }> {
  const result = await pool!.query<{ updated_at: Date; row_version: string }>(
    "select updated_at, row_version from resources where id = $1", [resourceId]
  );
  return { updatedAt: result.rows[0]!.updated_at, rowVersion: Number(result.rows[0]!.row_version) };
}

async function explain(client: PoolClient, sql: string, values: readonly unknown[]): Promise<string> {
  const result = await client.query<QueryResultRow>(`explain (costs off) ${sql}`, [...values]);
  return result.rows.map((row) => String(row["QUERY PLAN"])).join("\n");
}
