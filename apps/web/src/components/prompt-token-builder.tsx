"use client";

import { findPromptDuplicates, normalizePromptToken, parsePromptText, PROMPT_LIMITS } from "@lyricscloud/domain";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";

export interface PromptBuilderItem {
  readonly occurrenceId: string;
  readonly displayValue: string;
}

interface Suggestion {
  readonly displayValue: string;
  readonly normalizedValue: string;
  readonly usageCount: number;
  readonly lastUsedAt: string | null;
}

export function PromptTokenBuilder(props: {
  readonly idPrefix: string;
  readonly items: readonly PromptBuilderItem[];
  readonly disabled?: boolean;
  readonly onAdd: (values: readonly string[], bulk: boolean) => void | Promise<void>;
  readonly onMove: (occurrenceId: string, targetIndex: number) => void;
  readonly onRemove: (occurrenceId: string) => void;
  readonly onCleanup: () => void | Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<readonly Suggestion[]>([]);
  const [suggestionState, setSuggestionState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRefs = useRef(new Map<string, HTMLButtonElement>());
  const touchDrag = useRef<{ occurrenceId: string; pointerId: number } | null>(null);
  const normalized = useMemo(() => props.items.map((item) => normalizePromptToken(item.displayValue)), [props.items]);
  const duplicates = useMemo(() => findPromptDuplicates(normalized), [normalized]);
  const duplicateIndexes = useMemo(() => new Set(duplicates.flatMap(({ duplicateIndexes: indexes }) => indexes)), [duplicates]);
  const selectedIndex = props.items.findIndex(({ occurrenceId }) => occurrenceId === selectedId);

  useEffect(() => {
    if (selectedId && selectedIndex < 0) setSelectedId(null);
  }, [selectedId, selectedIndex]);

  function move(occurrenceId: string, targetIndex: number) {
    const currentIndex = props.items.findIndex((item) => item.occurrenceId === occurrenceId);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= props.items.length || currentIndex === targetIndex) return;
    const label = props.items[currentIndex]!.displayValue;
    setSelectedId(occurrenceId);
    props.onMove(occurrenceId, targetIndex);
    setAnnouncement(`${label} 태그를 ${targetIndex + 1}번째로 이동했습니다.`);
    window.requestAnimationFrame(() => tokenRefs.current.get(occurrenceId)?.focus());
  }

  function dragStart(event: DragEvent<HTMLButtonElement>, occurrenceId: string) {
    setDraggingId(occurrenceId); setSelectedId(occurrenceId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", occurrenceId);
  }

  function drop(event: DragEvent<HTMLElement>, targetIndex: number) {
    event.preventDefault();
    const occurrenceId = event.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    if (occurrenceId) move(occurrenceId, targetIndex);
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, occurrenceId: string) {
    if (event.pointerType === "mouse") return;
    touchDrag.current = { occurrenceId, pointerId: event.pointerId };
    setDraggingId(occurrenceId); setSelectedId(occurrenceId);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const activeDrag = touchDrag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-prompt-token-index]");
    touchDrag.current = null; setDraggingId(null);
    if (target) move(activeDrag.occurrenceId, Number(target.dataset.promptTokenIndex));
  }

  function tokenKeyDown(event: KeyboardEvent<HTMLButtonElement>, occurrenceId: string) {
    const index = props.items.findIndex((item) => item.occurrenceId === occurrenceId);
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault(); move(occurrenceId, index - 1);
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault(); move(occurrenceId, index + 1);
    }
  }

  useEffect(() => {
    const query = input.trim();
    if (!open || !query) { setSuggestions([]); setSuggestionState("idle"); setActive(-1); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSuggestionState("loading");
      const params = new URLSearchParams({ search: query, limit: "8" });
      void fetch(`/api/prompts/suggestions?${params}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          return response.json() as Promise<{ items: readonly Suggestion[] }>;
        })
        .then(({ items }) => { setSuggestions(items); setSuggestionState("ready"); setActive(items.length ? 0 : -1); })
        .catch(() => { if (!controller.signal.aborted) { setSuggestions([]); setSuggestionState("error"); setActive(-1); } });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [input, open]);

  async function add(values: readonly string[], bulk: boolean) {
    if (!values.length) return;
    if (props.items.length + values.length > PROMPT_LIMITS.tokensPerPrompt) {
      setMessage(`태그는 최대 ${PROMPT_LIMITS.tokensPerPrompt}개까지 추가할 수 있습니다.`); return;
    }
    try {
      await props.onAdd(values, bulk);
      setInput(""); setOpen(false); setMessage(`${values.length}개 태그를 추가했습니다.`);
      inputRef.current?.focus();
    } catch { setMessage("태그를 추가하지 못했습니다. 현재 초안은 그대로 보존됩니다."); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const suggestion = open && active >= 0 ? suggestions[active] : undefined;
    try {
      const values = suggestion ? [suggestion.displayValue] : parsePromptText(input).map(({ displayValue }) => displayValue);
      void add(values, input.includes(","));
    } catch { setMessage("빈 값과 허용 길이를 확인해 주세요."); }
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || composing.current) return;
    if (event.key === "ArrowDown" && open && suggestions.length) {
      event.preventDefault(); setActive((value) => (value + 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "ArrowUp" && open && suggestions.length) {
      event.preventDefault(); setActive((value) => (value - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Escape") {
      event.preventDefault(); setOpen(false); setActive(-1);
    }
  }

  return <section className="prompt-builder-card" aria-labelledby={`${props.idPrefix}-tokens-label`}>
    <header><div><h2 id={`${props.idPrefix}-tokens-label`}>프롬프트 태그</h2><p>쉼표 붙여넣기와 직접 입력을 같은 규칙으로 처리합니다.</p></div>
      <span>{props.items.length} / {PROMPT_LIMITS.tokensPerPrompt}</span></header>
    <div className="prompt-editor-cloud" aria-describedby={duplicates.length ? `${props.idPrefix}-duplicate-warning` : undefined}>
      {props.items.length ? props.items.map((item, index) => <span data-prompt-token-index={index}
        className={`prompt-editor-token${duplicateIndexes.has(index) ? " is-duplicate" : ""}${selectedId === item.occurrenceId ? " is-selected" : ""}${draggingId === item.occurrenceId ? " is-dragging" : ""}`}
        onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, index)} key={item.occurrenceId}>
        <button ref={(node) => { if (node) tokenRefs.current.set(item.occurrenceId, node); else tokenRefs.current.delete(item.occurrenceId); }}
          type="button" className="prompt-drag-handle" draggable={!props.disabled} disabled={props.disabled}
          aria-label={`${item.displayValue} 태그 ${index + 1}번째. 끌어서 이동하거나 방향키로 이동`}
          aria-pressed={selectedId === item.occurrenceId} onFocus={() => setSelectedId(item.occurrenceId)}
          onKeyDown={(event) => tokenKeyDown(event, item.occurrenceId)} onDragStart={(event) => dragStart(event, item.occurrenceId)}
          onDragEnd={() => setDraggingId(null)} onPointerDown={(event) => pointerDown(event, item.occurrenceId)} onPointerUp={pointerUp}>⠿</button>
        <span>{item.displayValue}</span><button type="button" className="prompt-token-remove" disabled={props.disabled}
          aria-label={`${item.displayValue} 태그 제거`} onClick={() => props.onRemove(item.occurrenceId)}>×</button>
      </span>) : <p className="prompt-builder-empty">아직 태그가 없습니다. 아래에서 첫 태그를 입력해 주세요.</p>}
    </div>
    <div className="prompt-reorder-controls" role="group" aria-label="선택한 태그 순서 변경">
      <span>{selectedIndex >= 0 ? `선택: ${props.items[selectedIndex]!.displayValue} · ${selectedIndex + 1}번째` : "이동할 태그의 손잡이를 선택해 주세요."}</span>
      <button type="button" disabled={props.disabled || selectedIndex <= 0} onClick={() => selectedId && move(selectedId, selectedIndex - 1)}>앞으로</button>
      <button type="button" disabled={props.disabled || selectedIndex < 0 || selectedIndex >= props.items.length - 1} onClick={() => selectedId && move(selectedId, selectedIndex + 1)}>뒤로</button>
    </div>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    <form className="prompt-token-input" onSubmit={submit}>
      <label htmlFor={`${props.idPrefix}-token-input`}>태그 입력</label>
      <div><input ref={inputRef} id={`${props.idPrefix}-token-input`} value={input} disabled={props.disabled}
        role="combobox" aria-autocomplete="list" aria-expanded={open && Boolean(input.trim())}
        aria-controls={`${props.idPrefix}-suggestions`} aria-activedescendant={active >= 0 ? `${props.idPrefix}-suggestion-${active}` : undefined}
        placeholder="예: female vocal 또는 쉼표 목록 붙여넣기"
        onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1); }}
        onChange={(event) => { setInput(event.target.value); setSuggestions([]); setSuggestionState("idle"); setActive(-1); setOpen(true); setMessage(""); }}
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={keyDown} onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (!pasted.includes(",")) return;
          event.preventDefault();
          try { void add(parsePromptText(pasted).map(({ displayValue }) => displayValue), true); }
          catch { setMessage("붙여넣은 태그의 길이와 개수를 확인해 주세요."); }
        }} />
        <button type="submit" disabled={props.disabled || !input.trim()}>태그 추가</button></div>
      {open && input.trim() ? <div className="prompt-suggestion-panel">
        {suggestionState === "loading" ? <p role="status">과거 태그를 불러오는 중…</p> : null}
        {suggestionState === "error" ? <p role="alert">자동완성을 불러오지 못했습니다. 직접 입력은 계속할 수 있습니다.</p> : null}
        {suggestionState === "ready" && !suggestions.length ? <p>일치하는 과거 태그가 없습니다. Enter로 직접 추가할 수 있습니다.</p> : null}
        {suggestions.length ? <ul id={`${props.idPrefix}-suggestions`} role="listbox" aria-label="과거 프롬프트 태그 제안">
          {suggestions.map((suggestion, index) => <li id={`${props.idPrefix}-suggestion-${index}`} role="option" aria-selected={index === active} key={suggestion.normalizedValue}>
            <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => void add([suggestion.displayValue], false)}>
              <span>{suggestion.displayValue}</span><small>{suggestion.usageCount}회 사용{suggestion.lastUsedAt ? " · 최근 사용" : ""}</small>
            </button>
          </li>)}</ul> : null}
      </div> : null}
    </form>
    {duplicates.length ? <div className="prompt-duplicate-warning" id={`${props.idPrefix}-duplicate-warning`} role="alert">
      <div><strong>중복 태그 {duplicates.reduce((sum, item) => sum + item.duplicateIndexes.length, 0)}개</strong>
        <p>{duplicates.map(({ normalizedValue, firstIndex, duplicateIndexes: indexes }) => `‘${normalizedValue}’ ${[firstIndex, ...indexes].map((index) => index + 1).join("·")}번째`).join(", ")}</p></div>
      <button type="button" disabled={props.disabled} onClick={() => void props.onCleanup()}>첫 표시 값으로 한 번에 정리</button>
    </div> : null}
    {message ? <p className="prompt-builder-message" role="status">{message}</p> : null}
  </section>;
}
