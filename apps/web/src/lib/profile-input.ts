import type { ProfileInput } from "@lyricscloud/database";

export class ProfileInputError extends Error {
  readonly code = "VALIDATION_FAILED" as const;
  constructor(readonly fields: readonly string[]) { super("VALIDATION_FAILED"); this.name = "ProfileInputError"; }
}

export function parseProfileInput(value: unknown): ProfileInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ProfileInputError(["body"]);
  const input = value as Record<string, unknown>;
  const fields: string[] = [];
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (!displayName || displayName.length > 120) fields.push("displayName");
  let avatarUrl: string | null = null;
  if (input.avatarUrl !== undefined && input.avatarUrl !== null && input.avatarUrl !== "") {
    if (typeof input.avatarUrl !== "string" || input.avatarUrl.length > 2048 || !isHttpUrl(input.avatarUrl)) fields.push("avatarUrl");
    else avatarUrl = input.avatarUrl;
  }
  if (fields.length) throw new ProfileInputError(fields);
  return { displayName, avatarUrl };
}

function isHttpUrl(value: string): boolean {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
