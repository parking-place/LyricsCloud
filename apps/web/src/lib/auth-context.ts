import { AuthService, cookieNames, GoogleOidcAdapter, readCookie, sessionCookie, tokenHash } from "@lyricscloud/auth";
import { readAuthConfig, readRuntimeConfig, type AuthConfig } from "@lyricscloud/config";
import { PostgresAuthStore, PostgresOwnedDataStore, PostgresSongStore, PostgresLyricStore, PostgresRhymeStore, PostgresRhymeInsertionStore, PostgresPromptStore, PostgresSearchStore, PostgresRecentWorkStore, PostgresSavedResourceStore, PostgresTemplateStore, PostgresDisplaySettingsStore, PostgresLifecycleStore, PostgresExportStore, type PendingWithdrawalSession } from "@lyricscloud/database";

interface AuthContext {
  readonly config: AuthConfig;
  readonly service: AuthService;
  readonly ownedData: PostgresOwnedDataStore;
  readonly songs: PostgresSongStore;
  readonly lyrics: PostgresLyricStore;
  readonly rhymes: PostgresRhymeStore;
  readonly rhymeInsertions: PostgresRhymeInsertionStore;
  readonly prompts: PostgresPromptStore;
  readonly search: PostgresSearchStore;
  readonly recentWork: PostgresRecentWorkStore;
  readonly savedResources: PostgresSavedResourceStore;
  readonly templates: PostgresTemplateStore;
  readonly displaySettings: PostgresDisplaySettingsStore;
  readonly lifecycle: PostgresLifecycleStore;
  readonly exports: PostgresExportStore;
}

export class RequestAuthError extends Error {
  readonly code = "AUTH_REQUIRED" as const;
  constructor() { super("AUTH_REQUIRED"); this.name = "RequestAuthError"; }
}

let cached: { key: string; context: AuthContext; allowedEmails: Set<string> } | undefined;

export function getAuthContext(): AuthContext {
  const runtime = readRuntimeConfig(process.env);
  const config = readAuthConfig(process.env);
  const key = `${runtime.databaseUrl}\u0000${config.appOrigin}\u0000${config.issuer}\u0000${config.clientId}`;
  if (cached?.key === key) {
    cached.allowedEmails.clear();
    for (const email of config.allowedEmails) cached.allowedEmails.add(email);
    return cached.context;
  }
  const allowedEmails = new Set(config.allowedEmails);
  const liveConfig = { ...config, allowedEmails };
  const store = new PostgresAuthStore(runtime.databaseUrl);
  const context = {
    config: liveConfig,
    service: new AuthService(liveConfig, store, new GoogleOidcAdapter(liveConfig)),
    ownedData: new PostgresOwnedDataStore(runtime.databaseUrl),
    songs: new PostgresSongStore(runtime.databaseUrl),
    lyrics: new PostgresLyricStore(runtime.databaseUrl),
    rhymes: new PostgresRhymeStore(runtime.databaseUrl),
    rhymeInsertions: new PostgresRhymeInsertionStore(runtime.databaseUrl),
    prompts: new PostgresPromptStore(runtime.databaseUrl),
    search: new PostgresSearchStore(runtime.databaseUrl),
    recentWork: new PostgresRecentWorkStore(runtime.databaseUrl),
    savedResources: new PostgresSavedResourceStore(runtime.databaseUrl),
    templates: new PostgresTemplateStore(runtime.databaseUrl),
    displaySettings: new PostgresDisplaySettingsStore(runtime.databaseUrl),
    lifecycle: new PostgresLifecycleStore(runtime.databaseUrl),
    exports: new PostgresExportStore(runtime.databaseUrl)
  };
  cached = { key, context, allowedEmails };
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
