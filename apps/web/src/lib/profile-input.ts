import type { ProfilePatchInput } from "@lyricscloud/database";

export class ProfileInputError extends Error {
  readonly code = "VALIDATION_FAILED" as const;
  constructor(readonly fields: readonly string[]) { super("VALIDATION_FAILED"); this.name = "ProfileInputError"; }
}

export function parseProfileInput(value: unknown): ProfilePatchInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ProfileInputError(["body"]);
  const input = value as Record<string, unknown>;
  const fields: string[] = [];
  if (!Number.isSafeInteger(input.expectedRowVersion) || Number(input.expectedRowVersion) < 1)
    fields.push("expectedRowVersion");
  const hasName = Object.hasOwn(input, "displayName");
  const hasAvatar = Object.hasOwn(input, "avatar");
  if (!hasName && !hasAvatar) fields.push("body");
  let displayName: string | null | undefined;
  if (hasName) {
    if (input.displayName === null) displayName = null;
    else if (typeof input.displayName === "string") {
      displayName = input.displayName.trim();
      if (!displayName || [...displayName].length > 120) fields.push("displayName");
    } else fields.push("displayName");
  }
  if (hasAvatar && input.avatar !== null) fields.push("avatar");
  if (Object.hasOwn(input, "avatarUrl") || Object.hasOwn(input, "owner_id")) fields.push("body");
  if (fields.length) throw new ProfileInputError(fields);
  return { expectedRowVersion: Number(input.expectedRowVersion),
    ...(hasName ? { displayName } : {}), ...(hasAvatar ? { avatar: null } : {}) };
}
