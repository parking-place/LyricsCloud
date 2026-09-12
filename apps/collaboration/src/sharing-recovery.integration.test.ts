import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { PostgresLyricSharingStore, PostgresLyricStore, PostgresSongStore } from "@lyricscloud/database";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { WebSocket, type RawData } from "ws";
import * as Y from "yjs";

describe.runIf(process.env.AUTH_DATABASE_INTEGRATION === "true")("selected reader collaboration recovery", () => {
  it("preserves read access across restart, rejects writes and expires an open reader", async () => {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    if (!/\/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires lyricscloud_test");
    const pool = new Pool({ connectionString: databaseUrl });
    const songs = new PostgresSongStore(databaseUrl, 1);
    const lyrics = new PostgresLyricStore(databaseUrl, 1);
    const sharing = new PostgresLyricSharingStore(databaseUrl, 2);
    const users: string[] = [];
    const clients: WebSocket[] = [];
    const port = await availablePort();
    const origin = "http://localhost:8080";
    let child: ChildProcessWithoutNullStreams | undefined;
    let startupFailure = "";
    try {
      const [ownerId, readerId, strangerId] = await Promise.all(["재시작 소유자", "재시작 독자", "재시작 무관 사용자"].map(async (name) => {
        const id = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
        users.push(id);
        await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, name]);
        return id;
      })) as [string, string, string];
      const ownerToken = await session(pool, ownerId);
      const readerToken = await session(pool, readerId);
      const strangerToken = await session(pool, strangerId);
      const song = (await songs.createSong(ownerId, parseCreateSongInput({ requestId: randomUUID(), title: "reader restart" }))).song;
      const lyric = (await lyrics.createLyric(ownerId, parseCreateLyricInput({ requestId: randomUUID(), title: "restart", body: "restart-safe body" }, song.id)))!.lyric;
      const readerSharingId = (await sharing.getOwnIdentity(readerId))!.sharingId;
      const grant = (await sharing.grantRead(ownerId, lyric.id, readerSharingId, randomUUID()))!.grant;
      const ownerHeaders = { cookie: `lc_session=${ownerToken}`, origin };
      const readerHeaders = { cookie: `lc_session=${readerToken}`, origin };

      child = start(); await ready();
      const bootstrap = await fetch(`http://127.0.0.1:${port}/documents/${lyric.id}`, { method: "POST", headers: ownerHeaders });
      expect(bootstrap.status).toBe(200);
      const { documentKey } = await bootstrap.json() as { documentKey: string };
      const writableProbe = connect(documentKey, readerHeaders); clients.push(writableProbe);
      await next(writableProbe, "snapshot");
      writableProbe.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload: Buffer.from([0]).toString("base64") }));
      expect(await next(writableProbe, "rejected")).toMatchObject({ code: "SYNC_WRITE_REVOKED", access: "read" });
      expect(writableProbe.readyState).toBe(WebSocket.OPEN);
      expect((await lyrics.getLyric(ownerId, lyric.id))!.body).toBe("restart-safe body");

      const beforeRestart = connect(documentKey, readerHeaders); clients.push(beforeRestart);
      expect(await next(beforeRestart, "snapshot")).toMatchObject({ access: "read", permissionEpoch: grant.permissionEpoch });
      const stopped = once(child, "exit"); child.kill("SIGTERM"); await stopped;
      child = start(); await ready();

      const discover = await fetch(`http://127.0.0.1:${port}/shared-documents/${lyric.id}`, { headers: readerHeaders });
      expect(discover.status).toBe(200);
      await expect(discover.json()).resolves.toMatchObject({ documentKey, permissionEpoch: grant.permissionEpoch });
      const afterRestart = connect(documentKey, readerHeaders); clients.push(afterRestart);
      expect(await next(afterRestart, "snapshot")).toMatchObject({ access: "read", permissionEpoch: grant.permissionEpoch });
      expect((await fetch(`http://127.0.0.1:${port}/shared-documents/${lyric.id}`, {
        headers: { cookie: `lc_session=${strangerToken}`, origin }
      })).status).toBe(404);

      const expired = once(afterRestart, "close");
      await pool.query("update lyric_read_grants set expires_at=now()-interval '1 second' where id=$1", [grant.id]);
      expect((await Promise.race([expired, timeout(3_000, "expiry timeout")]) as [number])[0]).toBe(4404);
      expect((await fetch(`http://127.0.0.1:${port}/shared-documents/${lyric.id}`, { headers: readerHeaders })).status).toBe(404);
      expect((await fetch(`http://127.0.0.1:${port}/documents/${lyric.id}`, { method: "POST", headers: ownerHeaders })).status).toBe(200);
    } finally {
      for (const client of clients) client.terminate();
      if (child && child.exitCode === null && child.signalCode === null) {
        const stopped = once(child, "exit"); child.kill("SIGKILL"); await stopped;
      }
      if (users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
      await Promise.all([pool.end(), songs.close(), lyrics.close(), sharing.close()]);
    }

    function start() {
      startupFailure = "";
      const process = spawn("apps/collaboration/node_modules/.bin/tsx", ["apps/collaboration/src/server.ts"], {
        cwd: globalThis.process.cwd(), env: { ...globalThis.process.env, DATABASE_URL: databaseUrl, APP_VERSION: "1.1.2",
          BUILD_ID: "synthetic", APP_CHANNEL: "dev", APP_PHASE: "p4", COLLABORATION_PORT: String(port), APP_ORIGIN: origin }
      });
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
        if (child && (child.exitCode !== null || child.signalCode !== null)) throw new Error(`server exited: ${startupFailure || child.exitCode}`);
        try { if ((await fetch(`http://127.0.0.1:${port}/health/ready`)).ok) return; } catch {}
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`server not ready: ${startupFailure || "running"}`);
    }
    function connect(key: string, headers: Record<string, string>) {
      return new WebSocket(`ws://127.0.0.1:${port}/sync/${key}`, { headers });
    }
  }, 15_000);

  it("converges owner and selected-writer updates across restart while isolating read and write revocation", async () => {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    if (!/\/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires lyricscloud_test");
    const pool = new Pool({ connectionString: databaseUrl });
    const songs = new PostgresSongStore(databaseUrl, 1);
    const lyrics = new PostgresLyricStore(databaseUrl, 1);
    const sharing = new PostgresLyricSharingStore(databaseUrl, 3);
    const users: string[] = [];
    const clients: WebSocket[] = [];
    const documents: Y.Doc[] = [];
    const port = await availablePort();
    const origin = "http://localhost:8080";
    let child: ChildProcessWithoutNullStreams | undefined;
    let startupFailure = "";
    try {
      const [ownerId, writerId, readerId] = await Promise.all(["경쟁 소유자", "경쟁 작성자", "경쟁 독자"].map(async (name) => {
        const id = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
        users.push(id);
        await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, name]);
        return id;
      })) as [string, string, string];
      const ownerToken = await session(pool, ownerId);
      const writerToken = await session(pool, writerId);
      const readerToken = await session(pool, readerId);
      const song = (await songs.createSong(ownerId, parseCreateSongInput({ requestId: randomUUID(), title: "writer restart" }))).song;
      const lyric = (await lyrics.createLyric(ownerId, parseCreateLyricInput({
        requestId: randomUUID(), title: "writer restart", body: "동시 원문"
      }, song.id)))!.lyric;
      const writerSharingId = (await sharing.getOwnIdentity(writerId))!.sharingId;
      const readerSharingId = (await sharing.getOwnIdentity(readerId))!.sharingId;
      const writerGrant = (await sharing.grantRead(ownerId, lyric.id, writerSharingId, randomUUID()))!.grant;
      const readerGrant = (await sharing.grantRead(ownerId, lyric.id, readerSharingId, randomUUID()))!.grant;
      const writable = (await sharing.setGrantAccess(ownerId, lyric.id, writerGrant.id, "write", randomUUID()))!.grant;
      await expect(sharing.setGrantAccess(ownerId, lyric.id, randomUUID(), "write", randomUUID())).resolves.toBeNull();
      await expect(sharing.listGrants(ownerId, lyric.id)).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ id: writerGrant.id, access: "write" }),
        expect.objectContaining({ id: readerGrant.id, access: "read" })
      ]));

      const ownerHeaders = { cookie: `lc_session=${ownerToken}`, origin };
      const writerHeaders = { cookie: `lc_session=${writerToken}`, origin };
      const readerHeaders = { cookie: `lc_session=${readerToken}`, origin };
      child = start(); await ready();
      const bootstrap = await fetch(`http://127.0.0.1:${port}/documents/${lyric.id}`, { method: "POST", headers: ownerHeaders });
      expect(bootstrap.status).toBe(200);
      const { documentKey } = await bootstrap.json() as { documentKey: string };
      const owner = connect(documentKey, ownerHeaders); clients.push(owner);
      const writer = connect(documentKey, writerHeaders); clients.push(writer);
      const reader = connect(documentKey, readerHeaders); clients.push(reader);
      const [ownerSnapshot, writerSnapshot, readerSnapshot] = await Promise.all([
        next(owner, "snapshot"), next(writer, "snapshot"), next(reader, "snapshot")
      ]);
      expect(writerSnapshot).toMatchObject({ access: "write", permissionEpoch: writerGrant.permissionEpoch,
        writeEpoch: writable.writeEpoch });
      expect(readerSnapshot).toMatchObject({ access: "read", permissionEpoch: readerGrant.permissionEpoch });

      const ownerDoc = materialize(ownerSnapshot.payload); documents.push(ownerDoc);
      const writerDoc = materialize(writerSnapshot.payload); documents.push(writerDoc);
      const ownerVector = Y.encodeStateVector(ownerDoc);
      const writerVector = Y.encodeStateVector(writerDoc);
      ownerDoc.getText("body").insert(ownerDoc.getText("body").length, "\n소유자 동시 한글");
      writerDoc.getText("body").insert(writerDoc.getText("body").length, "\n작성자 동시 한글");
      const ownerPayload = Buffer.from(Y.encodeStateAsUpdate(ownerDoc, ownerVector)).toString("base64");
      const writerPayload = Buffer.from(Y.encodeStateAsUpdate(writerDoc, writerVector)).toString("base64");
      const ownerUpdateId = randomUUID();
      const writerUpdateId = randomUUID();
      const readerUpdates = nextMany(reader, "update", 2);
      const ownerAck = next(owner, "ack");
      const writerAck = next(writer, "ack");
      owner.send(JSON.stringify({ type: "update", updateId: ownerUpdateId, payload: ownerPayload }));
      writer.send(JSON.stringify({ type: "update", updateId: writerUpdateId, payload: writerPayload,
        grantId: writerGrant.id, permissionEpoch: writerGrant.permissionEpoch, writeEpoch: writable.writeEpoch }));
      expect(await ownerAck).toMatchObject({ updateId: ownerUpdateId, duplicate: false });
      expect(await writerAck).toMatchObject({ updateId: writerUpdateId, duplicate: false,
        permissionEpoch: writerGrant.permissionEpoch, writeEpoch: writable.writeEpoch });
      expect(await readerUpdates).toHaveLength(2);
      expect((await lyrics.getLyric(ownerId, lyric.id))!.body).toContain("소유자 동시 한글");
      expect((await lyrics.getLyric(ownerId, lyric.id))!.body).toContain("작성자 동시 한글");

      const stopped = once(child, "exit"); child.kill("SIGTERM"); await stopped;
      child = start(); await ready();
      const ownerAfter = connect(documentKey, ownerHeaders); clients.push(ownerAfter);
      const writerAfter = connect(documentKey, writerHeaders); clients.push(writerAfter);
      const readerAfter = connect(documentKey, readerHeaders); clients.push(readerAfter);
      const [ownerAfterSnapshot, writerAfterSnapshot, readerAfterSnapshot] = await Promise.all([
        next(ownerAfter, "snapshot"), next(writerAfter, "snapshot"), next(readerAfter, "snapshot")
      ]);
      for (const snapshot of [ownerAfterSnapshot, writerAfterSnapshot, readerAfterSnapshot]) {
        const restored = materialize(snapshot.payload); documents.push(restored);
        expect(restored.getText("body").toString()).toContain("소유자 동시 한글");
        expect(restored.getText("body").toString()).toContain("작성자 동시 한글");
      }
      expect(writerAfterSnapshot).toMatchObject({ access: "write", writeEpoch: writable.writeEpoch });
      expect(readerAfterSnapshot).toMatchObject({ access: "read" });

      const readPermission = next(writerAfter, "permission");
      const downgraded = (await sharing.setGrantAccess(ownerId, lyric.id, writerGrant.id, "read", randomUUID()))!.grant;
      expect(await readPermission).toMatchObject({ access: "read", writeEpoch: downgraded.writeEpoch });
      writerAfter.send(JSON.stringify({ type: "update", updateId: writerUpdateId, payload: writerPayload,
        grantId: writerGrant.id, permissionEpoch: writerGrant.permissionEpoch, writeEpoch: writable.writeEpoch }));
      expect(await next(writerAfter, "ack")).toMatchObject({ updateId: writerUpdateId, duplicate: true,
        writeEpoch: writable.writeEpoch });
      writerAfter.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload: writerPayload,
        grantId: writerGrant.id, permissionEpoch: writerGrant.permissionEpoch, writeEpoch: writable.writeEpoch }));
      expect(await next(writerAfter, "rejected")).toMatchObject({ code: "SYNC_WRITE_REVOKED", access: "read",
        writeEpoch: downgraded.writeEpoch });

      const readerClosed = once(readerAfter, "close");
      expect(await sharing.revokeRead(ownerId, lyric.id, readerGrant.id)).toBe(true);
      expect((await Promise.race([readerClosed, timeout(3_000, "reader revoke timeout")]) as [number])[0]).toBe(4404);
      expect((await fetch(`http://127.0.0.1:${port}/shared-documents/${lyric.id}`, { headers: readerHeaders })).status).toBe(404);
      expect((await fetch(`http://127.0.0.1:${port}/shared-documents/${lyric.id}`, { headers: writerHeaders })).status).toBe(200);
      expect(writerAfter.readyState).toBe(WebSocket.OPEN);

      const latestOwner = materialize(ownerAfterSnapshot.payload); documents.push(latestOwner);
      const latestVector = Y.encodeStateVector(latestOwner);
      latestOwner.getText("body").insert(latestOwner.getText("body").length, "\n강등 뒤 읽기 유지");
      const ownerAfterPayload = Buffer.from(Y.encodeStateAsUpdate(latestOwner, latestVector)).toString("base64");
      const writerReceives = next(writerAfter, "update");
      ownerAfter.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload: ownerAfterPayload }));
      expect(await writerReceives).toMatchObject({ payload: ownerAfterPayload });
    } finally {
      for (const document of documents) document.destroy();
      for (const client of clients) client.terminate();
      if (child && child.exitCode === null && child.signalCode === null) {
        const stopped = once(child, "exit"); child.kill("SIGKILL"); await stopped;
      }
      if (users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
      await Promise.all([pool.end(), songs.close(), lyrics.close(), sharing.close()]);
    }

    function start() {
      startupFailure = "";
      const process = spawn("apps/collaboration/node_modules/.bin/tsx", ["apps/collaboration/src/server.ts"], {
        cwd: globalThis.process.cwd(), env: { ...globalThis.process.env, DATABASE_URL: databaseUrl, APP_VERSION: "1.1.2",
          BUILD_ID: "synthetic", APP_CHANNEL: "dev", APP_PHASE: "p4", COLLABORATION_PORT: String(port), APP_ORIGIN: origin }
      });
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
        if (child && (child.exitCode !== null || child.signalCode !== null)) throw new Error(`server exited: ${startupFailure || child.exitCode}`);
        try { if ((await fetch(`http://127.0.0.1:${port}/health/ready`)).ok) return; } catch {}
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`server not ready: ${startupFailure || "running"}`);
    }
    function connect(key: string, headers: Record<string, string>) {
      return new WebSocket(`ws://127.0.0.1:${port}/sync/${key}`, { headers });
    }
  }, 30_000);
});

async function session(pool: Pool, userId: string) {
  const token = `sharing-recovery-${randomUUID()}`;
  await pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
    values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`, [createHash("sha256").update(token).digest("base64url"), userId]);
  return token;
}

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

function nextMany(client: WebSocket, type: string, count: number): Promise<readonly Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const values: Record<string, unknown>[] = [];
    const message = (raw: RawData) => {
      const value = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (value.type === type) values.push(value);
      if (values.length === count) { cleanup(); resolve(values); }
    };
    const closed = () => { cleanup(); reject(new Error(`socket closed before ${count} ${type} messages`)); };
    const cleanup = () => { client.off("message", message); client.off("close", closed); client.off("error", closed); };
    client.on("message", message); client.once("close", closed); client.once("error", closed);
  });
}

function materialize(payload: unknown): Y.Doc {
  if (typeof payload !== "string") throw new Error("snapshot payload missing");
  const document = new Y.Doc();
  Y.applyUpdate(document, Buffer.from(payload, "base64"));
  return document;
}

function timeout(milliseconds: number, message: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), milliseconds));
}
