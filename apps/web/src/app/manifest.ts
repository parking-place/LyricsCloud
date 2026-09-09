import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/workspace",
    name: "LyricsCloud",
    short_name: "LyricsCloud",
    description: "가사, 라임 노트와 프롬프트를 이어 쓰는 개인 음악 창작 워크스페이스",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    background_color: "#090b0e",
    theme_color: "#c8ff3d",
    lang: "ko-KR",
    orientation: "any",
    categories: ["music", "productivity"],
    icons: [
      { src: "/icons/lyricscloud-mark-light.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/lyricscloud-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icons/lyricscloud-192-0903.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/lyricscloud-512-0903.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
