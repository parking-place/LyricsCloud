import type { ValidationIssue } from "./result.js";

export const SUNO_MODEL_SUGGESTIONS = ["v3", "v3.5", "v4", "v4.5", "v4.5+", "v4.5-all", "v5", "v5.5"] as const;
export const SUNO_WORKSPACE_LIMITS = {
  modelLabel: 64,
  links: 20,
  url: 2_048,
  query: 1_024,
  title: 200,
  note: 1_000
} as const;

export interface SunoWorkspaceLink {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly note: string;
  readonly position: number;
  readonly rowVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SunoWorkspace {
  readonly modelLabel: string | null;
  readonly links: readonly SunoWorkspaceLink[];
  readonly rowVersion: number;
}

interface CommandBase {
  readonly requestId: string;
  readonly expectedVersion: number;
}

export type SunoWorkspaceCommand =
  | (CommandBase & { readonly command: "set_model"; readonly modelLabel: string | null })
  | (CommandBase & { readonly command: "create_link"; readonly url: string; readonly title: string; readonly note: string })
  | (CommandBase & { readonly command: "update_link"; readonly linkId: string; readonly url?: string; readonly title?: string; readonly note?: string })
  | (CommandBase & { readonly command: "remove_link"; readonly linkId: string })
  | (CommandBase & { readonly command: "reorder_links"; readonly linkIds: readonly string[] });

export class SunoWorkspaceValidationError extends Error {
  readonly code = "VALIDATION_FAILED" as const;
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "SunoWorkspaceValidationError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SONG_PATH = /^\/song\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i;
const SHORT_PATH = /^\/s\/([A-Za-z0-9_-]{6,128})\/?$/;
const ALL_CONTROLS = /[\u0000-\u001f\u007f-\u009f]/u;
const MULTILINE_CONTROLS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u;

export function parseSunoWorkspaceCommand(value: unknown): SunoWorkspaceCommand {
  const issues: ValidationIssue[] = [];
  const input = objectInput(value, issues);
  const requestId = uuid(input.requestId, "requestId", issues);
  const expectedVersion = version(input.expectedVersion, issues);
  const command = typeof input.command === "string" ? input.command : "";
  const allowedByCommand: Record<string, readonly string[]> = {
    set_model: ["requestId", "expectedVersion", "command", "modelLabel"],
    create_link: ["requestId", "expectedVersion", "command", "url", "title", "note"],
    update_link: ["requestId", "expectedVersion", "command", "linkId", "url", "title", "note"],
    remove_link: ["requestId", "expectedVersion", "command", "linkId"],
    reorder_links: ["requestId", "expectedVersion", "command", "linkIds"]
  };
  const allowed = allowedByCommand[command];
  if (!allowed) issues.push({ field: "command", code: "unsupported_value" });
  else for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) issues.push({ field: key, code: "unsupported_field" });
  }

  if (command === "set_model") {
    const modelLabel = modelValue(input.modelLabel, issues);
    if (issues.length) throw new SunoWorkspaceValidationError(issues);
    return { requestId, expectedVersion, command, modelLabel };
  }
  if (command === "create_link") {
    const url = sunoUrl(input.url, issues);
    const title = titleValue(input.title, issues, true);
    const note = noteValue(input.note, issues, true);
    if (issues.length) throw new SunoWorkspaceValidationError(issues);
    return { requestId, expectedVersion, command, url, title, note };
  }
  if (command === "update_link") {
    const linkId = uuid(input.linkId, "linkId", issues);
    const result: { url?: string; title?: string; note?: string } = {};
    if ("url" in input) result.url = sunoUrl(input.url, issues);
    if ("title" in input) result.title = titleValue(input.title, issues, false);
    if ("note" in input) result.note = noteValue(input.note, issues, false);
    if (!Object.keys(result).length) issues.push({ field: "body", code: "at_least_one_field" });
    if (issues.length) throw new SunoWorkspaceValidationError(issues);
    return { requestId, expectedVersion, command, linkId, ...result };
  }
  if (command === "remove_link") {
    const linkId = uuid(input.linkId, "linkId", issues);
    if (issues.length) throw new SunoWorkspaceValidationError(issues);
    return { requestId, expectedVersion, command, linkId };
  }
  if (command === "reorder_links") {
    const linkIds = uuidList(input.linkIds, issues);
    if (issues.length) throw new SunoWorkspaceValidationError(issues);
    return { requestId, expectedVersion, command, linkIds };
  }
  throw new SunoWorkspaceValidationError(issues);
}

