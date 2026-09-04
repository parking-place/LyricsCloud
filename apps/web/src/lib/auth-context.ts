import { AuthService, cookieNames, GoogleOidcAdapter, readCookie, sessionCookie } from "@lyricscloud/auth";
import { readAuthConfig, readRuntimeConfig, type AuthConfig } from "@lyricscloud/config";
import { PostgresAuthStore, PostgresOwnedDataStore } from "@lyricscloud/database";

interface AuthContext {
  readonly config: AuthConfig;
  readonly service: AuthService;
  readonly ownedData: PostgresOwnedDataStore;
}

export class RequestAuthError extends Error {
  readonly code = "AUTH_REQUIRED" as const;
  constructor() { super("AUTH_REQUIRED"); this.name = "RequestAuthError"; }
}

let cached: { key: string; context: AuthContext } | undefined;

export function getAuthContext(): AuthContext {
  const runtime = readRuntimeConfig(process.env);
  const config = readAuthConfig(process.env);
  const key = `${runtime.databaseUrl}\u0000${config.appOrigin}\u0000${config.issuer}\u0000${config.clientId}`;
  if (cached?.key === key) return cached.context;
  const store = new PostgresAuthStore(runtime.databaseUrl);
  const context = {
    config,
    service: new AuthService(config, store, new GoogleOidcAdapter(config)),
    ownedData: new PostgresOwnedDataStore(runtime.databaseUrl)
  };
  cached = { key, context };
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
