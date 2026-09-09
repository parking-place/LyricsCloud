import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { WebSocket } from "ws";
import * as Y from "yjs";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (new URL(databaseUrl).pathname !== "/lyricscloud_test") throw new Error("requires isolated image-smoke database");
const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const owner = randomUUID(), song = randomUUID(), lyric = randomUUID(), token = randomUUID();
const headers = { Origin: "http://localhost:8080", Cookie: `lc_session=${token}`, "Content-Type": "application/json" };
let socket;
const document = new Y.Doc();
try {
  await pool.query("begin");
  await pool.query("insert into app_users(id,status) values($1,'active')", [owner]);
  await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [createHash("sha256").update(token).digest("base64url"), owner]);
  await pool.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','synthetic'),($3,$2,'lyrics','synthetic')", [song, owner, lyric]);
  await pool.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
  await pool.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,$2,$3,'original')", [lyric, owner, song]);
  await pool.query("commit");
  const { documentKey } = await request(`/documents/${lyric}`, {});
  const base = `/documents/${documentKey}/revisions`;
  const { revision } = await request(base, { reason: "large_paste" });
  socket = new WebSocket(`ws://127.0.0.1:3001/sync/${documentKey}`, { headers });
  Y.applyUpdate(document, Buffer.from((await next("snapshot")).payload, "base64"));
  const vector = Y.encodeStateVector(document);
  document.getText("body").insert(document.getText("body").length, " changed");
  const ack = next("ack");
  socket.send(JSON.stringify({ type: "update", updateId: randomUUID(), payload: Buffer.from(Y.encodeStateAsUpdate(document, vector)).toString("base64") }));
  await ack;
  const current = (await request(base)).current;
  assert.equal(current.body, "original changed");
  const broadcast = next("update");
  const input = { requestId: randomUUID(), expectedHash: current.hash };
  assert.equal((await request(`${base}/${revision.id}/restore`, input)).duplicate, false);
  Y.applyUpdate(document, Buffer.from((await broadcast).payload, "base64"));
  assert.equal(document.getText("body").toString(), "original");
  const history = await request(base);
  assert.equal(history.items[0].reason, "before_restore");
  assert.equal((await request(`${base}/${history.items[0].id}`)).body, "original changed");
  assert.equal((await request(`${base}/${revision.id}/restore`, input)).duplicate, true);
  assert.equal((await pool.query("select body from lyrics where resource_id=$1", [lyric])).rows[0].body, "original");
  console.log("Production revision flow: checkpoint, durable update, restore, preimage, replay and WebSocket convergence OK.");
} finally {
  socket?.close(); document.destroy();
  await pool.query("rollback").catch(() => undefined);
  await pool.query("delete from app_users where id=$1", [owner]);
  await pool.end();
}
async function request(path, body) {
  const response = await fetch(`http://web:3000/collaboration${path}`, { method: body ? "POST" : "GET", headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5_000) });
  assert.equal(response.status, 200, "production revision request must succeed");
  return response.json();
}
function next(type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("message", receive); reject(new Error(`missing ${type}`)); }, 5_000);
    function receive(raw) {
      const frame = JSON.parse(raw.toString());
      if (frame.type !== type) return;
      clearTimeout(timer); socket.off("message", receive); resolve(frame);
    }
    socket.on("message", receive);
  });
}
