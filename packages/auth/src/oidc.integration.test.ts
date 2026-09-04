import { createSign, generateKeyPairSync } from "node:crypto";
import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { AuthConfig } from "@lyricscloud/config";
import { GoogleOidcAdapter, OidcCodeRejectedError } from "./oidc.js";

let server: Server | undefined;

describe("Google OIDC adapter protocol", () => {
  afterEach(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined; });

  it("uses only OIDC profile scopes and verifies a signed nonce-bound ID token", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    let expectedNonce = "";
    let tokenBody = "";
    let rejectCode = false;
    server = createServer(async (request, response) => {
      const origin = `http://127.0.0.1:${(server!.address() as { port: number }).port}`;
      if (request.url === "/.well-known/openid-configuration") return json(response, {
        issuer: origin,
        authorization_endpoint: `${origin}/authorize`,
        token_endpoint: `${origin}/token`,
        jwks_uri: `${origin}/jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        token_endpoint_auth_methods_supported: ["client_secret_post"]
      });
      if (request.url === "/jwks") return json(response, { keys: [{
        ...(publicKey.export({ format: "jwk" }) as JsonWebKey), kid: "test-key", use: "sig", alg: "RS256"
      }] });
      if (request.url === "/token") {
        for await (const chunk of request) tokenBody += String(chunk);
        if (rejectCode) {
          response.writeHead(400, { "content-type": "application/json" });
          return response.end(JSON.stringify({ error: "invalid_grant" }));
        }
        const now = Math.floor(Date.now() / 1_000);
        return json(response, {
          access_token: "synthetic-access-token-never-persisted",
          token_type: "Bearer",
          expires_in: 300,
          id_token: jwt(privateKey, {
            iss: origin, aud: "synthetic-client", sub: "subject-1", iat: now, exp: now + 300,
            nonce: expectedNonce, email: "allowed@example.com", email_verified: true, name: "Synthetic User"
          })
        });
      }
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const config: AuthConfig = {
      appOrigin: "http://localhost:8080", issuer: origin, clientId: "synthetic-client",
      clientSecret: "synthetic-secret", sessionSecret: "synthetic-session-secret-at-least-32-bytes",
      allowedEmails: new Set(["allowed@example.com"]), secureCookies: false
    };
    const adapter = new GoogleOidcAdapter(config);
    expectedNonce = "nonce-1";
    const authorization = await adapter.authorizationUrl({ state: "state-1", nonce: expectedNonce, codeChallenge: "challenge-1" });
    expect(authorization.searchParams.get("scope")).toBe("openid email profile");
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorization.searchParams.get("redirect_uri")).toBe("http://localhost:8080/api/auth/callback");

    const identity = await adapter.exchange({
      callbackUrl: new URL("http://localhost:8080/api/auth/callback?code=one-time-code&state=state-1"),
      codeVerifier: "verifier-1", expectedState: "state-1", expectedNonce
    });
    expect(identity).toMatchObject({ issuer: origin, subject: "subject-1", emailVerified: true });
    const sent = new URLSearchParams(tokenBody);
    expect(sent.get("code_verifier")).toBe("verifier-1");
    expect(sent.get("client_secret")).toBe("synthetic-secret");
    rejectCode = true;
    await expect(adapter.exchange({
      callbackUrl: new URL("http://localhost:8080/api/auth/callback?code=reused-code&state=state-1"),
      codeVerifier: "verifier-1", expectedState: "state-1", expectedNonce
    })).rejects.toBeInstanceOf(OidcCodeRejectedError);
  });

  it("rejects a nonce mismatch", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    server = createServer(async (request, response) => {
      const origin = `http://127.0.0.1:${(server!.address() as { port: number }).port}`;
      if (request.url === "/.well-known/openid-configuration") return json(response, {
        issuer: origin, authorization_endpoint: `${origin}/authorize`, token_endpoint: `${origin}/token`, jwks_uri: `${origin}/jwks`,
        response_types_supported: ["code"], subject_types_supported: ["public"], id_token_signing_alg_values_supported: ["RS256"],
        token_endpoint_auth_methods_supported: ["client_secret_post"]
      });
      if (request.url === "/jwks") return json(response, { keys: [{ ...(publicKey.export({ format: "jwk" }) as JsonWebKey), kid: "test-key", use: "sig", alg: "RS256" }] });
      if (request.url === "/token") {
        for await (const _chunk of request) { /* drain request */ }
        const now = Math.floor(Date.now() / 1_000);
        return json(response, { access_token: "synthetic", token_type: "Bearer", id_token: jwt(privateKey, {
          iss: origin, aud: "client", sub: "subject", iat: now, exp: now + 300, nonce: "wrong",
          email: "allowed@example.com", email_verified: true
        }) });
      }
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const adapter = new GoogleOidcAdapter({
      appOrigin: "http://localhost:8080", issuer: origin, clientId: "client", clientSecret: "secret",
      sessionSecret: "synthetic-session-secret-at-least-32-bytes", allowedEmails: new Set(["allowed@example.com"]), secureCookies: false
    });
    await expect(adapter.exchange({
      callbackUrl: new URL("http://localhost:8080/api/auth/callback?code=code&state=state"),
      codeVerifier: "verifier", expectedState: "state", expectedNonce: "expected"
    })).rejects.toBeTruthy();
  });
});

function json(response: import("node:http").ServerResponse, body: unknown) {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function jwt(privateKey: import("node:crypto").KeyObject, claims: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).end().sign(privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}
