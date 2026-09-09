"use client";

import { useState } from "react";

const messages: Record<string, string> = {
  BETA_SIGNUP_INVALID: "초대 코드 6자리와 Google 계정 이메일을 확인해 주세요.",
  RATE_LIMITED: "가입 요청이 많습니다. 잠시 기다린 뒤 다시 시도해 주세요.",
  PAYLOAD_TOO_LARGE: "입력값이 너무 깁니다. 코드와 이메일을 다시 확인해 주세요.",
  FORBIDDEN: "이 페이지를 새로고침한 뒤 다시 시도해 주세요."
};

export function BetaSignupForm() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email })
      });
      const result = await response.json().catch(() => ({})) as {
        authorizationUrl?: string;
        error?: { code?: string };
      };
      if (!response.ok || !result.authorizationUrl) {
        throw new Error(result.error?.code ?? "AUTH_PROVIDER_UNAVAILABLE");
      }
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "AUTH_PROVIDER_UNAVAILABLE";
      setMessage(messages[reason] ?? "Google 가입을 시작하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
      setPending(false);
    }
  }

  return <section className="beta-signup" aria-labelledby="beta-signup-title">
    <div className="auth-divider"><span>처음 이용하시나요?</span></div>
    <h3 id="beta-signup-title">초대 코드로 가입</h3>
    <p>초대 코드와 Google 계정 이메일을 입력한 뒤 같은 계정으로 본인 확인을 완료해 주세요.</p>
    <form onSubmit={submit} aria-busy={pending}>
      <label><span>초대 코드</span><input name="betaCode" autoComplete="one-time-code" inputMode="text"
        maxLength={6} pattern="[A-Za-z0-9]{6}" required disabled={pending} value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/gu, "").slice(0, 6))}
        placeholder="영문·숫자 6자리" /></label>
      <label><span>Google 계정 이메일</span><input name="email" type="email" autoComplete="email"
        maxLength={320} required disabled={pending} value={email} onChange={(event) => setEmail(event.target.value)}
        placeholder="name@example.com" /></label>
      {message ? <p className="beta-signup-error" role="alert">{message}</p> : null}
      <button type="submit" disabled={pending || code.length !== 6 || !email.trim()}>
        {pending ? "Google 계정 확인 준비 중…" : "가입하고 Google로 확인"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "입력을 안전하게 확인하고 Google 가입을 시작합니다." : ""}
      </span>
    </form>
  </section>;
}
