import { AuthService, GoogleOidcAdapter } from "@lyricscloud/auth";
import { readAuthConfig, readRuntimeConfig, type AuthConfig } from "@lyricscloud/config";
import { PostgresAuthStore } from "@lyricscloud/database";

interface AuthContext { readonly config: AuthConfig; readonly service: AuthService; }

let cached: { key: string; context: AuthContext } | undefined;

export function getAuthContext(): AuthContext {
  const runtime = readRuntimeConfig(process.env);
  const config = readAuthConfig(process.env);
  const key = `${runtime.databaseUrl}\u0000${config.appOrigin}\u0000${config.issuer}\u0000${config.clientId}`;
  if (cached?.key === key) return cached.context;
  const store = new PostgresAuthStore(runtime.databaseUrl);
  const context = { config, service: new AuthService(config, store, new GoogleOidcAdapter(config)) };
  cached = { key, context };
  return context;
}
