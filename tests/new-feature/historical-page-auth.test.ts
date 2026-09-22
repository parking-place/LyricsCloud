import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { expect, it, vi } from "vitest";

it("shares root/page authentication within one React server request, never across accounts or revocation", async () => {
  const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
  // Use the installed React server cache, with only its request storage boundary simulated.
  const react = require(join(dirname(require.resolve("react/package.json")), "cjs/react.react-server.development.js"));
  const internals = react.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previous = internals.A;
  let token = "account-a";
  const session = vi.fn(async (value: string) => {
    if (value === "revoked") throw new Error("SESSION_REVOKED");
    return { userId: value };
  });
  const profile = vi.fn(async (userId: string) => ({ displayName: userId, avatarUrl: null }));
  const module = { exports: {} as { resolvePageUser: () => Promise<unknown>; resolvePageThemePreference: () => Promise<unknown> } };
  vm.runInNewContext(transformSync(readFileSync(new URL("../../apps/web/src/lib/page-auth.ts", import.meta.url), "utf8"), { loader: "ts", format: "cjs" }).code, {
    module, exports: module.exports,
    require: (name: string) => ({
      react,
      "next/headers": { cookies: async () => ({ get: () => ({ value: token }) }) },
      "./auth-context.js": { getAuthContext: () => ({ service: { resolveSession: session }, ownedData: { getProfile: profile }, displaySettings: { getUserSettings: async () => ({ theme: "dark" }) } }) },
      "@lyricscloud/auth": {}
    })[name]
  });
  function nextRequest() {
    const entries = new Map();
    internals.A = { getCacheForType(factory: () => unknown) {
      if (!entries.has(factory)) entries.set(factory, factory());
      return entries.get(factory);
    } };
  }
  try {
    nextRequest();
    const [theme, user] = await Promise.all([module.exports.resolvePageThemePreference(), module.exports.resolvePageUser()]);
    expect(theme).toBe("dark");
    expect(user).toMatchObject({ userId: "account-a" });
    expect(session).toHaveBeenCalledTimes(1);
    expect(profile).toHaveBeenCalledTimes(1);
    token = "account-b"; nextRequest();
    expect(await module.exports.resolvePageUser()).toMatchObject({ userId: "account-b" });
    expect(session).toHaveBeenCalledTimes(2);
    token = "revoked"; nextRequest();
    expect(await module.exports.resolvePageUser()).toBeNull();
    expect(await module.exports.resolvePageThemePreference()).toBe("system");
    expect(session).toHaveBeenCalledTimes(3);
    expect(profile).toHaveBeenCalledTimes(2);
  } finally { internals.A = previous; }
});
