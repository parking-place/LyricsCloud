import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@lyricscloud/auth", "@lyricscloud/config", "@lyricscloud/database", "@lyricscloud/domain", "@lyricscloud/ui"]
};
export default config;
