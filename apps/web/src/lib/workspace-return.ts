type WorkspaceReturnFallback = "/songs" | "/rhymes" | "/prompts";

export function safeWorkspaceReturnTo(value: string | undefined, fallback: WorkspaceReturnFallback = "/songs"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "https://lyricscloud.local");
    if (parsed.origin !== "https://lyricscloud.local") return fallback;
    return ["/workspace", "/songs", "/rhymes", "/prompts", "/lyrics", "/search"].some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))
      ? `${parsed.pathname}${parsed.search}` : fallback;
  } catch { return fallback; }
}
