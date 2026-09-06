import { createHash } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import { readRuntimeConfig } from "@lyricscloud/config";
import { checkDatabase, DatabaseHealthError, PostgresAuthStore } from "@lyricscloud/database";
import { isResourceId, parseCheckpointReason, parseRestoreRevisionInput, parseSyncUpdateEnvelope, SYNC_LIMITS } from "@lyricscloud/domain";
import { WebSocket, WebSocketServer } from "ws";
import * as Y from "yjs";
import { CollaborationStore } from "./store.js";

const config = readRuntimeConfig(process.env);
const port = Number(process.env.COLLABORATION_PORT ?? "3001");
const appOrigin = new URL(process.env.APP_ORIGIN ?? "http://localhost:8080").origin;
const auth = new PostgresAuthStore(config.databaseUrl);
const documents = new CollaborationStore(config.databaseUrl);
const sockets = new Map<string, Set<WebSocket>>();
const contexts = new WeakMap<WebSocket, ConnectionContext>();
const projectionRetry = setInterval(async () => {
  const result = await documents.retryPendingProjections().catch(() => ({ attempted: 0, recovered: 0 }));
  if (result.attempted) console.log(JSON.stringify({ event: "sync_projection_retry", ...result }));
  if (result.recovered) {
    for (const peers of sockets.values()) for (const peer of peers) {
      const context = contexts.get(peer);
      if (!context || !await authorized(peer)) continue;
      const loaded = await documents.loadDocument(context.ownerId, context.documentKey).catch(() => null);
      if (loaded && peer.readyState === WebSocket.OPEN) peer.send(JSON.stringify({ type: "projection", projection: loaded.projectionPending ? "pending" : "current" }));
    }
  }
}, 5_000);
projectionRetry.unref();
const reauthenticate = setInterval(() => {
  for (const peers of sockets.values()) for (const peer of peers) void authorized(peer, true);
}, 5 * 60_000);
reauthenticate.unref();
let maintainingRevisions = false;
const revisionMaintenance = setInterval(async () => {
  if (maintainingRevisions) return;
  maintainingRevisions = true;
  try {
    const result = await documents.maintainRevisions();
    if (result.checked || result.prunedDocuments || result.failed) console.log(JSON.stringify({ event: "revision_maintenance", ...result }));
  } catch { console.log(JSON.stringify({ event: "revision_maintenance_failed" })); }
  finally { maintainingRevisions = false; }
}, 30_000);
revisionMaintenance.unref();
const server = createServer(async (request, response) => {
  try {
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  if (request.url === "/health/live") return response.end(JSON.stringify({ status: "ok", service: "collaboration", check: "liveness", build: { version: config.appVersion, id: config.buildId } }));
  if (request.url === "/health/ready") {
    try {
      const database = await checkDatabase(config.databaseUrl);
      return response.end(JSON.stringify({ status: "ok", service: "collaboration", check: "readiness", build: { version: config.appVersion, id: config.buildId }, database }));
    } catch (error) {
      response.statusCode = 503;
      const reason = error instanceof DatabaseHealthError ? error.code : "CONFIG_INVALID";
      return response.end(JSON.stringify({ status: "unavailable", service: "collaboration", check: "readiness", reason }));
    }
  }
  if (request.url === "/metrics" && request.method === "GET") {
    const metrics = await documents.operationalMetrics();
    return response.end(JSON.stringify({ connections: [...sockets.values()].reduce((sum, peers) => sum + peers.size, 0), ...metrics }));
  }
  const documentRequest = request.method === "POST" && request.url?.match(/^\/documents\/([0-9a-f-]{36})$/i);
  if (documentRequest) {
    if (request.headers.origin !== appOrigin) return unavailable(response, 403);
    const session = await authenticate(request);
    if (!session) return unavailable(response, 401);
    const document = await documents.ensureDocument(session.userId, documentRequest[1]!);
    if (!document) return unavailable(response, 404);
    return response.end(JSON.stringify({ documentKey: document.document_key }));
  }
  const revisionRequest = request.url?.match(/^\/documents\/([0-9a-f-]{36})\/revisions(?:\/([0-9a-f-]{36})(\/restore)?)?$/i);
  if (revisionRequest) {
    const [, key, revisionId, restore] = revisionRequest;
    if (!isResourceId(key) || (revisionId && !isResourceId(revisionId))) return unavailable(response, 404);
    if (request.method !== "GET" && request.method !== "POST") return unavailable(response, 405);
    if (request.method === "POST" && request.headers.origin !== appOrigin) return unavailable(response, 403);
    const session = await authenticate(request);
    if (!session) return unavailable(response, 401);
    if (request.method === "GET" && !restore) {
      const result = revisionId ? await documents.getRevision(session.userId, key, revisionId) : await documents.listRevisions(session.userId, key);
      if (!result) return unavailable(response, 404);
      return response.end(JSON.stringify(result));
    }
    if (request.method === "POST" && !revisionId) {
      const input = await readJson(request);
      const revision = await documents.checkpoint(session.userId, key, parseCheckpointReason(input.reason));
      if (!revision) return unavailable(response, 404);
      return response.end(JSON.stringify({ revision }));
    }
    if (request.method === "POST" && restore && revisionId) {
      const result = await documents.restoreRevision(session.userId, key, revisionId, parseRestoreRevisionInput(await readJson(request)));
      if (!result) return unavailable(response, 404);
      const payload = Buffer.from(result.snapshot).toString("base64");
      for (const peer of sockets.get(key) ?? []) if (await authorized(peer, true)) {
        peer.send(JSON.stringify({ type: "update", payload }));
        peer.send(JSON.stringify({ type: "projection", projection: "current" }));
      }
      return response.end(JSON.stringify({ duplicate: result.duplicate, payload }));
    }
  }
  response.statusCode = 404;
  return response.end(JSON.stringify({ error: "NOT_FOUND" }));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("REVISION_")) {
      response.statusCode = error.message === "REVISION_INPUT_INVALID" ? 400 : 409;
      return response.end(JSON.stringify({ error: error.message }));
    }
    return unavailable(response, 503);
  }
});

