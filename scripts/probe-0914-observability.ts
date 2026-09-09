import { readFile } from "node:fs/promises";
import {
  buildOperationalDashboard, consoleTelemetryTransport, createRequestId, evaluateAlerts,
  MemoryTelemetryTransport, Observability, sanitizeTelemetry, type AlertRule
} from "@lyricscloud/observability";

const canary = "LC_CANARY_PRIVATE_0914_e7d693";
const identity = { service: "web", environment: "test", version: "0.9.1", buildId: "probe" } as const;

async function main() {
  const config = JSON.parse(await readFile(new URL("../config/observability-alerts.0914.json", import.meta.url), "utf8")) as {
    rules: AlertRule[];
  };
  const memory = new MemoryTelemetryTransport();
  const lines: string[] = [];
  const telemetry = new Observability(identity, [memory, consoleTelemetryTransport((line) => lines.push(line)), {
    emit() { throw new Error("synthetic exporter unavailable"); }
  }]);

  const requestId = createRequestId();
  telemetry.record({ signal: "log", event: "synthetic_failure", errorCode: "DEPENDENCY_UNAVAILABLE", requestId,
    title: canary, body: canary, searchQuery: canary, url: `/search?q=${canary}`,
    request: { headers: { authorization: `Bearer ${canary}`, cookie: canary }, body: canary },
    error: { message: canary, stack: canary, cause: { payload: canary } },
    breadcrumb: [canary], domSnapshot: `<main>${canary}</main>` });

  const saved = await telemetry.measure("save_operation", { resourceType: "lyric", requestId }, async () => "saved");
  if (saved !== "saved") throw new Error("transport isolation failed");

  const snapshot = {
    autosave_failure_rate_percent: 1.1,
    search_p95_ms: 151,
    purge_failure_count: 1,
    backup_failure_count: 1,
    service_unavailable_count: 1
  };
  const alerts = evaluateAlerts(identity, snapshot, config.rules);
  const quiet = evaluateAlerts(identity, {
    autosave_failure_rate_percent: 0,
    search_p95_ms: 100,
    purge_failure_count: 0,
    backup_failure_count: 0,
    service_unavailable_count: 0
  }, config.rules);
  if (alerts.length !== config.rules.length || quiet.length !== 0) throw new Error("alert threshold probe failed");

  const dashboard = buildOperationalDashboard([
    sanitizeTelemetry({ ...identity, signal: "metric", event: "search_measured", metric: "search_p95_ms",
      value: 120, unit: "ms", requestId }),
    sanitizeTelemetry({ ...identity, signal: "metric", event: "search_measured", metric: "search_p95_ms",
      value: 151, unit: "ms", requestId: createRequestId() })
  ]);
  const serialized = JSON.stringify({ records: memory.records, lines, alerts, dashboard });
  if (serialized.includes(canary)) throw new Error("private canary reached telemetry output");
  if (JSON.stringify(dashboard).includes(requestId)) throw new Error("dashboard retained a request identifier");
  if (memory.records.some((record) => Object.keys(record).some((key) =>
    ["url", "query", "body", "header", "stack", "cause", "breadcrumb", "domSnapshot"].includes(key)))) {
    throw new Error("forbidden telemetry field survived");
  }

  console.log(JSON.stringify({ pass: true, canaryMatches: 0, records: memory.records.length,
    alertsTriggered: alerts.length, alertsQuiet: quiet.length, dashboardPanels: dashboard.panels.length,
    exporterFailureIsolated: true, browserInstrumentation: false }));
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
