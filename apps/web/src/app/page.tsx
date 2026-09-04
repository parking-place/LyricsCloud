import { productRoutes } from "@lyricscloud/domain";

export default function Home() {
  return (
    <main>
      <section aria-labelledby="title">
        <p className="eyebrow">0.0.0 architecture baseline</p>
        <h1 id="title">LyricsCloud</h1>
        <p>곡, 가사, 라임과 프롬프트를 한 흐름으로 연결하는 창작 워크스페이스입니다.</p>
        <p className="status" role="status">제품 화면은 다음 버전부터 순서대로 열립니다.</p>
      </section>
      <section aria-labelledby="routes">
        <h2 id="routes">화면 준비 상태</h2>
        <ul>{productRoutes.map((route) => <li key={route.screen}><code>{route.path}</code><span>{route.screen}</span><strong>예정</strong></li>)}</ul>
      </section>
    </main>
  );
}
