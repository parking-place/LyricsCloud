import { calculatePKCECodeChallenge } from "openid-client";
import type { AuthConfig } from "@lyricscloud/config";
import type { NativeAuthStore } from "@lyricscloud/database";
import { constantTimeEqual, openJson, randomToken, sealJson, tokenHash } from "./crypto.js";

const TRANSACTION_MS = 10 * 60 * 1_000;
const CODE_MS = 60 * 1_000;
const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1_000;
const SESSION_ABSOLUTE_MS = 90 * 24 * 60 * 60 * 1_000;
const RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;
const PKCE_VERIFIER = /^[A-Za-z0-9_-]{43,128}$/;

export type NativeAuthErrorCode = "VALIDATION_FAILED" | "AUTH_STATE_INVALID" | "AUTH_CALLBACK_REPLAYED" | "AUTH_SESSION_EXPIRED";

export class NativeAuthError extends Error {
  constructor(readonly code: NativeAuthErrorCode) {
    super(code);
    this.name = "NativeAuthError";
  }
}

interface NativeTransactionPayload {
  readonly version: 1;
  readonly transactionToken: string;
  readonly state: string;
  readonly codeChallenge: string;
  readonly redirectUri: string;
  readonly expiresAt: number;
}

export interface NativeAuthClock { now(): Date; }

export class NativeAuthService {
  readonly #config: Pick<AuthConfig, "appOrigin" | "sessionSecret">;
  readonly #store: NativeAuthStore;
  readonly #clock: NativeAuthClock;

  constructor(config: Pick<AuthConfig, "appOrigin" | "sessionSecret">, store: NativeAuthStore,
    clock: NativeAuthClock = { now: () => new Date() }) {
    this.#config = config;
    this.#store = store;
    this.#clock = clock;
  }

  async begin(input: { codeChallenge: string; redirectUri: string }): Promise<{
    authorizationUrl: URL; transaction: string; state: string; expiresAt: string;
  }> {
    if (!BASE64URL_43.test(input.codeChallenge)) throw new NativeAuthError("VALIDATION_FAILED");
    const redirectUri = validLoopbackRedirect(input.redirectUri);
    const now = this.#clock.now();
    const expiresAt = new Date(now.getTime() + TRANSACTION_MS);
    const transactionToken = randomToken();
    const state = randomToken();
    const payload: NativeTransactionPayload = { version: 1, transactionToken, state,
      codeChallenge: input.codeChallenge, redirectUri: redirectUri.href, expiresAt: expiresAt.getTime() };
    const transaction = sealJson(payload, this.#config.sessionSecret);
    await this.#store.registerNativeTransaction({ transactionHash: tokenHash(transactionToken), stateHash: tokenHash(state),
      pkceChallenge: input.codeChallenge, redirectUriHash: tokenHash(redirectUri.href), expiresAt, now });
    const authorizationUrl = new URL("/api/native/v1/auth/authorize", this.#config.appOrigin);
    authorizationUrl.searchParams.set("transaction", transaction);
    return { authorizationUrl, transaction, state, expiresAt: expiresAt.toISOString() };
  }

