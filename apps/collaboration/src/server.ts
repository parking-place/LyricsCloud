import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import { parsePublicShareToken, publicShareTokenDigest } from "@lyricscloud/auth";
import { readRuntimeConfig } from "@lyricscloud/config";
import { checkDatabase, DatabaseHealthError, PostgresAuthStore } from "@lyricscloud/database";
import { isResourceId, parseCheckpointReason, parseRestoreRevisionInput, parseSyncUpdateEnvelope, SYNC_LIMITS } from "@lyricscloud/domain";
import { createRequestId, observabilityFromEnvironment } from "@lyricscloud/observability";
import { WebSocket, WebSocketServer } from "ws";
import * as Y from "yjs";
import { CollaborationStore } from "./store.js";

const config = readRuntimeConfig(process.env);
const port = Number(process.env.COLLABORATION_PORT ?? "3001");
const appOrigin = new URL(process.env.APP_ORIGIN ?? "http://localhost:8080").origin;
const auth = new PostgresAuthStore(config.databaseUrl);
const documents = new CollaborationStore(config.databaseUrl);
const telemetry = observabilityFromEnvironment("collaboration");
const sockets = new Map<string, Set<WebSocket>>();
const contexts = new WeakMap<WebSocket, ConnectionContext>();
const alive = new WeakMap<WebSocket, boolean>();
const publicHandshakeWindows = new Map<string, { startedAt: number; count: number }>();
const projectionRetry = setInterval(async () => {
  const result = await documents.retryPendingProjections().catch(() => ({ attempted: 0, recovered: 0 }));
  if (result.attempted) telemetry.record({ signal: "metric", event: "sync_projection_retry",
    metric: "sync_projection_retry_count", value: result.attempted, unit: "count",
    outcome: result.recovered ? "recovered" : "success", resourceType: "lyric" });
  for (const peers of sockets.values()) for (const peer of peers) {
    const context = contexts.get(peer);
    // A reconnect can load the pending snapshot while the repair transaction
    // commits before this socket is visible to the recovery broadcast. Keep
    // reconciling connections that have observed a pending projection so that
    // the ready transition cannot be lost at that boundary.
    if (!context || context.accessMode === "public-read"
      || (!result.recovered && !context.projectionPending) || !await authorized(peer)) continue;
    const loaded = await documents.loadDocument(context.ownerId, context.documentKey).catch(() => null);
    if (loaded && peer.readyState === WebSocket.OPEN) {
      context.projectionPending = loaded.projectionPending;
      peer.send(JSON.stringify({ type: "projection", projection: loaded.projectionPending ? "pending" : "current" }));
    }
  }
}, 5_000);
projectionRetry.unref();
const reauthenticate = setInterval(() => {
  for (const peers of sockets.values()) for (const peer of peers) void authorized(peer, true);
}, 1_000);
reauthenticate.unref();
const heartbeat = setInterval(() => {
  for (const peers of sockets.values()) for (const peer of peers) {
    if (!alive.get(peer)) peer.terminate();
    else { alive.set(peer, false); peer.ping(); }
  }
}, 30_000);
heartbeat.unref();
let maintainingRevisions = false;
const revisionMaintenance = setInterval(async () => {
  if (maintainingRevisions) return;
  maintainingRevisions = true;
  try {
    const result = await documents.maintainRevisions();
    if (result.checked || result.prunedDocuments || result.failed) telemetry.record({ signal: "metric",
      event: "revision_maintenance", operation: "revision_maintenance", metric: "revision_failure_count",
      value: result.failed, unit: "count", outcome: result.failed ? "failure" : "success", resourceType: "lyric" });
  } catch { telemetry.record({ signal: "log", event: "revision_maintenance_failed",
    operation: "revision_maintenance", errorCode: "REVISION_MAINTENANCE_FAILED", outcome: "failure", resourceType: "lyric" }); }
  finally { maintainingRevisions = false; }
}, 30_000);
revisionMaintenance.unref();
const server = createServer(async (request, response) => {
  const requestId = createRequestId(typeof request.headers["x-request-id"] === "string" ? request.headers["x-request-id"] : undefined);
  try {
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-request-id", requestId);
  if (request.url === "/health/live") return response.end(JSON.stringify({ status: "ok", service: "collaboration", check: "liveness", build: { version: config.appVersion, id: config.buildId } }));
  if (request.url === "/health/ready") {
    try {
      const database = await checkDatabase(config.databaseUrl);
      return response.end(JSON.stringify({ status: "ok", service: "collaboration", check: "readiness", build: { version: config.appVersion, id: config.buildId }, database }));
    } catch (error) {
      response.statusCode = 503;
      const reason = error instanceof DatabaseHealthError ? error.code : "CONFIG_INVALID";
      telemetry.record({ signal: "alert", event: "service_unavailable", metric: "service_unavailable_count",
        value: 1, unit: "count", errorCode: reason, resourceType: "service", requestId,
        outcome: "unavailable", severity: "critical", runbook: "docs/runbooks/observability-alerts.md#service-unavailable" });
      return response.end(JSON.stringify({ status: "unavailable", service: "collaboration", check: "readiness", reason }));
    }
  }
  const documentRequest = request.method === "POST" && request.url?.match(/^\/documents\/([0-9a-f-]{36})$/i);
  if (documentRequest) {
    if (request.headers.origin !== appOrigin) return unavailable(response, 403, requestId);
    const session = await authenticate(request);
    if (!session) return unavailable(response, 401, requestId);
    const capability = request.headers["x-lyricscloud-prompt-capability"] === "prompt-mode-v1";
    const document = await documents.ensureDocument(session.userId, documentRequest[1]!, capability);
    if (!document) return unavailable(response, 404, requestId);
    return response.end(JSON.stringify({ documentKey: document.document_key }));
  }
  const sharedDocumentRequest = request.method === "GET" && request.url?.match(/^\/shared-documents\/([0-9a-f-]{36})$/i);
  if (sharedDocumentRequest) {
    const session = await authenticate(request);
    if (!session) return unavailable(response, 401, requestId);
    const document = await documents.findSharedDocument(session.userId, sharedDocumentRequest[1]!);
    if (!document || document.access.accessMode !== "read") return unavailable(response, 404, requestId);
    return response.end(JSON.stringify({ documentKey: document.documentKey,
      permissionEpoch: document.access.permissionEpoch }));
  }
  const revisionRequest = request.url?.match(/^\/documents\/([0-9a-f-]{36})\/revisions(?:\/([0-9a-f-]{36})(\/restore)?)?$/i);
  if (revisionRequest) {
    const [, key, revisionId, restore] = revisionRequest;
    if (!isResourceId(key) || (revisionId && !isResourceId(revisionId))) return unavailable(response, 404, requestId);
    if (request.method !== "GET" && request.method !== "POST") return unavailable(response, 405, requestId);
    if (request.method === "POST" && request.headers.origin !== appOrigin) return unavailable(response, 403, requestId);
    const session = await authenticate(request);
    if (!session) return unavailable(response, 401, requestId);
    if (request.method === "GET" && !restore) {
      const result = revisionId ? await documents.getRevision(session.userId, key, revisionId) : await documents.listRevisions(session.userId, key);
      if (!result) return unavailable(response, 404, requestId);
      return response.end(JSON.stringify(result));
    }
    if (request.method === "POST" && !revisionId) {
      const input = await readJson(request);
      const revision = await documents.checkpoint(session.userId, key, parseCheckpointReason(input.reason));
      if (!revision) return unavailable(response, 404, requestId);
      return response.end(JSON.stringify({ revision }));
    }
    if (request.method === "POST" && restore && revisionId) {
      const result = await documents.restoreRevision(session.userId, key, revisionId, parseRestoreRevisionInput(await readJson(request)));
      if (!result) return unavailable(response, 404, requestId);
      const payload = Buffer.from(result.snapshot).toString("base64");
      for (const peer of sockets.get(key) ?? []) if (await authorized(peer, true)) {
        const context = contexts.get(peer);
        if (context) context.projectionPending = false;
        peer.send(JSON.stringify({ type: "update", payload }));
        peer.send(JSON.stringify({ type: "projection", projection: "current" }));
      }
      return response.end(JSON.stringify({ duplicate: result.duplicate, payload }));
    }
  }
  response.statusCode = 404;
  return response.end(JSON.stringify({ error: { code: "NOT_FOUND", requestId } }));
  } catch (error) {
    if (error instanceof Error && error.message === "PROMPT_MODE_CAPABILITY_REQUIRED") {
      response.statusCode = 409;
      response.setHeader("x-request-id", requestId);
      return response.end(JSON.stringify({ error: { code: error.message, requestId } }));
    }
    if (error instanceof Error && error.message.startsWith("REVISION_")) {
      response.statusCode = error.message === "REVISION_INPUT_INVALID" ? 400 : 409;
      response.setHeader("x-request-id", requestId);
      return response.end(JSON.stringify({ error: { code: error.message, requestId } }));
    }
    return unavailable(response, 503, requestId);
  }
});

