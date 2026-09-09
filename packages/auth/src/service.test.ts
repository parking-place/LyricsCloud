import { describe, expect, it } from "vitest";
import { calculatePKCECodeChallenge } from "openid-client";
import { hmacAllowlistDigest, readAuthConfig, type AuthConfig, type BetaSignupConfig } from "@lyricscloud/config";
import { betaSignupEmailDigest, type AuthIdentityInput, type AuthStore, type BetaSignupIntentInput,
  type BetaSignupStore, type BetaAdmissionInput, type BetaRedemptionInput } from "@lyricscloud/database";
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
  async revokeSession(hash: string, now: Date) {
    const session = await this.readSession(hash, now);
    if (session) for (const row of this.sessions.values()) if (row.userId === session.userId) row.revoked = true;
  }
  close() { return Promise.resolve(); }
}

class FakeOidc implements OidcAdapter {
  state = "";
  nonce = "";
  codeChallenge = "";
  codeVerifier = "";
  identity: OidcIdentity = {
    issuer: "https://accounts.google.com",
    subject: "google-subject-1",
    email: "Allowed@Example.com",
    emailVerified: true
  };
  authorizationUrl(input: { state: string; nonce: string; codeChallenge: string }) {
    this.state = input.state;
    this.nonce = input.nonce;
    this.codeChallenge = input.codeChallenge;
    return Promise.resolve(new URL(`https://accounts.google.com/o/oauth2/v2/auth?state=${input.state}`));
  }
  exchange(input: { codeVerifier: string; expectedNonce: string }) {
    this.codeVerifier = input.codeVerifier;
    if (input.expectedNonce !== this.nonce) throw new Error("NONCE_MISMATCH");
    return Promise.resolve(this.identity);
  }
}

class MemoryBetaStore implements BetaSignupStore {
  intents = new Map<string, BetaSignupIntentInput & { cancelled: boolean }>();
  admitted = new Set<string>();
  registerBetaSignupIntent(input: BetaSignupIntentInput) {
    this.intents.set(input.intentDigest, { ...input, cancelled: false });
    return Promise.resolve();
  }
  cancelBetaSignupIntent(intentDigest: string) {
    const intent = this.intents.get(intentDigest);
    if (intent) intent.cancelled = true;
    return Promise.resolve();
  }
  admitIdentity(input: BetaAdmissionInput) {
    const principal = `${input.identity.issuer}:${input.identity.subject}`;
    if (!input.bootstrapAllowed && !this.admitted.has(principal)) return Promise.resolve(null);
    this.admitted.add(principal);
    return Promise.resolve("00000000-0000-4000-8000-000000000002");
  }
  redeemBetaSignup(input: BetaRedemptionInput) {
    const intent = this.intents.get(input.intentDigest);
    if (!intent || intent.cancelled) return Promise.reject(new Error("BETA_SIGNUP_REJECTED"));
    if (intent.emailDigest !== input.verifiedEmailDigest) {
      intent.cancelled = true;
      return Promise.reject(new Error("BETA_EMAIL_MISMATCH"));
    }
    this.admitted.add(`${input.identity.issuer}:${input.identity.subject}`);
    return Promise.resolve({ userId: "00000000-0000-4000-8000-000000000002", outcome: "redeemed" as const });
  }
  close() { return Promise.resolve(); }
}

const betaKey = Buffer.alloc(32, 4);
const betaConfig: BetaSignupConfig = {
  environment: "test",
  indexKid: "test-kid",
  indexKey: betaKey,
  fingerprint: "synthetic"
};

const now = new Date("2026-09-04T12:00:00.000Z");

