"use client";

import {
  LIBRARY_VIEW_MODES,
  libraryViewSettingDefault,
  type LibraryViewMode,
  type LibraryViewResourceType,
  type LibraryViewSettingRecord
} from "@lyricscloud/domain";
import { useEffect, useState } from "react";

const MODE_LABELS: Record<LibraryViewMode, string> = {
  list: "목록",
  "grid-small": "작게",
  "grid-medium": "중간",
  "grid-large": "크게"
};

interface LibraryViewModeState {
  readonly viewMode: LibraryViewMode;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly notice: string;
  readonly select: (viewMode: LibraryViewMode) => void;
}

export function useLibraryViewMode(resourceType: LibraryViewResourceType): LibraryViewModeState {
  const [setting, setSetting] = useState<LibraryViewSettingRecord>(() => libraryViewSettingDefault(resourceType));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNotice("");
    void fetch(`/api/library-view-settings/${resourceType}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("LOAD_FAILED");
        return response.json() as Promise<{ setting: LibraryViewSettingRecord }>;
      })
      .then(({ setting: stored }) => {
        if (!LIBRARY_VIEW_MODES.includes(stored.viewMode)) throw new Error("INVALID_RESPONSE");
        setSetting(stored);
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotice("보기 설정을 불러오지 못해 목록으로 표시합니다.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [resourceType]);

  function select(viewMode: LibraryViewMode) {
    if (loading || saving || viewMode === setting.viewMode) return;
    const previous = setting;
    setSetting({ ...previous, viewMode });
    setSaving(true);
    setNotice("");
    void fetch(`/api/library-view-settings/${resourceType}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewMode, rowVersion: previous.rowVersion })
    }).then(async (response) => {
      if (response.status === 409) {
        const latestResponse = await fetch(`/api/library-view-settings/${resourceType}`, { cache: "no-store" });
        if (!latestResponse.ok) throw new Error("CONFLICT_RELOAD_FAILED");
        const latest = await latestResponse.json() as { setting: LibraryViewSettingRecord };
        setSetting(latest.setting);
        setNotice("다른 화면에서 보기 설정이 변경되어 최신 설정을 불러왔습니다.");
        return;
      }
      if (!response.ok) throw new Error("SAVE_FAILED");
      const saved = await response.json() as { setting: LibraryViewSettingRecord };
      if (!LIBRARY_VIEW_MODES.includes(saved.setting.viewMode)) throw new Error("INVALID_RESPONSE");
      setSetting(saved.setting);
      setNotice(`${MODE_LABELS[saved.setting.viewMode]} 보기로 저장했습니다.`);
    }).catch(() => {
      setSetting(previous);
      setNotice("보기 설정을 저장하지 못했습니다. 다시 시도해 주세요.");
    }).finally(() => setSaving(false));
  }

  return { viewMode: setting.viewMode, loading, saving, notice, select };
}

export function LibraryViewModeSelector({ label, state }: { label: string; state: LibraryViewModeState }) {
  return <div className="library-view-control">
    <div className="library-view-selector" role="group" aria-label={`${label} 보기 방식`} aria-busy={state.loading || state.saving}>
      <span className="library-view-label">보기</span>
      {LIBRARY_VIEW_MODES.map((mode) => <button key={mode} type="button" className={state.viewMode === mode ? "active" : ""}
        aria-label={`${label} ${MODE_LABELS[mode]} 보기`} aria-pressed={state.viewMode === mode}
        disabled={state.loading || state.saving} onClick={() => state.select(mode)}>{MODE_LABELS[mode]}</button>)}
    </div>
    {state.notice ? <p className="library-view-notice" role="status">{state.notice}</p> : null}
  </div>;
}
