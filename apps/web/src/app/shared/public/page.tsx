import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "공유 가사 | LyricsCloud",
  description: "LyricsCloud에서 공유된 가사를 읽습니다.",
  robots: { index: false, follow: false, noarchive: true }
};

export default function PublicSharedLyricPage() {
  return <main className="public-share-shell">
    <section className="public-share-card" aria-labelledby="public-share-title">
      <p className="eyebrow">SHARED LYRICS</p>
      <h1 id="public-share-title">공유 가사</h1>
      <p>안전한 공유 링크를 확인하고 있습니다.</p>
      <noscript><p>공유 가사를 보려면 JavaScript를 켜 주세요.</p></noscript>
    </section>
  </main>;
}
