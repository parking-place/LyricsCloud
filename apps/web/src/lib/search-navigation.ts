import { normalizeSearchText, type SearchTypeFilter, type UnifiedSearchResult } from "@lyricscloud/domain";

export function buildSearchUrl(query: string, type: SearchTypeFilter): string {
  const params = new URLSearchParams();
  const normalized = normalizeSearchText(query);
  if (normalized) params.set("q", normalized);
  if (type !== "all") params.set("type", type);
  const serialized = params.toString();
  return serialized ? `/search?${serialized}` : "/search";
}

export function buildSearchResultHref(result: Pick<UnifiedSearchResult, "id" | "type" | "matchField">, query: string, type: SearchTypeFilter): string {
  const returnTo = buildSearchUrl(query, type);
  const params = new URLSearchParams({ returnTo });
  if (result.type === "lyrics" && result.matchField === "body") params.set("find", normalizeSearchText(query));
  const base = result.type === "song" ? `/songs/${result.id}`
    : result.type === "lyrics" ? `/lyrics/${result.id}`
      : result.type === "rhyme_note" ? `/rhymes/${result.id}` : `/prompts/${result.id}`;
  return `${base}?${params}`;
}
