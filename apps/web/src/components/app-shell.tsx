"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { clearAccountCache, clearOtherAccountCaches, coordinateAccountLogout, downloadRecoveryDrafts, guardWorkspaceNavigation } from "../lib/account-cache.js";
import { DialogFocusBoundary } from "../lib/dialog-focus.js";
import { commandForKeyboardEvent, isEditableShortcutTarget, requestShortcutNavigation } from "../lib/shortcut-runtime.js";
import { PROFILE_UPDATED_EVENT, profileChannelName, type ProfileView } from "../lib/profile-state.js";
import { Brand, BrandMark } from "./auth-screen.js";
import { PwaManager } from "./pwa-manager.js";
import { QuickAdd } from "./quick-add.js";
import { ShortcutHelpDialog } from "./shortcut-help.js";

async function clearAccountCacheBeforeNavigation(userId: string): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      clearAccountCache(userId).catch(() => undefined),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, 2_000); })
    ]);
  } finally { clearTimeout(timer); }
}

interface ShellProfile {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly rowVersion?: number;
}

const CurrentProfile = createContext<ShellProfile | null>(null);

type ThemeShellWindow = Window & { __lcApplyTheme?: (theme: "system" | "light" | "dark") => void };

const WORKSPACE_CONTEXT = {
  home: ["Workspace", "창작 홈"],
  songs: ["라이브러리", "곡 · 가사"],
  rhymes: ["라이브러리", "라임 노트"],
  prompts: ["라이브러리", "프롬프트"],
  search: ["탐색", "통합 검색"],
  recent: ["탐색", "최근 작업"],
  favorites: ["탐색", "즐겨찾기"],
  templates: ["라이브러리", "템플릿"],
  trash: ["관리", "휴지통"],
  settings: ["계정", "설정"]
} as const;

