"use client";

import { DEFAULT_USER_SETTINGS, type ThemePreference, type UserSettingsRecord, type WritingFont } from "@lyricscloud/domain";
import { useEffect, useRef, useState } from "react";
import { clearAccountPrivateData, downloadRecoveryDrafts } from "../lib/account-cache.js";
import { trapDialogTab } from "../lib/dialog-focus.js";
import { ShortcutGuide } from "./shortcut-help.js";

type ThemeWindow = Window & { __lcApplyTheme?: (theme: ThemePreference) => void };

export function SettingsScreen({ initialSettings, ownerId }: { initialSettings: UserSettingsRecord; ownerId: string }) {
  const [saved, setSaved] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [conflicted, setConflicted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalConfirmation, setWithdrawalConfirmation] = useState("");
  const [exportAcknowledged, setExportAcknowledged] = useState(false);
  const [withdrawalBusy, setWithdrawalBusy] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState("");
  const sheetButton = useRef<HTMLButtonElement>(null);
  const withdrawalPriorFocus = useRef<HTMLElement | null>(null);
  const withdrawalBusyRef = useRef(false);
  const savedRef = useRef(initialSettings);

  useEffect(() => { savedRef.current = saved; }, [saved]);
  useEffect(() => () => applyTheme(savedRef.current.theme), []);
  useEffect(() => { withdrawalBusyRef.current = withdrawalBusy; }, [withdrawalBusy]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("withdrawal") === "confirm") {
      setWithdrawalOpen(true);
      document.querySelector("#account")?.scrollIntoView({ block: "start" });
    }
  }, []);
  useEffect(() => {
    if (!sheetOpen) return;
    const prior = document.activeElement instanceof HTMLElement ? document.activeElement : sheetButton.current;
    document.querySelector<HTMLElement>("[data-settings-sheet] select")?.focus();
    function keyboard(event: KeyboardEvent) { if (event.key === "Escape") closeSheet(); else trapDialogTab(event, "[data-settings-sheet]"); }
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("keydown", keyboard); prior?.focus(); };
  }, [sheetOpen]);
  useEffect(() => {
    if (!withdrawalOpen) return;
    withdrawalPriorFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLInputElement>("[data-withdrawal-dialog] input[type=checkbox]")?.focus());
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape" && !withdrawalBusyRef.current) { event.preventDefault(); setWithdrawalOpen(false); }
      else trapDialogTab(event, "[data-withdrawal-dialog]");
    }
    document.addEventListener("keydown", keyboard);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keyboard); requestAnimationFrame(() => withdrawalPriorFocus.current?.focus()); };
  }, [withdrawalOpen]);

  const dirty = fieldsChanged(saved, draft);
  function patch<K extends keyof UserSettingsRecord>(key: K, value: UserSettingsRecord[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage(""); setConflicted(false);
    if (key === "theme") applyTheme(value as ThemePreference);
  }
  function cancel() { setDraft(saved); applyTheme(saved.theme); setMessage("저장된 설정으로 되돌렸습니다."); setConflicted(false); }
  function defaults() {
    setDraft({ ...DEFAULT_USER_SETTINGS, rowVersion: saved.rowVersion, updatedAt: saved.updatedAt });
    applyTheme(DEFAULT_USER_SETTINGS.theme);
    setMessage("제품 기본값을 미리 보고 있습니다. 저장해야 다른 기기에도 반영됩니다.");
  }
  function closeSheet() { setSheetOpen(false); }

  async function save(refreshVersion = false) {
    if (busy) return;
    setBusy(true); setMessage(""); setConflicted(false);
    try {
      let version = saved.rowVersion;
      if (refreshVersion) {
        const latest = await fetch("/api/settings", { cache: "no-store" });
        if (!latest.ok) throw new Error("LATEST_FAILED");
        version = ((await latest.json()) as { settings: UserSettingsRecord }).settings.rowVersion;
      }
      const response = await fetch("/api/settings", {
        method: "PUT", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowVersion: version, theme: draft.theme, font: draft.font, fontSize: draft.fontSize,
          lineHeight: draft.lineHeight, letterSpacing: draft.letterSpacing, focusModeDefault: draft.focusModeDefault
        })
      });
      if (response.status === 409) {
        setConflicted(true);
        setMessage("다른 기기에서 서버 설정이 변경되었습니다. 이 화면의 값은 유지했습니다. 최신 버전을 확인한 뒤 다시 저장할 수 있습니다.");
        return;
      }
      if (!response.ok) throw new Error("SAVE_FAILED");
      const next = ((await response.json()) as { settings: UserSettingsRecord }).settings;
      setSaved(next); setDraft(next); applyTheme(next.theme);
      setMessage("설정을 서버에 저장했습니다.");
    } catch {
      setMessage("서버에 저장하지 못했습니다. 로컬 미리보기 값은 유지되지만 다른 화면·기기에는 아직 반영되지 않았습니다.");
    } finally { setBusy(false); }
  }

  async function downloadDrafts() {
    try { await downloadRecoveryDrafts(ownerId); setWithdrawalMessage("이 기기의 미전송 초안을 내려받았습니다."); }
    catch { setWithdrawalMessage("미전송 초안을 내려받지 못했습니다. 열린 편집기의 내용을 직접 복사해 주세요."); }
  }

  async function requestWithdrawal() {
    if (withdrawalBusyRef.current || withdrawalBusy || withdrawalConfirmation !== "탈퇴" || !exportAcknowledged) return;
    withdrawalBusyRef.current = true;
    setWithdrawalBusy(true); setWithdrawalMessage("");
    let completed = false;
    try {
      const response = await fetch("/api/account/withdrawal", {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: withdrawalConfirmation, exportAcknowledged })
      });
      if (response.status === 401) {
        setWithdrawalMessage("최근 Google 재인증이 필요합니다. 아래 재인증 버튼으로 다시 확인해 주세요.");
        return;
      }
      if (!response.ok) throw new Error("WITHDRAWAL_FAILED");
      completed = true;
    } catch {
      // A 401 from a separate session probe also means expiration or logout,
      // not necessarily successful withdrawal. Keep local drafts until confirmed.
      setWithdrawalMessage("탈퇴 요청 결과를 확인하지 못했습니다. 이 기기의 자료는 삭제하지 않았습니다. 연결과 Google 재인증 후 계정 상태를 확인해 주세요.");
    } finally {
      if (!completed) { withdrawalBusyRef.current = false; setWithdrawalBusy(false); }
    }
    if (completed) {
      await Promise.race([clearAccountPrivateData(ownerId).catch(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, 2_000))]);
      window.location.replace("/auth?withdrawal=pending");
      return;
    }
  }

  return <section className="settings-page" aria-labelledby="settings-title">
    <header className="settings-heading"><div><p className="eyebrow">Preferences · 1.0.0</p><h1 id="settings-title">설정</h1><p>창작 화면의 테마와 기본 표시 방식을 계정에 저장합니다.</p></div></header>
    <div className="settings-layout">
      <nav className="settings-sections" aria-label="설정 항목">
        <a className="active" href="#display">화면 및 작성</a><a href="#account">계정</a><a href="#keyboard">키보드</a>
      </nav>
      <div className="settings-content">
        <section id="display" className="settings-card" aria-labelledby="display-title">
          <header><div><h2 id="display-title">화면 및 작성 기본값</h2><p>가사별 설정이 있으면 그 값이 우선하고, 초기화하면 이 기본값으로 돌아옵니다.</p></div><button type="button" className="secondary-button" onClick={defaults}>제품 기본값</button></header>
          <div className="desktop-display-controls"><DisplayControls groupName="desktop-theme" settings={draft} onChange={patch} /></div>
          <button ref={sheetButton} className="mobile-writing-settings secondary-button" type="button" aria-haspopup="dialog" aria-expanded={sheetOpen} onClick={() => setSheetOpen(true)}>작성 표시 세부 설정</button>
          <WritingPreview settings={draft} />
          <div className="settings-actions"><button className="secondary-button" type="button" disabled={!dirty || busy} onClick={cancel}>취소</button><button className="primary-link" type="button" disabled={!dirty || busy} onClick={() => void save()}>{busy ? "저장 중" : "저장"}</button></div>
          {message ? <p className={message.startsWith("설정을 서버") || message.startsWith("저장된") ? "settings-message" : "settings-message warning"} role={conflicted || message.includes("못했습니다") ? "alert" : "status"}>{message}{conflicted ? <button type="button" onClick={() => void save(true)} disabled={busy}>최신 서버 버전에 다시 저장</button> : null}</p> : null}
        </section>
        <section id="account" className="settings-card account-settings"><h2>계정과 자료</h2><p>탈퇴 전에 서버의 전체 자료를 내보내고, 이 기기의 미전송 초안도 따로 보관하세요.</p>
          <div id="account-export" className="account-export-entry"><div><strong>전체 내보내기</strong><p>한 시점의 곡·가사·라임 노트·프롬프트·템플릿·관계·설정을 UTF-8 TXT/Markdown과 schema-versioned JSON이 든 ZIP으로 받습니다. 이미 완전 삭제된 자료와 인프라 백업은 포함되지 않습니다.</p></div><div className="account-danger-actions"><a className="primary-link" href="/api/export" download>전체 ZIP 내려받기</a><button type="button" className="secondary-button" onClick={() => void downloadDrafts()}>미전송 초안 내려받기</button></div></div>
          <div className="account-danger-zone"><div><strong>회원 탈퇴</strong><p>요청 즉시 모든 기기의 세션과 자료 접근이 차단됩니다. 7일 안에는 Google 재인증 후 명시적으로 철회할 수 있고, 정확히 7일이 지나면 계정과 자료가 완전히 삭제됩니다.</p><p>인프라 백업에는 운영 보존 기간 동안 암호화된 사본이 남을 수 있으며 일반 사용자 화면에서는 복원할 수 없습니다.</p></div><div className="account-danger-actions"><a className="secondary-button" href="/api/auth/login?returnTo=%2Fsettings%3Fwithdrawal%3Dconfirm%23account">Google로 재인증</a><button type="button" className="danger-button" onClick={() => setWithdrawalOpen(true)}>회원 탈퇴 검토</button></div></div>
          {!withdrawalOpen && withdrawalMessage ? <p className="settings-message warning" role="alert">{withdrawalMessage}</p> : null}
        </section>
        <section id="keyboard" className="settings-card"><h2>키보드</h2><p>명령과 키를 검색할 수 있습니다. 같은 기능은 화면 버튼과 메뉴에서도 사용할 수 있습니다.</p><ShortcutGuide /></section>
      </div>
    </div>
    {sheetOpen ? <div className="settings-sheet-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) closeSheet(); }}>
      <section className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-sheet-title" data-settings-sheet>
        <header><h2 id="settings-sheet-title">작성 표시 세부 설정</h2><button type="button" onClick={closeSheet}>닫기</button></header><DisplayControls groupName="mobile-theme" settings={draft} onChange={patch} /><WritingPreview settings={draft} />
      </section>
    </div> : null}
    {withdrawalOpen ? <div className="settings-sheet-backdrop withdrawal-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && !withdrawalBusy) setWithdrawalOpen(false); }}>
      <section className="withdrawal-dialog" role="dialog" aria-modal="true" aria-labelledby="withdrawal-title" data-withdrawal-dialog>
        <header><div><p className="eyebrow">Account lifecycle</p><h2 id="withdrawal-title">회원 탈퇴 확인</h2></div><button type="button" onClick={() => setWithdrawalOpen(false)} disabled={withdrawalBusy}>닫기</button></header>
        <div className="withdrawal-warning"><strong>요청 직후 이 화면을 포함한 모든 기기에서 로그아웃됩니다.</strong><p>7일의 철회 기간이 끝나면 계정과 창작 자료를 자동 삭제하며 되돌릴 수 없습니다. 연결과 수정 기록도 함께 제거됩니다.</p></div>
        <p><a className="secondary-button" href="/api/export" download>탈퇴 전에 전체 ZIP 내려받기</a></p>
        <label className="withdrawal-check"><input type="checkbox" checked={exportAcknowledged} onChange={(event) => setExportAcknowledged(event.target.checked)} /><span>전체 내보내기를 완료했거나, 내보내기 없이 탈퇴하는 결과를 이해했습니다.</span></label>
        <label className="withdrawal-confirmation">계속하려면 <strong>탈퇴</strong>를 입력하세요<input value={withdrawalConfirmation} onChange={(event) => setWithdrawalConfirmation(event.target.value)} autoComplete="off" /></label>
        <p>보안을 위해 최근 10분 안의 Google 재인증 세션에서만 요청할 수 있습니다.</p>
        {withdrawalMessage ? <p className="settings-message warning" role="alert">{withdrawalMessage}</p> : null}
        {!withdrawalBusy ? <p><a className="secondary-button" href="/api/auth/login?returnTo=%2Fsettings%3Fwithdrawal%3Dconfirm%23account">Google로 재인증</a></p> : null}
        <div className="trash-dialog-actions"><button type="button" className="secondary-button" onClick={() => setWithdrawalOpen(false)} disabled={withdrawalBusy}>취소</button><button type="button" className="danger-button" onClick={() => void requestWithdrawal()} disabled={withdrawalBusy || !exportAcknowledged || withdrawalConfirmation !== "탈퇴"}>{withdrawalBusy ? "요청 중" : "탈퇴 요청"}</button></div>
      </section>
    </div> : null}
  </section>;
}

