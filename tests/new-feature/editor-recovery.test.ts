import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as domain from "../../packages/domain/src/index.js";
import { SerializedSaveController } from "../../packages/editor/src/autosave.js";
import { parseSongForm } from "../../packages/editor/src/songform.js";
import { createLyricMetadataSaver } from "../../apps/web/src/lib/lyric-metadata.js";
import { createRhymeMetadataSaver } from "../../apps/web/src/lib/rhyme-metadata.js";
import { lyricCopyView } from "../../apps/web/src/lib/lyric-copy.js";
import { promptCopyView } from "../../apps/web/src/lib/prompt-copy.js";
import { hasVolatilePendingInput } from "../../apps/web/src/lib/update-safety.js";
import { createMetadataDraftStore } from "../../apps/web/src/lib/metadata-draft.js";

// Run the real editor handlers, JSX, save controller and metadata saver. Only
// React/CodeMirror/browser-sync/clipboard boundaries are isolated; no DB or server.
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return { get length() { return items.size; }, key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null, setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); }, clear: () => items.clear() };
}

function editorFixture(kind: "lyric" | "rhyme" | "prompt", storage = memoryStorage()) {
  vi.useFakeTimers();
  const failedRead = vi.fn(async (_url: string, _options?: any): Promise<any> => ({ ok: false, status: 503, json: async () => ({}) }));
  vi.stubGlobal("fetch", failedRead);
  vi.stubGlobal("localStorage", storage);
  const slots: any[] = [];
  let cursor = 0;
  let effects: Array<() => void> = [];
  const jsx = (type: any, props: any) => ({ type, props });
  const react = {
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value: any) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useMemo: (compute: () => any) => compute(),
    useEffect(effect: () => any, deps?: any[]) {
      const index = cursor++;
      const previous = slots[index];
      if (previous && deps?.every((value, i) => Object.is(value, previous.deps?.[i]))) return;
      effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
    }
  };
  let syncOptions: any;
  let editorOptions: any;
  const body = "[Verse]\n현재 원문 👩‍🎤\n[Extend]\n남겨야 할 작업 지시";
  const initial = { id: "fixture-document", title: "저장된 제목", body, memo: "저장된 메모", status: "draft",
    isFavorite: false, isPinned: false, pinOrder: null, color: null, tags: [], rowVersion: 1,
    mode: "sentence", tokens: [], tagText: "", sentenceText: "원래 문장", plainText: "원래 문장", linkedSongIds: [] };
  const sync = { setComposing() {}, setTitle() {}, setSentenceText() {}, leave() {}, flush: vi.fn(async () => false),
    checkpoint: vi.fn(async () => false), destroy: async () => undefined, retry() {} };
  const editor = { value: body, focus() {}, setEditable() {}, finishComposition() {}, destroy() {},
    selection: { from: 0, to: 0, head: 0, anchor: 0 }, songForm: { sections: [] }, scrollTop: 0 };
  const copy = vi.fn(async (_text: string, _target: string) => "copied");
  const feedback = { copyText: copy, manual: null as null | { text: string; target: string } };
  const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
  const dependencies: Record<string, any> = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/navigation": { useRouter: () => router },
    "@lyricscloud/domain": domain,
    "@lyricscloud/editor": { SerializedSaveController, parseSongForm, DEFAULT_SONG_FORM_MARKERS: [],
      BufferedPositionSaver: class { change() {} flush() { return Promise.resolve(); } destroy() {} dispose() {} },
      createCodeMirrorTextEditor: (options: any) => { editorOptions = options; return editor; },
      ...Object.fromEntries(["createBrowserLyricSync", "createBrowserRhymeSync", "createBrowserPromptSync"].map((name) => [name, async (options: any) => {
        syncOptions = options; options.onStateChange("ready"); options.onEditableChange(true); return sync;
      }])) },
    "../lib/account-cache.js": { registerLogoutSave: () => () => {} },
    "../lib/metadata-draft.js": { createMetadataDraftStore: (owner: string, kind: "lyric" | "rhyme", id: string) => createMetadataDraftStore(owner, kind, id, storage) },
    "../lib/lyric-metadata.js": { createLyricMetadataSaver },
    "../lib/rhyme-metadata.js": { createRhymeMetadataSaver },
    "../lib/lyric-copy.js": { lyricCopyView }, "../lib/prompt-copy.js": { promptCopyView },
    "../lib/update-safety.js": { hasVolatilePendingInput },
    "../lib/font-assets.js": { writingFontFamily: () => "sans-serif", writingDisplayVariables: () => ({}) },
    "./copy-feedback.js": { useCopyFeedback: () => feedback }
  };
  const module = { exports: {} as Record<string, (props: any) => any> };
  const source = readFileSync(new URL(`../../apps/web/src/components/${kind}-editor.tsx`, import.meta.url), "utf8");
  const window = Object.assign(new EventTarget(), { setTimeout, clearTimeout, matchMedia: () => ({ matches: false }) });
  vm.runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module, exports: module.exports, require: (name: string) => dependencies[name] ?? {},
    window, document: Object.assign(new EventTarget(), { querySelector: () => null }),
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, fetch: failedRead,
    URLSearchParams, AbortController, setTimeout, clearTimeout, crypto, localStorage: storage
  });
  const display = { font: "system", fontSize: 18, lineHeight: 1.8, letterSpacing: 0, focusModeDefault: false };
  const props = { ownerId: "fixture-owner", initialLyric: initial, initialRhyme: initial, initialPrompt: initial,
    songTitle: "합성 곡", songLyrics: [initial], dashboardHref: "/songs/fixture", returnTo: "/songs", initialFind: "", initialPosition: null,
    initialDisplaySettings: { account: display, effective: display, override: null }, displaySettings: display };
  return {
    copy, feedback, failedRead, body, editor, storage, sync, router, initial, window,
    get editorOptions() { return editorOptions; },
    syncState(state: string) { syncOptions.onStateChange(state); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    render() {
      cursor = 0; effects = [];
      const tree = module.exports[`${kind[0]!.toUpperCase()}${kind.slice(1)}Editor`]!(props);
      for (const node of nodes(tree)) if (node.props?.["data-editor-surface"] && node.props.ref) node.props.ref.current = {};
      for (const effect of effects) effect();
      return tree;
    }
  };
}
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  const rendered = ["SaveIndicator", "LocalDraftIndicator", "SyncIndicator"].includes(tree.type?.name) ? tree.type(tree.props) : null;
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.settings), ...nodes(rendered)];
}
function text(tree: any): string {
  if (tree == null || typeof tree === "boolean") return "";
  if (Array.isArray(tree)) return tree.map(text).join("");
  return typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
const titleInput = (tree: any) => nodes(tree).find((node) => /^(lyric|rhyme|prompt)-title$/.test(node.props?.id ?? ""));
const button = (tree: any, label: string) => nodes(tree).find((node) => node.type === "button" && text(node) === label);
const pending = (tree: any) => tree.props["data-pending-input"] === true;
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("volatile editor recovery", () => {
  for (const kind of ["lyric", "rhyme"] as const) {
    it(`${kind}: copies current fields after a real metadata save failure without changing normal body copy`, async () => {
      const fixture = editorFixture(kind);
      fixture.render(); await Promise.resolve();
      let tree = fixture.render();
      titleInput(tree).props.onChange({ target: { value: "저장 실패한 새 제목" } });
      if (kind === "lyric") nodes(tree).find((node) => node.type?.name === "LyricMetadataControls").props.onMemo("아직 저장 못한 메모\n둘째 줄");
      await vi.advanceTimersByTimeAsync(900);
      expect(fixture.failedRead.mock.calls.some(([url]) => String(url).endsWith(`/api/${kind === "lyric" ? "lyrics" : "rhymes"}/fixture-document`))).toBe(true);
      tree = fixture.render();
      expect(nodes(tree).some((node) => node.props?.className === "save-indicator is-error")).toBe(true);
      button(tree, "현재 입력 복사").props.onClick();
      const recovery = fixture.copy.mock.calls.at(-1)![0];
      expect(recovery).toContain("저장 실패한 새 제목");
      expect(JSON.parse(recovery)).toEqual(kind === "lyric"
        ? { title: "저장 실패한 새 제목", body: fixture.body, memo: "아직 저장 못한 메모\n둘째 줄" }
        : { title: "저장 실패한 새 제목", body: fixture.body });
      const normal = kind === "lyric" ? nodes(tree).find((node) => node.props?.["aria-label"] === "전체 복사") : button(tree, "전체 복사");
      normal.props.onClick();
      expect(fixture.copy.mock.calls.at(-1)![0]).toBe(kind === "lyric" ? "[Verse]\n현재 원문 👩‍🎤\n남겨야 할 작업 지시" : fixture.body);
    });

    it(`${kind}: protects composition and unsaved title while allowing a durable offline body`, async () => {
      const fixture = editorFixture(kind);
      fixture.render(); await Promise.resolve();
      fixture.syncState("offline");
      let tree = fixture.render(); expect(pending(tree)).toBe(false);
      fixture.editorOptions.onCompositionStart();
      expect(pending(fixture.render())).toBe(true);
      fixture.editorOptions.onCompositionEnd();
      tree = fixture.render(); expect(pending(tree)).toBe(false);
      titleInput(tree).props.onCompositionStart();
      expect(pending(fixture.render())).toBe(true);
      titleInput(tree).props.onCompositionEnd();
      tree = fixture.render(); expect(pending(tree)).toBe(false);
      if (kind === "lyric") {
        const metadata = nodes(tree).find((node) => node.type?.name === "LyricMetadataControls");
        metadata.props.onMemoCompositionStart(); expect(pending(fixture.render())).toBe(true);
        metadata.props.onMemoCompositionEnd(); expect(pending(fixture.render())).toBe(false);
      }
      titleInput(tree).props.onChange({ target: { value: "메모리에만 남은 제목" } });
      expect(pending(fixture.render())).toBe(true);
      await vi.advanceTimersByTimeAsync(900);
      expect(pending(fixture.render())).toBe(true);
    });
  }

  it("prompt: protects title/sentence composition and local write failures, but not durable offline drafts", async () => {
    const fixture = editorFixture("prompt");
    fixture.render(); await Promise.resolve(); fixture.syncState("offline");
    let tree = fixture.render(); expect(pending(tree)).toBe(false);
    titleInput(tree).props.onCompositionStart();
    expect(pending(fixture.render())).toBe(true);
    titleInput(tree).props.onChange({ target: { value: "조합 중인 제목" } });
    titleInput(fixture.render()).props.onCompositionEnd();
    expect(pending(fixture.render())).toBe(false);
    tree = fixture.render();
    const sentence = nodes(tree).find((node) => node.props?.id === "prompt-sentence");
    sentence.props.onCompositionStart();
    sentence.props.onChange({ target: { value: "조합 중인 문장  원문\n둘째 줄" } });
    expect(pending(fixture.render())).toBe(true);
    sentence.props.onCompositionEnd();
    fixture.syncState("saving-local"); expect(pending(fixture.render())).toBe(true);
    fixture.syncState("error"); tree = fixture.render(); expect(pending(tree)).toBe(true);
    button(tree, "현재 입력 복사").props.onClick();
    expect(JSON.parse(fixture.copy.mock.calls.at(-1)![0])).toMatchObject({ title: "조합 중인 제목", body: "조합 중인 문장  원문\n둘째 줄" });
    fixture.feedback.manual = { text: fixture.copy.mock.calls.at(-1)![0], target: fixture.copy.mock.calls.at(-1)![1] };
    // Recovery clipboard fallback must not record a normal prompt use.
    const fallback = nodes(fixture.render()).find((node) => node.props?.state === fixture.feedback);
    expect(fallback.props.onManualComplete).toBeUndefined();
    fixture.syncState("offline"); expect(pending(fixture.render())).toBe(false);
  });
});

describe("historical editor defects", () => {
  it.each([["lyric", "title"], ["lyric", "memo"], ["rhyme", "title"]] as const)(
    "%s %s: keeps metadata preedit local through commands, pagehide and disposal until actual compositionend",
    async (kind, field) => {
      const fixture = editorFixture(kind);
      let server = { ...fixture.initial };
      const metadataUrl = `/api/${kind === "lyric" ? "lyrics" : "rhymes"}/fixture-document`;
      fixture.failedRead.mockImplementation(async (url, options) => {
        if (url === metadataUrl && options?.method === "PATCH") server = { ...server, ...JSON.parse(options.body), rowVersion: server.rowVersion + 1 };
        return { ok: true, json: async () => ({ [kind]: server, items: [] }) };
      });
      fixture.sync.flush.mockResolvedValue(true); fixture.sync.checkpoint.mockResolvedValue(true);
      const tree = fixture.render(); await Promise.resolve();
      const input = field === "memo"
        ? nodes(tree).find((node) => node.type?.name === "LyricMetadataControls").props
        : titleInput(tree).props;
      const change = (value: string) => field === "memo" ? input.onMemo(value) : input.onChange({ target: { value } });
      const start = () => field === "memo" ? input.onMemoCompositionStart() : input.onCompositionStart();
      const end = () => field === "memo" ? input.onMemoCompositionEnd() : input.onCompositionEnd();
      const requests = () => fixture.failedRead.mock.calls.filter(([url]) => url === metadataUrl);
      change("조합 직전 입력");
      start();
      await vi.advanceTimersByTimeAsync(1_000); // compositionstart cancels the preceding debounce
      expect(requests()).toHaveLength(0);
      change("ㅎ");
      await vi.advanceTimersByTimeAsync(6_000);
      await button(fixture.render(), kind === "lyric" ? "복제" : "← 라임 노트").props.onClick();
      await vi.advanceTimersByTimeAsync(0);
      expect(requests()).toHaveLength(0);
      expect(fixture.sync.checkpoint).not.toHaveBeenCalled();
      expect(fixture.router.push).not.toHaveBeenCalled();
      fixture.window.dispatchEvent(new Event("blur"));
      fixture.window.dispatchEvent(new Event("pagehide"));
      await vi.advanceTimersByTimeAsync(0);
      expect(requests()).toHaveLength(0);
      expect(pending(fixture.render())).toBe(true);
      change("한글 확정 입력"); end();
      await vi.advanceTimersByTimeAsync(900);
      expect(server[field]).toBe("한글 확정 입력");
      expect(fixture.storage.length).toBe(0);
      const acknowledgedRequests = requests().length;
      start(); change("ㅁ"); fixture.unmount();
      await vi.advanceTimersByTimeAsync(6_000);
      expect(requests()).toHaveLength(acknowledgedRequests);
      const saved = JSON.parse(fixture.storage.getItem(fixture.storage.key(0)!)!);
      expect(saved[field]).toBe("ㅁ");
    }
  );

  for (const kind of ["lyric", "rhyme"] as const) {
    it(`${kind}: persists metadata synchronously and offers explicit restoration after reopening`, async () => {
      const first = editorFixture(kind);
      let tree = first.render();
      titleInput(tree).props.onChange({ target: { value: "종료 전 제목" } });
      if (kind === "lyric") nodes(tree).find((node) => node.type?.name === "LyricMetadataControls").props.onMemo("  미전송 메모\n[Extend : 3:00]  ");
      expect(first.storage.length).toBeGreaterThan(0);
      await vi.advanceTimersByTimeAsync(900); // failed save must retain the journal
      const reopened = editorFixture(kind, first.storage);
      reopened.render(); await Promise.resolve(); tree = reopened.render();
      expect(titleInput(tree).props.value).toBe("저장된 제목");
      expect(text(tree)).toContain("저장되지 않은");
      button(tree, "이 초안 복원").props.onClick();
      tree = reopened.render();
      expect(titleInput(tree).props.value).toBe("종료 전 제목");
      if (kind === "lyric") expect(nodes(tree).find((node) => node.type?.name === "LyricMetadataControls").props.memo).toBe("  미전송 메모\n[Extend : 3:00]  ");
      expect(pending(tree)).toBe(true);
    });

    it(`${kind}: refuses a stale restore action after fresher input and keeps it available for copying`, () => {
      const first = editorFixture(kind);
      titleInput(first.render()).props.onChange({ target: { value: "old unsent title" } });
      const reopened = editorFixture(kind, first.storage);
      reopened.render();
      const tree = reopened.render();
      const restore = button(tree, "이 초안 복원");
      titleInput(tree).props.onChange({ target: { value: "newer local title" } });
      restore.props.onClick();
      expect(titleInput(reopened.render()).props.value).toBe("newer local title");
      expect(button(reopened.render(), "이 초안 복원").props.disabled).toBe(true);
      button(reopened.render(), "이 초안 복사").props.onClick();
      expect(JSON.parse(reopened.copy.mock.calls.at(-1)![0]).title).toBe("old unsent title");
    });

    it(`${kind}: an older metadata ACK does not erase later input, and the final ACK clears its revision`, async () => {
      const fixture = editorFixture(kind);
      const reply = Promise.withResolvers<void>();
      let server = { ...fixture.initial };
      let writes = 0;
      fixture.failedRead.mockImplementation(async (_url, options) => {
        if (options?.method === "PATCH") {
          const submitted = JSON.parse(options.body);
          if (++writes === 1) await reply.promise;
          server = { ...server, ...submitted, rowVersion: server.rowVersion + 1 };
        }
        return { ok: true, json: async () => ({ [kind]: server, items: [] }) };
      });
      titleInput(fixture.render()).props.onChange({ target: { value: "submitted title" } });
      await vi.advanceTimersByTimeAsync(900);
      expect(writes).toBe(1);
      titleInput(fixture.render()).props.onChange({ target: { value: "newer title" } });
      reply.resolve(); await vi.advanceTimersByTimeAsync(0);
      const stored = Array.from({ length: fixture.storage.length }, (_, i) => JSON.parse(fixture.storage.getItem(fixture.storage.key(i)!)!));
      expect(stored).toMatchObject([{ title: "newer title" }]);
      expect(titleInput(fixture.render()).props.value).toBe("newer title");
      await vi.advanceTimersByTimeAsync(900);
      expect(server.title).toBe("newer title");
      expect(fixture.storage.length).toBe(0);
      expect(pending(fixture.render())).toBe(false);
    });
  }

  it("takes the duplicate lock before awaiting checkpoint and keeps the request ID after a lost reply", async () => {
    const fixture = editorFixture("lyric");
    fixture.sync.flush.mockResolvedValue(true);
    const checkpoint = Promise.withResolvers<boolean>();
    fixture.sync.checkpoint.mockReturnValue(checkpoint.promise);
    fixture.render(); await Promise.resolve();
    const tree = fixture.render();
    const first = button(tree, "복제").props.onClick();
    const second = button(tree, "복제").props.onClick();
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(fixture.sync.checkpoint).toHaveBeenCalledTimes(1);
      expect(button(fixture.render(), "복제").props.disabled).toBe(true);
    } finally { checkpoint.resolve(true); await Promise.all([first, second]); }
    const requests = () => fixture.failedRead.mock.calls.filter(([url]) => url.endsWith("/duplicate"));
    expect(requests()).toHaveLength(1);
    fixture.failedRead.mockImplementation(async () => ({ ok: true, json: async () => ({ lyric: { id: "copy" } }) }));
    await button(fixture.render(), "복제").props.onClick();
    expect(requests()).toHaveLength(2);
    expect(JSON.parse(requests()[0]![1].body).requestId).toBe(JSON.parse(requests()[1]![1].body).requestId);
    expect(fixture.router.push).toHaveBeenCalledTimes(1);
  });

  it("keeps an over-limit title intact and reports the Unicode code-point limit before saving", async () => {
    const fixture = editorFixture("lyric");
    let tree = fixture.render();
    const title = "🎵".repeat(201);
    titleInput(tree).props.onChange({ target: { value: title } });
    tree = fixture.render();
    expect(titleInput(tree).props.value).toBe(title);
    expect(titleInput(tree).props["aria-invalid"]).toBe(true);
    expect(text(tree)).toContain("제목은 200자 이하로 입력해 주세요.");
    await vi.advanceTimersByTimeAsync(900);
    expect(fixture.failedRead.mock.calls.filter(([url]) => url.includes("/api/lyrics/"))).toHaveLength(0);
    titleInput(fixture.render()).props.onChange({ target: { value: "🎵".repeat(200) } });
    expect(titleInput(fixture.render()).props["aria-invalid"]).toBe(false);
    await vi.advanceTimersByTimeAsync(900);
    expect(fixture.failedRead.mock.calls.filter(([url]) => url.includes("/api/lyrics/"))).toHaveLength(1);
  });

  it("cancels duplication if fresh metadata arrives during the awaited checkpoint", async () => {
    const fixture = editorFixture("lyric");
    const checkpoint = Promise.withResolvers<boolean>();
    fixture.sync.flush.mockResolvedValue(true);
    fixture.sync.checkpoint.mockReturnValue(checkpoint.promise);
    fixture.render(); await Promise.resolve();
    const operation = button(fixture.render(), "복제").props.onClick();
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.sync.checkpoint).toHaveBeenCalledTimes(1);
    titleInput(fixture.render()).props.onChange({ target: { value: "checkpoint 중 새 제목" } });
    checkpoint.resolve(true); await operation;
    expect(fixture.failedRead.mock.calls.filter(([url]) => url.endsWith("/duplicate"))).toHaveLength(0);
    expect(fixture.router.push).not.toHaveBeenCalled();
    expect(button(fixture.render(), "복제").props.disabled).toBe(false);
    expect(titleInput(fixture.render()).props.value).toBe("checkpoint 중 새 제목");
  });
});
