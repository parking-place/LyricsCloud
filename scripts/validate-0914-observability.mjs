import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const [source, tests, alertsText, dashboardText, classification, runbook, ci, rc, compose, webProxy, webError, worker, collaboration, errorContract, editorSync, promptSync] = await Promise.all([
  read("packages/observability/src/index.ts"),
  read("packages/observability/src/index.test.ts"),
  read("config/observability-alerts.0914.json"),
  read("config/observability-dashboard.0914.json"),
  read("docs/operations/OBSERVABILITY-DATA-CLASSIFICATION.md"),
  read("docs/runbooks/observability-alerts.md"),
  read(".github/workflows/ci.yml"),
  read("scripts/run-0913-rc.sh"),
  read("compose.yaml"),
  read("apps/web/src/proxy.ts"),
  read("apps/web/src/lib/http-response.ts"),
  read("apps/worker/src/server.ts"),
  read("apps/collaboration/src/server.ts"),
  read("packages/domain/src/error-contract.ts"),
  read("packages/editor/src/browser-sync.ts"),
  read("packages/editor/src/prompt-browser-sync.ts")
]);
const alerts = JSON.parse(alertsText);
const dashboard = JSON.parse(dashboardText);

for (const marker of ["TELEMETRY_ALLOWED_FIELDS", "TELEMETRY_FORBIDDEN_FIELDS", "redactRecursively",
  "sanitizeTelemetry", "@opentelemetry/api", "MemoryTelemetryTransport", "evaluateAlerts",
  "buildOperationalDashboard", "void emitted.catch"]) assert(source.includes(marker), `observability marker missing: ${marker}`);
for (const forbidden of ["title", "body", "search", "query", "url", "breadcrumb", "dom", "snapshot",
  "payload", "email", "cookie", "authorization", "oauth", "token", "stack", "message", "cause"]) {
  assert(source.includes(`"${forbidden}"`) || source.includes(`"${forbidden[0].toUpperCase()}${forbidden.slice(1)}"`), `forbidden field missing: ${forbidden}`);
}
assert(tests.includes("LC_CANARY_PRIVATE_0914") && tests.includes("transport offline"), "canary or outage isolation test missing");
assert(alerts.aggregationOnly === true && alerts.rules.length === 5, "alert definition count or aggregation boundary invalid");
const expectedMetrics = ["autosave_failure_rate_percent", "search_p95_ms", "purge_failure_count", "backup_failure_count", "service_unavailable_count"];
for (const metric of expectedMetrics) {
  const rule = alerts.rules.find((candidate) => candidate.metric === metric);
  assert(rule && rule.runbook.startsWith("docs/runbooks/observability-alerts.md#"), `alert/runbook missing: ${metric}`);
}
assert(dashboard.aggregationOnly === true && dashboard.forbiddenDimensions.includes("user")
  && dashboard.forbiddenDimensions.includes("searchQuery") && !dashboard.panels.some((panel) => "user" in panel), "dashboard privacy boundary invalid");
for (const marker of ["7일", "30일", "90일", "브라우저", "session replay", "requestId", "raw URL", "최소 권한"]) {
  assert(classification.includes(marker), `classification policy marker missing: ${marker}`);
}
for (const anchor of ["autosave-failure", "search-latency", "purge-failure", "backup-failure", "service-unavailable", "관측 backend 장애"]) {
  assert(runbook.includes(anchor), `runbook response missing: ${anchor}`);
}
assert(compose.includes("max-size: \"10m\"") && compose.includes("max-file: \"5\""), "bounded Docker log rotation missing");
assert(webProxy.includes("x-request-id") && webError.includes("x-request-id"), "web request correlation missing");
assert(!webProxy.includes('response.headers.set("x-request-id"'), "middleware must not overwrite downstream error correlation ID");
assert(worker.includes("observabilityFromEnvironment") && collaboration.includes("observabilityFromEnvironment"), "service integration missing");
assert(!collaboration.includes("function log(event: string, documentKey"), "stable document hash logging remains");
for (const behaviorEvent of ["sync_connected", "sync_disconnected", "sync_update_committed", 'request.url === "/metrics"']) {
  assert(!collaboration.includes(behaviorEvent), `behavioral or public metrics surface remains: ${behaviorEvent}`);
}
assert(errorContract.includes("parsePublicErrorCode") && errorContract.includes("PUBLIC_REQUEST_ID"), "shared public error parser missing");
assert(editorSync.includes("parsePublicErrorCode(error)") && promptSync.includes("parsePublicErrorCode(error)"), "editor error contract integration missing");
for (const marker of ["pnpm test:release:0914", "pnpm test:observability:0914"]) {
  assert(ci.includes(marker), `CI marker missing: ${marker}`);
  assert(rc.includes(marker), `RC marker missing: ${marker}`);
}
console.log("0.9.1 Phase 4 observability contract: strict allowlist, canary redaction, aggregate alerts and fail-open transport verified");
