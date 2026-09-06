import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { WebSocket } from "ws";
import * as Y from "yjs";

const url = process.env.DATABASE_URL ?? "";
if (new URL(url).pathname !== "/lyricscloud_test") throw new Error("requires isolated image-smoke database");
const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 1_000 });
let disconnected = false;
pool.on("error", () => { disconnected = true; });
const owner = randomUUID(), other = randomUUID(), song = randomUUID(), lyric = randomUUID();
const tokens = [randomUUID(), randomUUID(), randomUUID()];
const headers = { Origin: "http://localhost:8080", Cookie: `lc_session=${tokens[0]}`, "Content-Type": "application/json" };
const trigger = `p5_projection_${randomUUID().replaceAll("-", "")}`;
const document = new Y.Doc();
let socket;
try {
  await pool.query("begin");
  await pool.query("insert into app_users(id) values($1),($2)", [owner, other]);
  await pool.query("insert into user_profiles(owner_id,display_name) values($1,'synthetic'),($2,'synthetic')", [owner, other]);
  for (const [index, token] of tokens.entries()) await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hash(token), index === 2 ? other : owner]);
  await pool.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','synthetic'),($3,$2,'lyrics','synthetic')", [song, owner, lyric]);
  await pool.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
  await pool.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,$2,$3,'original')", [lyric, owner, song]);
  await pool.query("commit");
  // Warm every long-lived application pool before stopping the database.
  for (const path of ["/api/auth/session", "/api/profile", `/api/songs/${song}`, `/api/lyrics/${lyric}`]) assert.equal((await request(path)).status, 200);
  const { documentKey } = await (await request(`/collaboration/documents/${lyric}`, {})).json();
  const base = `/collaboration/documents/${documentKey}/revisions`;
  const { revision } = await (await request(base, { reason: "leave" })).json();
  socket = connect(documentKey);
  Y.applyUpdate(document, Buffer.from((await next(socket, "snapshot")).payload, "base64"));
  // Fail only this synthetic document's plaintext projection. The ACK must
  // still mean the CRDT update is durable, with its projection explicitly pending.
  await pool.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin raise exception 'synthetic projection failure'; end $$`);
  await pool.query(`create trigger ${trigger} before update of body on lyrics for each row when (old.resource_id='${lyric}'::uuid) execute function ${trigger}()`);
  const vector = Y.encodeStateVector(document);
  document.getText("body").insert(8, " recovered");
  const envelope = { type: "update", updateId: randomUUID(), payload: Buffer.from(Y.encodeStateAsUpdate(document, vector)).toString("base64") };
  const ack = next(socket, "ack"); socket.send(JSON.stringify(envelope));
  assert.equal((await ack).projection, "pending");
  assert.equal((await pool.query("select body from lyrics where resource_id=$1", [lyric])).rows[0].body, "original");
  await writeFile("/tmp/p5-recovery-ready", "ready");
  // The shell owns the disposable containers and signals after the actual DB
  // and collaboration restarts. This fixture never accesses a Docker socket.
  await eventually(async () => { await access("/tmp/p5-recovery-restarted"); return disconnected; }, 45_000);
  await eventually(async () => (await request("/collaboration/health/ready")).ok);
  socket.terminate(); socket = connect(documentKey);
  const recovered = await next(socket, "snapshot");
  assert.equal(recovered.projection, "pending");
  const server = new Y.Doc();
  try { Y.applyUpdate(server, Buffer.from(recovered.payload, "base64")); assert.equal(server.getText("body").toString(), "original recovered"); }
  finally { server.destroy(); }
  const duplicate = next(socket, "ack"); socket.send(JSON.stringify(envelope));
  assert.equal((await duplicate).duplicate, true);
  assert.equal((await pool.query("select count(*)::int count from sync_update_receipts where document_key=$1", [documentKey])).rows[0].count, 1);
  await pool.query(`drop trigger ${trigger} on lyrics`);
  await pool.query(`drop function ${trigger}()`);
  await eventually(async () => {
    const value = await (await request(`/api/lyrics/${lyric}`)).json();
    return value.lyric?.body === "original recovered";
  });
  const history = await (await request(base)).json();
  const restore = await request(`${base}/${revision.id}/restore`, { requestId: randomUUID(), expectedHash: history.current.hash });
  assert.equal(restore.status, 200);
  assert.equal((await pool.query("select body from lyrics where resource_id=$1", [lyric])).rows[0].body, "original");
  // Exercise all-session logout at the real web boundary; unrelated owners stay signed in.
  assert.equal((await request("/api/auth/logout", {})).status, 200);
  for (const token of tokens.slice(0, 2)) assert.equal((await request("/api/auth/session", undefined, token)).status, 401);
  assert.equal((await request("/api/auth/session", undefined, tokens[2])).status, 200);
  console.log("Production recovery: DB restart, service restart, durable pending projection, duplicate ACK, projector retry, revision restore and owner-only logout OK.");
} finally {
  socket?.terminate(); document.destroy();
  await pool.query("rollback").catch(() => undefined);
  await pool.query(`drop trigger if exists ${trigger} on lyrics`).catch(() => undefined);
  await pool.query(`drop function if exists ${trigger}()`).catch(() => undefined);
  await pool.query("delete from app_users where id=any($1::uuid[])", [[owner, other]]).catch(() => undefined);
  await pool.end();
}
function hash(token) { return createHash("sha256").update(token).digest("base64url"); }
function request(path, body, token) {
  return fetch(`http://web:3000${path}`, { method: body ? "POST" : "GET", headers: { ...headers, ...(token ? { Cookie: `lc_session=${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5_000) });
}
function connect(key) { const client = new WebSocket(`ws://collaboration:3001/sync/${key}`, { headers }); client.on("error", () => {}); return client; }
function next(client, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error(`missing ${type}`)); }, 8_000);
    function receive(raw) { const frame = JSON.parse(raw.toString()); if (frame.type === type) { cleanup(); resolve(frame); } }
    function close() { cleanup(); reject(new Error(`connection closed before ${type}`)); }
    function cleanup() { clearTimeout(timer); client.off("message", receive); client.off("close", close); }
    client.on("message", receive); client.once("close", close);
  });
}
async function eventually(check, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("production recovery did not reach its expected state");
}
