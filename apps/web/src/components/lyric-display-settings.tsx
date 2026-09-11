"use client";

import type { LyricDisplaySettingsRecord, WritingDisplaySettings, WritingFont } from "@lyricscloud/domain";
import { useState } from "react";
import { WRITING_FONT_OPTIONS, writingDisplayStyle } from "../lib/font-assets.js";

export function LyricDisplaySettings({ lyricId, settings, onApply, onCancel }: {
  lyricId: string;
  settings: LyricDisplaySettingsRecord;
  onApply: (settings: LyricDisplaySettingsRecord) => void;
  onCancel: () => void;
}) {
  const [base] = useState(settings);
  const [draft, setDraft] = useState<WritingDisplaySettings>(settings.effective);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [conflicted, setConflicted] = useState(false);

  function patch<K extends keyof WritingDisplaySettings>(key: K, value: WritingDisplaySettings[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next); onApply({ ...base, effective: next }); setMessage(""); setConflicted(false);
  }
  function cancel() { onApply(base); onCancel(); }

  async function save(refresh = false) {
    if (busy) return;
    setBusy(true); setMessage(""); setConflicted(false);
    try {
      let version = base.override?.rowVersion ?? 0;
      if (refresh) {
        const latestResponse = await fetch(`/api/lyrics/${lyricId}/display-settings`, { cache: "no-store" });
        if (!latestResponse.ok) throw new Error("LATEST_FAILED");
        const latest = ((await latestResponse.json()) as { settings: LyricDisplaySettingsRecord }).settings;
        version = latest.override?.rowVersion ?? 0;
      }
      const response = await fetch(`/api/lyrics/${lyricId}/display-settings`, {
        method: "PUT", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowVersion: version, ...draft })
      });
      if (response.status === 409) {
        setConflicted(true); setMessage("다른 화면에서 이 가사의 표시 설정이 변경되었습니다. 현재 미리보기는 유지했습니다."); return;
      }
      if (!response.ok) throw new Error("SAVE_FAILED");
      const next = ((await response.json()) as { settings: LyricDisplaySettingsRecord }).settings;
      onApply(next); onCancel();
    } catch { setMessage("서버에 저장하지 못했습니다. 현재 가사의 로컬 미리보기만 유지됩니다."); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (!base.override || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/lyrics/${lyricId}/display-settings`, {
        method: "DELETE", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowVersion: base.override.rowVersion })
      });
      if (response.status === 409) { setConflicted(true); setMessage("다른 화면의 변경을 확인한 뒤 다시 초기화해 주세요."); return; }
      if (!response.ok) throw new Error("RESET_FAILED");
      onApply(((await response.json()) as { settings: LyricDisplaySettingsRecord }).settings); onCancel();
    } catch { setMessage("서버의 가사별 설정을 초기화하지 못했습니다. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }

  return <section className="lyric-display-dialog" role="dialog" aria-modal="true" aria-labelledby="lyric-display-title">
    <header><div><p className="eyebrow">Per lyric override</p><h2 id="lyric-display-title">현재 가사 표시 설정</h2></div><button type="button" onClick={cancel}>닫기</button></header>
    <p className="lyric-display-priority">이 가사에 저장하면 계정 기본값보다 우선합니다. 초기화하면 현재 계정 기본값이 즉시 적용됩니다.</p>
    <div className="lyric-display-controls">
      <label>폰트<select autoFocus value={draft.font} onChange={(event) => patch("font", event.target.value as WritingFont)}>{WRITING_FONT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>크기 <output>{draft.fontSize}px</output><input type="range" min="14" max="28" step="1" value={draft.fontSize} onChange={(event) => patch("fontSize", Number(event.target.value))} /></label>
      <label>줄 간격 <output>{draft.lineHeight.toFixed(1)}</output><input type="range" min="1.2" max="2.4" step="0.1" value={draft.lineHeight} onChange={(event) => patch("lineHeight", Number(event.target.value))} /></label>
      <label>자간 <output>{draft.letterSpacing.toFixed(2)}em</output><input type="range" min="-0.05" max="0.2" step="0.01" value={draft.letterSpacing} onChange={(event) => patch("letterSpacing", Number(event.target.value))} /></label>
    </div>
    <div className="lyric-display-preview" style={writingDisplayStyle(draft)}><span>[Verse]</span><br />한글 가사 · bright rhyme · 光 ひかり · ♫<br />새벽의 공기 위로 우리의 멜로디가 번져 간다</div>
    {message ? <p className="lyric-display-message" role="alert">{message}{conflicted ? <button type="button" disabled={busy} onClick={() => void save(true)}>최신 버전에 다시 저장</button> : null}</p> : null}
    <footer><button type="button" className="secondary-button" disabled={!base.override || busy} onClick={() => void reset()}>계정 기본값으로 초기화</button><span /><button type="button" className="secondary-button" disabled={busy} onClick={cancel}>취소</button><button type="button" className="primary-link" disabled={busy} onClick={() => void save()}>{busy ? "저장 중" : "이 가사에 저장"}</button></footer>
  </section>;
}
