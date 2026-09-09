import type { AuthConfig } from "@lyricscloud/config";
import {
  allowInsecureRequests,
  authorizationCodeGrant,
  buildAuthorizationUrl,
  discovery,
  ResponseBodyError,
  type Configuration
} from "openid-client";

export interface OidcIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly displayName?: string;
  readonly avatarUrl?: string;
}

export interface OidcAdapter {
  authorizationUrl(input: { state: string; nonce: string; codeChallenge: string }): Promise<URL>;
  exchange(input: { callbackUrl: URL; codeVerifier: string; expectedState: string; expectedNonce: string }): Promise<OidcIdentity>;
}

export class OidcCodeRejectedError extends Error {
  constructor() { super("OIDC_CODE_REJECTED"); this.name = "OidcCodeRejectedError"; }
}

export class GoogleOidcAdapter implements OidcAdapter {
  readonly #config: AuthConfig;
  #client?: Promise<Configuration>;

  constructor(config: AuthConfig) { this.#config = config; }

  async authorizationUrl(input: { state: string; nonce: string; codeChallenge: string }): Promise<URL> {
    return buildAuthorizationUrl(await this.#configuration(), {
      redirect_uri: `${this.#config.appOrigin}/api/auth/callback`,
      scope: "openid email profile",
      response_type: "code",
      state: input.state,
      nonce: input.nonce,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256"
    });
  }

  async exchange(input: { callbackUrl: URL; codeVerifier: string; expectedState: string; expectedNonce: string }): Promise<OidcIdentity> {
    let tokens;
    try {
      tokens = await authorizationCodeGrant(await this.#configuration(), input.callbackUrl, {
        pkceCodeVerifier: input.codeVerifier,
        expectedState: input.expectedState,
        expectedNonce: input.expectedNonce
      });
    } catch (error) {
      if (error instanceof ResponseBodyError && error.error === "invalid_grant") throw new OidcCodeRejectedError();
      throw error;
    }
    const claims = tokens.claims();
    if (!claims || typeof claims.iss !== "string" || typeof claims.sub !== "string"
      || typeof claims.email !== "string" || claims.email_verified !== true) {
      throw new Error("OIDC_IDENTITY_INVALID");
    }
    return {
      issuer: claims.iss,
      subject: claims.sub,
      email: claims.email,
      emailVerified: true,
      ...(typeof claims.name === "string" ? { displayName: claims.name } : {}),
      ...(typeof claims.picture === "string" ? { avatarUrl: claims.picture } : {})
    };
  }

  #configuration(): Promise<Configuration> {
    this.#client ??= discovery(
      new URL(this.#config.issuer),
      this.#config.clientId,
      this.#config.clientSecret,
      undefined,
      new URL(this.#config.issuer).protocol === "http:"
        ? { execute: [allowInsecureRequests], timeout: 10 }
        : { timeout: 10 }
    );
    return this.#client;
  }
}
