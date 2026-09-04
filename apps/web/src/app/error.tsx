"use client";

export default function ErrorPage({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main>
      <section aria-labelledby="error-title">
        <p className="eyebrow">요청을 완료하지 못했습니다</p>
        <h1 id="error-title">잠시 후 다시 시도해주세요.</h1>
        <p role="alert">문제가 계속되면 새로고침한 뒤 다시 시도할 수 있습니다.</p>
        <button type="button" onClick={reset}>다시 시도</button>
      </section>
    </main>
  );
}
