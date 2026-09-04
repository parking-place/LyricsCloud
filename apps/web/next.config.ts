import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@lyricscloud/auth", "@lyricscloud/config", "@lyricscloud/database", "@lyricscloud/domain", "@lyricscloud/ui"],
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Pragma", value: "no-cache" }
    ];
    return ["/", "/auth", "/workspace"].map((source) => ({ source, headers: noStore }));
  }
};
export default config;
