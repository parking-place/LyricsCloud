import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { PostgresLyricStore, PostgresSongStore } from "@lyricscloud/database";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { WebSocket, type RawData } from "ws";
import * as Y from "yjs";

describe.runIf(process.env.AUTH_DATABASE_INTEGRATION === "true")("collaboration process crash recovery", () => {
  it.each(["before-update", "uncommitted", "before-ack"])("recovers the same queued update after a crash at %s", async (point) => {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    if (!/\/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires lyricscloud_test");
    const pool = new Pool({ connectionString: databaseUrl });
    const songs = new PostgresSongStore(databaseUrl, 1);
    const lyrics = new PostgresLyricStore(databaseUrl, 1);
    const userId = randomUUID();
    const token = `crash-fixture-${randomUUID()}`;
    const port = 31_000 + Math.floor(Math.random() * 10_000);
    const origin = "http://localhost:8080";
    let child: ChildProcessWithoutNullStreams | undefined;
    let startupFailure = "";
    const clients: WebSocket[] = [];
    const documents: Y.Doc[] = [];
    try {
      await pool.query("insert into app_users(id) values($1)", [userId]);
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')",
        [createHash("sha256").update(token).digest("base64url"), userId]);
      const song = (await songs.createSong(userId, parseCreateSongInput({ requestId: randomUUID(), title: "crash fixture" }))).song;
      const lyric = (await lyrics.createLyric(userId, parseCreateLyricInput({ requestId: randomUUID(), title: "fixture", body: "기준" }, song.id)))!.lyric;
      const headers = { origin, cookie: `lc_session=${token}` };
      child = start("tests/fixtures/collaboration-crash.mjs", point);
      await ready();
      const response = await fetch(`http://127.0.0.1:${port}/documents/${lyric.id}`, { method: "POST", headers });
      expect(response.status).toBe(200);
      const { documentKey } = await response.json() as { documentKey: string };
      const first = connect(documentKey, headers);
      const snapshot = await next(first, "snapshot");
      const local = new Y.Doc(); documents.push(local);
      Y.applyUpdate(local, Buffer.from(snapshot.payload, "base64"));
      let update: Uint8Array = new Uint8Array();
      local.once("update", (value) => { update = value; });
      local.getText("body").insert(2, "\n복구 한글 🎵");
      const envelope = { type: "update", updateId: randomUUID(), payload: Buffer.from(update).toString("base64") };
      const exited = once(child, "exit");
      first.send(JSON.stringify(envelope));
      await exited;
      const committed = point === "before-ack";
      expect((await lyrics.getLyric(userId, lyric.id))!.body).toBe(committed ? "기준\n복구 한글 🎵" : "기준");

      child = start("apps/collaboration/src/server.ts");
      await ready();
      const second = connect(documentKey, headers);
      const recovered = await next(second, "snapshot");
      const server = new Y.Doc(); documents.push(server);
      Y.applyUpdate(server, Buffer.from(recovered.payload, "base64"));
      expect(server.getText("body").toString()).toBe(committed ? local.getText("body").toString() : "기준");
      const ack = next(second, "ack");
      second.send(JSON.stringify(envelope));
      expect(await ack).toMatchObject({ updateId: envelope.updateId, duplicate: committed, projection: "current" });
      expect((await lyrics.getLyric(userId, lyric.id))!.body).toBe(local.getText("body").toString());
      expect((await pool.query("select count(*)::int count from sync_update_receipts where document_key=$1", [documentKey])).rows[0].count).toBe(1);
    } finally {
      for (const client of clients) client.terminate();
      if (child && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGKILL");
        await exited;
      }
      for (const document of documents) document.destroy();
      await pool.query("delete from app_users where id=$1", [userId]);
      await Promise.all([pool.end(), songs.close(), lyrics.close()]);
    }
    function start(file: string, crashPoint = "") {
      startupFailure = "";
      const process = spawn(globalThis.process.execPath, ["--import", pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href, file], { env: {
        ...globalThis.process.env, NODE_ENV: "test", DATABASE_URL: databaseUrl, COLLABORATION_PORT: String(port), APP_ORIGIN: origin, SYNC_CRASH_POINT: crashPoint
      } });
      // Do not accumulate application output or document payloads as evidence.
      process.stdout.resume();
      process.stderr.on("data", (data: Buffer) => {
        const code = data.toString().match(/\b(?:EADDRINUSE|EACCES|ECONNREFUSED|ERR_MODULE_NOT_FOUND|TypeError|SyntaxError)\b/);
        if (code) startupFailure = code[0];
      });
      process.once("error", (error: Error) => { startupFailure = error.name; });
      return process;
    }
    async function ready() {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (child && (child.exitCode !== null || child.signalCode !== null)) {
          throw new Error(`test server exited before readiness: ${startupFailure || child.signalCode || child.exitCode}`);
        }
        try { if ((await fetch(`http://127.0.0.1:${port}/health/ready`)).ok) return; } catch {}
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`test server did not become ready: ${startupFailure || "process still running"}`);
    }
    function connect(key: string, headers: Record<string, string>) {
      const client = new WebSocket(`ws://127.0.0.1:${port}/sync/${key}`, { headers });
      clients.push(client); return client;
    }
  }, 15_000);
});

function next(client: WebSocket, type: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const onMessage = (raw: RawData) => {
      const value = JSON.parse(raw.toString());
      if (value.type === type) { cleanup(); resolve(value); }
    };
    const closed = () => { cleanup(); reject(new Error("socket closed before expected message")); };
    const cleanup = () => { client.off("message", onMessage); client.off("close", closed); client.off("error", closed); };
    client.on("message", onMessage); client.once("close", closed); client.once("error", closed);
  });
}
