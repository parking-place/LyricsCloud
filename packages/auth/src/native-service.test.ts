import { calculatePKCECodeChallenge } from "openid-client";
import { describe, expect, it } from "vitest";
import type {
  NativeAuthStore,
  NativeSessionRecord,
  RegisterNativeTransactionInput,
  AuthorizeNativeTransactionInput,
  ExchangeNativeTransactionInput
} from "@lyricscloud/database";
import { tokenHash } from "./crypto.js";
import { NativeAuthError, NativeAuthService } from "./native-service.js";

const now = new Date("2026-09-15T00:20:00.000Z");
const userId = "00000000-0000-4000-8000-000000000118";
const config = {
  appOrigin: "https://dev.lyricscloud.test",
  sessionSecret: "synthetic-native-session-secret-at-least-32-bytes"
};

class MemoryNativeAuthStore implements NativeAuthStore {
  transaction?: RegisterNativeTransactionInput & { authorized?: AuthorizeNativeTransactionInput; consumed: boolean };
  sessions = new Map<string, NativeSessionRecord & { revoked: boolean }>();

  registerNativeTransaction(input: RegisterNativeTransactionInput): Promise<void> {
    this.transaction = { ...input, consumed: false };
    return Promise.resolve();
  }

  authorizeNativeTransaction(input: AuthorizeNativeTransactionInput): Promise<boolean> {
    if (!this.transaction || this.transaction.consumed || this.transaction.expiresAt <= input.now
      || this.transaction.transactionHash !== input.transactionHash || this.transaction.authorized) return Promise.resolve(false);
    this.transaction.authorized = input;
    return Promise.resolve(true);
  }

  exchangeNativeTransaction(input: ExchangeNativeTransactionInput): Promise<string | null> {
    const row = this.transaction;
    if (!row || row.consumed || row.transactionHash !== input.transactionHash
      || row.stateHash !== input.stateHash || row.pkceChallenge !== input.pkceChallenge
      || row.redirectUriHash !== input.redirectUriHash || row.expiresAt <= input.now
      || !row.authorized || row.authorized.codeHash !== input.codeHash
      || row.authorized.codeExpiresAt <= input.now) return Promise.resolve(null);
    row.consumed = true;
    this.sessions.set(input.sessionTokenHash, {
      userId: row.authorized.userId,
      expiresAt: input.sessionExpiresAt,
      absoluteExpiresAt: input.sessionAbsoluteExpiresAt,
      revoked: false
    });
    return Promise.resolve(row.authorized.userId);
  }

  readNativeSession(sessionTokenHash: string, at: Date): Promise<NativeSessionRecord | null> {
    const session = this.sessions.get(sessionTokenHash);
    return Promise.resolve(session && !session.revoked && session.expiresAt > at && session.absoluteExpiresAt > at
      ? session : null);
  }

  renewNativeSession(sessionTokenHash: string, expiresAt: Date): Promise<boolean> {
    const session = this.sessions.get(sessionTokenHash);
    if (!session || session.revoked) return Promise.resolve(false);
    this.sessions.set(sessionTokenHash, { ...session, expiresAt });
    return Promise.resolve(true);
  }

  revokeNativeSession(sessionTokenHash: string): Promise<void> {
    const session = this.sessions.get(sessionTokenHash);
    if (session) session.revoked = true;
    return Promise.resolve();
  }

  close(): Promise<void> { return Promise.resolve(); }
}

async function begin(service: NativeAuthService, verifier = "v".repeat(43)) {
  const challenge = await calculatePKCECodeChallenge(verifier);
  const started = await service.begin({
    codeChallenge: challenge,
    redirectUri: "http://127.0.0.1:49152/lyricscloud/oauth/" + "c".repeat(43)
  });
  return { ...started, verifier };
}

