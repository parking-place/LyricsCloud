import type { ValidationIssue } from "./result.js";

export const SEARCH_RESOURCE_TYPES = ["song", "lyrics", "rhyme_note", "prompt"] as const;
export type SearchResourceType = (typeof SEARCH_RESOURCE_TYPES)[number];
export type SearchTypeFilter = "all" | SearchResourceType;
export type SearchMatchField = "title" | "tag" | "body";

export interface UnifiedSearchInput {
  readonly query: string;
  readonly type: SearchTypeFilter;
  readonly limit: number;
  readonly cursor?: string;
}

export interface UnifiedSearchResult {
  readonly id: string;
  readonly type: SearchResourceType;
  readonly title: string;
  readonly matchField: SearchMatchField;
  readonly preview: string;
  readonly linkedSongIds: readonly string[];
  readonly score: number;
  readonly updatedAt: string;
}

export interface UnifiedSearchPage {
  readonly items: readonly UnifiedSearchResult[];
  readonly nextCursor: string | null;
}

export const RECENT_SEARCH_LIMIT = 8;

export interface RecentSearchRecord {
  readonly id: string;
  readonly query: string;
  readonly type: SearchTypeFilter;
  readonly searchedAt: string;
}

export interface RecordRecentSearchInput {
  readonly query: string;
  readonly type: SearchTypeFilter;
}

export class SearchValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "SearchValidationError";
  }
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function escapeSearchLikeLiteral(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export function findSearchLiteralRange(text: string, query: string): { readonly from: number; readonly to: number } | null {
  const needle = normalizeSearchText(query);
  if (!needle) return null;
  let normalized = "";
  const offsets: Array<{ from: number; to: number }> = [];
  let sourceOffset = 0;
  let pendingSpace: { from: number; to: number } | null = null;
  const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text);
  for (const { segment: point } of graphemes) {
    const from = sourceOffset;
    sourceOffset += point.length;
    if (/^\s+$/u.test(point)) {
      if (normalized) {
        const spaceFrom: number = pendingSpace === null ? from : pendingSpace.from;
        pendingSpace = { from: spaceFrom, to: sourceOffset };
      }
      continue;
    }
    if (pendingSpace) {
      normalized += " ";
      offsets.push(pendingSpace);
      pendingSpace = null;
    }
    for (const normalizedPoint of point.normalize("NFKC").toLowerCase()) {
      normalized += normalizedPoint;
      offsets.push({ from, to: sourceOffset });
    }
  }
  const index = normalized.indexOf(needle);
  if (index < 0) return null;
  const pointIndex = [...normalized.slice(0, index)].length;
  const start = offsets[pointIndex];
  const end = offsets[pointIndex + [...needle].length - 1];
  return start && end ? { from: start.from, to: end.to } : null;
}

export function parseUnifiedSearchInput(params: URLSearchParams): UnifiedSearchInput {
  const issues: ValidationIssue[] = [];
  const query = normalizeSearchText(params.get("q") ?? "");
  if (!query) issues.push({ field: "q", code: "required" });
  if ([...query].length > 200) issues.push({ field: "q", code: "too_long" });

  const rawType = params.get("type") ?? "all";
  const type = (["all", ...SEARCH_RESOURCE_TYPES] as readonly string[]).includes(rawType)
    ? rawType as SearchTypeFilter
    : (issues.push({ field: "type", code: "invalid" }), "all" as const);

  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? 20 : Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) issues.push({ field: "limit", code: "invalid" });

  const cursor = params.get("cursor") || undefined;
  if (cursor && (cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor))) {
    issues.push({ field: "cursor", code: "invalid" });
  }
  if (issues.length) throw new SearchValidationError(issues);
  return { query, type, limit, ...(cursor ? { cursor } : {}) };
}

export function parseRecordRecentSearchInput(value: unknown): RecordRecentSearchInput {
  const issues: ValidationIssue[] = [];
  const input = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const query = normalizeSearchText(typeof input.query === "string" ? input.query : "");
  if (!query) issues.push({ field: "query", code: "required" });
  if ([...query].length > 200) issues.push({ field: "query", code: "too_long" });
  const type = typeof input.type === "string" && (["all", ...SEARCH_RESOURCE_TYPES] as readonly string[]).includes(input.type)
    ? input.type as SearchTypeFilter
    : (issues.push({ field: "type", code: "invalid" }), "all" as const);
  if (issues.length) throw new SearchValidationError(issues);
  return { query, type };
}