async function login(store = new MemoryStore(), oidc = new FakeOidc(), authConfig = config) {
  const service = new AuthService(authConfig, store, oidc, { now: () => now });
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

  it("admits a verified existing identity through the environment-bound HMAC bootstrap list", async () => {
    const key = Buffer.alloc(32, 7);
    const record = JSON.stringify({ formatVersion: 1, environment: "development", purpose: "auth-bootstrap",
      normalizationVersion: "nfkc-trim-lower-v1", kid: "development-test",
      digest: hmacAllowlistDigest("allowed@example.com", "development", key), state: "active" });
    const keyring = JSON.stringify({ formatVersion: 1, activeKid: "development-test",
      keys: [{ kid: "development-test", key: key.toString("base64url") }] });
    const hmacConfig = readAuthConfig({ NODE_ENV: "test", APP_ORIGIN: "http://localhost:8080",
      GOOGLE_ISSUER: "http://oidc.test", GOOGLE_CLIENT_ID: "synthetic-client.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "synthetic-secret", SESSION_SECRET: "synthetic-session-secret-at-least-32-bytes",
      AUTH_ALLOWED_EMAILS_FILE: "/allowlist", AUTH_ALLOWLIST_FORMAT: "hmac-v1",
      AUTH_ALLOWLIST_ENVIRONMENT: "development", AUTH_ALLOWLIST_HMAC_KEYRING_FILE: "/keyring" },
    (path) => path === "/keyring" ? keyring : record);
    const permitted = await login(new MemoryStore(), new FakeOidc(), hmacConfig);
    const completed = await permitted.service.completeLogin(permitted.callback, permitted.started.transaction);
    expect(permitted.store.sessions.has(tokenHash(completed.sessionToken))).toBe(true);

    const outsider = new FakeOidc();
    outsider.identity = { ...outsider.identity, email: "outsider@example.com" };
    const denied = await login(new MemoryStore(), outsider, hmacConfig);
    await expect(denied.service.completeLogin(denied.callback, denied.started.transaction))
      .rejects.toMatchObject({ code: "AUTH_NOT_ALLOWED" });
  });

  it("binds the callback exchange to the generated S256 PKCE verifier and nonce", async () => {
    const flow = await login();
    await flow.service.completeLogin(flow.callback, flow.started.transaction);
    expect(flow.oidc.codeVerifier).not.toBe("");
    expect(await calculatePKCECodeChallenge(flow.oidc.codeVerifier)).toBe(flow.oidc.codeChallenge);
    expect(flow.oidc.nonce).not.toBe("");
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

describe("beta signup boundary", () => {
  it("binds a code and claimed email to the verified callback without exposing either in the redirect", async () => {
    const store = new MemoryStore();
    const beta = new MemoryBetaStore();
    const oidc = new FakeOidc();
    oidc.identity = { ...oidc.identity, email: "new-user@example.com" };
    const service = new AuthService(config, store, oidc, { now: () => now }, { config: betaConfig, store: beta });
    const started = await service.beginBetaSignup({ code: "A1B2C3", email: "New-User@Example.com", returnTo: "/workspace" });
    expect(started.authorizationUrl.href).not.toContain("A1B2C3");
    expect(started.authorizationUrl.href).not.toContain("new-user@example.com");
    expect(started.transaction).not.toContain("A1B2C3");
    const callback = new URL(`http://localhost:8080/api/auth/callback?code=synthetic-code&state=${oidc.state}`);
    const result = await service.completeLogin(callback, started.transaction);
    expect(result.userId).toBe("00000000-0000-4000-8000-000000000002");
    expect(beta.admitted.has("https://accounts.google.com:google-subject-1")).toBe(true);
  });

  it("cancels a wrong-account or provider-cancelled intent without creating a session", async () => {
    const store = new MemoryStore();
    const beta = new MemoryBetaStore();
    const oidc = new FakeOidc();
    oidc.identity = { ...oidc.identity, email: "other@example.com" };
    const service = new AuthService(config, store, oidc, { now: () => now }, { config: betaConfig, store: beta });
    const started = await service.beginBetaSignup({ code: "A1B2C3", email: "claimed@example.com", returnTo: "/workspace" });
    await expect(service.completeLogin(
      new URL(`http://localhost:8080/api/auth/callback?code=synthetic-code&state=${oidc.state}`), started.transaction
    )).rejects.toMatchObject({ code: "BETA_EMAIL_MISMATCH", flow: "signup" });
    expect([...beta.intents.values()][0]?.cancelled).toBe(true);
    expect(store.sessions.size).toBe(0);

    const cancelledOidc = new FakeOidc();
    const cancelledBeta = new MemoryBetaStore();
    const cancelledService = new AuthService(config, new MemoryStore(), cancelledOidc, { now: () => now },
      { config: betaConfig, store: cancelledBeta });
    const cancelled = await cancelledService.beginBetaSignup({ code: "Z9Y8X7", email: "new@example.com", returnTo: null });
    await expect(cancelledService.completeLogin(
      new URL(`http://localhost:8080/api/auth/callback?error=access_denied&state=${cancelledOidc.state}`), cancelled.transaction
    )).rejects.toMatchObject({ code: "AUTH_CANCELLED", flow: "signup" });
    expect([...cancelledBeta.intents.values()][0]?.cancelled).toBe(true);
  });

  it("lets a prior beta grant use normal login even when it is not on the bootstrap list", async () => {
    const store = new MemoryStore();
    const beta = new MemoryBetaStore();
    const oidc = new FakeOidc();
    oidc.identity = { ...oidc.identity, email: "granted@example.com" };
    beta.admitted.add("https://accounts.google.com:google-subject-1");
    const service = new AuthService(config, store, oidc, { now: () => now }, { config: betaConfig, store: beta });
    const started = await service.beginLogin("/workspace");
    const result = await service.completeLogin(
      new URL(`http://localhost:8080/api/auth/callback?code=synthetic-code&state=${oidc.state}`), started.transaction
    );
    expect(result.userId).toBe("00000000-0000-4000-8000-000000000002");
  });

  it("uses purpose-separated environment-bound email digests", () => {
    expect(betaSignupEmailDigest(" User@Example.com ", "test", betaKey))
      .toBe(betaSignupEmailDigest("user@example.com", "test", betaKey));
    expect(betaSignupEmailDigest("user@example.com", "test", betaKey))
      .not.toBe(betaSignupEmailDigest("user@example.com", "development", betaKey));
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
