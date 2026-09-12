import type { Metadata } from "next";
import { PublicSharedLyricViewer } from "../../../components/public-shared-lyric-viewer.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "공유 가사 | LyricsCloud",
  description: "LyricsCloud에서 공유된 가사를 읽습니다.",
  robots: { index: false, follow: false, noarchive: true }
};

export default function PublicSharedLyricPage() {
  return <main className="public-share-shell"><PublicSharedLyricViewer /><noscript><p>공유 가사를 보려면 JavaScript를 켜 주세요.</p></noscript></main>;
}
