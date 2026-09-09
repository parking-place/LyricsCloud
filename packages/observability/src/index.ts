import { randomUUID } from "node:crypto";
import { SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";

export const TELEMETRY_ALLOWED_FIELDS = [
  "timestamp", "service", "environment", "version", "buildId", "signal", "event",
  "routeTemplate", "method", "statusClass", "durationMs", "errorCode", "resourceType",
  "requestId", "metric", "value", "unit", "outcome", "operation", "count", "threshold",
  "alert", "severity", "runbook"
] as const;

export const TELEMETRY_FORBIDDEN_FIELDS = [
  "title", "body", "text", "content", "lyrics", "rhyme", "prompt", "template", "search",
  "query", "url", "path", "breadcrumb", "dom", "snapshot", "clipboard", "payload", "email",
  "cookie", "authorization", "header", "oauth", "token", "codeVerifier", "stack", "message", "cause"
] as const;

type AllowedField = typeof TELEMETRY_ALLOWED_FIELDS[number];
export type TelemetryValue = string | number | boolean;
export type TelemetryRecord = Partial<Record<AllowedField, TelemetryValue>>;
export type TelemetryInput = Readonly<Record<string, unknown>>;

export interface TelemetryTransport {
  emit(record: Readonly<TelemetryRecord>): void | Promise<void>;
}

export interface ObservabilityIdentity {
  readonly service: "web" | "collaboration" | "worker" | "database" | "backup" | "migration";
  readonly environment: "development" | "test" | "production";
  readonly version: string;
  readonly buildId: string;
}

export function observabilityFromEnvironment(
  service: ObservabilityIdentity["service"],
  env: NodeJS.ProcessEnv = process.env,
  transports?: readonly TelemetryTransport[]
): Observability {
  const environment = env.NODE_ENV === "test" || env.NODE_ENV === "production" ? env.NODE_ENV : "development";
  return new Observability({ service, environment,
    version: safeIdentifier.test(env.APP_VERSION ?? "") ? env.APP_VERSION! : "unknown",
    buildId: safeIdentifier.test(env.BUILD_ID ?? "") ? env.BUILD_ID! : "unknown" }, transports);
}

const tracer = trace.getTracer("@lyricscloud/observability", "0.1.0");
const allowed = new Set<string>(TELEMETRY_ALLOWED_FIELDS);
const forbidden = TELEMETRY_FORBIDDEN_FIELDS.map((field) => field.toLowerCase());
const safeCode = /^[A-Z][A-Z0-9_]{0,79}$/u;
const safeIdentifier = /^[A-Za-z0-9._-]{1,128}$/u;
const safeRequestId = /^req_[0-9a-f]{32}$/u;
const safeRunbook = /^docs\/runbooks\/[A-Za-z0-9._/-]+(?:#[A-Za-z0-9._-]+)?$/u;
const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const statusClasses = new Set(["1xx", "2xx", "3xx", "4xx", "5xx"]);
const resourceTypes = new Set(["song", "lyric", "rhyme", "prompt", "template", "account", "session", "database", "service"]);
const outcomes = new Set(["success", "failure", "conflict", "unavailable", "recovered", "rolled_back"]);
const units = new Set(["ms", "seconds", "count", "percent", "bytes", "mib"]);
const severities = new Set(["warning", "critical"]);
const events = new Set([
  "request_failed", "save_operation", "search_operation", "search_measured", "synthetic_failure",
  "operational_alert_triggered", "service_started", "service_unavailable", "database_connection_lost",
  "sync_projection_retry", "sync_update_rejected", "revision_maintenance", "revision_maintenance_failed",
  "lifecycle_purge_completed", "lifecycle_purge_failed", "migration_completed", "migration_failed",
  "backup_completed", "backup_failed", "backup_pruned", "rpo_checked",
  "restore_completed", "restore_failed", "upgrade_completed", "upgrade_failed", "rollback_completed"
]);
const metrics = new Set([
  "autosave_failure_rate_percent", "search_p95_ms", "purge_failure_count", "purge_resource_count",
  "backup_failure_count", "service_unavailable_count", "sync_conflict_count",
  "sync_projection_retry_count", "revision_failure_count", "backup_age_seconds", "backup_size_bytes",
  "backup_checksum_verified", "restore_duration_ms", "rollback_duration_ms"
]);
const operations = new Set(["save", "search", "purge", "backup", "restore", "upgrade", "rollback", "migration", "revision_maintenance"]);
const routeSegments = new Set([
  "", "api", "account", "withdrawal", "cancel", "auth", "callback", "login", "logout", "session",
  "export", "health", "live", "ready", "lyrics", "display-settings", "duplicate", "resources",
  "rhyme-insertion", "profile", "prompts", "favorite", "pin", "songs", "use", "suggestions", "recent",
  "open", "position", "rhymes", "color", "insertion-source", "tags", "saved", "pins", "order", "search",
  "settings", "links", "templates", "apply", "trash", "permanent", "restore", "workspace", "new", "edit",
  "privacy", "terms", "favorites", ":id"
]);

export function createRequestId(candidate?: string | null): string {
  return candidate && safeRequestId.test(candidate) ? candidate : `req_${randomUUID().replaceAll("-", "")}`;
}

export function toRouteTemplate(pathname: string): string | undefined {
  const path = pathname.split(/[?#]/u, 1)[0];
  if (!path?.startsWith("/") || path.length > 180) return undefined;
  const segments = path.split("/").map((segment) => {
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(segment)) return ":id";
    return routeSegments.has(segment) ? segment : ":value";
  });
  const result = segments.join("/");
  return result.includes(":value") ? undefined : result;
}

export function redactRecursively(value: unknown, key = "", depth = 0): unknown {
  if (depth > 8) return "[REDACTED]";
  // This operational field shares a word with authored templates. Normalize
  // it before the generic denylist; never exempt its raw value from redaction.
  if (key === "routeTemplate") {
    return typeof value === "string" ? toRouteTemplate(value) ?? "[REDACTED]" : "[REDACTED]";
  }
  if (forbiddenKey(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactRecursively(item, key, depth + 1));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value).slice(0, 100)) {
      output[childKey] = redactRecursively(childValue, childKey, depth + 1);
    }
    return output;
  }
  if (typeof value === "string" && looksSecret(value)) return "[REDACTED]";
  return value;
}

export function sanitizeTelemetry(input: TelemetryInput): TelemetryRecord {
  const output: TelemetryRecord = {};
  // Drop unknown fields before traversing their values, while keeping the
  // original top-level bound and child depth for allowed fields.
  for (const [key, raw] of Object.entries(input).slice(0, 100)) {
    if (!allowed.has(key)) continue;
    const value = sanitizeValue(key as AllowedField, redactRecursively(raw, key, 1));
    if (value !== undefined) output[key as AllowedField] = value;
  }
  return output;
}

export function consoleTelemetryTransport(write: (line: string) => void = console.log): TelemetryTransport {
  return { emit(record) { write(JSON.stringify(record)); } };
}

export class MemoryTelemetryTransport implements TelemetryTransport {
  readonly records: TelemetryRecord[] = [];
  emit(record: Readonly<TelemetryRecord>): void { this.records.push({ ...record }); }
}

export class Observability {
  constructor(
    private readonly identity: ObservabilityIdentity,
    private readonly transports: readonly TelemetryTransport[] = [consoleTelemetryTransport()]
  ) {}

  record(input: TelemetryInput): TelemetryRecord {
    const record = sanitizeTelemetry({ ...input, ...this.identity, timestamp: new Date().toISOString() });
    try {
      const span = tracer.startSpan(typeof record.event === "string" ? record.event : "operational_event", {
        attributes: otelAttributes(record)
      });
      if (record.outcome === "failure" || record.outcome === "unavailable") {
        span.setStatus({ code: SpanStatusCode.ERROR, message: typeof record.errorCode === "string" ? record.errorCode : undefined });
      }
      span.end();
    } catch {}
    for (const transport of this.transports) {
      try {
        const emitted = transport.emit(record);
        if (emitted && typeof emitted.then === "function") void emitted.catch(() => undefined);
      } catch {}
    }
    return record;
  }

  async measure<Value>(event: string, input: TelemetryInput, operation: () => Promise<Value>): Promise<Value> {
    const start = performance.now();
    try {
      const value = await operation();
      this.record({ ...input, signal: "trace", event, durationMs: performance.now() - start, outcome: "success" });
      return value;
    } catch (error) {
      this.record({ ...input, signal: "trace", event, durationMs: performance.now() - start,
        outcome: "failure", errorCode: operationalErrorCode(error) });
      throw error;
    }
  }
}

export interface AlertRule {
  readonly metric: string;
  readonly comparator: "gt" | "gte";
  readonly threshold: number;
  readonly severity: "warning" | "critical";
  readonly runbook: string;
}

export function evaluateAlerts(
  identity: ObservabilityIdentity,
  snapshot: Readonly<Record<string, number>>,
  rules: readonly AlertRule[]
): TelemetryRecord[] {
  return rules.flatMap((rule) => {
    const value = snapshot[rule.metric];
    const triggered = value !== undefined && Number.isFinite(value)
      && (rule.comparator === "gte" ? value >= rule.threshold : value > rule.threshold);
    if (!triggered) return [];
    const record = sanitizeTelemetry({ ...identity, timestamp: new Date().toISOString(), signal: "alert",
      event: "operational_alert_triggered", alert: rule.metric, metric: rule.metric, value,
      threshold: rule.threshold, severity: rule.severity, runbook: rule.runbook, outcome: "failure" });
    return record.metric === rule.metric && record.alert === rule.metric && record.runbook === rule.runbook ? [record] : [];
  });
}

export function buildOperationalDashboard(records: readonly Readonly<TelemetryRecord>[]) {
  const aggregates = new Map<string, { service: string; metric: string; samples: number; maximum: number; latest: number }>();
  for (const unsafeRecord of records) {
    const record = sanitizeTelemetry(unsafeRecord);
    if (typeof record.service !== "string" || typeof record.metric !== "string" || typeof record.value !== "number") continue;
    const key = `${record.service}:${record.metric}`;
    const current = aggregates.get(key);
    aggregates.set(key, {
      service: record.service,
      metric: record.metric,
      samples: (current?.samples ?? 0) + 1,
      maximum: Math.max(current?.maximum ?? Number.NEGATIVE_INFINITY, record.value),
      latest: record.value
    });
  }
  return { panels: [...aggregates.values()].sort((left, right) =>
    left.service.localeCompare(right.service) || left.metric.localeCompare(right.metric)) };
}

function sanitizeValue(key: AllowedField, value: unknown): TelemetryValue | undefined {
  if (["durationMs", "value", "count", "threshold"].includes(key)) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 1000) / 1000 : undefined;
  }
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (key === "timestamp") return /^\d{4}-\d{2}-\d{2}T/u.test(value) ? value.slice(0, 32) : undefined;
  if (key === "service") return ["web", "collaboration", "worker", "database", "backup", "migration"].includes(value) ? value : undefined;
  if (key === "environment") return ["development", "test", "production"].includes(value) ? value : undefined;
  if (key === "version" || key === "buildId") return safeIdentifier.test(value) ? value : undefined;
  if (key === "signal") return ["log", "metric", "trace", "alert"].includes(value) ? value : undefined;
  if (key === "event") return events.has(value) ? value : undefined;
  if (key === "metric" || key === "alert") return metrics.has(value) ? value : undefined;
  if (key === "operation") return operations.has(value) ? value : undefined;
  if (key === "routeTemplate") return toRouteTemplate(value);
  if (key === "method") return methods.has(value) ? value : undefined;
  if (key === "statusClass") return statusClasses.has(value) ? value : undefined;
  if (key === "errorCode") return safeCode.test(value) ? value : undefined;
  if (key === "resourceType") return resourceTypes.has(value) ? value : undefined;
  if (key === "requestId") return safeRequestId.test(value) ? value : undefined;
  if (key === "unit") return units.has(value) ? value : undefined;
  if (key === "outcome") return outcomes.has(value) ? value : undefined;
  if (key === "severity") return severities.has(value) ? value : undefined;
  if (key === "runbook") return safeRunbook.test(value) ? value : undefined;
  return undefined;
}

function forbiddenKey(key: string): boolean {
  const normalized = key.replace(/[^A-Za-z0-9]/gu, "").toLowerCase();
  return forbidden.some((part) => normalized.includes(part));
}

function looksSecret(value: string): boolean {
  return /(?:bearer\s+|oauth|refresh[_-]?token|access[_-]?token|authorization|cookie=|-----BEGIN)/iu.test(value);
}

function operationalErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && safeCode.test(error.code)) return error.code;
  return "OPERATION_FAILED";
}

function otelAttributes(record: TelemetryRecord): Attributes {
  const attributes: Attributes = {};
  for (const [key, value] of Object.entries(record)) if (key !== "timestamp" && value !== undefined) attributes[key] = value;
  return attributes;
}
