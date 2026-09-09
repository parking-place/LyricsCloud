import { createServer } from "node:http";
import { readRuntimeConfig } from "@lyricscloud/config";
import { checkDatabase, DatabaseHealthError, PostgresLifecycleStore } from "@lyricscloud/database";
import { createRequestId, observabilityFromEnvironment } from "@lyricscloud/observability";

const config = readRuntimeConfig(process.env);
const port = Number(process.env.WORKER_HEALTH_PORT ?? "3002");
const lifecycle = new PostgresLifecycleStore(config.databaseUrl, 2);
const telemetry = observabilityFromEnvironment("worker");
const purgeIntervalMs = Math.max(60_000, Number(process.env.LIFECYCLE_PURGE_INTERVAL_MS ?? "300000"));
let purgeRunning = false;

async function runLifecyclePurge() {
  if (purgeRunning) return;
  purgeRunning = true;
  try {
    const result = await lifecycle.runDuePurge(new Date(), 100);
    telemetry.record({ signal: "metric", event: "lifecycle_purge_completed", operation: "purge",
      metric: "purge_resource_count", value: result.resourceCount, unit: "count", outcome: "success",
      requestId: createRequestId(result.runId) });
  } catch {
    telemetry.record({ signal: "alert", event: "lifecycle_purge_failed", operation: "purge",
      metric: "purge_failure_count", value: 1, unit: "count", errorCode: "PURGE_FAILED", outcome: "failure",
      severity: "critical", runbook: "docs/runbooks/observability-alerts.md#purge-failure" });
  } finally { purgeRunning = false; }
}
const server = createServer(async (request, response) => {
  const requestId = createRequestId(typeof request.headers["x-request-id"] === "string" ? request.headers["x-request-id"] : undefined);
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-request-id", requestId);
  if (request.url === "/health/live") return response.end(JSON.stringify({ status: "ok", service: "worker", check: "liveness", build: { version: config.appVersion, id: config.buildId } }));
  if (request.url === "/health/ready") {
    try {
      const database = await checkDatabase(config.databaseUrl);
      return response.end(JSON.stringify({ status: "ok", service: "worker", check: "readiness", build: { version: config.appVersion, id: config.buildId }, database }));
    } catch (error) {
      response.statusCode = 503;
      const reason = error instanceof DatabaseHealthError ? error.code : "CONFIG_INVALID";
      telemetry.record({ signal: "alert", event: "service_unavailable", metric: "service_unavailable_count",
        value: 1, unit: "count", errorCode: reason, resourceType: "service", requestId,
        outcome: "unavailable", severity: "critical", runbook: "docs/runbooks/observability-alerts.md#service-unavailable" });
      return response.end(JSON.stringify({ status: "unavailable", service: "worker", check: "readiness", reason }));
    }
  }
  response.statusCode = 404;
  return response.end(JSON.stringify({ error: { code: "NOT_FOUND", requestId } }));
});
server.listen(port, "0.0.0.0", () => {
  telemetry.record({ signal: "log", event: "service_started", resourceType: "service", outcome: "success" });
  setTimeout(() => void runLifecyclePurge(), 2_000).unref();
});
setInterval(() => void runLifecyclePurge(), purgeIntervalMs).unref();

async function shutdown() {
  server.close();
  await lifecycle.close().catch(() => undefined);
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
