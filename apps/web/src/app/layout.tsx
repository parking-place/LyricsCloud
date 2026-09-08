import "@lyricscloud/ui/tokens.css";
import "./styles.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { resolvePageThemePreference } from "../lib/page-auth.js";

export const metadata: Metadata = {
  title: "LyricsCloud",
  description: "음악 창작 워크스페이스",
  applicationName: "LyricsCloud",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LyricsCloud", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/lyricscloud-192-0903.svg", apple: "/icons/lyricscloud-192-0903.svg" }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

const themeBootstrap = `(function(){var r=document.documentElement,p=r.dataset.themePreference||'system',m=window.matchMedia('(prefers-color-scheme: dark)');function a(){r.dataset.theme=p==='system'?(m.matches?'dark':'light'):p;r.style.colorScheme=r.dataset.theme}a();m.addEventListener&&m.addEventListener('change',function(){if(p==='system')a()});window.__lcApplyTheme=function(n){if(n!=='system'&&n!=='light'&&n!=='dark')return;p=n;r.dataset.themePreference=n;a()}})()`;

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const themePreference = await resolvePageThemePreference();
  return <html lang="ko" data-theme-preference={themePreference} suppressHydrationWarning>
    <head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
    <body>{children}</body>
  </html>;
}
