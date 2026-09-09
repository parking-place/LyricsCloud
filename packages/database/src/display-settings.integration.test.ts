import { randomUUID } from "node:crypto";
import { DisplaySettingsConflictError, parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresDisplaySettingsStore } from "./display-settings.js";
import { PostgresLyricStore } from "./lyrics.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const settings = enabled ? new PostgresDisplaySettingsStore(databaseUrl, 3) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 2) : null;
const lyrics = enabled ? new PostgresLyricStore(databaseUrl, 2) : null;
const users: string[] = [];

describe.runIf(enabled)("display settings PostgreSQL contract", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires isolated lyricscloud_test");
    for (let index = 0; index < 2; index++) users.push((await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id);
  });

  it("starts with safe defaults and performs optimistic account updates", async () => {
    const [alice] = users as [string, string];
    expect(await settings!.getUserSettings(alice)).toMatchObject({ theme: "system", font: "sans", fontSize: 18, rowVersion: 0 });
    const saved = await settings!.updateUserSettings(alice, {
      rowVersion: 0, theme: "dark", font: "serif", fontSize: 20,
      lineHeight: 1.7, letterSpacing: 0.02, focusModeDefault: true
    });
    expect(saved).toMatchObject({ theme: "dark", font: "serif", fontSize: 20, rowVersion: 1 });
    await expect(settings!.updateUserSettings(alice, { ...saved, theme: "light", rowVersion: 0 })).rejects.toBeInstanceOf(DisplaySettingsConflictError);
  });

  it("isolates lyric overrides and deleting one restores current account defaults", async () => {
    const [alice, bob] = users as [string, string];
    const song = (await songs!.createSong(alice, parseCreateSongInput({ requestId: randomUUID(), title: "Display parent" }))).song;
    const lyric = (await lyrics!.createLyric(alice, parseCreateLyricInput({ requestId: randomUUID(), title: "Display lyric" }, song.id)))!.lyric;
    expect(await settings!.getLyricDisplaySettings(bob, lyric.id)).toBeNull();
    expect(await settings!.getLyricDisplaySettings(alice, lyric.id)).toMatchObject({ override: null, effective: { font: "serif", fontSize: 20 } });

    const withOverride = await settings!.updateLyricDisplaySettings(alice, lyric.id, {
      rowVersion: 0, font: "mono", fontSize: 16, lineHeight: 2, letterSpacing: -0.01
    });
    expect(withOverride).toMatchObject({ override: { rowVersion: 1 }, effective: { font: "mono", fontSize: 16 } });
    await expect(settings!.updateLyricDisplaySettings(alice, lyric.id, {
      rowVersion: 0, font: "sans", fontSize: 18, lineHeight: 1.8, letterSpacing: 0
    })).rejects.toBeInstanceOf(DisplaySettingsConflictError);
    expect(await settings!.updateLyricDisplaySettings(bob, lyric.id, {
      rowVersion: 0, font: "sans", fontSize: 18, lineHeight: 1.8, letterSpacing: 0
    })).toBeNull();

    const reset = await settings!.resetLyricDisplaySettings(alice, lyric.id, { rowVersion: withOverride!.override!.rowVersion });
    expect(reset).toMatchObject({ override: null, effective: { font: "serif", fontSize: 20 } });
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([settings?.close(), songs?.close(), lyrics?.close(), pool?.end()]);
});