const websocket = new WebSocketServer({ noServer: true, maxPayload: Math.ceil(SYNC_LIMITS.updateBytes / 3) * 4 + 1024 });
server.on("upgrade", async (request, socket, head) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://collaboration.local");
    if (request.headers.origin === appOrigin && requestUrl.pathname === "/public") {
      const address = request.socket.remoteAddress?.slice(0, 128) ?? "unknown";
      if (!withinPublicHandshakeLimit(address)) {
        socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n"); socket.destroy(); return;
      }
      websocket.handleUpgrade(request, socket, head, (client) => setupPublicClient(client));
      return;
    }
    const match = request.headers.origin === appOrigin && requestUrl.pathname.match(/^\/sync\/([0-9a-f-]{36})$/i);
    const session = match ? await authenticate(request) : null;
    const loaded = match && session ? await documents.loadDocumentForActor(session.userId, match[1]!) : null;
    const capable = requestUrl.searchParams.get("capability") === "prompt-mode-v1";
    if (!match || !session || !loaded || (loaded.resourceType === "prompt" && loaded.promptMode === "sentence" && !capable)) {
      const status = loaded?.resourceType === "prompt" && loaded.promptMode === "sentence" && !capable ? "409 Conflict" : "404 Not Found";
      socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
      return;
    }
    websocket.handleUpgrade(request, socket, head, (client) => {
      contexts.set(client, { documentKey: match[1]!, actorId: session.userId, ownerId: loaded.access.ownerId,
        accessMode: loaded.access.accessMode, permissionEpoch: loaded.access.permissionEpoch,
        displayName: loaded.access.displayName, participantId: randomUUID(), request, promptModeCapable: capable,
        projectionPending: loaded.projectionPending });
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
  alive.set(client, true);
  client.on("pong", () => alive.set(client, true));
  const peers = sockets.get(context.documentKey) ?? new Set<WebSocket>();
  peers.add(client);
  sockets.set(context.documentKey, peers);
  // Join broadcasts first, then take a consistent snapshot so an update during
  // the HTTP upgrade cannot fall between the snapshot and the subscription.
  void documents.loadDocumentForActor(context.actorId!, context.documentKey).then((loaded) => {
    if (!loaded) return closeUnavailable(client);
    context.projectionPending = loaded.projectionPending;
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: "snapshot",
      payload: Buffer.from(merge(loaded.snapshot, loaded.updates)).toString("base64"),
      access: context.accessMode, permissionEpoch: context.permissionEpoch,
      projection: loaded.projectionPending ? "pending" : "current" }));
    void broadcastPresence(context.documentKey);
  }).catch(() => client.close(1013, "SYNC_TEMPORARILY_UNAVAILABLE"));
  client.on("message", async (raw, binary) => {
    if (binary) return closeProtocol(client, "SYNC_UPDATE_INVALID");
    try {
      const session = await authenticate(request);
      if (!session || session.userId !== context.actorId) return closeUnavailable(client);
      const current = await documents.loadDocumentForActor(session.userId, context.documentKey);
      if (!current) return closeUnavailable(client);
      if (current.access.accessMode !== context.accessMode || current.access.permissionEpoch !== context.permissionEpoch) return closeUnavailable(client);
      if (context.accessMode !== "owner") return client.close(4403, "SYNC_WRITE_FORBIDDEN");
      if (current.resourceType === "prompt" && current.promptMode === "sentence" && !context.promptModeCapable) {
        return client.close(4409, "PROMPT_MODE_CAPABILITY_REQUIRED");
      }
      const input = JSON.parse(raw.toString()) as { type?: unknown; updateId?: unknown; payload?: unknown };
      if (input.type !== "update" || typeof input.payload !== "string") throw new Error("SYNC_UPDATE_INVALID");
      const payload = Buffer.from(input.payload, "base64");
      const envelope = parseSyncUpdateEnvelope({ updateId: input.updateId, payload: new Uint8Array(payload) });
      const result = await documents.applyUpdate(context.ownerId, context.documentKey, envelope.updateId, envelope.payload);
      if (!result) return closeUnavailable(client);
      context.projectionPending = result.projectionPending;
      client.send(JSON.stringify({ type: "ack", updateId: envelope.updateId, duplicate: result.duplicate,
        projection: result.projectionPending ? "pending" : "current" }));
      if (!result.duplicate) for (const peer of peers) if (peer !== client && await authorized(peer) && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ type: "update", updateId: envelope.updateId, payload: input.payload }));
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) return client.close(1013, "SYNC_TEMPORARILY_UNAVAILABLE");
      const code = error instanceof Error && /^SYNC_/.test(error.message) ? error.message : "SYNC_UPDATE_INVALID";
      telemetry.record({ signal: "log", event: "sync_update_rejected", errorCode: code,
        resourceType: "lyric", outcome: "failure" });
      closeProtocol(client, code);
    }
  });
  client.on("close", () => {
    peers.delete(client);
    if (peers.size === 0) sockets.delete(context.documentKey);
    else void broadcastPresence(context.documentKey);
  });
});

