import { calculatePKCECodeChallenge, randomNonce, randomPKCECodeVerifier, randomState } from "openid-client";
import { normalizeEmail, type AuthConfig } from "@lyricscloud/config";
import type { AuthStore } from "@lyricscloud/database";
import { constantTimeEqual, openJson, randomToken, sealJson, tokenHash } from "./crypto.js";
import { OidcCodeRejectedError, type OidcAdapter, type OidcIdentity } from "./oidc.js";

const TRANSACTION_MS = 10 * 60 * 1_000;
const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1_000;
const SESSION_ABSOLUTE_MS = 90 * 24 * 60 * 60 * 1_000;
const RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

export type AuthErrorCode =
  | "AUTH_CANCELLED"
  | "AUTH_STATE_INVALID"
  | "AUTH_CALLBACK_REPLAYED"
  | "AUTH_NOT_ALLOWED"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_PROVIDER_UNAVAILABLE";

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) { super(code); this.name = "AuthError"; }
}

interface TransactionPayload {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly returnTo: string;
  readonly expiresAt: number;
}

export interface AuthClock { now(): Date; }

export class AuthService {
  readonly #config: AuthConfig;
  readonly #store: AuthStore;
  readonly #oidc: OidcAdapter;
  readonly #clock: AuthClock;

  constructor(
    config: AuthConfig,
    store: AuthStore,
    oidc: OidcAdapter,
    clock: AuthClock = { now: () => new Date() }
  ) {
    this.#config = config;
    this.#store = store;
    this.#oidc = oidc;
    this.#clock = clock;
  }

  async beginLogin(returnTo: string | null): Promise<{ authorizationUrl: URL; transaction: string }> {
    const state = randomState();
    const nonce = randomNonce();
    const codeVerifier = randomPKCECodeVerifier();
    const now = this.#clock.now();
    const expiresAt = new Date(now.getTime() + TRANSACTION_MS);
    await this.#store.registerTransaction(tokenHash(state), expiresAt);
    const authorizationUrl = await this.#oidc.authorizationUrl({
      state,
      nonce,
      codeChallenge: await calculatePKCECodeChallenge(codeVerifier)
    });
    return {
      authorizationUrl,
      transaction: sealJson({ state, nonce, codeVerifier, returnTo: safeReturnTo(returnTo), expiresAt: expiresAt.getTime() }, this.#config.sessionSecret)
    };
  }

  async completeLogin(callbackUrl: URL, transaction: string | null): Promise<{ sessionToken: string; userId: string; returnTo: string }> {
    const payload = transaction ? openJson<TransactionPayload>(transaction, this.#config.sessionSecret) : null;
    const state = callbackUrl.searchParams.get("state");
    const now = this.#clock.now();
    if (!isTransaction(payload) || payload.expiresAt <= now.getTime() || !state || !constantTimeEqual(payload.state, state)) {
      throw new AuthError("AUTH_STATE_INVALID");
    }
    if (!await this.#store.consumeTransaction(tokenHash(state), now)) throw new AuthError("AUTH_CALLBACK_REPLAYED");
    if (callbackUrl.searchParams.get("error") === "access_denied") throw new AuthError("AUTH_CANCELLED");
    if (!callbackUrl.searchParams.get("code")) throw new AuthError("AUTH_PROVIDER_UNAVAILABLE");

    let identity: OidcIdentity;
    try {
      identity = await this.#oidc.exchange({
        callbackUrl,
        codeVerifier: payload.codeVerifier,
        expectedState: payload.state,
        expectedNonce: payload.nonce
      });
    } catch (error) {
      if (error instanceof OidcCodeRejectedError) throw new AuthError("AUTH_CALLBACK_REPLAYED");
      throw new AuthError("AUTH_PROVIDER_UNAVAILABLE");
    }
    const email = normalizeEmail(identity.email);
    if (!identity.emailVerified || !this.#config.allowedEmails.has(email)) throw new AuthError("AUTH_NOT_ALLOWED");
    const userId = await this.#store.upsertIdentity({ ...identity, email }, now);
    const sessionToken = randomToken();
    await this.#store.createSession(
      tokenHash(sessionToken), userId,
      new Date(now.getTime() + SESSION_IDLE_MS),
      new Date(now.getTime() + SESSION_ABSOLUTE_MS), now
    );
    return { sessionToken, userId, returnTo: payload.returnTo };
  }

  async resolveSession(sessionToken: string | null): Promise<{ userId: string; renewed: boolean; maxAge?: number }> {
    if (!sessionToken) throw new AuthError("AUTH_SESSION_EXPIRED");
    const now = this.#clock.now();
    const hashed = tokenHash(sessionToken);
    const session = await this.#store.readSession(hashed, now);
    if (!session) throw new AuthError("AUTH_SESSION_EXPIRED");
    if (session.expiresAt.getTime() - now.getTime() > RENEW_WINDOW_MS) return { userId: session.userId, renewed: false };
    const nextExpiry = new Date(Math.min(now.getTime() + SESSION_IDLE_MS, session.absoluteExpiresAt.getTime()));
    if (nextExpiry <= now || !await this.#store.renewSession(hashed, nextExpiry, now)) {
      throw new AuthError("AUTH_SESSION_EXPIRED");
    }
    return { userId: session.userId, renewed: true, maxAge: Math.max(0, Math.floor((nextExpiry.getTime() - now.getTime()) / 1_000)) };
  }

  async logout(sessionToken: string | null): Promise<void> {
    if (sessionToken) await this.#store.revokeSession(tokenHash(sessionToken), this.#clock.now());
  }
}

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const parsed = new URL(value, "https://internal.invalid");
    return parsed.origin === "https://internal.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/";
  } catch { return "/"; }
}

function isTransaction(value: TransactionPayload | null): value is TransactionPayload {
  return Boolean(value && typeof value.state === "string" && typeof value.nonce === "string"
    && typeof value.codeVerifier === "string" && typeof value.returnTo === "string" && typeof value.expiresAt === "number");
}
