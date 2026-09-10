import { LibraryViewSettingsConflictError } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresDisplaySettingsStore } from "./display-settings.js";
import { PostgresLibraryViewSettingsStore } from "./library-view-settings.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const views = enabled ? new PostgresLibraryViewSettingsStore(databaseUrl, 5) : null;
const display = enabled ? new PostgresDisplaySettingsStore(databaseUrl, 3) : null;
const users: string[] = [];

describe.runIf(enabled)("library view settings PostgreSQL contract", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires isolated lyricscloud_test");
    for (let index = 0; index < 2; index++) users.push((await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id);
  });

  it("returns non-writing defaults and isolates owner and resource type", async () => {
    const [alice, bob] = users as [string, string];
    expect(await views!.get(alice, "songs")).toEqual({ resourceType: "songs", viewMode: "list", rowVersion: 0, updatedAt: null });
    expect((await pool!.query("select count(*)::int count from library_view_settings where owner_id=$1", [alice])).rows[0].count).toBe(0);
    expect(await views!.update(alice, "songs", { viewMode: "grid-large", rowVersion: 0 })).toMatchObject({ viewMode: "grid-large", rowVersion: 1 });
    expect(await views!.update(alice, "rhymes", { viewMode: "grid-small", rowVersion: 0 })).toMatchObject({ viewMode: "grid-small", rowVersion: 1 });
    expect(await views!.get(bob, "songs")).toMatchObject({ viewMode: "list", rowVersion: 0 });
  });

  it("rejects a stale same-type write and preserves concurrent font settings", async () => {
    const [alice] = users as [string, string];
    const current = await views!.get(alice, "songs");
    const [font, view] = await Promise.all([
      display!.updateUserSettings(alice, {
        rowVersion: 0, theme: "dark", font: "serif", fontSize: 20,
        lineHeight: 1.7, letterSpacing: 0.02, focusModeDefault: true
      }),
      views!.update(alice, "songs", { viewMode: "grid-medium", rowVersion: current.rowVersion })
    ]);
    expect(font).toMatchObject({ font: "serif", rowVersion: 1 });
    expect(view).toMatchObject({ viewMode: "grid-medium", rowVersion: current.rowVersion + 1 });
    await expect(views!.update(alice, "songs", { viewMode: "list", rowVersion: current.rowVersion }))
      .rejects.toBeInstanceOf(LibraryViewSettingsConflictError);
    expect(await display!.getUserSettings(alice)).toMatchObject({ font: "serif", rowVersion: 1 });
  });

  it("allows exactly one concurrent first writer", async () => {
    const [, bob] = users as [string, string];
    const results = await Promise.allSettled([
      views!.update(bob, "prompts", { viewMode: "grid-small", rowVersion: 0 }),
      views!.update(bob, "prompts", { viewMode: "grid-large", rowVersion: 0 })
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason)
      .toBeInstanceOf(LibraryViewSettingsConflictError);
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([views?.close(), display?.close(), pool?.end()]);
});
