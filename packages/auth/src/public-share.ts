import { createHash, randomBytes } from "node:crypto";

const PUBLIC_SHARE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const PUBLIC_SHARE_DIGEST_DOMAIN = "lyricscloud-public-link-v1\0";

export class PublicShareTokenError extends Error {
  readonly code = "PUBLIC_SHARE_TOKEN_INVALID" as const;
  constructor() { super("PUBLIC_SHARE_TOKEN_INVALID"); this.name = "PublicShareTokenError"; }
}

export function createPublicShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function parsePublicShareToken(value: unknown): string {
  if (typeof value !== "string" || !PUBLIC_SHARE_TOKEN.test(value)) throw new PublicShareTokenError();
  return value;
}

export function publicShareTokenDigest(value: unknown): string {
  const token = parsePublicShareToken(value);
  return createHash("sha256").update(PUBLIC_SHARE_DIGEST_DOMAIN).update(token).digest("hex");
}
