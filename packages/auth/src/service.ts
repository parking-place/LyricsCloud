import { calculatePKCECodeChallenge, randomNonce, randomPKCECodeVerifier, randomState } from "openid-client";
import { normalizeEmail, type AuthConfig, type BetaSignupConfig } from "@lyricscloud/config";
import {
  betaCodeDigest,
  betaSignupEmailDigest,
  betaSignupPrincipalDigest,
  normalizeBetaCode,
  type AuthStore,
  type BetaSignupStore
} from "@lyricscloud/database";
import { constantTimeEqual, openJson, randomToken, sealJson, sha256Hex, tokenHash } from "./crypto.js";
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
  | "AUTH_PROVIDER_UNAVAILABLE"
  | "BETA_SIGNUP_INVALID"
  | "BETA_SIGNUP_REJECTED"
  | "BETA_EMAIL_MISMATCH"
  | "BETA_SIGNUP_RATE_LIMITED";

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode, readonly flow: "login" | "signup" = "login") {
    super(code);
    this.name = "AuthError";
  }
}

interface TransactionPayload {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly returnTo: string;
  readonly expiresAt: number;
  readonly flow?: "login" | "signup";
  readonly intentToken?: string;
}

export interface AuthClock { now(): Date; }
export interface BetaAuthDependencies {
  readonly config: BetaSignupConfig;
  readonly store: BetaSignupStore;
}

export class AuthService {
  readonly #config: AuthConfig;
  readonly #store: AuthStore;
  readonly #oidc: OidcAdapter;
  readonly #clock: AuthClock;
  readonly #beta?: BetaAuthDependencies;

