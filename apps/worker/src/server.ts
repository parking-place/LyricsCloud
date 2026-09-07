import { createServer } from "node:http";
import { readRuntimeConfig } from "@lyricscloud/config";
import { checkDatabase, DatabaseHealthError, PostgresLifecycleStore } from "@lyricscloud/database";

const config = readRuntimeConfig(process.env);
const port = Number(process.env.WORKER_HEALTH_PORT ?? "3002");
const lifecycle = new PostgresLifecycleStore(config.databaseUrl, 2);
const purgeIntervalMs = Math.max(60_000, Number(process.env.LIFECYCLE_PURGE_INTERVAL_MS ?? "300000"));
let purgeRunning = false;

async function runLifecyclePurge() {
  if (purgeRunning) return;
  purgeRunning = true;
  try {
    const result = await lifecycle.runDuePurge(new Date(), 100);
    console.log(JSON.stringify({ event: "lifecycle_purge_completed", runId: result.runId,
      resources: result.resourceCount, templates: result.templateCount, accounts: result.accountCount }));
  } catch {
    console.error(JSON.stringify({ event: "lifecycle_purge_failed", errorCode: "PURGE_FAILED" }));
  } finally { purgeRunning = false; }
}
const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  if (request.url === "/health/live") return response.end(JSON.stringify({ status: "ok", service: "worker", check: "liveness", build: { version: config.appVersion, id: config.buildId } }));
  if (request.url === "/health/ready") {
    try {
      const database = await checkDatabase(config.databaseUrl);
      return response.end(JSON.stringify({ status: "ok", service: "worker", check: "readiness", build: { version: config.appVersion, id: config.buildId }, database }));
    } catch (error) {
      response.statusCode = 503;
      const reason = error instanceof DatabaseHealthError ? error.code : "CONFIG_INVALID";
      return response.end(JSON.stringify({ status: "unavailable", service: "worker", check: "readiness", reason }));
    }
  }
  response.statusCode = 404;
  return response.end(JSON.stringify({ error: "NOT_FOUND" }));
});
server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ event: "service_started", service: "worker", port }));
  setTimeout(() => void runLifecyclePurge(), 2_000).unref();
});
setInterval(() => void runLifecyclePurge(), purgeIntervalMs).unref();

async function shutdown() {
  server.close();
  await lifecycle.close().catch(() => undefined);
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
