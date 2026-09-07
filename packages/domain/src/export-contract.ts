export const EXPORT_SCHEMA_VERSION = "lyricscloud.export.v1" as const;
export const EXPORT_BATCH_SIZE = 50;
export const EXPORT_SECTIONS = ["account", "profile", "identities", "resources", "songs", "lyrics", "rhymeNotes", "prompts", "promptDictionary", "promptTokens", "tags", "resourceTags", "songResourceLinks", "templates", "templatePreferences", "settings", "lyricDisplaySettings", "recentItems", "recentSearches", "lyricRevisions"] as const;
export type ExportSection = typeof EXPORT_SECTIONS[number];
export interface ExportDocument { readonly schemaVersion: typeof EXPORT_SCHEMA_VERSION; readonly exportedAt: string; readonly records: readonly { readonly section: ExportSection; readonly data: Record<string, unknown> }[] }

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const UNSAFE_FILENAME = /[\u0000-\u001f\u007f<>:"/\\|?*]/g;

export function safeExportFilename(title: string, id: string, extension: "md" | "txt"): string {
  const normalized = title.normalize("NFKC").replace(UNSAFE_FILENAME, "_").replace(/\s+/g, " ").replace(/\s*_\s*/g, "_").trim().replace(/[. ]+$/g, "");
  let base = [...(normalized || "제목 없음")].slice(0, 72).join("");
  if (WINDOWS_RESERVED.test(base)) base = `_${base}`;
  const suffix = /^[0-9a-f-]{8,}$/i.test(id) ? id.replaceAll("-", "").slice(0, 8).toLowerCase() : "unknown";
  return `${base}--${suffix}.${extension}`;
}

export function exportArchiveFilename(at: Date): string {
  const date = at.toISOString().slice(0, 10).replaceAll("-", "");
  return `lyricscloud-export-${date}.zip`;
}

export function safeMarkdownHeading(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim() || "제목 없음";
}

export function validateExportDocument(value: unknown): ExportDocument {
  if (!value || typeof value !== "object") throw new Error("EXPORT_SCHEMA_INVALID");
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== EXPORT_SCHEMA_VERSION || typeof input.exportedAt !== "string" || !Number.isFinite(Date.parse(input.exportedAt)) || !Array.isArray(input.records)) throw new Error("EXPORT_SCHEMA_INVALID");
  const allowed = new Set<string>(EXPORT_SECTIONS);
  const records = input.records as Array<{ section?: unknown; data?: unknown }>;
  if (records.some((record) => !record || typeof record !== "object" || typeof record.section !== "string" || !allowed.has(record.section) || !record.data || typeof record.data !== "object" || Array.isArray(record.data))) throw new Error("EXPORT_SCHEMA_INVALID");
  const bySection = new Map<string, Record<string, unknown>[]>();
  for (const record of records) bySection.set(record.section as string, [...(bySection.get(record.section as string) ?? []), record.data as Record<string, unknown>]);
  const resources = ids(bySection.get("resources"));
  const tags = ids(bySection.get("tags"));
  const templates = ids(bySection.get("templates"));
  const dictionary = ids(bySection.get("promptDictionary"));
  requireReferences(bySection.get("songs"), "resource_id", resources);
  requireReferences(bySection.get("lyrics"), "resource_id", resources); requireReferences(bySection.get("lyrics"), "song_id", resources);
  requireReferences(bySection.get("rhymeNotes"), "resource_id", resources); requireReferences(bySection.get("prompts"), "resource_id", resources);
  requireReferences(bySection.get("promptTokens"), "prompt_resource_id", resources); requireReferences(bySection.get("promptTokens"), "dictionary_token_id", dictionary);
  requireReferences(bySection.get("resourceTags"), "resource_id", resources); requireReferences(bySection.get("resourceTags"), "tag_id", tags);
  requireReferences(bySection.get("songResourceLinks"), "song_resource_id", resources); requireReferences(bySection.get("songResourceLinks"), "linked_resource_id", resources);
  requireReferences(bySection.get("templatePreferences"), "template_id", templates);
  requireReferences(bySection.get("lyricDisplaySettings"), "lyric_id", resources);
  requireReferences(bySection.get("recentItems"), "resource_id", resources);
  requireReferences(bySection.get("lyricRevisions"), "resource_id", resources);
  return input as unknown as ExportDocument;
}

function ids(rows: readonly Record<string, unknown>[] | undefined): Set<string> {
  return new Set((rows ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string"));
}
function requireReferences(rows: readonly Record<string, unknown>[] | undefined, field: string, targets: ReadonlySet<string>): void {
  for (const row of rows ?? []) if (row[field] !== null && (typeof row[field] !== "string" || !targets.has(row[field] as string))) throw new Error(`EXPORT_REFERENCE_INVALID:${field}`);
}
