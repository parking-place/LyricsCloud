import { describe, expect, it } from "vitest";
import {
  buildOperationalDashboard, createRequestId, evaluateAlerts, MemoryTelemetryTransport,
  Observability, redactRecursively, sanitizeTelemetry, toRouteTemplate
} from "./index.js";

const identity = { service: "web", environment: "test", version: "0.9.1", buildId: "test" } as const;

describe("privacy-first observability", () => {
  it("drops forbidden and unknown fields through nested causes", () => {
    const canary = "LC_CANARY_PRIVATE_0914";
    const record = sanitizeTelemetry({ ...identity, signal: "log", event: "request_failed",
      errorCode: "DEPENDENCY_UNAVAILABLE", title: canary, body: canary, url: `/search?q=${canary}`,
      cause: { message: canary, stack: canary, response: { headers: { authorization: canary }, body: canary } },
      arbitrary: { nested: canary } });
    expect(JSON.stringify(record)).not.toContain(canary);
    expect(record).toMatchObject({ service: "web", event: "request_failed", errorCode: "DEPENDENCY_UNAVAILABLE" });
    expect(Object.keys(record).sort()).toEqual(["buildId", "environment", "errorCode", "event", "service", "signal", "version"].sort());
    expect(JSON.stringify(redactRecursively({ cause: { message: canary } }))).not.toContain(canary);
  });

  it("rejects authored text smuggled into allowed string fields", () => {
    const canary = "lc_canary_private_0914";
    const record = sanitizeTelemetry({ ...identity, event: canary, errorCode: canary, requestId: canary,
      routeTemplate: `/search/${canary}`, runbook: `https://example.test/${canary}` });
    expect(record).toEqual(identity);
  });

  it("normalizes UUID paths without keeping raw URL or query", () => {
    expect(toRouteTemplate("/api/lyrics/123e4567-e89b-12d3-a456-426614174000?query=private"))
      .toBe("/api/lyrics/:id");
    expect(toRouteTemplate("/search/한글")).toBeUndefined();
    expect(toRouteTemplate("/search/private-authored-slug")).toBeUndefined();
    expect(createRequestId("too-short")).toMatch(/^req_[0-9a-f]{32}$/u);
  });

  it("cannot block product work when a transport or exporter fails", async () => {
    const memory = new MemoryTelemetryTransport();
    const telemetry = new Observability(identity, [{ emit() { throw new Error("transport offline"); } }, memory]);
    await expect(telemetry.measure("save_operation", { resourceType: "lyric" }, async () => "saved"))
      .resolves.toBe("saved");
    expect(memory.records).toHaveLength(1);
    expect(memory.records[0]).toMatchObject({ event: "save_operation", outcome: "success" });
  });

  it("turns nested runtime errors into anonymous codes without messages", async () => {
    const memory = new MemoryTelemetryTransport();
    const telemetry = new Observability(identity, [memory]);
    const canary = "LC_CANARY_NESTED_ERROR_0914";
    await expect(telemetry.measure("search_operation", {}, async () => {
      throw new Error(canary, { cause: { stack: canary, body: canary } });
    })).rejects.toThrow(canary);
    expect(memory.records[0]).toMatchObject({ event: "search_operation", errorCode: "OPERATION_FAILED", outcome: "failure" });
    expect(JSON.stringify(memory.records)).not.toContain(canary);
  });

  it("generates aggregate alerts and dashboards without request or user histories", () => {
    const alerts = evaluateAlerts(identity, { search_p95_ms: 181, backup_failure_count: 1 }, [
      { metric: "search_p95_ms", comparator: "gt", threshold: 150, severity: "warning",
        runbook: "docs/runbooks/observability-alerts.md#search-latency" },
      { metric: "backup_failure_count", comparator: "gte", threshold: 1, severity: "critical",
        runbook: "docs/runbooks/observability-alerts.md#backup-failure" }
    ]);
    expect(alerts).toHaveLength(2);
    const dashboard = buildOperationalDashboard([
      { service: "web", metric: "search_p95_ms", value: 120, requestId: "opaque-request-id-0001" },
      { service: "web", metric: "search_p95_ms", value: 181, requestId: "opaque-request-id-0002" },
      { service: "web", metric: "lc_private_authored_value", value: 999 }
    ]);
    expect(dashboard).toEqual({ panels: [{ service: "web", metric: "search_p95_ms", samples: 2, maximum: 181, latest: 181 }] });
    expect(JSON.stringify(dashboard)).not.toContain("request-id");
  });

  it("drops unregistered alert dimensions", () => {
    expect(evaluateAlerts(identity, { lc_private_authored_value: 1 }, [{
      metric: "lc_private_authored_value", comparator: "gte", threshold: 1, severity: "critical",
      runbook: "docs/runbooks/observability-alerts.md#service-unavailable"
    }])).toEqual([]);
  });
});