  async authorize(transaction: string, userId: string): Promise<{ redirectUrl: URL }> {
    const payload = this.#readTransaction(transaction);
    const now = this.#clock.now();
    if (payload.expiresAt <= now.getTime()) throw new NativeAuthError("AUTH_CALLBACK_REPLAYED");
    const code = randomToken();
    const codeExpiresAt = new Date(Math.min(payload.expiresAt, now.getTime() + CODE_MS));
    if (!await this.#store.authorizeNativeTransaction({ transactionHash: tokenHash(payload.transactionToken), userId,
      codeHash: tokenHash(code), codeExpiresAt, now })) throw new NativeAuthError("AUTH_CALLBACK_REPLAYED");
    const redirectUrl = new URL(payload.redirectUri);
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", payload.state);
    return { redirectUrl };
  }

  async exchange(input: { transaction: string; state: string; code: string; codeVerifier: string }): Promise<{
    sessionToken: string; userId: string; scope: "read"; expiresAt: string;
  }> {
    const payload = this.#readTransaction(input.transaction);
    const now = this.#clock.now();
    if (payload.expiresAt <= now.getTime() || !BASE64URL_43.test(input.state) || !constantTimeEqual(payload.state, input.state)
      || !BASE64URL_43.test(input.code) || !PKCE_VERIFIER.test(input.codeVerifier)) throw new NativeAuthError("AUTH_STATE_INVALID");
    const challenge = await calculatePKCECodeChallenge(input.codeVerifier);
    if (!constantTimeEqual(payload.codeChallenge, challenge)) throw new NativeAuthError("AUTH_STATE_INVALID");
    const sessionToken = randomToken();
    const sessionExpiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
    const sessionAbsoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
    const userId = await this.#store.exchangeNativeTransaction({ transactionHash: tokenHash(payload.transactionToken),
      stateHash: tokenHash(payload.state), pkceChallenge: payload.codeChallenge,
      redirectUriHash: tokenHash(payload.redirectUri), codeHash: tokenHash(input.code), sessionTokenHash: tokenHash(sessionToken),
      sessionExpiresAt, sessionAbsoluteExpiresAt, now });
    if (!userId) throw new NativeAuthError("AUTH_CALLBACK_REPLAYED");
    return { sessionToken, userId, scope: "read", expiresAt: sessionExpiresAt.toISOString() };
  }

  async resolveSession(sessionToken: string | null): Promise<{ userId: string; scope: "read"; renewed: boolean; expiresAt: string }> {
    if (!sessionToken || !BASE64URL_43.test(sessionToken)) throw new NativeAuthError("AUTH_SESSION_EXPIRED");
    const now = this.#clock.now();
    const hash = tokenHash(sessionToken);
    const session = await this.#store.readNativeSession(hash, now);
    if (!session) throw new NativeAuthError("AUTH_SESSION_EXPIRED");
    if (session.expiresAt.getTime() - now.getTime() > RENEW_WINDOW_MS) {
      return { userId: session.userId, scope: "read", renewed: false, expiresAt: session.expiresAt.toISOString() };
    }
    const expiresAt = new Date(Math.min(now.getTime() + SESSION_IDLE_MS, session.absoluteExpiresAt.getTime()));
    if (expiresAt <= now || !await this.#store.renewNativeSession(hash, expiresAt, now)) {
      throw new NativeAuthError("AUTH_SESSION_EXPIRED");
    }
    return { userId: session.userId, scope: "read", renewed: true, expiresAt: expiresAt.toISOString() };
  }

  async logout(sessionToken: string | null): Promise<void> {
    if (sessionToken && BASE64URL_43.test(sessionToken)) {
      await this.#store.revokeNativeSession(tokenHash(sessionToken), this.#clock.now());
    }
  }

  #readTransaction(transaction: string): NativeTransactionPayload {
    const payload = transaction.length <= 4096
      ? openJson<NativeTransactionPayload>(transaction, this.#config.sessionSecret) : null;
    if (!payload || payload.version !== 1 || !BASE64URL_43.test(payload.transactionToken) || !BASE64URL_43.test(payload.state)
      || !BASE64URL_43.test(payload.codeChallenge) || typeof payload.expiresAt !== "number") {
      throw new NativeAuthError("AUTH_STATE_INVALID");
    }
    validLoopbackRedirect(payload.redirectUri);
    return payload;
  }
}

function validLoopbackRedirect(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new NativeAuthError("VALIDATION_FAILED"); }
  const port = Number(url.port);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || port < 1024 || port > 65535
    || url.username || url.password || url.search || url.hash
    || !/^\/lyricscloud\/oauth\/[A-Za-z0-9_-]{43,128}$/.test(url.pathname)) {
    throw new NativeAuthError("VALIDATION_FAILED");
  }
  return url;
}