const websocket = new WebSocketServer({ noServer: true, maxPayload: Math.ceil(SYNC_LIMITS.updateBytes / 3) * 4 + 1024 });
server.on("upgrade", async (request, socket, head) => {
  try {
    const match = request.headers.origin === appOrigin && request.url?.match(/^\/sync\/([0-9a-f-]{36})$/i);
    const session = match ? await authenticate(request) : null;
    const loaded = match && session ? await documents.loadDocument(session.userId, match[1]!) : null;
    if (!match || !session || !loaded) {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    websocket.handleUpgrade(request, socket, head, (client) => {
      contexts.set(client, { documentKey: match[1]!, ownerId: session.userId, request });
      websocket.emit("connection", client, request);
    });
  } catch {
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    socket.destroy();
  }
});

websocket.on("connection", (client, request) => {
  const context = contexts.get(client);
  if (!context) return closeUnavailable(client);
  const peers = sockets.get(context.documentKey) ?? new Set<WebSocket>();
  peers.add(client);
  sockets.set(context.documentKey, peers);
  // Join broadcasts first, then take a consistent snapshot so an update during
  // the HTTP upgrade cannot fall between the snapshot and the subscription.
  void documents.loadDocument(context.ownerId, context.documentKey).then((loaded) => {
    if (!loaded) return closeUnavailable(client);
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: "snapshot",
      payload: Buffer.from(merge(loaded.snapshot, loaded.updates)).toString("base64"), projection: loaded.projectionPending ? "pending" : "current" }));
  }).catch(() => client.close(1013, "SYNC_TEMPORARILY_UNAVAILABLE"));
  log("sync_connected", context.documentKey, { connections: peers.size });

  client.on("message", async (raw, binary) => {
    if (binary) return closeProtocol(client, "SYNC_UPDATE_INVALID");
    try {
      const session = await authenticate(request);
      if (!session || session.userId !== context.ownerId) return closeUnavailable(client);
      const input = JSON.parse(raw.toString()) as { type?: unknown; updateId?: unknown; payload?: unknown };
      if (input.type !== "update" || typeof input.payload !== "string") throw new Error("SYNC_UPDATE_INVALID");
      const payload = Buffer.from(input.payload, "base64");
      const envelope = parseSyncUpdateEnvelope({ updateId: input.updateId, payload: new Uint8Array(payload) });
      const result = await documents.applyUpdate(session.userId, context.documentKey, envelope.updateId, envelope.payload);
      if (!result) return closeUnavailable(client);
      client.send(JSON.stringify({ type: "ack", updateId: envelope.updateId, duplicate: result.duplicate,
        projection: result.projectionPending ? "pending" : "current" }));
      if (!result.duplicate) for (const peer of peers) if (peer !== client && await authorized(peer) && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ type: "update", updateId: envelope.updateId, payload: input.payload }));
      }
      log("sync_update_committed", context.documentKey, { bytes: envelope.payload.byteLength, duplicate: result.duplicate });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) return client.close(1013, "SYNC_TEMPORARILY_UNAVAILABLE");
      const code = error instanceof Error && /^SYNC_/.test(error.message) ? error.message : "SYNC_UPDATE_INVALID";
      log("sync_update_rejected", context.documentKey, { code });
      closeProtocol(client, code);
    }
  });
  client.on("close", () => {
    peers.delete(client);
    if (peers.size === 0) sockets.delete(context.documentKey);
    log("sync_disconnected", context.documentKey, { connections: peers.size });
  });
});

