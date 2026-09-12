"use client";

import {
  buildSongFormInsertion,
  copySongFormSections,
  capturePortableTextSelection,
  createBrowserLyricSync,
  BufferedPositionSaver,
  createCodeMirrorTextEditor,
  DEFAULT_SONG_FORM_MARKERS,
  parseSongForm,
  SerializedSaveController,
  type CodeMirrorTextEditor,
  type BrowserLyricSync,
  type LocalSyncState,
  type SharingParticipant,
  type SaveState,
  type SongFormNavigationState,
  type PortableTextSource,
  type SongFormInsertMenuRequest,
  type SongFormMarkerLabel,
  type SongFormSection
} from "@lyricscloud/editor";
import {
  LYRIC_STATUSES,
  LYRIC_LIMITS,
  LYRIC_STATUS_LABELS,
  RHYME_INSERTION_CONTRACT_VERSION,
  type CrdtTextSelectionReference,
  type EditorResourcePanelItem,
  type LyricDisplaySettingsRecord,
  type LyricRecord,
  type LyricResumePosition,
  type SaveLyricPositionInput,
  type LyricStatus
} from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createLyricMetadataSaver } from "../lib/lyric-metadata.js";
import { registerLogoutSave } from "../lib/account-cache.js";
import { writingFontFamily } from "../lib/font-assets.js";
import { promptCopyView } from "../lib/prompt-copy.js";
import { lyricCopyView } from "../lib/lyric-copy.js";
import { DialogFocusBoundary, trapDialogTab } from "../lib/dialog-focus.js";
import { BEFORE_SHORTCUT_NAVIGATION_EVENT, commandForKeyboardEvent, isEditableShortcutTarget, type ShortcutNavigationDetail } from "../lib/shortcut-runtime.js";
import { hasVolatilePendingInput } from "../lib/update-safety.js";
import { LyricHistory } from "./lyric-history.js";
import { LyricResourcePanel } from "./lyric-resource-panel.js";
import { CopyFeedback, useCopyFeedback } from "./copy-feedback.js";
import { LyricDisplaySettings } from "./lyric-display-settings.js";
import { LyricShareManager } from "./lyric-share-manager.js";

interface LyricEditorDraft {
  readonly title: string;
  readonly memo: string;
  readonly status: LyricStatus;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
}

