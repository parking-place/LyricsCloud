import { describe, expect, it } from "vitest";
import type { AuthConfig } from "@lyricscloud/config";
import type { AuthIdentityInput, AuthStore } from "@lyricscloud/database";
import { cookieNames, sessionCookie, transactionCookie } from "./cookies.js";
import { tokenHash } from "./crypto.js";
import { OidcCodeRejectedError, type OidcAdapter, type OidcIdentity } from "./oidc.js";
import { AuthError, AuthService, safeReturnTo } from "./service.js";

const config: AuthConfig = {
  appOrigin: "http://localhost:8080",
  issuer: "https://accounts.google.com/",
  clientId: "synthetic-client",
  clientSecret: "synthetic-secret",
  sessionSecret: "synthetic-session-secret-at-least-32-bytes",
  allowedEmails: new Set(["allowed@example.com"]),
  secureCookies: false
};

class MemoryStore implements AuthStore {
  transactions = new Map<string, { expiresAt: Date; consumed: boolean }>();
  sessions = new Map<string, { userId: string; expiresAt: Date; absoluteExpiresAt: Date; revoked: boolean }>();
  identities = new Map<string, string>();
  registerTransaction(hash: string, expiresAt: Date) { this.transactions.set(hash, { expiresAt, consumed: false }); return Promise.resolve(); }
  consumeTransaction(hash: string, now: Date) {
    const row = this.transactions.get(hash);
    if (!row || row.consumed || row.expiresAt <= now) return Promise.resolve(false);
    row.consumed = true; return Promise.resolve(true);
  }
  upsertIdentity(identity: AuthIdentityInput) {
    const key = `${identity.issuer}:${identity.subject}`;
    const id = this.identities.get(key) ?? "00000000-0000-4000-8000-000000000001";
    this.identities.set(key, id); return Promise.resolve(id);
  }
  createSession(hash: string, userId: string, expiresAt: Date, absoluteExpiresAt: Date) {
    this.sessions.set(hash, { userId, expiresAt, absoluteExpiresAt, revoked: false }); return Promise.resolve();
  }
  readSession(hash: string, now: Date) {
    const row = this.sessions.get(hash);
    return Promise.resolve(row && !row.revoked && row.expiresAt > now && row.absoluteExpiresAt > now ? row : null);
  }
  renewSession(hash: string, expiresAt: Date) {
    const row = this.sessions.get(hash); if (!row || row.revoked) return Promise.resolve(false);
    row.expiresAt = expiresAt; return Promise.resolve(true);
  }
  revokeSession(hash: string) { const row = this.sessions.get(hash); if (row) row.revoked = true; return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

class FakeOidc implements OidcAdapter {
  state = "";
  identity: OidcIdentity = {
    issuer: "https://accounts.google.com",
    subject: "google-subject-1",
    email: "Allowed@Example.com",
    emailVerified: true
  };
  authorizationUrl(input: { state: string }) {
    this.state = input.state;
    return Promise.resolve(new URL(`https://accounts.google.com/o/oauth2/v2/auth?state=${input.state}`));
  }
  exchange() { return Promise.resolve(this.identity); }
}

const now = new Date("2026-09-04T12:00:00.000Z");

async function login(store = new MemoryStore(), oidc = new FakeOidc()) {
  const service = new AuthService(config, store, oidc, { now: () => now });
  const started = await service.beginLogin("/songs?view=recent");
  const callback = new URL(`http://localhost:8080/api/auth/callback?code=synthetic-code&state=${oidc.state}`);
  return { service, store, oidc, started, callback };
}

describe("OIDC login boundary", () => {
  it("issues one opaque session and reuses the issuer+subject user", async () => {
    const flow = await login();
    const first = await flow.service.completeLogin(flow.callback, flow.started.transaction);
    const secondFlow = await login(flow.store, flow.oidc);
    const second = await secondFlow.service.completeLogin(secondFlow.callback, secondFlow.started.transaction);
    expect(first.userId).toBe(second.userId);
    expect(first.returnTo).toBe("/songs?view=recent");
    expect(flow.store.sessions.has(first.sessionToken)).toBe(false);
    expect(flow.store.sessions.has(tokenHash(first.sessionToken))).toBe(true);
  });

  it("distinguishes bad state, callback replay, cancellation, and denied accounts", async () => {
    const bad = await login();
    await expect(bad.service.completeLogin(new URL(`${bad.callback.href}tampered`), bad.started.transaction))
      .rejects.toMatchObject({ code: "AUTH_STATE_INVALID" } satisfies Partial<AuthError>);

    const replay = await login();
    await replay.service.completeLogin(replay.callback, replay.started.transaction);
    await expect(replay.service.completeLogin(replay.callback, replay.started.transaction))
      .rejects.toMatchObject({ code: "AUTH_CALLBACK_REPLAYED" });

    const cancelled = await login();
    const cancelUrl = new URL(`http://localhost:8080/api/auth/callback?error=access_denied&state=${cancelled.oidc.state}`);
    await expect(cancelled.service.completeLogin(cancelUrl, cancelled.started.transaction))
      .rejects.toMatchObject({ code: "AUTH_CANCELLED" });

    const deniedOidc = new FakeOidc();
    deniedOidc.identity = { ...deniedOidc.identity, email: "outsider@example.com" };
    const denied = await login(new MemoryStore(), deniedOidc);
    await expect(denied.service.completeLogin(denied.callback, denied.started.transaction))
      .rejects.toMatchObject({ code: "AUTH_NOT_ALLOWED" });
    expect(denied.store.sessions.size).toBe(0);

    const reusedCodeOidc = new FakeOidc();
    reusedCodeOidc.exchange = () => Promise.reject(new OidcCodeRejectedError());
    const reusedCode = await login(new MemoryStore(), reusedCodeOidc);
    await expect(reusedCode.service.completeLogin(reusedCode.callback, reusedCode.started.transaction))
      .rejects.toMatchObject({ code: "AUTH_CALLBACK_REPLAYED" });
  });

  it("renews an expiring session, expires an old one, and revokes on logout", async () => {
    const flow = await login();
    const result = await flow.service.completeLogin(flow.callback, flow.started.transaction);
    const hash = tokenHash(result.sessionToken);
    flow.store.sessions.get(hash)!.expiresAt = new Date(now.getTime() + 60_000);
    expect(await flow.service.resolveSession(result.sessionToken)).toMatchObject({ renewed: true, userId: result.userId });
    await flow.service.logout(result.sessionToken);
    await expect(flow.service.resolveSession(result.sessionToken)).rejects.toMatchObject({ code: "AUTH_SESSION_EXPIRED" });

    const expired = await login();
    const expiredResult = await expired.service.completeLogin(expired.callback, expired.started.transaction);
    expired.store.sessions.get(tokenHash(expiredResult.sessionToken))!.expiresAt = new Date(now.getTime() - 1);
    await expect(expired.service.resolveSession(expiredResult.sessionToken))
      .rejects.toMatchObject({ code: "AUTH_SESSION_EXPIRED" });
  });
});

describe("redirect and cookie policy", () => {
  it.each(["https://evil.test", "//evil.test/path", "/\\evil", "javascript:alert(1)", "/ok\nX-Test: bad"])("rejects %s", (value) => {
    expect(safeReturnTo(value)).toBe("/");
  });
  it("keeps an internal path and applies the accepted cookie attributes", () => {
    expect(safeReturnTo("/songs/1?tab=lyrics#verse")).toBe("/songs/1?tab=lyrics#verse");
    expect(cookieNames(config)).toEqual({ session: "lc_session", transaction: "lc_oidc" });
    expect(sessionCookie(config, "opaque")).toContain("HttpOnly; SameSite=Lax; Max-Age=2592000");
    expect(sessionCookie({ secureCookies: true }, "opaque"))
      .toContain("__Host-lc_session=opaque; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure");
    expect(transactionCookie({ secureCookies: true }, "sealed")).toContain("__Host-lc_oidc=sealed; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure");
  });
});
