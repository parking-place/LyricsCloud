import { AuthService, cookieNames, GoogleOidcAdapter, readCookie, sessionCookie } from "@lyricscloud/auth";
import { readAuthConfig, readRuntimeConfig, type AuthConfig } from "@lyricscloud/config";
import { PostgresAuthStore, PostgresOwnedDataStore, PostgresSongStore, PostgresLyricStore, PostgresRhymeStore } from "@lyricscloud/database";

interface AuthContext {
  readonly config: AuthConfig;
  readonly service: AuthService;
  readonly ownedData: PostgresOwnedDataStore;
  readonly songs: PostgresSongStore;
  readonly lyrics: PostgresLyricStore;
  readonly rhymes: PostgresRhymeStore;
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
    rhymes: new PostgresRhymeStore(runtime.databaseUrl)
  };
  cached = { key, context, allowedEmails };
  return context;
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
