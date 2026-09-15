import { AuthService, NativeAuthService, cookieNames, GoogleOidcAdapter, readCookie, sessionCookie, tokenHash } from "@lyricscloud/auth";
import { readAuthConfig, readBetaSignupConfig, readRuntimeConfig, type AuthConfig } from "@lyricscloud/config";
import { PostgresAuthStore, PostgresNativeAuthStore, PostgresBetaSignupStore, PostgresOwnedDataStore, PostgresSongStore, PostgresLyricStore, PostgresLyricSharingStore, PostgresPublicLyricSharingStore, PostgresRhymeStore, PostgresRhymeInsertionStore, PostgresPromptStore, PostgresSearchStore, PostgresRecentWorkStore, PostgresSavedResourceStore, PostgresTemplateStore, PostgresDisplaySettingsStore, PostgresLibraryViewSettingsStore, PostgresLifecycleStore, PostgresExportStore, PostgresSunoWorkspaceStore, type PendingWithdrawalSession } from "@lyricscloud/database";

interface AuthContext {
  readonly config: AuthConfig;
  readonly service: AuthService;
  readonly nativeService: NativeAuthService;
  readonly ownedData: PostgresOwnedDataStore;
  readonly songs: PostgresSongStore;
  readonly lyrics: PostgresLyricStore;
  readonly lyricSharing: PostgresLyricSharingStore;
  readonly publicLyricSharing: PostgresPublicLyricSharingStore;
  readonly rhymes: PostgresRhymeStore;
  readonly rhymeInsertions: PostgresRhymeInsertionStore;
  readonly prompts: PostgresPromptStore;
  readonly search: PostgresSearchStore;
  readonly recentWork: PostgresRecentWorkStore;
  readonly savedResources: PostgresSavedResourceStore;
  readonly templates: PostgresTemplateStore;
  readonly displaySettings: PostgresDisplaySettingsStore;
  readonly libraryViewSettings: PostgresLibraryViewSettingsStore;
  readonly lifecycle: PostgresLifecycleStore;
  readonly exports: PostgresExportStore;
  readonly sunoWorkspaces: PostgresSunoWorkspaceStore;
}

export class RequestAuthError extends Error {
  readonly code = "AUTH_REQUIRED" as const;
  constructor() { super("AUTH_REQUIRED"); this.name = "RequestAuthError"; }
}

let cached: { key: string; context: AuthContext } | undefined;

export function getAuthContext(): AuthContext {
  const runtime = readRuntimeConfig(process.env);
  const config = readAuthConfig(process.env);
  const betaConfig = readBetaSignupConfig(process.env);
  const key = `${runtime.databaseUrl}\u0000${config.appOrigin}\u0000${config.issuer}\u0000${config.clientId}\u0000${config.allowlistFingerprint ?? "static"}\u0000${betaConfig.fingerprint}`;
  if (cached?.key === key) return cached.context;
  const liveConfig = config;
  const store = new PostgresAuthStore(runtime.databaseUrl);
  const nativeStore = new PostgresNativeAuthStore(runtime.databaseUrl);
  const betaStore = new PostgresBetaSignupStore(runtime.databaseUrl);
  const context = {
    config: liveConfig,
    service: new AuthService(liveConfig, store, new GoogleOidcAdapter(liveConfig), undefined,
      { config: betaConfig, store: betaStore }),
    nativeService: new NativeAuthService(liveConfig, nativeStore),
    ownedData: new PostgresOwnedDataStore(runtime.databaseUrl),
    songs: new PostgresSongStore(runtime.databaseUrl),
    lyrics: new PostgresLyricStore(runtime.databaseUrl),
    lyricSharing: new PostgresLyricSharingStore(runtime.databaseUrl),
    publicLyricSharing: new PostgresPublicLyricSharingStore(runtime.databaseUrl),
    rhymes: new PostgresRhymeStore(runtime.databaseUrl),
    rhymeInsertions: new PostgresRhymeInsertionStore(runtime.databaseUrl),
    prompts: new PostgresPromptStore(runtime.databaseUrl),
    search: new PostgresSearchStore(runtime.databaseUrl),
    recentWork: new PostgresRecentWorkStore(runtime.databaseUrl),
    savedResources: new PostgresSavedResourceStore(runtime.databaseUrl),
    templates: new PostgresTemplateStore(runtime.databaseUrl),
    displaySettings: new PostgresDisplaySettingsStore(runtime.databaseUrl),
    libraryViewSettings: new PostgresLibraryViewSettingsStore(runtime.databaseUrl),
    lifecycle: new PostgresLifecycleStore(runtime.databaseUrl),
    exports: new PostgresExportStore(runtime.databaseUrl),
    sunoWorkspaces: new PostgresSunoWorkspaceStore(runtime.databaseUrl)
  };
  cached = { key, context };
  return context;
}

export async function resolvePendingWithdrawalAuth(request: Request): Promise<{ session: PendingWithdrawalSession; tokenHash: string }> {
  const context = getAuthContext();
  const token = readCookie(request.headers.get("cookie"), cookieNames(context.config).session);
  if (!token) throw new RequestAuthError();
  const hashed = tokenHash(token);
  const session = await context.lifecycle.resolvePendingWithdrawalSession(hashed);
  if (!session) throw new RequestAuthError();
  return { session, tokenHash: hashed };
}

export async function resolveRequestAuth(request: Request): Promise<{ userId: string; renewalCookie?: string }> {
  const context = getAuthContext();
  const token = readCookie(request.headers.get("cookie"), cookieNames(context.config).session);
  if (!token) throw new RequestAuthError();
  const session = await context.service.resolveSession(token);
  return {
    userId: session.userId,
    ...(session.renewed ? { renewalCookie: sessionCookie(context.config, token, session.maxAge) } : {})
  };
}

export async function resolveNativeRequestAuth(request: Request): Promise<{ userId: string; scope: "read"; expiresAt: string }> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  if (!match) throw new RequestAuthError();
  return getAuthContext().nativeService.resolveSession(match[1]!);
}