describe("Windows native browser broker", () => {
  it("accepts only an exact IPv4 loopback callback and S256 challenge", async () => {
    const service = new NativeAuthService(config, new MemoryNativeAuthStore(), { now: () => now });
    await expect(service.begin({ codeChallenge: "short", redirectUri: "http://127.0.0.1:49152/callback" }))
      .rejects.toMatchObject({ code: "VALIDATION_FAILED" } satisfies Partial<NativeAuthError>);
    await expect(service.begin({ codeChallenge: "a".repeat(43), redirectUri: "http://localhost:49152/callback" }))
      .rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(service.begin({ codeChallenge: "a".repeat(43), redirectUri: "https://127.0.0.1:49152/callback" }))
      .rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("creates no native session until a browser-authenticated one-time code is exchanged", async () => {
    const store = new MemoryNativeAuthStore();
    const service = new NativeAuthService(config, store, { now: () => now });
    const started = await begin(service);
    expect(store.sessions.size).toBe(0);
    const authorized = await service.authorize(started.transaction, userId);
    expect(store.sessions.size).toBe(0);
    expect(authorized.redirectUrl.origin).toBe("http://127.0.0.1:49152");
    expect(authorized.redirectUrl.searchParams.get("state")).toBe(started.state);
    const exchanged = await service.exchange({
      transaction: started.transaction,
      state: started.state,
      code: authorized.redirectUrl.searchParams.get("code")!,
      codeVerifier: started.verifier
    });
    expect(exchanged.userId).toBe(userId);
    expect(store.sessions.has(tokenHash(exchanged.sessionToken))).toBe(true);
  });

  it("rejects wrong state, wrong verifier, callback replay, and code replay", async () => {
    const wrongStateStore = new MemoryNativeAuthStore();
    const wrongState = new NativeAuthService(config, wrongStateStore, { now: () => now });
    const stateFlow = await begin(wrongState);
    const stateGrant = await wrongState.authorize(stateFlow.transaction, userId);
    await expect(wrongState.exchange({ transaction: stateFlow.transaction, state: "x".repeat(43),
      code: stateGrant.redirectUrl.searchParams.get("code")!, codeVerifier: stateFlow.verifier }))
      .rejects.toMatchObject({ code: "AUTH_STATE_INVALID" });
    expect(wrongStateStore.sessions.size).toBe(0);

    const wrongVerifierStore = new MemoryNativeAuthStore();
    const wrongVerifier = new NativeAuthService(config, wrongVerifierStore, { now: () => now });
    const verifierFlow = await begin(wrongVerifier);
    const verifierGrant = await wrongVerifier.authorize(verifierFlow.transaction, userId);
    await expect(wrongVerifier.exchange({ transaction: verifierFlow.transaction, state: verifierFlow.state,
      code: verifierGrant.redirectUrl.searchParams.get("code")!, codeVerifier: "z".repeat(43) }))
      .rejects.toMatchObject({ code: "AUTH_STATE_INVALID" });
    expect(wrongVerifierStore.sessions.size).toBe(0);

    const replayStore = new MemoryNativeAuthStore();
    const replay = new NativeAuthService(config, replayStore, { now: () => now });
    const replayFlow = await begin(replay);
    const replayGrant = await replay.authorize(replayFlow.transaction, userId);
    await expect(replay.authorize(replayFlow.transaction, userId))
      .rejects.toMatchObject({ code: "AUTH_CALLBACK_REPLAYED" });
    const input = { transaction: replayFlow.transaction, state: replayFlow.state,
      code: replayGrant.redirectUrl.searchParams.get("code")!, codeVerifier: replayFlow.verifier };
    await replay.exchange(input);
    await expect(replay.exchange(input)).rejects.toMatchObject({ code: "AUTH_CALLBACK_REPLAYED" });
    expect(replayStore.sessions.size).toBe(1);
  });

  it("resolves and revokes only a read-scoped opaque native session", async () => {
    const store = new MemoryNativeAuthStore();
    const service = new NativeAuthService(config, store, { now: () => now });
    const started = await begin(service);
    const grant = await service.authorize(started.transaction, userId);
    const session = await service.exchange({ transaction: started.transaction, state: started.state,
      code: grant.redirectUrl.searchParams.get("code")!, codeVerifier: started.verifier });
    expect(await service.resolveSession(session.sessionToken)).toMatchObject({ userId, scope: "read" });
    await service.logout(session.sessionToken);
    await expect(service.resolveSession(session.sessionToken)).rejects.toMatchObject({ code: "AUTH_SESSION_EXPIRED" });
  });
});
