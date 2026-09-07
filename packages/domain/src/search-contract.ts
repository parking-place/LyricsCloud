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
