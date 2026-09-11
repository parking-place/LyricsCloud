import { randomUUID } from "node:crypto";
import { parseCreateSongInput, parseSunoWorkspaceCommand } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresLifecycleStore } from "./lifecycle.js";
import { PostgresSongStore } from "./songs.js";
import {
  PostgresSunoWorkspaceStore,
  SunoWorkspaceNotFoundError,
  SunoWorkspaceRequestReuseError
} from "./suno-workspaces.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl, max: 2 }) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 4) : null;
const lifecycle = enabled ? new PostgresLifecycleStore(databaseUrl, 4) : null;
let workspaces = enabled ? new PostgresSunoWorkspaceStore(databaseUrl, 4) : null;
const users: string[] = [];

describe.runIf(enabled)("Suno manual workspace store", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("Suno integration requires lyricscloud_test");
  });

  it("persists custom model and independent links across a new store connection", async () => {
    const owner = await createUser();
    const song = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "Suno 작업" }))).song;
    expect(await workspaces!.getWorkspace(owner, song.id)).toEqual({ modelLabel: null, links: [], rowVersion: 0 });

    let version = (await workspaces!.applyCommand(owner, song.id, command(0, { command: "set_model", modelLabel: "  사용자 v6  " }))).workspace.rowVersion;
    const ids: string[] = [];
    for (const [index, url] of [
      "https://suno.com/song/11111111-1111-4111-8111-111111111111",
      "https://www.suno.com/s/abcdef?sh=one",
      "https://suno.com/song/22222222-2222-4222-8222-222222222222?ref=manual"
    ].entries()) {
      const result = await workspaces!.applyCommand(owner, song.id, command(version, {
        command: "create_link", url, title: `작업 ${index + 1}`, note: `메모 ${index + 1}`
      }));
      version = result.workspace.rowVersion;
      ids.push(result.workspace.links[index]!.id);
    }
    await workspaces!.close();
    workspaces = new PostgresSunoWorkspaceStore(databaseUrl, 4);
    const loaded = await workspaces.getWorkspace(owner, song.id);
    expect(loaded).toMatchObject({ modelLabel: "사용자 v6", rowVersion: 4 });
    expect(loaded!.links.map(({ title, position }) => ({ title, position }))).toEqual([
      { title: "작업 1", position: 0 }, { title: "작업 2", position: 1 }, { title: "작업 3", position: 2 }
    ]);

    const reorderRequest = command(version, { command: "reorder_links", linkIds: [ids[2]!, ids[0]!, ids[1]!] });
    const reordered = await workspaces.applyCommand(owner, song.id, reorderRequest);
    const replay = await workspaces.applyCommand(owner, song.id, reorderRequest);
    expect(replay).toEqual({ workspace: reordered.workspace, replayed: true });
    const reusedRequest = parseSunoWorkspaceCommand({
      requestId: reorderRequest.requestId, expectedVersion: reorderRequest.expectedVersion,
      command: "reorder_links", linkIds: ids
    });
    await expect(workspaces.applyCommand(owner, song.id, reusedRequest))
      .rejects.toBeInstanceOf(SunoWorkspaceRequestReuseError);
  });

  it("hides foreign and deleted parents, then restores the same aggregate", async () => {
    const owner = await createUser(); const other = await createUser();
    const song = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "복원 곡" }))).song;
    const created = await workspaces!.applyCommand(owner, song.id, command(0, {
      command: "create_link", url: "https://suno.com/s/restore1", title: "복원 링크", note: ""
    }));
    expect(await workspaces!.getWorkspace(other, song.id)).toBeNull();
    await expect(workspaces!.applyCommand(other, song.id, command(0, { command: "set_model", modelLabel: "x" })))
      .rejects.toBeInstanceOf(SunoWorkspaceNotFoundError);
    await songs!.deleteSong(owner, song.id);
    expect(await workspaces!.getWorkspace(owner, song.id)).toBeNull();
    await lifecycle!.restore(owner, [{ kind: "resource", id: song.id }]);
    expect(await workspaces!.getWorkspace(owner, song.id)).toEqual(created.workspace);
  });

  it("rejects stale aggregate versions without partial writes", async () => {
    const owner = await createUser();
    const song = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "CAS 곡" }))).song;
    await workspaces!.applyCommand(owner, song.id, command(0, { command: "set_model", modelLabel: "v5.5" }));
    await expect(workspaces!.applyCommand(owner, song.id, command(0, {
      command: "create_link", url: "https://suno.com/s/stale11", title: "stale", note: ""
    }))).rejects.toMatchObject({ currentVersion: 1 });
    expect(await workspaces!.getWorkspace(owner, song.id)).toMatchObject({ rowVersion: 1, links: [] });
  });

  afterAll(async () => {
    if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
    await workspaces?.close(); await songs?.close(); await lifecycle?.close(); await pool?.end();
  });
});

async function createUser(): Promise<string> {
  const id = (await pool!.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
  users.push(id); return id;
}

function command(expectedVersion: number, value: Record<string, unknown>) {
  return parseSunoWorkspaceCommand({ requestId: randomUUID(), expectedVersion, ...value });
}
