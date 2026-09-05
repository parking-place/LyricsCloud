export function safeSongReturnTo(value: string | undefined): string {
  if (!value || (value !== "/songs" && !value.startsWith("/songs?")) || value.includes("\n") || value.includes("\r")) return "/songs";
  return value;
}