export function WorkspaceShell({
  profile,
  loginCompleted = false,
  active = "songs",
  currentSongId,
  children
}: {
  profile: ShellProfile;
  loginCompleted?: boolean;
  active?: "home" | "songs" | "rhymes" | "prompts" | "search" | "recent" | "favorites" | "templates" | "trash" | "settings";
  currentSongId?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [contextGroup, contextTitle] = WORKSPACE_CONTEXT[active];
  const [shownProfile, setShownProfile] = useState<ShellProfile>(profile);
  const visibleProfile = shownProfile.userId === profile.userId ? shownProfile : profile;
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [logoutBlocked, setLogoutBlocked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [accountPaused, setAccountPaused] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [homeMessage, setHomeMessage] = useState("");
  const logoutPending = useRef(false);
  const mainShell = useRef<HTMLDivElement>(null);
  const pausedFocus = useRef<HTMLElement | null>(null);
  const guard = useRef<ReturnType<typeof coordinateAccountLogout> | null>(null);
  const homePending = useRef(false);
  const homeComposing = useRef(false);
  const closeShortcutHelp = useCallback(() => setShortcutHelpOpen(false), []);
  const closeMobileMore = useCallback(() => setMobileMoreOpen(false), []);

  useEffect(() => {
    let mounted = true;
    setShownProfile(profile);
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(profileChannelName(profile.userId));
    async function refreshProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!mounted || !response.ok) return;
        const latest = ((await response.json()) as { profile: ProfileView }).profile;
        if (mounted && latest.userId === profile.userId) setShownProfile(latest);
      } catch { /* Keep the server-rendered profile during an outage. */ }
    }
    const updated = (event: Event) => {
      const latest = (event as CustomEvent<ProfileView>).detail;
      if (latest?.userId === profile.userId) setShownProfile(latest);
    };
    // The page already resolved this profile. Revalidate on external changes,
    // including a restored document, rather than fetching it again on hydration.
    const pageShown = (event: PageTransitionEvent) => { if (event.persisted) void refreshProfile(); };
    window.addEventListener("focus", refreshProfile);
    window.addEventListener("online", refreshProfile);
    window.addEventListener("pageshow", pageShown);
    window.addEventListener(PROFILE_UPDATED_EVENT, updated);
    channel?.addEventListener("message", refreshProfile);
    return () => { mounted = false; window.removeEventListener("focus", refreshProfile);
      window.removeEventListener("online", refreshProfile); window.removeEventListener("pageshow", pageShown);
      window.removeEventListener(PROFILE_UPDATED_EVENT, updated); channel?.removeEventListener("message", refreshProfile); channel?.close(); };
  }, [profile.userId]);

  function navigateWorkspace(event: MouseEvent<HTMLElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const destination = new URL(link.href);
    if (destination.origin !== window.location.origin) return;
    event.preventDefault();
    navigateToWorkspace(destination.href);
  }

  function navigateToWorkspace(href: string) {
    const destination = new URL(href, window.location.href);
    const home = destination.pathname === "/workspace";
    if (destination.href === window.location.href) {
      if (home) setHomeMessage("이미 창작 홈입니다. 현재 화면을 새로고침하지 않았습니다.");
      closeMobileMore();
      return;
    }
    if (homePending.current) return;
    homePending.current = true; setHomeMessage("");
    void guardWorkspaceNavigation(profile.userId, homeComposing.current).then((safe) => {
      if (!safe || homeComposing.current || document.querySelector('[data-pending-input="true"], [data-pending-profile="true"]')) {
        setHomeMessage(`아직 저장되지 않은 입력이나 사진 선택, 오프라인 작업이 있어 ${home ? "홈으로" : "다른 화면으로"} 이동하지 않았습니다. 현재 화면에서 저장 또는 취소한 뒤 다시 시도하세요.`);
        return;
      }
      closeMobileMore();
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
    }).catch(() => {
      setHomeMessage(`저장 상태를 확인하지 못해 ${home ? "홈으로" : "다른 화면으로"} 이동하지 않았습니다. 연결을 확인한 뒤 다시 시도하세요.`);
    }).finally(() => { homePending.current = false; });
  }

  useEffect(() => {
    let composing = false;
    const compositionStart = () => { composing = true; homeComposing.current = true; };
    const compositionEnd = () => { composing = false; homeComposing.current = false; };
    function keyboard(event: KeyboardEvent) {
      if (composing || event.isComposing || isEditableShortcutTarget(event.target) || document.querySelector('[aria-modal="true"]')) return;
      const command = commandForKeyboardEvent(event, "global");
      if (!command) return;
      event.preventDefault();
      if (command === "shortcut_help") setShortcutHelpOpen(true);
      else if (command === "search") requestShortcutNavigation({ commandId: command, href: "/search" }, navigateToWorkspace);
      else if (command === "new_lyric") {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        requestShortcutNavigation({ commandId: command, href: `/lyrics/new?returnTo=${encodeURIComponent(returnTo)}` }, navigateToWorkspace);
      }
    }
    document.addEventListener("compositionstart", compositionStart, true);
    document.addEventListener("compositionend", compositionEnd, true);
    window.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("compositionstart", compositionStart, true);
      document.removeEventListener("compositionend", compositionEnd, true);
      window.removeEventListener("keydown", keyboard);
    };
  }, [profile.userId, router]);

  useEffect(() => {
    let active = true;
    const preferenceAtRequest = document.documentElement.dataset.themePreference;
    void fetch("/api/settings", { cache: "no-store" }).then(async (response) => {
      if (!active || !response.ok) return;
      const theme = ((await response.json()) as { settings?: { theme?: unknown } }).settings?.theme;
      if (
        document.documentElement.dataset.themePreference === preferenceAtRequest
        && (theme === "system" || theme === "light" || theme === "dark")
      ) (window as ThemeShellWindow).__lcApplyTheme?.(theme);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [profile.userId]);

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
      void clearAccountCacheBeforeNavigation(profile.userId).finally(() => window.location.replace("/auth"));
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
        let response: Response;
        try {
          response = await fetch("/api/auth/logout", { method: "POST", headers: { "X-Expected-Owner": profile.userId }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
        } catch (error) {
          // Clear-Site-Data can abort an intercepted or delayed fetch after the
          // server has already revoked the session. Reconcile that ambiguous
          // response before resuming editors and reporting a false failure.
          const session = await fetch("/api/auth/session", { cache: "no-store", signal: AbortSignal.timeout(5_000) }).catch(() => null);
          if (session?.status !== 401) throw error;
          return;
        }
        if (!response.ok) throw new Error("LOGOUT_FAILED");
      }, force);
      if (!completed) {
        setLogoutError("아직 서버에 저장하지 못한 변경이 있어 로그아웃하지 않았습니다. 편집하던 가사를 열어 저장을 마친 뒤 다시 시도해 주세요.");
        setLogoutBlocked(true);
        return;
      }
      await clearAccountCacheBeforeNavigation(profile.userId);
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

  return <CurrentProfile.Provider value={visibleProfile}><main className={`workspace-shell${collapsed ? " is-collapsed" : ""}${sessionExpired || logoutError || homeMessage ? " has-account-error" : ""}`}>
    {loginCompleted ? <p className="sr-only" role="status">로그인이 완료되었습니다. 개인 작업 공간으로 이동했습니다.</p> : null}
    <aside className="side-nav">
      <a className="brand-home-link" href="/workspace" aria-label="창작 홈으로 이동" onClick={navigateWorkspace}><Brand /></a>
      <button className="rail-toggle" type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} aria-label={collapsed ? "좌측 메뉴 펼치기" : "좌측 메뉴 접기"}>☰</button>
      <p className="nav-label">Workspace</p>
      <nav className="nav-list" aria-label="데스크톱 주 메뉴" onClick={navigateWorkspace}>
        <a className={`nav-item${active === "home" ? " active" : ""}`} href="/workspace" title="창작 홈" aria-label="창작 홈" aria-current={active === "home" ? "page" : undefined}><span aria-hidden="true">✦</span><span className="nav-text">창작 홈</span></a>
        <a className={`nav-item${active === "songs" ? " active" : ""}`} href="/songs" title="곡" aria-label="곡" aria-current={active === "songs" ? "page" : undefined}><span aria-hidden="true">♪</span><span className="nav-text">곡</span></a>
        <a className={`nav-item${active === "rhymes" ? " active" : ""}`} href="/rhymes" title="라임 노트" aria-label="라임 노트" aria-current={active === "rhymes" ? "page" : undefined}><span aria-hidden="true">≈</span><span className="nav-text">라임 노트</span></a>
        <a className={`nav-item${active === "prompts" ? " active" : ""}`} href="/prompts" title="프롬프트" aria-label="프롬프트" aria-current={active === "prompts" ? "page" : undefined}><span aria-hidden="true">◇</span><span className="nav-text">프롬프트</span></a>
        <a className={`nav-item${active === "search" ? " active" : ""}`} href="/search" title="통합 검색" aria-label="통합 검색" aria-current={active === "search" ? "page" : undefined}><span aria-hidden="true">⌕</span><span className="nav-text">통합 검색</span></a>
        <a className={`nav-item${active === "recent" ? " active" : ""}`} href="/recent" title="최근 작업" aria-label="최근 작업" aria-current={active === "recent" ? "page" : undefined}><span aria-hidden="true">↺</span><span className="nav-text">최근 작업</span></a>
        <a className={`nav-item${active === "favorites" ? " active" : ""}`} href="/favorites" title="즐겨찾기" aria-label="즐겨찾기" aria-current={active === "favorites" ? "page" : undefined}><span aria-hidden="true">★</span><span className="nav-text">즐겨찾기</span></a>
        <a className={`nav-item${active === "templates" ? " active" : ""}`} href="/templates" title="템플릿" aria-label="템플릿" aria-current={active === "templates" ? "page" : undefined}><span aria-hidden="true">▦</span><span className="nav-text">템플릿</span></a>
        <a className={`nav-item${active === "trash" ? " active" : ""}`} href="/trash" title="휴지통" aria-label="휴지통" aria-current={active === "trash" ? "page" : undefined}><span aria-hidden="true">♲</span><span className="nav-text">휴지통</span></a>
        <a className={`nav-item${active === "settings" ? " active" : ""}`} href="/settings" title="설정" aria-label="설정" aria-current={active === "settings" ? "page" : undefined}><span aria-hidden="true">⚙</span><span className="nav-text">설정</span></a>
      </nav>
      <div className="side-spacer" />
      <div className="profile-mini"><Avatar key={`${visibleProfile.userId}-${visibleProfile.rowVersion ?? 0}`} profile={visibleProfile} /><span className="nav-text"><strong>{visibleProfile.displayName}</strong><small>개인 작업 공간</small></span></div>
      <button className="logout-button" type="button" title="로그아웃" aria-label={loggingOut ? "로그아웃 중" : "로그아웃"} onClick={() => void logout()} disabled={loggingOut || accountPaused}><span aria-hidden="true">↗</span><span className="nav-text">{loggingOut ? "로그아웃 중" : "로그아웃"}</span></button>
    </aside>
    <div className="main-shell" ref={mainShell}>
      <header className="topbar">
        <nav className="workspace-tabs" aria-label="창작 영역" onClick={navigateWorkspace}><a href="/songs" className={`workspace-tab${active === "songs" ? " active" : ""}`} aria-current={active === "songs" ? "page" : undefined}>곡 · 가사</a><a href="/rhymes" className={`workspace-tab${active === "rhymes" ? " active" : ""}`} aria-current={active === "rhymes" ? "page" : undefined}>라임 노트</a><a href="/prompts" className={`workspace-tab${active === "prompts" ? " active" : ""}`} aria-current={active === "prompts" ? "page" : undefined}>프롬프트</a><a href="/templates" className={`workspace-tab${active === "templates" ? " active" : ""}`} aria-current={active === "templates" ? "page" : undefined}>▦ 템플릿</a><a href="/favorites" className={`workspace-tab${active === "favorites" ? " active" : ""}`} aria-current={active === "favorites" ? "page" : undefined}>★ 즐겨찾기</a><a href="/recent" className={`workspace-tab${active === "recent" ? " active" : ""}`} aria-current={active === "recent" ? "page" : undefined}>↺ 최근</a><a href="/search" className={`workspace-tab${active === "search" ? " active" : ""}`} aria-current={active === "search" ? "page" : undefined}>⌕ 검색</a></nav>
        <div className="b1-topbar-context" role="group" aria-label="현재 작업 영역"><span>{contextGroup}</span><strong>{contextTitle}</strong></div>
        <span className="topbar-spacer" /><button className="top-shortcut-help" type="button" aria-haspopup="dialog" aria-expanded={shortcutHelpOpen} onClick={() => setShortcutHelpOpen(true)} aria-label="단축키 도움말">?</button><a className={`top-settings${active === "settings" ? " active" : ""}`} href="/settings" aria-label="설정" onClick={navigateWorkspace}>⚙</a><span className="private-badge">개인 공간</span><button className="top-logout" onClick={() => void logout()} disabled={loggingOut || accountPaused}>{loggingOut ? "종료 중" : "로그아웃"}</button><a className="top-home-mark" href="/workspace" aria-label="창작 홈으로 이동" onClick={navigateWorkspace}><BrandMark /></a>
      </header>
      <PwaManager ownerId={profile.userId} />
      {sessionExpired || logoutError || homeMessage ? <div className="account-messages">
      {sessionExpired ? <div className="account-error" role="alert"><p>로그인이 만료되었습니다. 미전송 초안과 현재 입력을 보존했습니다. <a href="/auth" target="_blank" rel="noopener noreferrer">다시 로그인</a>한 뒤 동기화를 다시 시도해 주세요.</p><button className="secondary-button" type="button" onClick={() => void downloadDrafts()}>초안 내려받기</button></div> : null}
      {logoutError ? <div className="account-error" role="alert"><p>{logoutError}</p>{logoutBlocked ? <><p>문서가 삭제되어 저장할 수 없다면 초안을 보관한 뒤 로그아웃할 수 있습니다.</p><div className="account-actions"><button className="secondary-button" type="button" onClick={() => void downloadDrafts()}>초안 내려받기</button><button className="danger-button" type="button" onClick={() => {
        if (window.confirm("이 기기의 미전송 초안을 삭제하고 모든 기기에서 로그아웃할까요? 다른 탭의 저장되지 않은 입력도 먼저 내려받거나 복사해 보관해 주세요.")) void logout(true);
      }}>초안을 지우고 로그아웃</button></div></> : null}</div> : null}
      {homeMessage ? <p className="account-error" role={active === "home" ? "status" : "alert"}>{homeMessage}</p> : null}
      </div> : null}
      {children}
    </div>
    <header className="mobile-header"><a className="brand-home-link" href="/workspace" aria-label="창작 홈으로 이동" onClick={navigateWorkspace}><Brand /></a><span className="mobile-account"><button className="mobile-shortcut-help" type="button" aria-haspopup="dialog" aria-expanded={shortcutHelpOpen} onClick={() => setShortcutHelpOpen(true)} aria-label="단축키 도움말">?</button><a className={`mobile-settings${active === "settings" ? " active" : ""}`} href="/settings" aria-label="설정" onClick={navigateWorkspace}>⚙</a><Avatar key={`${visibleProfile.userId}-${visibleProfile.rowVersion ?? 0}`} profile={visibleProfile} /><strong className="mobile-profile-name" title={visibleProfile.displayName}>{visibleProfile.displayName}</strong><button className="mobile-logout" type="button" onClick={() => void logout()} disabled={loggingOut || accountPaused}>{loggingOut ? "종료 중" : "로그아웃"}</button></span><a className="mobile-home-icon" href="/workspace" aria-label="창작 홈으로 이동" onClick={navigateWorkspace}><BrandMark /></a></header>
    <nav className="mobile-bottom-nav" aria-label="모바일 주 메뉴" onClick={navigateWorkspace}>
      <a href="/songs" className={`mobile-nav-item${active === "songs" ? " active" : ""}`} aria-current={active === "songs" ? "page" : undefined}><span aria-hidden="true">♪</span><strong>곡</strong></a>
      <a href="/rhymes" className={`mobile-nav-item${active === "rhymes" ? " active" : ""}`} aria-current={active === "rhymes" ? "page" : undefined}><span aria-hidden="true">≈</span><strong>라임</strong></a>
      <a href="/prompts" className={`mobile-nav-item${active === "prompts" ? " active" : ""}`} aria-current={active === "prompts" ? "page" : undefined}><span aria-hidden="true">◇</span><strong>프롬프트</strong></a>
      <span className="mobile-nav-spacer" aria-hidden="true" />
      <a href="/search" className={`mobile-nav-item${active === "search" ? " active" : ""}`} aria-current={active === "search" ? "page" : undefined}><span aria-hidden="true">⌕</span><strong>검색</strong></a>
      <a href="/favorites" aria-label="즐겨찾기" className={`mobile-nav-item mobile-favorites-direct${active === "favorites" ? " active" : ""}`} aria-current={active === "favorites" ? "page" : undefined}><span aria-hidden="true">★</span><strong aria-hidden="true">저장</strong></a>
      <button type="button" className={`mobile-nav-item mobile-more-button${["favorites", "recent", "templates", "trash", "settings"].includes(active) ? " active" : ""}`}
        aria-haspopup="dialog" aria-expanded={mobileMoreOpen} onClick={() => setMobileMoreOpen(true)}><span aria-hidden="true">•••</span><strong>더보기</strong></button>
    </nav>
    {mobileMoreOpen ? <div className="mobile-more-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) closeMobileMore(); }}>
      <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" data-mobile-more-dialog>
        <DialogFocusBoundary selector="[data-mobile-more-dialog]" onClose={closeMobileMore} initialFocus="a" />
        <div className="sheet-handle" aria-hidden="true" />
        <header><div><p className="eyebrow">Workspace</p><h2 id="mobile-more-title">더보기</h2></div><button type="button" onClick={closeMobileMore}>닫기</button></header>
        <nav aria-label="모바일 추가 메뉴" onClick={navigateWorkspace}>
          <a className="b1-more-item" href="/favorites" aria-current={active === "favorites" ? "page" : undefined}><span aria-hidden="true">★</span><span><strong>즐겨찾기</strong><small>고정한 곡과 자료 모아보기</small></span></a>
          <a href="/recent" aria-current={active === "recent" ? "page" : undefined}><span aria-hidden="true">↺</span><span><strong>최근 작업</strong><small>마지막 작업 위치로 돌아가기</small></span></a>
          <a href="/templates" aria-current={active === "templates" ? "page" : undefined}><span aria-hidden="true">▦</span><span><strong>템플릿</strong><small>가사 구조와 프롬프트 재사용</small></span></a>
          <a href="/trash" aria-current={active === "trash" ? "page" : undefined}><span aria-hidden="true">♲</span><span><strong>휴지통</strong><small>삭제한 자료 복원과 완전 삭제</small></span></a>
          <a href="/settings" aria-current={active === "settings" ? "page" : undefined}><span aria-hidden="true">⚙</span><span><strong>설정</strong><small>표시, 단축키와 계정 관리</small></span></a>
        </nav>
      </section>
    </div> : null}
    <QuickAdd ownerId={profile.userId} currentSongId={currentSongId} />
    <ShortcutHelpDialog open={shortcutHelpOpen} onClose={closeShortcutHelp} />
  </main></CurrentProfile.Provider>;
}

export function AppShell({ profile, loginCompleted }: { profile: ShellProfile; loginCompleted: boolean }) {
  return <WorkspaceShell profile={profile} loginCompleted={loginCompleted} active="home">
    <section className="workspace-content" aria-labelledby="workspace-title">
      <p className="eyebrow">Private beta workspace</p>
      <HomeGreeting fallback={profile} />
      <p>안전한 개인 작업 공간이 준비됐습니다.</p>
      <div className="empty-state"><span aria-hidden="true">✦</span><h2>곡을 정리해볼까요?</h2><p>곡 목록에서 아이디어부터 완성까지 작업 상태를 관리할 수 있어요.</p><a className="primary-link" href="/songs">곡 목록 열기</a></div>
    </section>
  </WorkspaceShell>;
}

function HomeGreeting({ fallback }: { fallback: ShellProfile }) {
  const current = useContext(CurrentProfile) ?? fallback;
  return <h1 tabIndex={-1} data-login-focus id="workspace-title">안녕하세요, {current.displayName}님.</h1>;
}

function PlannedItem({ icon, label, version }: { icon: string; label: string; version: string }) { return <span className="nav-item disabled" aria-disabled="true" title={`${version}에서 제공 예정`}><span aria-hidden="true">{icon}</span><span className="nav-text">{label}<small>{version} 예정</small></span></span>; }
function Avatar({ profile }: { profile: Pick<ShellProfile, "displayName" | "avatarUrl"> }) {
  const [failed, setFailed] = useState(false);
  const fallback = Array.from(profile.displayName.trim())[0] || "•";
  return profile.avatarUrl && !failed ? <img className="avatar" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer"
    onError={() => setFailed(true)} /> : <span className="avatar" aria-label={`${profile.displayName || "사용자"}의 기본 사진`}>{fallback}</span>;
}
