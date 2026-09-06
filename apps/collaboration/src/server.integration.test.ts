import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { PostgresLyricStore, PostgresSongStore } from "@lyricscloud/database";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket, type RawData } from "ws";
import * as Y from "yjs";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 1) : null;
const lyrics = enabled ? new PostgresLyricStore(databaseUrl, 1) : null;
const users: string[] = [];
const port = 20_000 + Math.floor(Math.random() * 10_000);
let processHandle: ChildProcessWithoutNullStreams | undefined;
let output = "";

describe.runIf(enabled)("authenticated collaboration WebSocket", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("collaboration integration requires lyricscloud_test");
    processHandle = spawn("apps/collaboration/node_modules/.bin/tsx", ["apps/collaboration/src/server.ts"], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl, APP_VERSION: "0.5.0", BUILD_ID: "synthetic", COLLABORATION_PORT: String(port), APP_ORIGIN: "http://localhost:8080" }
    });
    processHandle.stdout.on("data", (chunk) => { output += chunk.toString(); });
    processHandle.stderr.on("data", (chunk) => { output += chunk.toString(); });
    await waitForReady();
  }, 10_000);

  it("bootstraps, broadcasts after durable ACK and rejects a revoked session without logging content", async () => {
    const ownerId = (await pool!.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
    users.push(ownerId);
    const song = (await songs!.createSong(ownerId, parseCreateSongInput({ title: "wire 곡", requestId: randomUUID() }))).song;
    const secretBody = `로그금지-${randomUUID()}`;
    const lyric = (await lyrics!.createLyric(ownerId, parseCreateLyricInput({ title: "wire", body: secretBody, requestId: randomUUID() }, song.id)))!.lyric;
    const token = `session-${randomUUID()}`;
    const hash = createHash("sha256").update(token).digest("base64url");
    await pool!.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
      values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`, [hash, ownerId]);
    const cookie = `lc_session=${encodeURIComponent(token)}`;
    const headers = { cookie, origin: "http://localhost:8080" };
    expect((await fetch(`http://127.0.0.1:${port}/documents/${lyric.id}`, { method: "POST", headers: { cookie, origin: "https://foreign.example" } })).status).toBe(403);
    const bootstrap = await fetch(`http://127.0.0.1:${port}/documents/${lyric.id}`, { method: "POST", headers });
    expect(bootstrap.status).toBe(200);
    const { documentKey } = await bootstrap.json() as { documentKey: string };
    expect(documentKey).not.toBe(lyric.id);

    const secondToken = `session-${randomUUID()}`;
    await pool!.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
      values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`, [createHash("sha256").update(secondToken).digest("base64url"), ownerId]);

    const first = new WebSocket(`ws://127.0.0.1:${port}/sync/${documentKey}`, { headers });
    const second = new WebSocket(`ws://127.0.0.1:${port}/sync/${documentKey}`, { headers: { ...headers, cookie: `lc_session=${secondToken}` } });
    const idle = new WebSocket(`ws://127.0.0.1:${port}/sync/${documentKey}`, { headers });
    const [firstSnapshot] = await Promise.all([nextJson(first, "snapshot"), nextJson(second, "snapshot"), nextJson(idle, "snapshot")]);
    const document = new Y.Doc(); Y.applyUpdate(document, Buffer.from(firstSnapshot.payload as string, "base64"));
    let update: Uint8Array<ArrayBufferLike> = new Uint8Array();
    document.once("update", (value) => { update = value; });
    document.getText("body").insert(document.getText("body").length, "\n전송됨 🎵");
    const updateId = randomUUID();
    const broadcast = nextJson(second, "update");
    first.send(JSON.stringify({ type: "update", updateId, payload: Buffer.from(update).toString("base64") }));
    expect(await nextJson(first, "ack")).toMatchObject({ updateId, duplicate: false });
    expect(await broadcast).toMatchObject({ updateId });
    expect((await lyrics!.getLyric(ownerId, lyric.id))!.body).toContain("전송됨 🎵");

    await pool!.query("update auth_sessions set revoked_at=now() where token_hash=$1", [hash]);
    first.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload: Buffer.from(update).toString("base64") }));
    const [code] = await once(first, "close") as [number, Buffer];
    expect(code).toBe(4404);
    const idleClosed = once(idle, "close");
    document.once("update", (value) => { update = value; });
    document.getText("body").insert(0, "유효한 다른 세션\n");
    const secondAck = nextJson(second, "ack");
    second.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload: Buffer.from(update).toString("base64") }));
    await secondAck;
    expect((await idleClosed)[0]).toBe(4404);
    const secondClosed = once(second, "close"); second.close(); await secondClosed; document.destroy();
    expect(output).not.toContain(secretBody);
    expect(output).not.toContain(Buffer.from(update).toString("base64"));
    expect(output).not.toContain(ownerId);
    expect(output).not.toContain(lyric.id);
  }, 15_000);
});

afterAll(async () => {
  processHandle?.kill("SIGTERM");
  if (processHandle && processHandle.exitCode === null) {
    await Promise.race([once(processHandle, "exit"), new Promise((resolve) => setTimeout(resolve, 1_000))]);
    if (processHandle.exitCode === null) processHandle.kill("SIGKILL");
  }
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([songs?.close(), lyrics?.close(), pool?.end()]);
});

async function waitForReady() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/health/ready`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`collaboration server did not become ready: ${output}`);
}

async function nextJson(socket: WebSocket, type: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const message = (raw: RawData) => {
      const value = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (value.type === type) { cleanup(); resolve(value); }
    };
    const error = (cause: Error) => { cleanup(); reject(cause); };
    const close = () => { cleanup(); reject(new Error(`socket closed before ${type}`)); };
    const cleanup = () => { socket.off("message", message); socket.off("error", error); socket.off("close", close); };
    socket.on("message", message); socket.once("error", error); socket.once("close", close);
  });
}