function objectInput(value: unknown, issues: ValidationIssue[]): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  issues.push({ field: "body", code: "object_required" });
  return {};
}

function version(value: unknown, issues: ValidationIssue[]): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    issues.push({ field: "expectedVersion", code: "non_negative_safe_integer_required" });
    return 0;
  }
  return value as number;
}

function uuid(value: unknown, field: string, issues: ValidationIssue[]): string {
  if (typeof value !== "string" || !UUID.test(value)) {
    issues.push({ field, code: "uuid_required" });
    return "00000000-0000-4000-8000-000000000000";
  }
  return value.toLowerCase();
}

function modelValue(value: unknown, issues: ValidationIssue[]): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    issues.push({ field: "modelLabel", code: "string_or_null_required" });
    return null;
  }
  const normalized = value.normalize("NFC").trim();
  if (!normalized) return null;
  if (ALL_CONTROLS.test(normalized)) issues.push({ field: "modelLabel", code: "control_character" });
  if (codePoints(normalized) > SUNO_WORKSPACE_LIMITS.modelLabel) issues.push({ field: "modelLabel", code: "too_long" });
  return normalized;
}

function titleValue(value: unknown, issues: ValidationIssue[], optional: boolean): string {
  if (value === undefined && optional) return "";
  if (typeof value !== "string") {
    issues.push({ field: "title", code: "string_required" });
    return "";
  }
  const normalized = value.normalize("NFC").trim();
  if (ALL_CONTROLS.test(normalized)) issues.push({ field: "title", code: "control_character" });
  if (codePoints(normalized) > SUNO_WORKSPACE_LIMITS.title) issues.push({ field: "title", code: "too_long" });
  return normalized;
}

function noteValue(value: unknown, issues: ValidationIssue[], optional: boolean): string {
  if (value === undefined && optional) return "";
  if (typeof value !== "string") {
    issues.push({ field: "note", code: "string_required" });
    return "";
  }
  const normalized = value.normalize("NFC");
  if (MULTILINE_CONTROLS.test(normalized)) issues.push({ field: "note", code: "control_character" });
  if (codePoints(normalized) > SUNO_WORKSPACE_LIMITS.note) issues.push({ field: "note", code: "too_long" });
  return normalized;
}

function sunoUrl(value: unknown, issues: ValidationIssue[]): string {
  if (typeof value !== "string") {
    issues.push({ field: "url", code: "string_required" });
    return "";
  }
  const raw = value.trim();
  if (!raw || codePoints(raw) > SUNO_WORKSPACE_LIMITS.url || ALL_CONTROLS.test(raw)) {
    issues.push({ field: "url", code: !raw ? "required" : "invalid_or_too_long" });
    return raw;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || parsed.hash) throw new Error();
    const host = parsed.hostname.toLowerCase();
    if (host !== "suno.com" && host !== "www.suno.com") throw new Error();
    if (codePoints(parsed.search) > SUNO_WORKSPACE_LIMITS.query) throw new Error();
    const song = parsed.pathname.match(SONG_PATH);
    const short = parsed.pathname.match(SHORT_PATH);
    if (!song && !short) throw new Error();
    const path = song ? `/song/${song[1]!.toLowerCase()}` : `/s/${short![1]}`;
    const normalized = `https://${host}${path}${parsed.search}`;
    if (codePoints(normalized) > SUNO_WORKSPACE_LIMITS.url) throw new Error();
    return normalized;
  } catch {
    issues.push({ field: "url", code: "approved_suno_https_url_required" });
    return raw;
  }
}

function uuidList(value: unknown, issues: ValidationIssue[]): string[] {
  if (!Array.isArray(value)) {
    issues.push({ field: "linkIds", code: "array_required" });
    return [];
  }
  if (value.length > SUNO_WORKSPACE_LIMITS.links) issues.push({ field: "linkIds", code: "too_many" });
  const result = value.map((item) => uuid(item, "linkIds", issues));
  if (new Set(result).size !== result.length) issues.push({ field: "linkIds", code: "distinct_values_required" });
  return result;
}

function codePoints(value: string): number {
  return [...value].length;
}
