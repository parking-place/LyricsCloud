import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["yjs"],
  generateBuildId: async () => process.env.NEXT_BUILD_ID ?? "lyricscloud-1.0.1",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@lyricscloud/auth", "@lyricscloud/config", "@lyricscloud/database", "@lyricscloud/domain", "@lyricscloud/ui"],
  async rewrites() {
    return [{ source: "/collaboration/:path*", destination: `${process.env.COLLABORATION_INTERNAL_URL ?? "http://127.0.0.1:3001"}/:path*` }];
  },
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Pragma", value: "no-cache" }
    ];
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ];
    const privateRoutes = [
      "/", "/auth", "/account/:path*", "/api/:path*", "/workspace",
      "/songs/:path*", "/lyrics/:path*", "/rhymes/:path*", "/prompts/:path*",
      "/search", "/recent", "/favorites", "/templates", "/trash", "/settings"
    ];
    return [
      { source: "/:path*", headers: security },
      ...privateRoutes.map((source) => ({ source, headers: noStore }))
    ];
  }
};
export default config;
