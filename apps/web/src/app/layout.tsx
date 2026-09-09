import "@lyricscloud/ui/tokens.css";
import "./styles.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { CSSProperties, ReactNode } from "react";
import { readRuntimeConfig } from "@lyricscloud/config";
import { formatBuildLabel } from "../lib/build-metadata.js";
import { resolvePageThemePreference } from "../lib/page-auth.js";

export const metadata: Metadata = {
  title: "LyricsCloud",
  description: "음악 창작 워크스페이스",
  applicationName: "LyricsCloud",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LyricsCloud", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/lyricscloud-favicon.svg", apple: "/icons/lyricscloud-mark-light.svg" }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

const themeBootstrap = `(function(){var r=document.documentElement,p=r.dataset.themePreference||'system',m=window.matchMedia('(prefers-color-scheme: dark)');function a(){r.dataset.theme=p==='system'?(m.matches?'dark':'light'):p;r.style.colorScheme=r.dataset.theme}a();m.addEventListener&&m.addEventListener('change',function(){if(p==='system')a()});window.__lcApplyTheme=function(n){if(n!=='system'&&n!=='light'&&n!=='dark')return;p=n;r.dataset.themePreference=n;a()}})()`;

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const themePreference = await resolvePageThemePreference();
  const runtime = readRuntimeConfig(process.env);
  const buildLabel = formatBuildLabel({ version: runtime.appVersion, channel: runtime.appChannel, phase: runtime.appPhase });
  return <html lang="ko" data-theme-preference={themePreference} style={{ "--lc-build-label": `"${buildLabel}"` } as CSSProperties} suppressHydrationWarning>
    <head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
    <body><span id="runtime-build-label" className="sr-only">{buildLabel}</span>{children}</body>
  </html>;
}
