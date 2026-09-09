"use client";

import { useState } from "react";
import { Brand } from "./auth-screen.js";

export function WithdrawalScreen({ displayName, purgeAt }: { displayName: string; purgeAt: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function cancel() {
    if (busy || confirmation !== "철회") return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/account/withdrawal/cancel", {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation })
      });
      if (!response.ok) throw new Error("CANCEL_FAILED");
      window.location.replace("/workspace");
    } catch {
      setMessage("탈퇴 철회를 완료하지 못했습니다. 철회 기한과 연결 상태를 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }
  return <main className="withdrawal-page"><section className="withdrawal-card" aria-labelledby="withdrawal-pending-title">
    <div className="withdrawal-brand"><Brand /></div>
    <p className="eyebrow">Withdrawal grace period</p><h1 id="withdrawal-pending-title">{displayName}님의 탈퇴가 예약되었습니다</h1>
    <p>현재 계정의 창작 자료와 일반 기능은 즉시 차단된 상태입니다. <strong>{formatDeadline(purgeAt)}</strong> 전까지 아래에서 탈퇴를 철회할 수 있습니다.</p>
    <div className="withdrawal-warning"><strong>기한이 지나면 계정과 자료를 완전히 삭제합니다.</strong><p>인프라 백업에는 운영 보존 기간 동안 암호화된 사본이 남을 수 있으며, 이 화면이나 고객 기능으로는 복원할 수 없습니다.</p></div>
    <label className="withdrawal-confirmation">계속하려면 <strong>철회</strong>를 입력하세요<input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
    {message ? <p className="settings-message warning" role="alert">{message}</p> : null}
    <button type="button" className="primary-link withdrawal-cancel" onClick={() => void cancel()} disabled={busy || confirmation !== "철회"}>{busy ? "철회 중" : "탈퇴 철회하고 작업 공간 복구"}</button>
  </section></main>;
}

function formatDeadline(value: string): string { return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value)); }
