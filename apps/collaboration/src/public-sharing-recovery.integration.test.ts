import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { createPublicShareToken, publicShareTokenDigest } from "@lyricscloud/auth";
import { PostgresLyricStore, PostgresPublicLyricSharingStore, PostgresSongStore } from "@lyricscloud/database";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { WebSocket, type RawData } from "ws";

describe.runIf(process.env.AUTH_DATABASE_INTEGRATION === "true")("public reader collaboration recovery", () => {
  it("survives restart without presence, rejects protocol writes and expires the open capability", async () => {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    if (!/\/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires lyricscloud_test");
    const pool = new Pool({ connectionString: databaseUrl });
    const songs = new PostgresSongStore(databaseUrl, 1);
    const lyrics = new PostgresLyricStore(databaseUrl, 1);
    const sharing = new PostgresPublicLyricSharingStore(databaseUrl, 2);
    const clients: WebSocket[] = [];
    const port = await availablePort();
    const origin = "http://localhost:8080";
    let child: ChildProcessWithoutNullStreams | undefined;
    let ownerId = "";
    let output = "";
    try {
      ownerId = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,'공개 복구 소유자')", [ownerId]);
      const ownerToken = `public-recovery-${randomUUID()}`;
      await pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
        values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`, [createHash("sha256").update(ownerToken).digest("base64url"), ownerId]);
      const song = (await songs.createSong(ownerId, parseCreateSongInput({ requestId: randomUUID(), title: "public restart" }))).song;
      const lyric = (await lyrics.createLyric(ownerId, parseCreateLyricInput({ requestId: randomUUID(), title: "public recovery",
        body: "restart-safe public body", memo: "never public" }, song.id)))!.lyric;
      const token = createPublicShareToken();
      const issued = await sharing.issue(ownerId, lyric.id, { requestId: randomUUID(), tokenDigest: publicShareTokenDigest(token),
        expiresAt: new Date(Date.now() + 86_400_000), fields: { ownerDisplayName: false, status: false, updatedAt: false } });
      expect(issued).not.toBeNull();

      child = start(); await ready();
      const ownerHeaders = { cookie: `lc_session=${ownerToken}`, origin };
      const bootstrap = await fetch(`http://127.0.0.1:${port}/documents/${lyric.id}`, { method: "POST", headers: ownerHeaders });
      const { documentKey } = await bootstrap.json() as { documentKey: string };
      const publicReader = connectPublic(token, issued!.link.id); clients.push(publicReader);
      expect(await next(publicReader, "snapshot")).toMatchObject({ access: "public-read", permissionEpoch: issued!.link.permissionEpoch });

      const publicMessages: string[] = [];
      publicReader.on("message", (raw) => publicMessages.push(raw.toString()));
      const owner = new WebSocket(`ws://127.0.0.1:${port}/sync/${documentKey}`, { headers: ownerHeaders }); clients.push(owner);
      const [, presence] = await Promise.all([next(owner, "snapshot"), next(owner, "presence")]);
      expect(presence.participants).toEqual([expect.objectContaining({ role: "owner" })]);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(publicMessages.some((value) => JSON.parse(value).type === "presence")).toBe(false);

      const restartedClose = once(publicReader, "close");
      const stopped = once(child, "exit"); child.kill("SIGTERM"); await stopped;
      expect((await restartedClose as [number])[0]).toBe(1012);
      child = start(); await ready();

      const afterRestart = connectPublic(token, issued!.link.id); clients.push(afterRestart);
      expect(await next(afterRestart, "snapshot")).toMatchObject({ access: "public-read", permissionEpoch: issued!.link.permissionEpoch });
      afterRestart.send(JSON.stringify({ type: "revision", revisionId: randomUUID() }));
      expect((await once(afterRestart, "close"))[0]).toBe(4403);

      const expiring = connectPublic(token, issued!.link.id); clients.push(expiring);
      await next(expiring, "snapshot");
      const expired = once(expiring, "close");
      await pool.query("update lyric_public_read_links set expires_at=now()-interval '1 second' where id=$1", [issued!.link.id]);
      expect((await Promise.race([expired, timeout(3_000, "public expiry timeout")]) as [number])[0]).toBe(4404);
      expect(output).not.toContain(token);
    } finally {
      for (const client of clients) client.terminate();
      if (child && child.exitCode === null && child.signalCode === null) {
        const stopped = once(child, "exit"); child.kill("SIGKILL"); await stopped;
      }
      if (ownerId) await pool.query("delete from app_users where id=$1", [ownerId]);
      await Promise.all([pool.end(), songs.close(), lyrics.close(), sharing.close()]);
    }

    function start() {
      const process = spawn("apps/collaboration/node_modules/.bin/tsx", ["apps/collaboration/src/server.ts"], {
        cwd: globalThis.process.cwd(), env: { ...globalThis.process.env, DATABASE_URL: databaseUrl, APP_VERSION: "1.1.1",
          BUILD_ID: "synthetic", APP_CHANNEL: "dev", APP_PHASE: "p4", COLLABORATION_PORT: String(port), APP_ORIGIN: origin }
      });
      process.stdout.on("data", (data: Buffer) => { output += data.toString(); });
      process.stderr.on("data", (data: Buffer) => { output += data.toString(); });
      return process;
    }
    async function ready() {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (child && (child.exitCode !== null || child.signalCode !== null)) throw new Error("collaboration server exited");
        try { if ((await fetch(`http://127.0.0.1:${port}/health/ready`)).ok) return; } catch {}
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error("collaboration server not ready");
    }
    function connectPublic(value: string, linkId: string) {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/public`, { headers: { origin } });
      socket.once("open", () => socket.send(JSON.stringify({ type: "auth", token: value, linkId })));
      return socket;
    }
  }, 20_000);
});

async function availablePort() {
  const reservation = createServer(); reservation.unref(); reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address(); if (!address || typeof address === "string") throw new Error("failed to reserve port");
  await new Promise<void>((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

function next(client: WebSocket, type: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const message = (raw: RawData) => { const value = JSON.parse(raw.toString()) as Record<string, unknown>; if (value.type === type) { cleanup(); resolve(value); } };
    const closed = () => { cleanup(); reject(new Error(`socket closed before ${type}`)); };
    const cleanup = () => { client.off("message", message); client.off("close", closed); client.off("error", closed); };
    client.on("message", message); client.once("close", closed); client.once("error", closed);
  });
}

function timeout(milliseconds: number, message: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), milliseconds));
}
