"use client";

import { useState } from "react";

export function LoginButton() {
  const [pending, setPending] = useState(false);
  return <><a className={`google-button${pending ? " pending" : ""}`} href="/api/auth/login?returnTo=/workspace" aria-disabled={pending} onClick={(event) => {
    if (pending) { event.preventDefault(); return; }
    setPending(true);
  }}><span className="google-mark" aria-hidden="true">G</span><span>{pending ? "Google 계정을 확인하는 중" : "Google 계정으로 계속하기"}</span></a><span className="sr-only" role="status" aria-live="polite">{pending ? "Google 로그인을 시작합니다." : ""}</span></>;
}
