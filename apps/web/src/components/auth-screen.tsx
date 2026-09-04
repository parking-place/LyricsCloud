import Link from "next/link";
import { LoginButton } from "./login-button.js";

const errors: Record<string, { title: string; message: string }> = {
  AUTH_CANCELLED: { title: "로그인이 취소됐어요", message: "Google 계정 선택을 다시 시작할 수 있습니다." },
  AUTH_STATE_INVALID: { title: "로그인 시간이 만료됐어요", message: "안전을 위해 처음부터 다시 로그인해 주세요." },
  AUTH_CALLBACK_REPLAYED: { title: "이미 처리한 로그인 요청이에요", message: "새 로그인 요청으로 다시 시도해 주세요." },
  AUTH_NOT_ALLOWED: { title: "아직 초대되지 않은 계정이에요", message: "LyricsCloud 비공개 베타에 등록된 Google 계정으로 로그인해 주세요." },
  AUTH_PROVIDER_UNAVAILABLE: { title: "Google에 연결하지 못했어요", message: "네트워크를 확인한 뒤 잠시 후 다시 시도해 주세요." }
};

export function AuthScreen({ errorCode, requestId }: { errorCode?: string; requestId?: string }) {
  const error = errorCode ? errors[errorCode] ?? errors.AUTH_PROVIDER_UNAVAILABLE : undefined;
  return <main className="auth-layout">
    <section className="auth-story" aria-labelledby="auth-story-title"><Brand /><div className="auth-copy"><p className="eyebrow">Your music workspace</p><h1 id="auth-story-title"><span className="desktop-auth-title">가사와 라임,<br />Suno 프롬프트를<br />한곳에서.</span><span className="mobile-auth-title">한 줄의 아이디어가<br />한 곡이 되는 곳.</span></h1><p><span className="desktop-auth-lede">떠오른 한 줄부터 최종본까지.<br />창작 흐름을 끊지 않고 이어가세요.</span><span className="mobile-auth-lede">가사, 라임 노트, Suno 프롬프트를<br />흐름이 끊기지 않는 한곳에서 관리하세요.</span></p></div><ol className="auth-flow" aria-label="LyricsCloud 창작 흐름"><li>아이디어</li><li>라임 탐색</li><li>가사 작성</li><li>Suno 입력</li></ol></section>
    <section className="auth-panel" aria-labelledby="login-title"><div className="auth-card"><span className="brand-mark card-mark" aria-hidden="true">L</span><h2 id="login-title">다시 작업을 시작해볼까요?</h2><p className="auth-description">로그인하면 PC와 모바일 어디서든 같은 곡, 가사, 라임 노트와 프롬프트를 이어서 사용할 수 있습니다.</p>{error ? <div className="auth-error" role="alert" tabIndex={-1}><strong>{error.title}</strong><span>{error.message}</span>{requestId ? <small>문의 코드 {requestId}</small> : null}</div> : null}<div className="mobile-sync-copy"><strong>어느 기기에서든 이어서</strong><span>마지막으로 쓰던 가사부터 바로 시작할 수 있습니다.</span></div><LoginButton /><p className="auth-foot">계속하면 <Link href="/terms">이용 안내</Link>와 <Link href="/privacy">개인정보 안내</Link>를 확인하고 동의한 것으로 봅니다.</p><p className="policy-version">정책 버전 2026-09-04</p></div></section>
  </main>;
}

export function Brand() { return <div className="brand"><span className="brand-mark" aria-hidden="true">L</span><span>LYRICS CLOUD</span></div>; }
