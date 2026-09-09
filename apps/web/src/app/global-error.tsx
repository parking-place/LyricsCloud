"use client";

export default function GlobalError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="ko">
      <body>
        <main>
          <section aria-labelledby="global-error-title">
            <h1 id="global-error-title">LyricsCloud를 불러오지 못했습니다.</h1>
            <p role="alert">잠시 후 다시 시도해주세요.</p>
            <button type="button" onClick={reset}>다시 시도</button>
          </section>
        </main>
      </body>
    </html>
  );
}
