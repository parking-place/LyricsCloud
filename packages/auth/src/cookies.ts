import type { AuthConfig } from "@lyricscloud/config";

const SESSION_SECONDS = 60 * 60 * 24 * 30;
const TRANSACTION_SECONDS = 60 * 10;

export function cookieNames(config: Pick<AuthConfig, "secureCookies">) {
  return config.secureCookies
    ? { session: "__Host-lc_session", transaction: "__Host-lc_oidc" }
    : { session: "lc_session", transaction: "lc_oidc" };
}

export function transactionCookie(config: Pick<AuthConfig, "secureCookies">, value: string): string {
  return serialize(cookieNames(config).transaction, value, TRANSACTION_SECONDS, config.secureCookies);
}

export function sessionCookie(config: Pick<AuthConfig, "secureCookies">, value: string, maxAge = SESSION_SECONDS): string {
  return serialize(cookieNames(config).session, value, maxAge, config.secureCookies);
}

export function clearTransactionCookie(config: Pick<AuthConfig, "secureCookies">): string {
  return serialize(cookieNames(config).transaction, "", 0, config.secureCookies);
}

export function clearSessionCookie(config: Pick<AuthConfig, "secureCookies">): string {
  return serialize(cookieNames(config).session, "", 0, config.secureCookies);
}

export function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1)); } catch { return null; }
  }
  return null;
}

function serialize(name: string, value: string, maxAge: number, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
