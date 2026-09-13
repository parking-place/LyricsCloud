import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { createGuestSessionToken, createPublicShareToken, guestSessionTokenDigest, publicShareTokenDigest } from "@lyricscloud/auth";
import { PostgresLyricStore, PostgresPublicLyricSharingStore, PostgresSongStore } from "@lyricscloud/database";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { WebSocket, type RawData } from "ws";
import * as Y from "yjs";

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
        cwd: globalThis.process.cwd(), env: { ...globalThis.process.env, DATABASE_URL: databaseUrl, APP_VERSION: "1.1.3",
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

  it("keeps public guest limits across restart and lets the owner stop writing without losing accepted text", async () => {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    if (!/\/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires lyricscloud_test");
    const pool = new Pool({ connectionString: databaseUrl });
    const songs = new PostgresSongStore(databaseUrl, 1);
    const lyrics = new PostgresLyricStore(databaseUrl, 1);
    const sharing = new PostgresPublicLyricSharingStore(databaseUrl, 3);
    const clients: WebSocket[] = [];
    const documents: Y.Doc[] = [];
    const port = await availablePort();
    const origin = "http://localhost:8080";
    let child: ChildProcessWithoutNullStreams | undefined;
    let ownerId = "";
    let output = "";
    try {
      ownerId = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,'공개 쓰기 복구 소유자')", [ownerId]);
      const ownerToken = `public-writer-recovery-${randomUUID()}`;
      await pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
        values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`,
      [createHash("sha256").update(ownerToken).digest("base64url"), ownerId]);
      const song = (await songs.createSong(ownerId, parseCreateSongInput({ requestId: randomUUID(), title: "guest restart" }))).song;
      const privateBody = `restart-safe guest body ${randomUUID()}`;
      const lyric = (await lyrics.createLyric(ownerId, parseCreateLyricInput({ requestId: randomUUID(), title: "guest recovery",
        body: privateBody, memo: "never public guest memo" }, song.id)))!.lyric;
      const other = (await lyrics.createLyric(ownerId, parseCreateLyricInput({ requestId: randomUUID(), title: "other guest scope",
        body: "other-resource-secret", memo: "other-resource-memo" }, song.id)))!.lyric;
      const token = createPublicShareToken();
      const issued = await sharing.issue(ownerId, lyric.id, { requestId: randomUUID(), tokenDigest: publicShareTokenDigest(token),
        expiresAt: new Date(Date.now() + 86_400_000), fields: { ownerDisplayName: false, status: false, updatedAt: false } });
      const otherToken = createPublicShareToken();
      const otherIssued = await sharing.issue(ownerId, other.id, { requestId: randomUUID(), tokenDigest: publicShareTokenDigest(otherToken),
        expiresAt: new Date(Date.now() + 86_400_000), fields: { ownerDisplayName: false, status: false, updatedAt: false } });
      const writable = (await sharing.setAccess(ownerId, lyric.id, issued!.link.id, { requestId: randomUUID(),
        access: "write", confirmation: "public-guest-write-v1" }))!.link;
      const guestToken = createGuestSessionToken();
      const guest = await sharing.issueGuestSession(publicShareTokenDigest(token), guestSessionTokenDigest(guestToken));
      expect(guest).not.toBeNull();

      child = start(); await ready();
      const ownerHeaders = { cookie: `lc_session=${ownerToken}`, origin };
      const bootstrap = await fetch(`http://127.0.0.1:${port}/documents/${lyric.id}`, { method: "POST", headers: ownerHeaders });
      const { documentKey } = await bootstrap.json() as { documentKey: string };

      const wrongScope = connectPublic(token, otherIssued!.link.id, guestToken); clients.push(wrongScope);
      expect((await once(wrongScope, "close"))[0]).toBe(4404);
      const spoof = connectPublic(token, issued!.link.id, guestToken); clients.push(spoof);
      await next(spoof, "snapshot");
      spoof.send(JSON.stringify({ type: "awareness", activity: "active", ownerId, displayName: "소유자 위조" }));
      const spoofClosed = await once(spoof, "close") as [number, Buffer];
      expect(spoofClosed[0]).toBe(4400);
      expect(spoofClosed[1].toString()).toBe("SYNC_AWARENESS_IDENTITY_FORBIDDEN");

      const guestSockets = Array.from({ length: 4 }, () => connectPublic(token, issued!.link.id, guestToken));
      clients.push(...guestSockets);
      const snapshots = await Promise.all(guestSockets.map((client) => next(client, "snapshot")));
      expect(snapshots.every((snapshot) => snapshot.access === "public-write"
        && snapshot.guestSessionId === guest!.id && snapshot.displayName === guest!.displayName)).toBe(true);
      const overflow = connectPublic(token, issued!.link.id, guestToken); clients.push(overflow);
      expect((await once(overflow, "close"))[0]).toBe(4429);
      for (const extra of guestSockets.slice(1)) {
        const closed = once(extra, "close"); extra.close(); await closed;
      }
      let writer = guestSockets[0]!;
      const document = materialize(snapshots[0]!.payload); documents.push(document);
      const vector = Y.encodeStateVector(document);
      document.getText("body").insert(document.getText("body").length, "\n예산 안 저장");
      const payload = Buffer.from(Y.encodeStateAsUpdate(document, vector)).toString("base64");

      const second = Number((await pool.query<{ value: string }>("select extract(second from statement_timestamp())::text value")).rows[0]!.value);
      if (second > 55) await new Promise((resolve) => setTimeout(resolve, 6_000));
      const bucket = (await pool.query<{ value: Date }>("select date_trunc('minute',statement_timestamp()) value")).rows[0]!.value;
      await pool.query(`insert into lyric_public_write_windows
        (scope,scope_id,link_id,guest_session_id,window_start,update_count,byte_count)
        values('guest',$1,$2,$1,$3,239,239),('link',$2,$2,null,$3,1199,1199)`, [guest!.id, issued!.link.id, bucket]);
      const burst = collect(writer, new Set(["ack", "rejected"]), 32);
      for (let index = 0; index < 32; index++) writer.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload,
        permissionEpoch: writable.permissionEpoch, writeEpoch: writable.writeEpoch }));
      const outcomes = await burst;
      expect(outcomes.filter((item) => item.type === "ack")).toHaveLength(1);
      expect(outcomes.filter((item) => item.type === "rejected")).toHaveLength(31);
      expect(outcomes.filter((item) => item.type === "rejected")).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "SYNC_RATE_LIMITED", access: "public-write" })
      ]));
      const acceptedBody = (await lyrics.getLyric(ownerId, lyric.id))!.body;
      expect(acceptedBody).toContain("예산 안 저장");
      expect(acceptedBody.match(/예산 안 저장/g)).toHaveLength(1);
      const persistedWindow = (await pool.query<{ update_count: number }>(`select update_count from lyric_public_write_windows
        where scope='guest' and guest_session_id=$1 and window_start=$2`, [guest!.id, bucket])).rows[0]!;
      expect(persistedWindow.update_count).toBe(271);

      const restartedClose = once(writer, "close");
      const stopped = once(child, "exit"); child.kill("SIGTERM"); await stopped;
      expect((await restartedClose as [number])[0]).toBe(1012);
      child = start(); await ready();
      writer = connectPublic(token, issued!.link.id, guestToken); clients.push(writer);
      const restoredSnapshot = await next(writer, "snapshot");
      const restored = materialize(restoredSnapshot.payload); documents.push(restored);
      expect(restored.getText("body").toString()).toBe(acceptedBody);
      const stillLimited = next(writer, "rejected");
      writer.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload,
        permissionEpoch: writable.permissionEpoch, writeEpoch: writable.writeEpoch }));
      expect(await stillLimited).toMatchObject({ code: "SYNC_RATE_LIMITED", access: "public-write" });

      const permission = next(writer, "permission"); const rejected = next(writer, "rejected");
      const disabled = (await sharing.setAccess(ownerId, lyric.id, issued!.link.id,
        { requestId: randomUUID(), access: "read" }))!.link;
      writer.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload,
        permissionEpoch: writable.permissionEpoch, writeEpoch: writable.writeEpoch }));
      expect(await permission).toMatchObject({ access: "public-read", permissionEpoch: disabled.permissionEpoch });
      expect(await rejected).toMatchObject({ code: "SYNC_WRITE_REVOKED", access: "public-read" });
      expect((await lyrics.getLyric(ownerId, lyric.id))!.body).toBe(acceptedBody);
      const readOnly = connectPublic(token, issued!.link.id, guestToken); clients.push(readOnly);
      expect(await next(readOnly, "snapshot")).toMatchObject({ access: "public-read", permissionEpoch: disabled.permissionEpoch });
      expect(output).not.toContain(token);
      expect(output).not.toContain(guestToken);
      expect(output).not.toContain(privateBody);
      expect(output).not.toContain("other-resource-secret");
    } finally {
      for (const document of documents) document.destroy();
      for (const client of clients) client.terminate();
      if (child && child.exitCode === null && child.signalCode === null) {
        const stopped = once(child, "exit"); child.kill("SIGKILL"); await stopped;
      }
      if (ownerId) await pool.query("delete from app_users where id=$1", [ownerId]);
      await Promise.all([pool.end(), songs.close(), lyrics.close(), sharing.close()]);
    }

    function start() {
      const process = spawn("apps/collaboration/node_modules/.bin/tsx", ["apps/collaboration/src/server.ts"], {
        cwd: globalThis.process.cwd(), env: { ...globalThis.process.env, DATABASE_URL: databaseUrl, APP_VERSION: "1.1.3",
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
    function connectPublic(value: string, linkId: string, guestSession?: string) {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/public`, { headers: { origin } });
      socket.once("open", () => socket.send(JSON.stringify({ type: "auth", token: value, linkId,
        ...(guestSession ? { guestSession } : {}) })));
      return socket;
    }
  }, 60_000);
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

function collect(client: WebSocket, types: ReadonlySet<string>, count: number): Promise<readonly Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const values: Record<string, unknown>[] = [];
    const message = (raw: RawData) => {
      const value = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (typeof value.type === "string" && types.has(value.type)) values.push(value);
      if (values.length === count) { cleanup(); resolve(values); }
    };
    const closed = () => { cleanup(); reject(new Error(`socket closed before ${count} matching messages`)); };
    const cleanup = () => { client.off("message", message); client.off("close", closed); client.off("error", closed); };
    client.on("message", message); client.once("close", closed); client.once("error", closed);
  });
}

function materialize(payload: unknown): Y.Doc {
  if (typeof payload !== "string") throw new Error("snapshot payload missing");
  const document = new Y.Doc(); Y.applyUpdate(document, Buffer.from(payload, "base64")); return document;
}

function timeout(milliseconds: number, message: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), milliseconds));
}