function DisplayControls({ groupName, settings, onChange }: { groupName: string; settings: UserSettingsRecord; onChange: <K extends keyof UserSettingsRecord>(key: K, value: UserSettingsRecord[K]) => void }) {
  return <div className="display-controls">
    <fieldset><legend>테마</legend><div className="segmented-control">{(["system", "light", "dark"] as const).map((theme) => <label key={theme}><input type="radio" name={groupName} value={theme} checked={settings.theme === theme} onChange={() => onChange("theme", theme)} /><span>{theme === "system" ? "시스템" : theme === "light" ? "라이트" : "다크"}</span></label>)}</div></fieldset>
    <label>작성 폰트<select value={settings.font} onChange={(event) => onChange("font", event.target.value as WritingFont)}><option value="sans">산세리프</option><option value="serif">세리프</option><option value="mono">고정폭</option></select></label>
    <label>글자 크기 <output>{settings.fontSize}px</output><input type="range" min="14" max="28" step="1" value={settings.fontSize} onChange={(event) => onChange("fontSize", Number(event.target.value))} /></label>
    <label>줄 간격 <output>{settings.lineHeight.toFixed(1)}</output><input type="range" min="1.2" max="2.4" step="0.1" value={settings.lineHeight} onChange={(event) => onChange("lineHeight", Number(event.target.value))} /></label>
    <label>자간 <output>{settings.letterSpacing.toFixed(2)}em</output><input type="range" min="-0.05" max="0.2" step="0.01" value={settings.letterSpacing} onChange={(event) => onChange("letterSpacing", Number(event.target.value))} /></label>
    <label className="focus-default"><input type="checkbox" checked={settings.focusModeDefault} onChange={(event) => onChange("focusModeDefault", event.target.checked)} /><span><strong>집중 모드로 가사 열기</strong><small>가사를 열 때 주변 도구를 접습니다.</small></span></label>
  </div>;
}

function WritingPreview({ settings }: { settings: Pick<UserSettingsRecord, "font" | "fontSize" | "lineHeight" | "letterSpacing"> }) {
  return <div className="writing-preview"><span>미리보기</span><p style={{ fontFamily: fontFamily(settings.font), fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight, letterSpacing: `${settings.letterSpacing}em` }}>새벽의 공기 위로<br />우리의 멜로디가 번져 간다</p></div>;
}

function fontFamily(font: WritingFont): string {
  if (font === "serif") return 'Georgia, "Noto Serif KR", serif';
  if (font === "mono") return 'ui-monospace, "SFMono-Regular", Consolas, monospace';
  return 'Inter, Pretendard, "Noto Sans KR", system-ui, sans-serif';
}

function applyTheme(theme: ThemePreference) { (window as ThemeWindow).__lcApplyTheme?.(theme); }
function fieldsChanged(left: UserSettingsRecord, right: UserSettingsRecord) {
  return left.theme !== right.theme || left.font !== right.font || left.fontSize !== right.fontSize || left.lineHeight !== right.lineHeight || left.letterSpacing !== right.letterSpacing || left.focusModeDefault !== right.focusModeDefault;
}