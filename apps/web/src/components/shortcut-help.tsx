"use client";

import { formatShortcut, SHORTCUT_COMMANDS, type ShortcutPlatform } from "@lyricscloud/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { trapDialogTab } from "../lib/dialog-focus.js";
import { currentShortcutPlatform } from "../lib/shortcut-runtime.js";

export function ShortcutGuide() {
  const [query, setQuery] = useState("");
  const platform = useShortcutPlatform();
  const commands = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko");
    if (!normalized) return SHORTCUT_COMMANDS;
    return SHORTCUT_COMMANDS.filter((command) => `${command.label} ${command.description} ${formatShortcut(command.id, platform)}`.toLocaleLowerCase("ko").includes(normalized));
  }, [platform, query]);

  return <div className="shortcut-guide">
    <label className="shortcut-search">단축키 검색<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="명령 또는 키 검색" /></label>
    {commands.length ? <div className="shortcut-table-wrap"><table><thead><tr><th>명령</th><th>키</th><th>사용 위치</th></tr></thead><tbody>
      {commands.map((command) => <tr key={command.id} data-command-id={command.id}><td><strong>{command.label}</strong><small>{command.description}</small></td><td><kbd>{formatShortcut(command.id, platform)}</kbd></td><td>{command.context === "global" ? "로그인 화면" : "가사 편집기"}</td></tr>)}
    </tbody></table></div> : <p className="shortcut-empty" role="status">일치하는 단축키가 없습니다. 다른 명령이나 키를 검색해 주세요.</p>}
    <p className="shortcut-policy">입력 필드·열린 대화상자·한글 조합 중에는 실행하지 않으며 브라우저의 저장·찾기·탭 이동 키를 유지합니다.</p>
  </div>;
}

export function ShortcutHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const priorFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    priorFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus());
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      else trapDialogTab(event, "[data-shortcut-dialog]");
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keyboard);
      requestAnimationFrame(() => priorFocus.current?.focus());
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="dialog-backdrop shortcut-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-dialog-title" data-shortcut-dialog>
      <header><div><p className="eyebrow">Keyboard commands</p><h2 id="shortcut-dialog-title">단축키 도움말</h2></div><button type="button" onClick={onClose}>닫기</button></header>
      <ShortcutGuide />
    </section>
  </div>;
}

function useShortcutPlatform(): ShortcutPlatform {
  const [platform, setPlatform] = useState<ShortcutPlatform>("windows_linux");
  useEffect(() => setPlatform(currentShortcutPlatform()), []);
  return platform;
}
