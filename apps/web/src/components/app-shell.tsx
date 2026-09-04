"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAccountCache } from "../lib/account-cache.js";
import { Brand } from "./auth-screen.js";

export function AppShell({ profile, loginCompleted }: { profile: { userId: string; displayName: string; avatarUrl: string | null }; loginCompleted: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  useEffect(() => { if (loginCompleted) heading.current?.focus(); void fetch("/api/auth/session", { cache: "no-store" }); }, [loginCompleted]);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    if (response.ok) { clearAccountCache(profile.userId); router.replace("/auth"); router.refresh(); return; }
    setLoggingOut(false);
  }
  return <main className={`workspace-shell${collapsed ? " is-collapsed" : ""}`}>
    {loginCompleted ? <p className="sr-only" role="status">로그인이 완료되었습니다. 창작 홈으로 이동했습니다.</p> : null}
    <aside className="side-nav"><Brand /><button className="rail-toggle" type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} aria-label={collapsed ? "좌측 메뉴 펼치기" : "좌측 메뉴 접기"}>☰</button><p className="nav-label">Workspace</p><nav className="nav-list" aria-label="데스크톱 주 메뉴"><a className="nav-item active" href="/workspace" aria-current="page"><span aria-hidden="true">✦</span><span className="nav-text">창작 홈</span></a><PlannedItem icon="♪" label="곡" version="0.2.0" /><PlannedItem icon="≈" label="라임 노트" version="0.4.0" /><PlannedItem icon="◇" label="프롬프트" version="0.5.0" /></nav><div className="side-spacer" /><div className="profile-mini"><Avatar profile={profile} /><span className="nav-text"><strong>{profile.displayName}</strong><small>개인 작업 공간</small></span></div><button className="logout-button" type="button" onClick={logout} disabled={loggingOut}><span aria-hidden="true">↗</span><span className="nav-text">{loggingOut ? "로그아웃 중" : "로그아웃"}</span></button></aside>
    <div className="main-shell"><header className="topbar"><nav className="workspace-tabs" aria-label="창작 영역"><a href="/workspace" className="workspace-tab active" aria-current="page">창작</a><span className="workspace-tab disabled" aria-disabled="true">자료 <small>준비 중</small></span></nav><span className="topbar-spacer" /><span className="private-badge">개인 공간</span><button className="top-logout" onClick={logout} disabled={loggingOut}>{loggingOut ? "종료 중" : "로그아웃"}</button></header><section className="workspace-content" aria-labelledby="workspace-title"><p className="eyebrow">Private beta · 0.1.0</p><h1 ref={heading} tabIndex={-1} id="workspace-title">안녕하세요, {profile.displayName}님.</h1><p>안전한 개인 작업 공간이 준비됐습니다.</p><div className="empty-state"><span aria-hidden="true">✦</span><h2>창작 도구를 준비하고 있어요</h2><p>곡과 가사 작성은 다음 버전부터 순서대로 열립니다.</p><span className="planned-pill">0.2.0에서 곡 관리 시작</span></div></section></div>
    <header className="mobile-header"><Brand /><span className="mobile-account"><Avatar profile={profile} /><button className="mobile-logout" type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? "종료 중" : "로그아웃"}</button></span></header><nav className="mobile-bottom-nav" aria-label="모바일 주 메뉴"><a href="/workspace" className="mobile-nav-item active" aria-current="page"><span aria-hidden="true">⌂</span><strong>홈</strong></a><PlannedMobile icon="♪" label="곡" /><button className="quick-add" type="button" disabled aria-label="빠른 추가, 준비 중"><span>＋</span><small>준비 중</small></button><PlannedMobile icon="•••" label="더보기" /></nav>
  </main>;
}

function PlannedItem({ icon, label, version }: { icon: string; label: string; version: string }) { return <span className="nav-item disabled" aria-disabled="true" title={`${version}에서 제공 예정`}><span aria-hidden="true">{icon}</span><span className="nav-text">{label}<small>{version} 예정</small></span></span>; }
function PlannedMobile({ icon, label }: { icon: string; label: string }) { return <span className="mobile-nav-item disabled" aria-disabled="true"><span aria-hidden="true">{icon}</span><strong>{label}</strong><small>예정</small></span>; }
function Avatar({ profile }: { profile: { displayName: string; avatarUrl: string | null } }) { return profile.avatarUrl ? <img className="avatar" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="avatar" aria-hidden="true">{profile.displayName.slice(0, 1)}</span>; }
