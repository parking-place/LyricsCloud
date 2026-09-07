export function safeWorkspaceReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/songs";
  try {
    const parsed = new URL(value, "https://lyricscloud.local");
    if (parsed.origin !== "https://lyricscloud.local") return "/songs";
    return ["/workspace", "/songs", "/rhymes", "/prompts", "/lyrics"].some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))
      ? `${parsed.pathname}${parsed.search}` : "/songs";
  } catch { return "/songs"; }
}