  constructor(
    config: AuthConfig,
    store: AuthStore,
    oidc: OidcAdapter,
    clock: AuthClock = { now: () => new Date() },
    beta?: BetaAuthDependencies
  ) {
    this.#config = config;
    this.#store = store;
    this.#oidc = oidc;
    this.#clock = clock;
    this.#beta = beta;
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

  async beginBetaSignup(input: { code: string; email: string; returnTo: string | null }): Promise<{
    authorizationUrl: URL;
    transaction: string;
  }> {
    if (!this.#beta) throw new AuthError("AUTH_PROVIDER_UNAVAILABLE", "signup");
    let code: string;
    let email: string;
    try {
      code = normalizeBetaCode(input.code);
      email = normalizeEmail(input.email);
      betaSignupEmailDigest(email, this.#beta.config.environment, this.#beta.config.indexKey);
    } catch {
      throw new AuthError("BETA_SIGNUP_INVALID", "signup");
    }
    const state = randomState();
    const nonce = randomNonce();
    const codeVerifier = randomPKCECodeVerifier();
    const intentToken = randomToken();
    const now = this.#clock.now();
    const expiresAt = new Date(now.getTime() + TRANSACTION_MS);
    await this.#store.registerTransaction(tokenHash(state), expiresAt);
    await this.#beta.store.registerBetaSignupIntent({
      intentDigest: sha256Hex(intentToken),
      environment: this.#beta.config.environment,
      claimedCodeDigest: betaCodeDigest(code, this.#beta.config.environment, this.#beta.config.indexKey),
      emailDigest: betaSignupEmailDigest(email, this.#beta.config.environment, this.#beta.config.indexKey),
      emailKid: this.#beta.config.indexKid,
      oauthStateHash: sha256Hex(state),
      expiresAt,
      now
    });
    const authorizationUrl = await this.#oidc.authorizationUrl({
      state,
      nonce,
      codeChallenge: await calculatePKCECodeChallenge(codeVerifier)
    });
    return {
      authorizationUrl,
      transaction: sealJson({ state, nonce, codeVerifier, returnTo: safeReturnTo(input.returnTo),
        expiresAt: expiresAt.getTime(), flow: "signup", intentToken }, this.#config.sessionSecret)
    };
  }

  async completeLogin(callbackUrl: URL, transaction: string | null): Promise<{ sessionToken: string; userId: string; returnTo: string }> {
    const payload = transaction ? openJson<TransactionPayload>(transaction, this.#config.sessionSecret) : null;
    const state = callbackUrl.searchParams.get("state");
    const now = this.#clock.now();
    const flow = payload?.flow === "signup" ? "signup" : "login";
    if (!isTransaction(payload) || payload.expiresAt <= now.getTime() || !state || !constantTimeEqual(payload.state, state)) {
      throw new AuthError("AUTH_STATE_INVALID", flow);
    }
    if (!await this.#store.consumeTransaction(tokenHash(state), now)) throw new AuthError("AUTH_CALLBACK_REPLAYED", flow);
    if (callbackUrl.searchParams.get("error") === "access_denied") {
      await this.#cancelBetaIntent(payload, now);
      throw new AuthError("AUTH_CANCELLED", flow);
    }
    if (!callbackUrl.searchParams.get("code")) {
      await this.#cancelBetaIntent(payload, now);
      throw new AuthError("AUTH_PROVIDER_UNAVAILABLE", flow);
    }

    let identity: OidcIdentity;
    try {
      identity = await this.#oidc.exchange({
        callbackUrl,
        codeVerifier: payload.codeVerifier,
        expectedState: payload.state,
        expectedNonce: payload.nonce
      });
    } catch (error) {
      await this.#cancelBetaIntent(payload, now);
      if (error instanceof OidcCodeRejectedError) throw new AuthError("AUTH_CALLBACK_REPLAYED", flow);
      throw new AuthError("AUTH_PROVIDER_UNAVAILABLE", flow);
    }
    const email = normalizeEmail(identity.email);
    if (!identity.emailVerified) {
      await this.#cancelBetaIntent(payload, now);
      throw new AuthError("AUTH_NOT_ALLOWED", flow);
    }
    const verifiedIdentity = { ...identity, email };
    let userId: string;
    if (this.#beta) {
      const bootstrapAllowed = this.#config.allowedEmails.has(email);
      if (flow === "signup") {
        if (!payload.intentToken) throw new AuthError("AUTH_STATE_INVALID", "signup");
        if (bootstrapAllowed) {
          await this.#cancelBetaIntent(payload, now);
          const admitted = await this.#beta.store.admitIdentity({
            environment: this.#beta.config.environment, identity: verifiedIdentity, bootstrapAllowed: true, now
          });
          if (!admitted) throw new AuthError("AUTH_NOT_ALLOWED", "signup");
          userId = admitted;
        } else {
          try {
            const result = await this.#beta.store.redeemBetaSignup({
              intentDigest: sha256Hex(payload.intentToken),
              environment: this.#beta.config.environment,
              identity: verifiedIdentity,
              verifiedEmailDigest: betaSignupEmailDigest(email, this.#beta.config.environment, this.#beta.config.indexKey),
              principalDigest: betaSignupPrincipalDigest(identity.issuer, identity.subject,
                this.#beta.config.environment, this.#beta.config.indexKey),
              oauthStateHash: sha256Hex(payload.state),
              now
            });
            userId = result.userId;
          } catch (error) {
            throw mapBetaStoreError(error);
          }
        }
      } else {
        const admitted = await this.#beta.store.admitIdentity({
          environment: this.#beta.config.environment, identity: verifiedIdentity, bootstrapAllowed, now
        });
        if (!admitted) throw new AuthError("AUTH_NOT_ALLOWED");
        userId = admitted;
      }
    } else {
      if (!this.#config.allowedEmails.has(email)) throw new AuthError("AUTH_NOT_ALLOWED");
      userId = await this.#store.upsertIdentity(verifiedIdentity, now);
    }
    const sessionToken = randomToken();
    await this.#store.createSession(
      tokenHash(sessionToken), userId,
      new Date(now.getTime() + SESSION_IDLE_MS),
      new Date(now.getTime() + SESSION_ABSOLUTE_MS), now
    );
    return { sessionToken, userId, returnTo: payload.returnTo };
  }

  async #cancelBetaIntent(payload: TransactionPayload, now: Date): Promise<void> {
    if (!this.#beta || payload.flow !== "signup" || !payload.intentToken) return;
    await this.#beta.store.cancelBetaSignupIntent(
      sha256Hex(payload.intentToken), this.#beta.config.environment, now
    );
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
    && typeof value.codeVerifier === "string" && typeof value.returnTo === "string" && typeof value.expiresAt === "number"
    && (value.flow === undefined || value.flow === "login" || (value.flow === "signup" && typeof value.intentToken === "string")));
}

function mapBetaStoreError(error: unknown): AuthError {
  const code = error instanceof Error ? error.message : "";
  if (code === "BETA_EMAIL_MISMATCH" || code === "BETA_SIGNUP_RATE_LIMITED"
    || code === "BETA_SIGNUP_REJECTED" || code === "AUTH_NOT_ALLOWED") {
    return new AuthError(code, "signup");
  }
  return new AuthError("AUTH_PROVIDER_UNAVAILABLE", "signup");
}