server.listen(port, "0.0.0.0", () => telemetry.record({ signal: "log", event: "service_started",
  resourceType: "service", outcome: "success" }));

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => {
  clearInterval(projectionRetry);
  clearInterval(reauthenticate);
  clearInterval(heartbeat);
  clearInterval(revisionMaintenance);
  for (const peers of sockets.values()) for (const peer of peers) peer.close(1012, "SYNC_RESTARTING");
  server.close(async () => { await Promise.all([auth.close(), documents.close()]); process.exit(0); });
});

interface ConnectionContext {
  documentKey: string;
  actorId?: string;
  ownerId: string;
  accessMode: "owner" | "read" | "public-read";
  permissionEpoch: number;
  displayName: string;
  participantId: string;
  request?: IncomingMessage;
  promptModeCapable: boolean;
  projectionPending: boolean;
  publicLinkId?: string;
  publicTokenDigest?: string;
}

async function authorized(client: WebSocket, checkDocument = false): Promise<boolean> {
  const context = contexts.get(client);
  try {
    if (context?.accessMode === "public-read") {
      const allowed = await documents.hasPublicAccess(context.publicTokenDigest!, context.publicLinkId!,
        context.documentKey, context.permissionEpoch);
      if (!allowed) { closeUnavailable(client); return false; }
      return client.readyState === WebSocket.OPEN;
    }
    const session = context?.request ? await authenticate(context.request) : null;
    const loaded = context && session && session.userId === context.actorId && checkDocument
      ? await documents.loadDocumentForActor(context.actorId, context.documentKey) : undefined;
    if (!context || !session || session.userId !== context.actorId
      || (checkDocument && (!loaded || loaded.access.accessMode !== context.accessMode
        || loaded.access.permissionEpoch !== context.permissionEpoch))) {
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

function unavailable(response: import("node:http").ServerResponse, status: number, requestId = createRequestId()) {
  response.statusCode = status;
  response.setHeader("x-request-id", requestId);
  return response.end(JSON.stringify({ error: { code: "SYNC_DOCUMENT_UNAVAILABLE", requestId } }));
}

function closeUnavailable(client: WebSocket) { client.close(4404, "SYNC_DOCUMENT_UNAVAILABLE"); }
function closeProtocol(client: WebSocket, code: string) { client.close(4400, code.slice(0, 120)); }

async function broadcastPresence(documentKey: string): Promise<void> {
  const peers = [...(sockets.get(documentKey) ?? [])];
  const participants = peers.flatMap((peer) => {
    const context = contexts.get(peer);
    return context && context.accessMode !== "public-read" && peer.readyState === WebSocket.OPEN ? [{ participantId: context.participantId,
      displayName: publicParticipantName(context.displayName), role: context.accessMode }] : [];
  });
  const payload = JSON.stringify({ type: "presence", participants });
  for (const peer of peers) {
    const context = contexts.get(peer);
    if (context?.accessMode !== "public-read" && await authorized(peer, true) && peer.readyState === WebSocket.OPEN) peer.send(payload);
  }
}

function setupPublicClient(client: WebSocket): void {
  alive.set(client, true);
  client.on("pong", () => alive.set(client, true));
  const timer = setTimeout(() => closeUnavailable(client), 5_000); timer.unref();
  client.once("message", async (raw, binary) => {
    clearTimeout(timer);
    const text = raw.toString();
    if (binary || Buffer.byteLength(text, "utf8") > 4_096) return closeProtocol(client, "SYNC_AUTH_INVALID");
    try {
      const input = JSON.parse(text) as { type?: unknown; token?: unknown; linkId?: unknown };
      if (input.type !== "auth" || typeof input.linkId !== "string" || !isResourceId(input.linkId)) throw new Error();
      const digest = publicShareTokenDigest(parsePublicShareToken(input.token));
      const loaded = await documents.loadPublicDocument(digest, input.linkId);
      if (!loaded) return closeUnavailable(client);
      const peers = sockets.get(loaded.documentKey) ?? new Set<WebSocket>();
      const publicCount = [...peers].filter((peer) => contexts.get(peer)?.accessMode === "public-read").length;
      if (publicCount >= 20) return client.close(4429, "SYNC_TEMPORARILY_UNAVAILABLE");
      contexts.set(client, { documentKey: loaded.documentKey, ownerId: loaded.ownerId,
        accessMode: "public-read", permissionEpoch: loaded.permissionEpoch, displayName: "", participantId: randomUUID(),
        promptModeCapable: false, projectionPending: false, publicLinkId: input.linkId, publicTokenDigest: digest });
      peers.add(client); sockets.set(loaded.documentKey, peers);
      if (!await authorized(client)) return;
      client.send(JSON.stringify({ type: "snapshot", payload: Buffer.from(merge(loaded.snapshot, loaded.updates)).toString("base64"),
        access: "public-read", permissionEpoch: loaded.permissionEpoch, projection: "current" }));
      client.on("message", () => client.close(4403, "SYNC_WRITE_FORBIDDEN"));
      client.on("close", () => { peers.delete(client); if (!peers.size) sockets.delete(loaded.documentKey); });
    } catch { closeUnavailable(client); }
  });
}

function withinPublicHandshakeLimit(key: string, now = Date.now()): boolean {
  const window = publicHandshakeWindows.get(key);
  if (!window || now - window.startedAt >= 60_000) {
    publicHandshakeWindows.set(key, { startedAt: now, count: 1 });
    if (publicHandshakeWindows.size > 10_000) for (const [candidate, value] of publicHandshakeWindows) {
      if (now - value.startedAt >= 60_000) publicHandshakeWindows.delete(candidate);
    }
    return true;
  }
  window.count++;
  return window.count <= 10;
}

function merge(snapshot: Uint8Array, updates: readonly Uint8Array[]) {
  return updates.length ? Y.mergeUpdates([snapshot, ...updates]) : snapshot;
}

function publicParticipantName(value: string): string {
  const name = value.trim().slice(0, 60);
  return !name || name.includes("@") || /^[0-9a-f-]{36}$/i.test(name) ? "참여자" : name;
}