export function LyricEditor({ ownerId, initialLyric, songTitle, songLyrics, dashboardHref, returnTo, initialFind, initialPosition, initialDisplaySettings }: {
  ownerId: string;
  initialLyric: LyricRecord;
  songTitle: string;
  songLyrics: readonly LyricRecord[];
  dashboardHref: string;
  returnTo: string;
  initialFind: string;
  initialPosition: LyricResumePosition | null;
  initialDisplaySettings: LyricDisplaySettingsRecord;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirrorTextEditor | null>(null);
  const controllerRef = useRef<SerializedSaveController<LyricEditorDraft> | null>(null);
  const localSyncRef = useRef<BrowserLyricSync | null>(null);
  const positionSaverRef = useRef<BufferedPositionSaver<SaveLyricPositionInput> | null>(null);
  const titleRef = useRef(initialLyric.title);
  const bodyRef = useRef(initialLyric.body);
  const memoRef = useRef(initialLyric.memo);
  const statusRef = useRef(initialLyric.status);
  const favoriteRef = useRef(initialLyric.isFavorite);
  const pinnedRef = useRef(initialLyric.isPinned);
  const pinOrderRef = useRef(initialLyric.pinOrder);
  const titleComposingRef = useRef(false);
  const memoComposingRef = useRef(false);
  const rhymeSelectionRef = useRef<HTMLTextAreaElement>(null);
  const rhymeSelectionRangeRef = useRef({ anchor: 0, head: 0 });
  const mobileSongFormButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSongFormDialogRef = useRef<HTMLElement>(null);
  const songFormInsertMenuRef = useRef<HTMLElement>(null);
  const restoreSongFormFocusRef = useRef(false);
  const [title, setTitle] = useState(initialLyric.title);
  const [memo, setMemo] = useState(initialLyric.memo);
  const [status, setStatus] = useState(initialLyric.status);
  const [isFavorite, setIsFavorite] = useState(initialLyric.isFavorite);
  const [isPinned, setIsPinned] = useState(initialLyric.isPinned);
  const [saveState, setSaveState] = useState<SaveState>({ status: "saved", sequence: 0, lastSavedAt: null, error: null });
  const [localSyncState, setLocalSyncState] = useState<LocalSyncState>("loading");
  const [legacyConflict, setLegacyConflict] = useState<{ localBody: string; serverBody: string } | null>(null);
  const [songForm, setSongForm] = useState<SongFormNavigationState>({ sections: parseSongForm(initialLyric.body), activeSectionId: null });
  const [wholeCopyView, setWholeCopyView] = useState(() => lyricCopyView(initialLyric.body));
  const [mobileSongFormOpen, setMobileSongFormOpen] = useState(false);
  const [songFormInsertMenu, setSongFormInsertMenu] = useState<{
    target: CrdtTextSelectionReference;
    source: "pointer" | "keyboard" | "mobile";
    clientX: number;
    clientY: number;
  } | null>(null);
  const [desktopResourcesOpen, setDesktopResourcesOpen] = useState(true);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const [resourcePanelWidth, setResourcePanelWidth] = useState(296);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(() => new Set());
  const [focusMode, setFocusMode] = useState(initialDisplaySettings.account.focusModeDefault);
  const [displaySettings, setDisplaySettings] = useState(initialDisplaySettings);
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);
  const [rhymeSelection, setRhymeSelection] = useState<{
    item: EditorResourcePanelItem;
    source: PortableTextSource;
    target: CrdtTextSelectionReference;
    requestId: string;
  } | null>(null);
  const [commandNotice, setCommandNotice] = useState("");
  const [commandBusy, setCommandBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sharingParticipants, setSharingParticipants] = useState<readonly SharingParticipant[]>([]);
  const copyFeedback = useCopyFeedback();
  const router = useRouter();
  const lyricReturnSuffix = `?returnTo=${encodeURIComponent(returnTo)}`;
  const currentLyricIndex = songLyrics.findIndex((lyric) => lyric.id === initialLyric.id);
  const previousLyric = currentLyricIndex > 0 ? songLyrics[currentLyricIndex - 1] ?? null : null;
  const nextLyric = currentLyricIndex >= 0 ? songLyrics[currentLyricIndex + 1] ?? null : null;

  useEffect(() => {
    if (!displaySettingsOpen) return;
    function keyboard(event: KeyboardEvent) { if (event.key === "Escape") setDisplaySettingsOpen(false); else trapDialogTab(event, ".lyric-display-dialog"); }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      requestAnimationFrame(() => editorRef.current?.focus());
    };
  }, [displaySettingsOpen]);

  useEffect(() => {
    if (!mobileSongFormOpen) return;
    const frame = requestAnimationFrame(() => mobileSongFormDialogRef.current?.querySelector<HTMLButtonElement>("header button")?.focus());
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); restoreSongFormFocusRef.current = true; setMobileSongFormOpen(false); }
      else trapDialogTab(event, ".songform-sheet");
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keyboard);
      const restoreFocus = restoreSongFormFocusRef.current;
      restoreSongFormFocusRef.current = false;
      if (restoreFocus) requestAnimationFrame(() => mobileSongFormButtonRef.current?.focus());
    };
  }, [mobileSongFormOpen]);

  useEffect(() => {
    if (!songFormInsertMenu) return;
    const frame = songFormInsertMenu.source === "pointer" ? null : requestAnimationFrame(() => {
      songFormInsertMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    function keyboard(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setSongFormInsertMenu(null);
      requestAnimationFrame(() => editorRef.current?.focus());
    }
    function pointer(event: PointerEvent) {
      if (event.target instanceof Node && !songFormInsertMenuRef.current?.contains(event.target)) setSongFormInsertMenu(null);
    }
    document.addEventListener("keydown", keyboard);
    document.addEventListener("pointerdown", pointer);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("pointerdown", pointer);
    };
  }, [songFormInsertMenu]);

  function draft(overrides: Partial<LyricEditorDraft> = {}): LyricEditorDraft {
    return {
      title: titleRef.current, memo: memoRef.current, status: statusRef.current,
      isFavorite: favoriteRef.current, isPinned: pinnedRef.current, pinOrder: pinOrderRef.current,
      ...overrides
    };
  }

  useEffect(() => {
    const parent = mountRef.current;
    if (!parent) return;
    let active = true;
    let initialNavigationPending = Boolean(initialFind || initialPosition);
    let positionCaptureEnabled = !initialNavigationPending;
    const controller = new SerializedSaveController<LyricEditorDraft>({
      initialDraft: {
        title: initialLyric.title, memo: initialLyric.memo, status: initialLyric.status,
        isFavorite: initialLyric.isFavorite, isPinned: initialLyric.isPinned, pinOrder: initialLyric.pinOrder
      },
      initialRowVersion: initialLyric.rowVersion,
      save: createLyricMetadataSaver(initialLyric.id, initialLyric),
      onStateChange(state) { if (active) setSaveState(state); }
    });
    controllerRef.current = controller;
    const positionSaver = new BufferedPositionSaver<SaveLyricPositionInput>({
      save: async (position) => {
        const response = await fetch(`/api/recent/${initialLyric.id}/position`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(position),
          keepalive: true
        });
        if (!response.ok) throw new Error("POSITION_SAVE_FAILED");
      }
    });
    positionSaverRef.current = positionSaver;
    const queuePosition = (navigation: SongFormNavigationState) => {
      const editor = editorRef.current;
      if (!active || !positionCaptureEnabled || !editor) return;
      const activeSection = navigation.sections.find((section) => section.id === navigation.activeSectionId);
      positionSaver.change({
        cursorOffset: editor.selection.head,
        songformLabel: activeSection?.label.trim() || null,
        songformOccurrence: activeSection?.occurrence ?? null,
        scrollTop: editor.scrollTop,
        viewport: window.matchMedia("(max-width: 720px)").matches ? "mobile" : "desktop"
      });
    };
    const editor = createCodeMirrorTextEditor({
      parent,
      initialValue: initialLyric.body,
      ariaLabel: "가사 본문",
      readOnly: true,
      onChange(value) {
        bodyRef.current = value;
        if (active) setWholeCopyView(lyricCopyView(value));
      },
      onCompositionStart() { localSyncRef.current?.setComposing(true); },
      onCompositionEnd() { localSyncRef.current?.setComposing(false); },
      onSelectionChange(selection) { localSyncRef.current?.updateSelection(selection); },
      async beforeLargePaste() {
        const saved = await localSyncRef.current?.checkpoint("large_paste") ?? false;
        if (active) setCommandNotice(saved ? "" : "붙여넣기 전 수정 기록을 저장하지 못했습니다. 연결을 확인한 뒤 다시 붙여넣어 주세요.");
        return saved;
      },
      onSongFormNavigationChange(navigation) {
        setSongForm(navigation);
        queuePosition(navigation);
      },
      onSongFormInsertMenuRequest(request) { requestSongFormInsertMenu(request); },
      onTransaction(transaction) { localSyncRef.current?.applyLocalTransaction(transaction); }
    });
    editorRef.current = editor;
    void createBrowserLyricSync({ ownerId, resourceId: initialLyric.id, initialBody: initialLyric.body,
      onRemoteBody(value, changes) {
        if (!active || value === bodyRef.current) return;
        const currentLength = editorRef.current?.value.length ?? 0;
        bodyRef.current = value;
        editorRef.current?.applyTransaction({ changes: changes ?? [{ from: 0, to: currentLength, insert: value }] });
      }, onEditableChange(editable) {
        if (!active) return;
        editor.setEditable(editable);
        if (editable && initialNavigationPending) {
          initialNavigationPending = false;
          requestAnimationFrame(() => {
            if (!active) return;
            applyInitialNavigation(editor);
            positionCaptureEnabled = true;
            queuePosition(editor.songForm);
          });
        }
      },
      onLegacyConflict(conflict) { if (active) setLegacyConflict(conflict); },
      onStateChange(state) { if (active) setLocalSyncState(state); },
      onPresenceChange(participants) { if (active) setSharingParticipants(participants); }
    }).then((sync) => { if (active) localSyncRef.current = sync; else void sync.destroy(); })
      .catch(() => { if (active) setLocalSyncState("error"); });
    const finishInput = () => {
      editor.finishComposition();
      if (titleComposingRef.current) { titleComposingRef.current = false; controller.compositionEnd(); }
      if (memoComposingRef.current) { memoComposingRef.current = false; controller.compositionEnd(); }
    };
    const flush = () => {
      finishInput();
      void controller.flush();
      void positionSaver.flush().catch(() => undefined);
      localSyncRef.current?.leave();
    };
    const unregisterLogout = registerLogoutSave(async () => {
      if (titleComposingRef.current || memoComposingRef.current) return false;
      await controller.flush();
      if (controller.state.status !== "saved") return false;
      return await localSyncRef.current?.checkpoint("leave") ?? false;
    }, () => ({ resourceId: initialLyric.id, title: titleRef.current, body: bodyRef.current, memo: memoRef.current }));
    window.addEventListener("pagehide", flush);
    const focusFrame = requestAnimationFrame(() => {
      applyInitialNavigation(editor);
      if (!initialNavigationPending) {
        positionCaptureEnabled = true;
        queuePosition(editor.songForm);
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("pagehide", flush);
      unregisterLogout();
      finishInput();
      editor.destroy();
      localSyncRef.current?.leave();
      void localSyncRef.current?.destroy();
      localSyncRef.current = null;
      positionSaver.destroy();
      if (positionSaverRef.current === positionSaver) positionSaverRef.current = null;
      if (editorRef.current === editor) editorRef.current = null;
      void controller.dispose();
      controllerRef.current = null;
    };
    function applyInitialNavigation(target: CodeMirrorTextEditor) {
      if (initialFind && target.goToTextMatch(initialFind)) {
        setCommandNotice("검색 결과와 일치하는 첫 위치로 이동했습니다.");
        return;
      }
      if (initialPosition) {
        const viewport = window.matchMedia("(max-width: 720px)").matches ? "mobile" : "desktop";
        const preferSongform = initialPosition.viewport !== viewport || initialPosition.basisUpdatedAt !== initialLyric.updatedAt;
        const restored = target.restoreResumePosition(initialPosition, preferSongform);
        setCommandNotice(restored.usedSongform
          ? `마지막 ${initialPosition.songformLabel ?? "송폼"} 구간으로 이동했습니다.`
          : "마지막 편집 위치로 이동했습니다.");
        return;
      }
      target.focus();
    }
  }, [initialFind, initialLyric.body, initialLyric.id, initialLyric.isFavorite, initialLyric.isPinned, initialLyric.memo, initialLyric.pinOrder, initialLyric.rowVersion, initialLyric.status, initialLyric.title, initialLyric.updatedAt, initialPosition, ownerId]);

  useEffect(() => {
    const currentIds = new Set(songForm.sections.map((section) => section.id));
    setSelectedSectionIds((previous) => {
      const next = new Set([...previous].filter((id) => currentIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [songForm.sections]);

  useEffect(() => {
    if (!rhymeSelection) return;
    rhymeSelectionRangeRef.current = { anchor: 0, head: rhymeSelection.source.body.length };
    const area = rhymeSelectionRef.current;
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(0, rhymeSelection.source.body.length);
    });
  }, [rhymeSelection]);

  function changeTitle(value: string) {
    titleRef.current = value;
    setTitle(value);
    controllerRef.current?.change(draft({ title: value }), { composing: titleComposingRef.current });
  }

  function changeMemo(value: string) {
    memoRef.current = value;
    setMemo(value);
    controllerRef.current?.change(draft({ memo: value }), { composing: memoComposingRef.current });
  }

  function changeStatus(value: LyricStatus) {
    statusRef.current = value;
    setStatus(value);
    controllerRef.current?.change(draft({ status: value }));
  }

  function toggleMetadata(field: "favorite" | "pinned") {
    if (field === "favorite") {
      const value = !favoriteRef.current;
      favoriteRef.current = value;
      setIsFavorite(value);
      controllerRef.current?.change(draft({ isFavorite: value }));
    } else {
      const value = !pinnedRef.current;
      pinnedRef.current = value;
      pinOrderRef.current = value ? 0 : null;
      setIsPinned(value);
      controllerRef.current?.change(draft({ isPinned: value, pinOrder: value ? 0 : null }));
    }
  }

  async function flushBeforeCommand(reason?: "leave" | "duplicate"): Promise<boolean> {
    editorRef.current?.finishComposition();
    if (titleComposingRef.current) { titleComposingRef.current = false; controllerRef.current?.compositionEnd(); }
    if (memoComposingRef.current) { memoComposingRef.current = false; controllerRef.current?.compositionEnd(); }
    await controllerRef.current?.flush();
    if (controllerRef.current?.state.status === "error" || !await localSyncRef.current?.flush()) {
      setCommandNotice("현재 변경 내용을 먼저 저장해야 합니다. 저장을 다시 시도해 주세요.");
      return false;
    }
    if (reason && !await localSyncRef.current?.checkpoint(reason)) {
      setCommandNotice("작업 전 수정 기록을 저장하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
      return false;
    }
    await positionSaverRef.current?.flush().catch(() => undefined);
    return true;
  }

  async function openPanelResource(item: EditorResourcePanelItem): Promise<"opened" | "deleted" | "failed"> {
    if (commandBusy || item.availability !== "available") return "failed";
    const apiHref = item.kind === "song" ? `/api/songs/${item.id}` : item.kind === "lyrics" ? `/api/lyrics/${item.id}`
      : item.kind === "rhyme_note" ? `/api/rhymes/${item.id}` : `/api/prompts/${item.id}`;
    try {
      const response = await fetch(apiHref, { cache: "no-store" });
      if (!response.ok) {
        setCommandNotice(response.status === 404
          ? "선택한 자료가 삭제되었거나 더 이상 접근할 수 없습니다. 목록을 다시 확인해 주세요."
          : "선택한 자료를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return response.status === 404 ? "deleted" : "failed";
      }
      if (!await flushBeforeCommand("leave")) return "failed";
      setMobileResourcesOpen(false);
      const href = item.kind === "song" ? `/songs/${item.id}?returnTo=${encodeURIComponent(returnTo)}` : item.kind === "lyrics"
        ? `/lyrics/${item.id}${lyricReturnSuffix}` : item.kind === "rhyme_note" ? `/rhymes/${item.id}` : `/prompts/${item.id}`;
      router.push(href);
      return "opened";
    } catch {
      setCommandNotice("선택한 자료를 확인하지 못했습니다. 현재 초안은 그대로 보존됩니다.");
      return "failed";
    }
  }

  async function copyPanelResource(item: EditorResourcePanelItem): Promise<"copied" | "deleted" | "failed"> {
    if (item.kind !== "rhyme_note" && item.kind !== "prompt") return "failed";
    try {
      const response = await fetch(item.kind === "rhyme_note" ? `/api/rhymes/${item.id}` : `/api/prompts/${item.id}`, { cache: "no-store" });
      if (!response.ok) {
        setCommandNotice(response.status === 404
          ? "선택한 자료가 삭제되었거나 더 이상 접근할 수 없습니다. 목록을 다시 확인해 주세요."
          : "복사할 원문을 불러오지 못했습니다. 현재 가사와 입력은 그대로 유지됩니다.");
        return response.status === 404 ? "deleted" : "failed";
      }
      const result = await response.json() as { rhyme?: { body?: string }; prompt?: { plainText?: string } };
      const text = item.kind === "rhyme_note" ? result.rhyme?.body : result.prompt?.plainText;
      if (typeof text !== "string") throw new Error("COPY_SOURCE_UNAVAILABLE");
      setCommandNotice("");
      const target = item.kind === "rhyme_note" ? "라임 원문" : "프롬프트";
      const message = item.kind === "rhyme_note" ? "라임 원문을 복사했습니다" : "프롬프트를 복사했습니다";
      if (item.kind === "prompt") {
        const view = promptCopyView(text);
        await copyFeedback.copyText(view.text, target, view.feedback(message), view.warningMessage);
      } else await copyFeedback.copyText(text, target, message);
      return "copied";
    } catch {
      setCommandNotice("복사할 원문을 불러오지 못했습니다. 현재 가사와 입력은 그대로 유지됩니다.");
      return "failed";
    }
  }

  async function beginRhymeInsertion(item: EditorResourcePanelItem, mode: "whole" | "selection") {
    if (commandBusy || item.kind !== "rhyme_note") return;
    const editor = editorRef.current;
    const sync = localSyncRef.current;
    if (!editor || !sync) {
      setCommandNotice("삽입할 가사 편집기를 아직 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    for (let attempt = 0; editor.composing && attempt < 12; attempt += 1) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 25));
    }
    if (editor.composing) {
      setCommandNotice("한글 조합 입력을 먼저 확정했습니다. 현재 입력은 보존되었으니 다시 삽입해 주세요.");
      editor.focus();
      return;
    }
    const target = sync.captureSelection(editor.selection);
    if (!target) {
      setCommandNotice("현재 가사의 삽입 위치를 보존하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
      return;
    }
    setCommandBusy(true);
    setCommandNotice("");
    try {
      const response = await fetch(`/api/rhymes/${item.id}/insertion-source`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "SOURCE_DELETED" : "SOURCE_UNAVAILABLE");
      const { source } = await response.json() as { source: PortableTextSource };
      if (mode === "selection") {
        setRhymeSelection({ item, source, target, requestId: crypto.randomUUID() });
      } else {
        await commitRhymeInsertion(source, target, 0, source.body.length, crypto.randomUUID());
      }
    } catch (error) {
      setCommandNotice(error instanceof Error && error.message === "SOURCE_DELETED"
        ? "선택한 라임이 삭제되었거나 접근 권한이 없습니다. 현재 가사는 변경하지 않았습니다."
        : "라임 원문을 확인하지 못했습니다. 현재 가사는 변경하지 않았습니다.");
    } finally { setCommandBusy(false); }
  }

  function requestSongFormInsertMenu(request: SongFormInsertMenuRequest | { source: "mobile"; clientX: number; clientY: number }) {
    const editor = editorRef.current;
    const sync = localSyncRef.current;
    if (!editor || !sync) {
      setCommandNotice("송폼을 삽입할 편집기를 아직 준비하고 있습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (editor.composing) {
      setSongFormInsertMenu(null);
      setCommandNotice("한글 조합을 마친 뒤 송폼 삽입을 다시 열어 주세요. 현재 입력은 그대로 보존됩니다.");
      return;
    }
    const target = sync.captureSelection(editor.selection);
    if (!target) {
      setSongFormInsertMenu(null);
      setCommandNotice("현재 삽입 위치를 보존하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
      return;
    }
    setCommandNotice("");
    setSongFormInsertMenu({
      target,
      source: request.source,
      clientX: Math.max(8, Math.min(request.clientX, window.innerWidth - 300)),
      clientY: Math.max(8, Math.min(request.clientY, window.innerHeight - 360))
    });
  }

  function insertSongForm(label: SongFormMarkerLabel) {
    const menu = songFormInsertMenu;
    const editor = editorRef.current;
    const sync = localSyncRef.current;
    if (!menu || !editor || !sync) return;
    if (editor.composing) {
      setSongFormInsertMenu(null);
      setCommandNotice("한글 조합을 마친 뒤 다시 삽입해 주세요. 현재 입력은 그대로 보존됩니다.");
      requestAnimationFrame(() => editor.focus());
      return;
    }
    const resolved = sync.resolveSelection(menu.target);
    if (!resolved) {
      setSongFormInsertMenu(null);
      setCommandNotice("원격 변경 뒤 삽입 위치를 찾지 못했습니다. 가사 원문은 변경하지 않았습니다.");
      requestAnimationFrame(() => editor.focus());
      return;
    }
    try {
      const change = buildSongFormInsertion(editor.value, resolved.head, label);
      const next = `${editor.value.slice(0, change.from)}${change.insert}${editor.value.slice(change.to)}`;
      if ([...next].length > LYRIC_LIMITS.body) {
        setSongFormInsertMenu(null);
        setCommandNotice(`가사 본문은 ${LYRIC_LIMITS.body.toLocaleString()}자를 넘을 수 없습니다. 원문은 변경하지 않았습니다.`);
        requestAnimationFrame(() => editor.focus());
        return;
      }
      editor.replace(change.from, change.to, change.insert, crypto.randomUUID());
      setSongFormInsertMenu(null);
      setCommandNotice("");
      copyFeedback.showToast(`${label} 송폼을 현재 위치에 삽입했습니다`);
      requestAnimationFrame(() => editor.focus());
    } catch {
      setSongFormInsertMenu(null);
      setCommandNotice("송폼을 삽입하지 못했습니다. 가사 원문은 변경하지 않았습니다.");
      requestAnimationFrame(() => editor.focus());
    }
  }

  async function commitRhymeInsertion(source: PortableTextSource, target: CrdtTextSelectionReference, anchor: number, head: number, requestId: string) {
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);
    const text = source.body.slice(from, to);
    if (!text) {
      setCommandNotice("삽입할 라임 표현을 선택해 주세요.");
      return;
    }
    const currentBody = editorRef.current?.value ?? bodyRef.current;
    const targetSelection = localSyncRef.current?.resolveSelection(target);
    if (targetSelection && [...`${currentBody.slice(0, targetSelection.from)}${text}${currentBody.slice(targetSelection.to)}`].length > LYRIC_LIMITS.body) {
      preserveInsertionFallback(text, `가사 본문은 ${LYRIC_LIMITS.body.toLocaleString()}자를 넘을 수 없습니다. 아래 원문을 직접 복사할 수 있습니다.`);
      return;
    }
    const sourceReference = capturePortableTextSelection(source, anchor, head);
    const sync = localSyncRef.current;
    const editor = editorRef.current;
    if (!sourceReference || !sync || !editor || !await sync.flush()) {
      preserveInsertionFallback(text, "삽입 위치를 서버와 확인하지 못했습니다. 아래 원문을 직접 복사할 수 있습니다.");
      return;
    }
    try {
      const response = await fetch(`/api/lyrics/${initialLyric.id}/rhyme-insertion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: RHYME_INSERTION_CONTRACT_VERSION,
          requestId,
          source: sourceReference,
          target: {
            resourceId: target.resourceId,
            documentKey: target.documentKey,
            relativePosition: target.anchorRelativePosition
          },
          text
        })
      });
      const result = await response.json().catch(() => ({})) as { valid?: boolean; reason?: string };
      if (!response.ok || !result.valid) {
        const message = result.reason === "target_deleted" ? "현재 가사가 삭제되었거나 접근할 수 없습니다."
          : result.reason === "target_changed" ? "현재 가사가 전환되었거나 삽입 위치가 더 이상 유효하지 않습니다."
          : "라임 원문이 변경되어 안전하게 삽입할 수 없습니다.";
        preserveInsertionFallback(text, `${message} 아래 원문을 직접 복사할 수 있습니다.`);
        return;
      }
      const resolved = sync.resolveSelection(target);
      if (!resolved) {
        preserveInsertionFallback(text, "원격 변경으로 삽입 위치를 찾지 못했습니다. 아래 원문을 직접 복사할 수 있습니다.");
        return;
      }
      editor.replace(resolved.from, resolved.to, text, requestId);
      setRhymeSelection(null);
      setMobileResourcesOpen(false);
      setCommandNotice("");
      copyFeedback.showToast(resolved.from === resolved.to ? "라임을 현재 커서에 삽입했습니다" : "선택 영역을 라임으로 바꿨습니다");
      requestAnimationFrame(() => editor.focus());
    } catch {
      preserveInsertionFallback(text, "삽입 요청을 확인하지 못했습니다. 아래 원문을 직접 복사할 수 있습니다.");
    }
  }

  function preserveInsertionFallback(text: string, message: string) {
    setRhymeSelection(null);
    setCommandNotice(message);
    copyFeedback.openManual(text, "라임 표현");
  }

  function closeResourcePanel() {
    if (mobileResourcesOpen) setMobileResourcesOpen(false);
    else setDesktopResourcesOpen(false);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  async function duplicateCurrent() {
    if (commandBusy || !await flushBeforeCommand("duplicate")) return;
    setCommandBusy(true);
    setCommandNotice("");
    try {
      const response = await fetch(`/api/lyrics/${initialLyric.id}/duplicate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: crypto.randomUUID() })
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { lyric: LyricRecord };
      router.push(`/lyrics/${result.lyric.id}${lyricReturnSuffix}`);
      router.refresh();
    } catch {
      setCommandBusy(false);
      setCommandNotice("가사를 복제하지 못했습니다. 현재 내용은 그대로 보존됩니다.");
    }
  }

  async function deleteCurrent() {
    if (commandBusy || !await flushBeforeCommand()) return;
    setCommandBusy(true);
    setCommandNotice("");
    try {
      const response = await fetch(`/api/lyrics/${initialLyric.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean };
      if (!response.ok || !result.deleted) throw new Error();
      const listResponse = await fetch(`/api/songs/${initialLyric.songId}/lyrics`, { cache: "no-store" });
      const currentLyrics = listResponse.ok ? (await listResponse.json() as { items: LyricRecord[] }).items : songLyrics;
      const next = currentLyrics.filter((lyric) => lyric.id !== initialLyric.id)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))[0];
      router.replace(next ? `/lyrics/${next.id}${lyricReturnSuffix}` : dashboardHref);
      router.refresh();
    } catch {
      setCommandBusy(false);
      setDeleteOpen(false);
      setCommandNotice("가사를 삭제하지 못했습니다. 현재 화면을 유지합니다.");
    }
  }

  function goToSection(sectionId: string) {
    editorRef.current?.goToSongFormSection(sectionId);
    restoreSongFormFocusRef.current = false;
    setMobileSongFormOpen(false);
  }

  function toggleSection(sectionId: string) {
    setSelectedSectionIds((previous) => {
      const next = new Set(previous);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  async function writeClipboard(text: string, target: string) {
    await copyFeedback.copyText(text, target, target === "가사 전체" ? "가사를 복사했습니다" : `${target}을 복사했습니다`);
  }

  function copyWhole() {
    const view = lyricCopyView(editorRef.current?.value ?? bodyRef.current);
    setWholeCopyView(view);
    void copyFeedback.copyText(view.payload, "가사 전체", view.feedback("Suno용 가사를 복사했습니다. Extend 작업 메모는 제외됩니다."), view.warningMessage);
  }

  function copyRawLyric() {
    const raw = editorRef.current?.value ?? bodyRef.current;
    setSongFormInsertMenu(null);
    void copyFeedback.copyText(raw, "Extend 포함 원문", "Extend 작업 메모를 포함한 현재 원문을 복사했습니다.");
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function copySelected() {
    const sections = editorRef.current?.songForm.sections ?? songForm.sections;
    const text = copySongFormSections(editorRef.current?.value ?? bodyRef.current, sections, selectedSectionIds);
    if (!text) return;
    const selected = sections.filter((section) => selectedSectionIds.has(section.id));
    const target = selected.length === 1
      ? `선택한 ${selected[0]!.label}${selected[0]!.occurrence > 1 ? ` ${selected[0]!.occurrence}번째` : ""} 구간`
      : `선택한 ${selected.length}개 구간`;
    void writeClipboard(text, target);
  }

  function toggleFocusMode() {
    setFocusMode((current) => !current);
    restoreSongFormFocusRef.current = false;
    setMobileSongFormOpen(false);
    setMobileResourcesOpen(false);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function toggleResourcePanel() {
    if (window.matchMedia("(max-width: 720px)").matches) setMobileResourcesOpen((current) => !current);
    else setDesktopResourcesOpen((current) => !current);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  async function navigateToLyric(target: LyricRecord | null, boundary: "이전" | "다음") {
    if (!target) {
      setCommandNotice(`현재 곡에 ${boundary} 가사가 없습니다.`);
      requestAnimationFrame(() => editorRef.current?.focus());
      return;
    }
    if (commandBusy) return;
    setCommandBusy(true);
    setCommandNotice("");
    if (!await flushBeforeCommand("leave")) {
      setCommandBusy(false);
      return;
    }
    router.push(`/lyrics/${target.id}${lyricReturnSuffix}`);
    router.refresh();
  }

  useEffect(() => {
    function beforeShortcutNavigation(event: Event) {
      const shortcutEvent = event as CustomEvent<ShortcutNavigationDetail>;
      event.preventDefault();
      if (commandBusy) return;
      setCommandBusy(true);
      setCommandNotice("");
      void flushBeforeCommand("leave").then((saved) => {
        if (!saved) { setCommandBusy(false); return; }
        router.push(shortcutEvent.detail.href);
        router.refresh();
      });
    }
    window.addEventListener(BEFORE_SHORTCUT_NAVIGATION_EVENT, beforeShortcutNavigation);
    return () => window.removeEventListener(BEFORE_SHORTCUT_NAVIGATION_EVENT, beforeShortcutNavigation);
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (editorRef.current?.composing || titleComposingRef.current || memoComposingRef.current) return;
      const editable = isEditableShortcutTarget(event.target);
      if (editable && !(event.target instanceof Element && event.target.closest(".cm-editor"))) return;
      const command = commandForKeyboardEvent(event, "lyric_editor");
      if (!command) return;
      const modal = document.querySelector<HTMLElement>('[aria-modal="true"]');
      if (modal && !(command === "toggle_resource_panel" && modal.classList.contains("editor-resource-panel"))) return;
      event.preventDefault();
      if (command === "copy_whole_lyric") copyWhole();
      else if (command === "toggle_focus_mode") toggleFocusMode();
      else if (command === "toggle_resource_panel") toggleResourcePanel();
      else if (command === "previous_lyric") void navigateToLyric(previousLyric, "이전");
      else if (command === "next_lyric") void navigateToLyric(nextLyric, "다음");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const writingVariables = {
    "--lyric-font-family": writingFontFamily(displaySettings.effective.font),
    "--lyric-font-size": `${displaySettings.effective.fontSize}px`,
    "--lyric-line-height": String(displaySettings.effective.lineHeight),
    "--lyric-letter-spacing": `${displaySettings.effective.letterSpacing}em`
  } as CSSProperties;

  return <section className={`lyric-editor-page${focusMode ? " is-focus-mode" : ""}`} aria-labelledby="lyric-editor-heading" style={writingVariables}
    data-pending-input={hasVolatilePendingInput(saveState.status, localSyncState) || undefined}>
    <h1 className="sr-only" id="lyric-editor-heading">가사 편집: {title || "제목 없음"}</h1>
    <header className="lyric-editor-header">
      <div className="lyric-editor-context">
        <a href={dashboardHref} className="back-inline" onClick={(event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          void flushBeforeCommand("leave").then((saved) => { if (saved) router.push(dashboardHref); });
        }}>← {songTitle}</a>
        <p className="eyebrow">Lyrics editor</p>
        <nav className="lyric-sequence-nav" aria-label="현재 곡의 가사 이동">
          <button type="button" disabled={!previousLyric || commandBusy} aria-keyshortcuts="Alt+Shift+[" onClick={() => void navigateToLyric(previousLyric, "이전")}>← 이전 가사</button>
          <button type="button" disabled={!nextLyric || commandBusy} aria-keyshortcuts="Alt+Shift+]" onClick={() => void navigateToLyric(nextLyric, "다음")}>다음 가사 →</button>
        </nav>
      </div>
      <div className="editor-header-actions">
        <button type="button" aria-expanded={desktopResourcesOpen} aria-controls="editor-resource-results" title="Alt+Shift+P" aria-keyshortcuts="Alt+Shift+P"
          onClick={toggleResourcePanel}>{desktopResourcesOpen ? "자료 패널 접기" : "자료 패널 펼치기"}</button>
        <button type="button" onClick={() => setHistoryOpen(true)}>버전 비교</button>
        <button type="button" aria-haspopup="dialog" aria-expanded={displaySettingsOpen} onClick={() => setDisplaySettingsOpen(true)}>표시 설정</button>
        <LyricShareManager lyric={{ ...initialLyric, title, body: bodyRef.current, memo, status, isFavorite, isPinned, pinOrder: pinOrderRef.current }} participants={sharingParticipants} />
        <button type="button" onClick={copyWhole} title="Alt+Shift+C" aria-label="전체 복사" aria-keyshortcuts="Alt+Shift+C">Suno용 복사</button>
        <span className={`lyric-copy-length${wholeCopyView.exceedsRecommendedLimit ? " over" : ""}`}>{wholeCopyView.codePointCount.toLocaleString("ko-KR")}자</span>
        <button type="button" aria-pressed={focusMode} onClick={toggleFocusMode} title="Alt+Shift+F" aria-keyshortcuts="Alt+Shift+F">{focusMode ? "집중 모드 종료" : "집중 모드"}</button>
        <button type="button" disabled={commandBusy} onClick={duplicateCurrent}>복제</button>
        <button type="button" disabled={commandBusy} className="danger-text" onClick={() => setDeleteOpen(true)}>삭제</button>
      </div>
      <SaveIndicator state={saveState} syncState={localSyncState} onRetry={() => { void controllerRef.current?.retry(); }} onCopy={copyWhole} />
      <LocalDraftIndicator state={localSyncState} onRetry={() => localSyncRef.current?.retry()} onCopy={copyWhole} />
    </header>
    {commandNotice ? <p className="editor-command-notice" role="status">{commandNotice}</p> : null}
    {legacyConflict ? <details className="editor-command-notice" open>
      <summary>이전 로컬 초안이 서버와 다릅니다. 두 내용을 보존하고 동기화를 멈췄습니다.</summary>
      <label>이전 로컬 초안<textarea readOnly value={legacyConflict.localBody} /></label>
      <label>서버 본문<textarea readOnly value={legacyConflict.serverBody} /></label>
      <button type="button" onClick={() => { void writeClipboard(legacyConflict.localBody, "이전 로컬 초안"); }}>이전 초안 복사</button>
    </details> : null}
    <div className="lyric-editor-title">
      <label id="lyric-title-label" htmlFor="lyric-title">가사 제목</label>
      <input id="lyric-title" value={title} aria-invalid={!title.trim()} onChange={(event) => changeTitle(event.target.value)}
        onCompositionStart={() => { titleComposingRef.current = true; }}
        onCompositionEnd={() => { titleComposingRef.current = false; controllerRef.current?.compositionEnd(); }} />
      {!title.trim() ? <span role="alert">제목을 입력해야 저장할 수 있습니다.</span> : null}
    </div>
    <div className="lyric-editor-workspace">
      <aside className="songform-outline" aria-label="송폼 목차">
        <div className="songform-heading"><strong>송폼</strong><span>{songForm.sections.length}</span></div>
        <SongFormList sections={songForm.sections} activeSectionId={songForm.activeSectionId} selectedSectionIds={selectedSectionIds} onSelect={goToSection} onToggle={toggleSection} />
        <CopySelectionActions selectedCount={selectedSectionIds.size} onClear={() => setSelectedSectionIds(new Set())} onCopy={copySelected} />
      </aside>
      <div className="lyric-editor-document">
        <div className="lyric-editor-surface" data-lyric-id={initialLyric.id} ref={mountRef} />
        <footer className="lyric-editor-footer">
          <span>순수 텍스트 · 최대 100,000자</span>
          <span className={`lyric-copy-length${wholeCopyView.exceedsRecommendedLimit ? " over" : ""}`}>{wholeCopyView.codePointCount.toLocaleString("ko-KR")}자{wholeCopyView.exceedsRecommendedLimit ? " · 3,000자 권장 초과" : " · 본문 자동 동기화"}</span>
        </footer>
      </div>
      <LyricResourcePanel lyricId={initialLyric.id} desktopOpen={desktopResourcesOpen} mobileOpen={mobileResourcesOpen}
        width={resourcePanelWidth} onWidth={setResourcePanelWidth} onClose={closeResourcePanel} onOpen={openPanelResource}
        onCopy={copyPanelResource}
        onInsertRhyme={(item, mode) => { void beginRhymeInsertion(item, mode); }}
        settings={<><div className="mobile-lyric-commands"><button type="button" disabled={commandBusy} onClick={duplicateCurrent}>현재 가사 복제</button><button type="button" disabled={commandBusy} className="danger-text" onClick={() => { setMobileResourcesOpen(false); setDeleteOpen(true); }}>현재 가사 삭제</button></div>
          <div className="lyric-display-summary"><span>{displaySettings.override ? "가사별 설정" : "계정 기본값"} · {displaySettings.effective.fontSize}px · 줄 {displaySettings.effective.lineHeight.toFixed(1)}</span><button type="button" onClick={() => { setMobileResourcesOpen(false); setDisplaySettingsOpen(true); }}>표시 설정 열기</button></div>
          <LyricMetadataControls memo={memo} status={status} isFavorite={isFavorite} isPinned={isPinned}
            onMemo={changeMemo} onStatus={changeStatus} onFavorite={() => toggleMetadata("favorite")} onPinned={() => toggleMetadata("pinned")}
            onMemoCompositionStart={() => { memoComposingRef.current = true; }} onMemoCompositionEnd={() => { memoComposingRef.current = false; controllerRef.current?.compositionEnd(); }} /></>} />
    </div>
    <div className="mobile-editor-dock" role="group" aria-label="가사 편집 도구">
      <button type="button" aria-haspopup="menu" aria-expanded={Boolean(songFormInsertMenu)} onClick={() => requestSongFormInsertMenu({
        source: "mobile", clientX: window.innerWidth / 2, clientY: window.innerHeight - 360
      })}>＋ 송폼 삽입</button>
      <button ref={mobileSongFormButtonRef} type="button" aria-haspopup="dialog" aria-expanded={mobileSongFormOpen}
        onClick={() => { restoreSongFormFocusRef.current = false; setMobileSongFormOpen(true); }}>☷ 송폼 <span>{songForm.sections.length}</span></button>
      <button type="button" onClick={copyWhole} aria-label="전체 복사" aria-keyshortcuts="Alt+Shift+C">⧉ Suno용 <small aria-hidden="true">{wholeCopyView.codePointCount.toLocaleString("ko-KR")}자</small></button>
      <button type="button" aria-haspopup="dialog" aria-expanded={mobileResourcesOpen} onClick={() => setMobileResourcesOpen(true)}>≋ 다른 가사 <span>{songLyrics.length}</span> · 자료</button>
      <LyricShareManager lyric={{ ...initialLyric, title, body: bodyRef.current, memo, status, isFavorite, isPinned, pinOrder: pinOrderRef.current }} participants={sharingParticipants} />
      <button type="button" onClick={() => setHistoryOpen(true)}>기록·비교</button>
      <button type="button" aria-pressed={focusMode} onClick={toggleFocusMode} aria-keyshortcuts="Alt+Shift+F">{focusMode ? "집중 종료" : "집중 모드"}</button>
    </div>
    {songFormInsertMenu ? <section ref={songFormInsertMenuRef} className={`songform-insert-menu source-${songFormInsertMenu.source}`}
      role="menu" aria-label="송폼 삽입" style={{ left: songFormInsertMenu.clientX, top: songFormInsertMenu.clientY }}>
      <div role="presentation"><strong>송폼 삽입</strong><small>{songFormInsertMenu.source === "pointer" ? "브라우저 메뉴를 닫은 뒤 선택하세요" : "현재 커서 기준"}</small></div>
      <div role="presentation" className="songform-insert-options">{DEFAULT_SONG_FORM_MARKERS.map((item) => <button key={item.label} type="button" role="menuitem"
        onClick={() => insertSongForm(item.label)}>{item.marker}</button>)}</div>
      <p role="presentation">Suno용 전체 복사는 `[Extend]` 작업 메모만 제외합니다. 저장 원문과 기록은 그대로 유지됩니다.</p>
      <button type="button" role="menuitem" className="songform-raw-copy" onClick={copyRawLyric}>Extend 포함 원문 복사</button>
      <button type="button" role="menuitem" className="songform-insert-close" onClick={() => {
        setSongFormInsertMenu(null);
        requestAnimationFrame(() => editorRef.current?.focus());
      }}>닫기</button>
    </section> : null}
    {mobileSongFormOpen ? <div className="editor-sheet-backdrop" onPointerDown={(event) => {
      if (event.target === event.currentTarget) { restoreSongFormFocusRef.current = true; setMobileSongFormOpen(false); }
    }}>
      <section ref={mobileSongFormDialogRef} className="songform-sheet" role="dialog" aria-modal="true" aria-labelledby="songform-sheet-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header><div><h2 id="songform-sheet-title">송폼 이동</h2><p>{selectedSectionIds.size}개 선택됨</p></div><button type="button" onClick={() => { restoreSongFormFocusRef.current = true; setMobileSongFormOpen(false); }}>닫기</button></header>
        <SongFormList sections={songForm.sections} activeSectionId={songForm.activeSectionId} selectedSectionIds={selectedSectionIds} onSelect={goToSection} onToggle={toggleSection} />
        <CopySelectionActions selectedCount={selectedSectionIds.size} onClear={() => setSelectedSectionIds(new Set())} onCopy={copySelected} />
      </section>
    </div> : null}
    {displaySettingsOpen ? <div className="lyric-display-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setDisplaySettingsOpen(false); }}>
      <LyricDisplaySettings lyricId={initialLyric.id} settings={displaySettings} onApply={setDisplaySettings} onCancel={() => setDisplaySettingsOpen(false)} />
    </div> : null}
    {historyOpen ? <LyricHistory lyricId={initialLyric.id} versions={songLyrics} onClose={() => setHistoryOpen(false)}
      readHistory={async () => {
        const sync = localSyncRef.current;
        if (!sync || !await sync.flush()) throw new Error("REVISION_UNAVAILABLE");
        return sync.listRevisions();
      }}
      readRevision={async (id) => {
        if (!localSyncRef.current) throw new Error("REVISION_UNAVAILABLE");
        return localSyncRef.current.getRevision(id);
      }}
      restore={async (id, input) => {
        if (!await flushBeforeCommand() || !localSyncRef.current) throw new Error("REVISION_UNAVAILABLE");
        await localSyncRef.current.restoreRevision(id, input);
      }} /> : null}
    <CopyFeedback state={copyFeedback}
      dialogTitle={(target) => target === "가사 전체" ? "가사 전체를 직접 복사해 주세요" : `직접 복사: ${target}`}
      textareaLabel={(target) => target === "가사 전체" ? "수동 복사할 가사" : `수동 복사할 ${target}`} />
    {rhymeSelection ? <div className="dialog-backdrop rhyme-selection-backdrop" role="presentation" onPointerDown={(event) => {
      if (event.target === event.currentTarget) setRhymeSelection(null);
    }}><section className="manual-copy-dialog rhyme-selection-dialog" role="dialog" aria-modal="true" aria-labelledby="rhyme-selection-title" aria-describedby="rhyme-selection-description">
      <DialogFocusBoundary selector=".rhyme-selection-dialog" onClose={() => setRhymeSelection(null)} blocked={commandBusy} initialFocus="textarea" />
      <p className="eyebrow">Rhyme selection</p>
      <h2 id="rhyme-selection-title">‘{rhymeSelection.item.title}’에서 표현 선택</h2>
      <p id="rhyme-selection-description">아래 원문에서 삽입할 부분을 드래그해 선택하세요. 현재 가사의 커서·선택 위치는 CRDT 기준으로 보존됩니다.</p>
      <textarea ref={(area) => {
        rhymeSelectionRef.current = area;
        if (area) area.onselect = () => {
          rhymeSelectionRangeRef.current = { anchor: area.selectionStart, head: area.selectionEnd };
        };
      }} readOnly aria-label="삽입할 라임 표현 선택" value={rhymeSelection.source.body} />
      <div className="dialog-actions"><button type="button" onClick={() => setRhymeSelection(null)}>취소</button><button type="button" className="primary-link" onClick={() => {
        const area = rhymeSelectionRef.current;
        if (area && !commandBusy) {
          setCommandBusy(true);
          const range = rhymeSelectionRangeRef.current;
          void commitRhymeInsertion(rhymeSelection.source, rhymeSelection.target, range.anchor, range.head, rhymeSelection.requestId)
            .finally(() => setCommandBusy(false));
        }
      }} disabled={commandBusy}>{commandBusy ? "확인 중…" : "선택 영역 삽입"}</button></div>
    </section></div> : null}
    {deleteOpen ? <div className="dialog-backdrop" role="presentation"><section className="delete-dialog lyric-editor-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-delete-title" aria-describedby="editor-delete-description"><DialogFocusBoundary selector=".lyric-editor-delete-dialog" onClose={() => setDeleteOpen(false)} blocked={commandBusy} /><p className="eyebrow">Soft delete</p><h2 id="editor-delete-title">‘{title}’ 가사를 삭제할까요?</h2><p id="editor-delete-description">현재 가사를 숨긴 뒤 최근 다른 가사 또는 곡 대시보드로 이동합니다.</p><div><button className="secondary-button" type="button" disabled={commandBusy} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-button" type="button" disabled={commandBusy} onClick={deleteCurrent}>{commandBusy ? "삭제 중…" : "가사 삭제 확인"}</button></div></section></div> : null}
  </section>;
}

function LyricMetadataControls({ memo, status, isFavorite, isPinned, onMemo, onStatus, onFavorite, onPinned, onMemoCompositionStart, onMemoCompositionEnd }: {
  memo: string;
  status: LyricStatus;
  isFavorite: boolean;
  isPinned: boolean;
  onMemo: (value: string) => void;
  onStatus: (value: LyricStatus) => void;
  onFavorite: () => void;
  onPinned: () => void;
  onMemoCompositionStart: () => void;
  onMemoCompositionEnd: () => void;
}) {
  return <section className="lyric-metadata" aria-label="가사 설정">
    <div className="other-panel-heading"><strong>가사 설정</strong></div>
    <label><span>상태</span><select value={status} onChange={(event) => onStatus(event.target.value as LyricStatus)}>{LYRIC_STATUSES.map((value) => <option key={value} value={value}>{LYRIC_STATUS_LABELS[value]}</option>)}</select></label>
    <div className="lyric-metadata-toggles"><button type="button" aria-pressed={isFavorite} onClick={onFavorite}>★ {isFavorite ? "즐겨찾기됨" : "즐겨찾기"}</button><button type="button" aria-pressed={isPinned} onClick={onPinned}>⌁ {isPinned ? "고정됨" : "고정"}</button></div>
    <label><span>작업 메모</span><textarea value={memo} maxLength={10_000} placeholder="다음 수정 방향을 기록하세요" onChange={(event) => onMemo(event.target.value)} onCompositionStart={onMemoCompositionStart} onCompositionEnd={onMemoCompositionEnd} /></label>
  </section>;
}

function SongFormList({ sections, activeSectionId, selectedSectionIds, onSelect, onToggle }: {
  sections: readonly SongFormSection[];
  activeSectionId: string | null;
  selectedSectionIds: ReadonlySet<string>;
  onSelect: (sectionId: string) => void;
  onToggle: (sectionId: string) => void;
}) {
  if (sections.length === 0) return <p className="songform-empty">`[Verse]`처럼 한 줄에 태그를 입력하면 목차가 생깁니다.</p>;
  return <nav className="songform-list" aria-label="인식된 송폼 구간">
    {sections.map((section) => {
      const name = `${section.label}${section.occurrence > 1 ? ` ${section.occurrence}번째` : ""}`;
      return <div className="songform-row" key={section.id}>
        <input type="checkbox" checked={selectedSectionIds.has(section.id)} aria-label={`${name} 구간 선택`}
          onChange={() => onToggle(section.id)} />
        <button type="button" className={section.id === activeSectionId ? "active" : ""}
          aria-current={section.id === activeSectionId ? "location" : undefined}
          aria-label={`${name} 구간으로 이동`}
          onClick={() => onSelect(section.id)}>
          <span className="songform-primary-label">{section.label}</span>
          {section.subtag ? <span className="songform-subtag" aria-hidden="true">{section.subtag}</span> : null}
          {section.occurrence > 1 ? <small>#{section.occurrence}</small> : null}
        </button>
      </div>;
    })}
  </nav>;
}

function CopySelectionActions({ selectedCount, onClear, onCopy }: { selectedCount: number; onClear: () => void; onCopy: () => void }) {
  return <div className="songform-copy-actions">
    <span aria-live="polite">{selectedCount}개 선택됨</span>
    <button type="button" onClick={onClear} disabled={selectedCount === 0}>선택 해제</button>
    <button type="button" className="primary" onClick={onCopy} disabled={selectedCount === 0}>선택 복사</button>
  </div>;
}

function SaveIndicator({ state, syncState, onRetry, onCopy }: { state: SaveState; syncState: LocalSyncState; onRetry: () => void; onCopy: () => void }) {
  if (state.status === "saved" && syncState !== "ready") return null;
  const label = state.status === "dirty" ? "변경 내용 있음" : state.status === "saving" ? "변경 내용을 저장하는 중…" : state.status === "error" ? "저장하지 못했습니다" : "방금 저장됨";
  return <div className={`save-indicator is-${state.status}`} role="status" aria-live="polite">
    <span aria-hidden="true" />{label}
    {state.status === "error" ? <><button type="button" onClick={onRetry}>다시 시도</button><button type="button" onClick={onCopy}>현재 입력 복사</button></> : null}
  </div>;
}

function LocalDraftIndicator({ state, onRetry, onCopy }: { state: LocalSyncState; onRetry: () => void; onCopy: () => void }) {
  if (state === "ready") return null;
  const labels: Record<Exclude<LocalSyncState, "ready">, string> = {
    loading: "초안과 서버 연결 확인 중…", "saving-local": "이 기기에 저장하는 중…",
    local: "이 기기에 임시 저장됨 · 서버 연결 대기", syncing: "이 기기에 임시 저장됨 · 서버 동기화 중…",
    projection: "서버에 저장됨 · 검색 반영 중…", offline: "오프라인 · 이 기기에 임시 저장됨",
    error: "이 기기 초안 또는 서버 저장을 완료하지 못했습니다. 현재 입력은 화면에 남아 있습니다.",
    unavailable: "서버에 저장할 수 없습니다. 로그인·문서 접근을 확인하고 이탈 전 현재 입력을 복사해 주세요.",
    conflict: "초안을 자동으로 합칠 수 없어 동기화를 멈췄습니다."
  };
  return <p className={`local-draft-state state-${state}`} role="status">{labels[state]}
    {state === "error" || state === "local" || state === "unavailable" ? <button type="button" onClick={onRetry}>동기화 다시 시도</button> : null}
    {state === "error" || state === "unavailable" ? <button type="button" onClick={onCopy}>현재 입력 복사</button> : null}
  </p>;
}