server.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "service_started", service: "collaboration", port })));

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => {
  clearInterval(projectionRetry);
  clearInterval(reauthenticate);
  clearInterval(revisionMaintenance);
  for (const peers of sockets.values()) for (const peer of peers) peer.close(1012, "SYNC_RESTARTING");
  server.close(async () => { await Promise.all([auth.close(), documents.close()]); process.exit(0); });
});

interface ConnectionContext { documentKey: string; ownerId: string; request: IncomingMessage }

async function authorized(client: WebSocket, checkDocument = false): Promise<boolean> {
  const context = contexts.get(client);
  try {
    const session = context ? await authenticate(context.request) : null;
    if (!context || !session || session.userId !== context.ownerId
      || (checkDocument && !await documents.loadDocument(context.ownerId, context.documentKey))) {
      closeUnavailable(client);
      return false;
    }
    return client.readyState === WebSocket.OPEN;
  } catch { client.close(1013, "SYNC_TEMPORARILY_UNAVAILABLE"); return false; }
}

async function authenticate(request: IncomingMessage) {
  const token = readCookie(request.headers.cookie, "__Host-lc_session") ?? readCookie(request.headers.cookie, "lc_session");
  if (!token) return null;
  return auth.readSession(createHash("sha256").update(token).digest("base64url"), new Date());
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8_192) throw new Error("REVISION_INPUT_INVALID");
    chunks.push(Buffer.from(chunk));
  }
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
    return input;
  } catch { throw new Error("REVISION_INPUT_INVALID"); }
}

function readCookie(header: string | undefined, name: string) {
  for (const value of header?.split(";") ?? []) {
    const separator = value.indexOf("=");
    if (separator > 0 && value.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(value.slice(separator + 1)); } catch { return null; }
    }
  }
  return null;
}

function unavailable(response: import("node:http").ServerResponse, status: number) {
  response.statusCode = status;
  return response.end(JSON.stringify({ error: "SYNC_DOCUMENT_UNAVAILABLE" }));
}

function closeUnavailable(client: WebSocket) { client.close(4404, "SYNC_DOCUMENT_UNAVAILABLE"); }
function closeProtocol(client: WebSocket, code: string) { client.close(4400, code.slice(0, 120)); }

function merge(snapshot: Uint8Array, updates: readonly Uint8Array[]) {
  return updates.length ? Y.mergeUpdates([snapshot, ...updates]) : snapshot;
}

function log(event: string, documentKey: string, fields: Record<string, unknown>) {
  const document = createHash("sha256").update(documentKey).digest("hex").slice(0, 16);
  console.log(JSON.stringify({ event, document, ...fields }));
}
