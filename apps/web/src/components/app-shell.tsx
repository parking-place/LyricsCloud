"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { clearAccountCache, clearOtherAccountCaches, coordinateAccountLogout, downloadRecoveryDrafts } from "../lib/account-cache.js";
import { Brand } from "./auth-screen.js";

interface ShellProfile {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
}

export function WorkspaceShell({
  profile,
  loginCompleted = false,
  active = "songs",
  children
}: {
  profile: ShellProfile;
  loginCompleted?: boolean;
  active?: "home" | "songs";
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [logoutBlocked, setLogoutBlocked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [accountPaused, setAccountPaused] = useState(false);
  const logoutPending = useRef(false);
  const mainShell = useRef<HTMLDivElement>(null);
  const pausedFocus = useRef<HTMLElement | null>(null);
  const guard = useRef<ReturnType<typeof coordinateAccountLogout> | null>(null);

  useEffect(() => {
    const coordination = coordinateAccountLogout(profile.userId, (paused) => {
      if (paused && document.activeElement instanceof HTMLElement && !mainShell.current?.inert) pausedFocus.current = document.activeElement;
      if (mainShell.current) mainShell.current.inert = paused;
      if (!paused) {
        pausedFocus.current?.focus();
        if (loginCompleted) document.querySelector<HTMLElement>("[data-login-focus]")?.focus();
      }
      setAccountPaused(paused);
    }, () => {
      void clearAccountCache(profile.userId).catch(() => undefined).finally(() => window.location.replace("/auth"));
    });
    guard.current = coordination;
    return () => { coordination.dispose(); guard.current = null; };
  }, [profile.userId]);

  useEffect(() => {
    if (loginCompleted) document.querySelector<HTMLElement>("[data-login-focus]")?.focus();
    let active = true;
    let checking = false;
    async function checkAccount() {
      if (checking || logoutPending.current || !navigator.onLine) return;
      checking = true;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", signal: AbortSignal.timeout(8_000) });
        const session = response.ok ? await response.json() as { user?: { id?: string } } : null;
        if (active && session?.user?.id === profile.userId) await clearOtherAccountCaches(profile.userId);
        if (active && !logoutPending.current && response.status === 401) {
          setSessionExpired(true);
        } else if (active && response.ok) setSessionExpired(false);
        if (active && !logoutPending.current && response.ok && session?.user?.id !== profile.userId) {
          // Full navigation removes the previous account's component/route cache.
          try { await clearAccountCache(profile.userId); }
          finally { if (active) window.location.replace("/auth"); }
        }
      } catch { /* A network outage must leave the local editor usable. */ }
      finally { checking = false; }
    }
    void checkAccount();
    window.addEventListener("focus", checkAccount);
    window.addEventListener("online", checkAccount);
    return () => { active = false; window.removeEventListener("focus", checkAccount); window.removeEventListener("online", checkAccount); };
  }, [loginCompleted, profile.userId]);

  async function logout(force = false) {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    setLogoutError("");
    setLogoutBlocked(false);
    try {
      const completed = await guard.current?.run(async () => {
        const response = await fetch("/api/auth/logout", { method: "POST", headers: { "X-Expected-Owner": profile.userId }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error("LOGOUT_FAILED");
        await clearAccountCache(profile.userId).catch(() => undefined);
      }, force);
      if (!completed) {
        setLogoutError("아직 서버에 저장하지 못한 변경이 있어 로그아웃하지 않았습니다. 편집하던 가사를 열어 저장을 마친 뒤 다시 시도해 주세요.");
        setLogoutBlocked(true);
        return;
      }
      window.location.replace("/auth");
    } catch {
      setLogoutError("로그아웃을 완료하지 못했습니다. 현재 화면을 유지했으니 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
  }

  async function downloadDrafts() {
    try { await downloadRecoveryDrafts(profile.userId); }
    catch { setLogoutError("초안을 내려받지 못했습니다. 현재 입력을 직접 복사해 보관해 주세요."); }
  }

  return <main className={`workspace-shell${collapsed ? " is-collapsed" : ""}${sessionExpired || logoutError ? " has-account-error" : ""}`}>
    {loginCompleted ? <p className="sr-only" role="status">로그인이 완료되었습니다. 개인 작업 공간으로 이동했습니다.</p> : null}
    <aside className="side-nav">
      <Brand />
      <button className="rail-toggle" type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} aria-label={collapsed ? "좌측 메뉴 펼치기" : "좌측 메뉴 접기"}>☰</button>
      <p className="nav-label">Workspace</p>
      <nav className="nav-list" aria-label="데스크톱 주 메뉴">
        <a className={`nav-item${active === "home" ? " active" : ""}`} href="/workspace" aria-current={active === "home" ? "page" : undefined}><span aria-hidden="true">✦</span><span className="nav-text">창작 홈</span></a>
        <a className={`nav-item${active === "songs" ? " active" : ""}`} href="/songs" aria-current={active === "songs" ? "page" : undefined}><span aria-hidden="true">♪</span><span className="nav-text">곡</span></a>
        <PlannedItem icon="≈" label="라임 노트" version="0.4.0" />
        <PlannedItem icon="◇" label="프롬프트" version="0.5.0" />
      </nav>
      <div className="side-spacer" />
      <div className="profile-mini"><Avatar profile={profile} /><span className="nav-text"><strong>{profile.displayName}</strong><small>개인 작업 공간</small></span></div>
      <button className="logout-button" type="button" onClick={() => void logout()} disabled={loggingOut || accountPaused}><span aria-hidden="true">↗</span><span className="nav-text">{loggingOut ? "로그아웃 중" : "로그아웃"}</span></button>
    </aside>
    <div className="main-shell" ref={mainShell}>
      <header className="topbar">
        <nav className="workspace-tabs" aria-label="창작 영역"><a href="/songs" className="workspace-tab active" aria-current="page">곡 · 가사</a><span className="workspace-tab disabled" aria-disabled="true">라임 노트 <small>0.4.0</small></span><span className="workspace-tab disabled" aria-disabled="true">프롬프트 <small>0.5.0</small></span></nav>
        <span className="topbar-spacer" /><span className="private-badge">개인 공간</span><button className="top-logout" onClick={() => void logout()} disabled={loggingOut || accountPaused}>{loggingOut ? "종료 중" : "로그아웃"}</button>
      </header>
      {sessionExpired || logoutError ? <div className="account-messages">
      {sessionExpired ? <div className="account-error" role="alert"><p>로그인이 만료되었습니다. 미전송 초안과 현재 입력을 보존했습니다. <a href="/auth" target="_blank" rel="noopener noreferrer">다시 로그인</a>한 뒤 동기화를 다시 시도해 주세요.</p><button className="secondary-button" type="button" onClick={() => void downloadDrafts()}>초안 내려받기</button></div> : null}
      {logoutError ? <div className="account-error" role="alert"><p>{logoutError}</p>{logoutBlocked ? <><p>문서가 삭제되어 저장할 수 없다면 초안을 보관한 뒤 로그아웃할 수 있습니다.</p><div className="account-actions"><button className="secondary-button" type="button" onClick={() => void downloadDrafts()}>초안 내려받기</button><button className="danger-button" type="button" onClick={() => {
        if (window.confirm("이 기기의 미전송 초안을 삭제하고 모든 기기에서 로그아웃할까요? 다른 탭의 저장되지 않은 입력도 먼저 내려받거나 복사해 보관해 주세요.")) void logout(true);
      }}>초안을 지우고 로그아웃</button></div></> : null}</div> : null}
      </div> : null}
      {children}
    </div>
    <header className="mobile-header"><Brand /><span className="mobile-account"><Avatar profile={profile} /><button className="mobile-logout" type="button" onClick={() => void logout()} disabled={loggingOut || accountPaused}>{loggingOut ? "종료 중" : "로그아웃"}</button></span></header>
    <nav className="mobile-bottom-nav" aria-label="모바일 주 메뉴">
      <a href="/workspace" className={`mobile-nav-item${active === "home" ? " active" : ""}`} aria-current={active === "home" ? "page" : undefined}><span aria-hidden="true">⌂</span><strong>홈</strong></a>
      <a href="/songs" className={`mobile-nav-item${active === "songs" ? " active" : ""}`} aria-current={active === "songs" ? "page" : undefined}><span aria-hidden="true">♪</span><strong>곡</strong></a>
      <a className="quick-add" href="/songs/new" aria-label="새 곡 추가"><span>＋</span><small>새 곡</small></a>
      <PlannedMobile icon="•••" label="더보기" />
    </nav>
  </main>;
}

export function AppShell({ profile, loginCompleted }: { profile: ShellProfile; loginCompleted: boolean }) {
  return <WorkspaceShell profile={profile} loginCompleted={loginCompleted} active="home">
    <section className="workspace-content" aria-labelledby="workspace-title">
      <p className="eyebrow">Private beta · 0.3.1</p>
      <h1 tabIndex={-1} data-login-focus id="workspace-title">안녕하세요, {profile.displayName}님.</h1>
      <p>안전한 개인 작업 공간이 준비됐습니다.</p>
      <div className="empty-state"><span aria-hidden="true">✦</span><h2>첫 곡을 정리해볼까요?</h2><p>곡 목록에서 아이디어부터 완성까지 작업 상태를 관리할 수 있어요.</p><a className="primary-link" href="/songs">곡 목록 열기</a></div>
    </section>
  </WorkspaceShell>;
}

function PlannedItem({ icon, label, version }: { icon: string; label: string; version: string }) { return <span className="nav-item disabled" aria-disabled="true" title={`${version}에서 제공 예정`}><span aria-hidden="true">{icon}</span><span className="nav-text">{label}<small>{version} 예정</small></span></span>; }
function PlannedMobile({ icon, label }: { icon: string; label: string }) { return <span className="mobile-nav-item disabled" aria-disabled="true"><span aria-hidden="true">{icon}</span><strong>{label}</strong><small>예정</small></span>; }
function Avatar({ profile }: { profile: Pick<ShellProfile, "displayName" | "avatarUrl"> }) { return profile.avatarUrl ? <img className="avatar" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="avatar" aria-hidden="true">{profile.displayName.slice(0, 1)}</span>; }
