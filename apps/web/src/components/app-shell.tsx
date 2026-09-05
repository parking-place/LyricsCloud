"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAccountCache } from "../lib/account-cache.js";
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
  const router = useRouter();

  useEffect(() => {
    if (loginCompleted) document.querySelector<HTMLElement>("[data-login-focus]")?.focus();
    void fetch("/api/auth/session", { cache: "no-store" });
  }, [loginCompleted]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    if (response.ok) {
      clearAccountCache(profile.userId);
      router.replace("/auth");
      router.refresh();
      return;
    }
    setLoggingOut(false);
  }

  return <main className={`workspace-shell${collapsed ? " is-collapsed" : ""}`}>
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
      <button className="logout-button" type="button" onClick={logout} disabled={loggingOut}><span aria-hidden="true">↗</span><span className="nav-text">{loggingOut ? "로그아웃 중" : "로그아웃"}</span></button>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <nav className="workspace-tabs" aria-label="창작 영역"><a href="/songs" className="workspace-tab active" aria-current="page">곡 · 가사</a><span className="workspace-tab disabled" aria-disabled="true">라임 노트 <small>0.4.0</small></span><span className="workspace-tab disabled" aria-disabled="true">프롬프트 <small>0.5.0</small></span></nav>
        <span className="topbar-spacer" /><span className="private-badge">개인 공간</span><button className="top-logout" onClick={logout} disabled={loggingOut}>{loggingOut ? "종료 중" : "로그아웃"}</button>
      </header>
      {children}
    </div>
    <header className="mobile-header"><Brand /><span className="mobile-account"><Avatar profile={profile} /><button className="mobile-logout" type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? "종료 중" : "로그아웃"}</button></span></header>
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
