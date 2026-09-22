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

// Run the real editor handlers, JSX, save controller and metadata saver. Only
// React/CodeMirror/browser-sync/clipboard boundaries are isolated; no DB or server.
function editorFixture(kind: "lyric" | "rhyme" | "prompt") {
  vi.useFakeTimers();
  const failedRead = vi.fn(async (_url: string) => ({ ok: false, status: 503, json: async () => ({}) }));
  vi.stubGlobal("fetch", failedRead);
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
  const sync = { setComposing() {}, setTitle() {}, setSentenceText() {}, leave() {}, flush: async () => false,
    checkpoint: async () => false, destroy: async () => undefined, retry() {} };
  const editor = { value: body, focus() {}, setEditable() {}, finishComposition() {}, destroy() {},
    selection: { from: 0, to: 0, head: 0, anchor: 0 }, songForm: { sections: [] }, scrollTop: 0 };
  const copy = vi.fn(async (_text: string, _target: string) => "copied");
  const feedback = { copyText: copy, manual: null as null | { text: string; target: string } };
  const dependencies: Record<string, any> = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/navigation": { useRouter: () => ({ push() {}, replace() {} }) },
    "@lyricscloud/domain": domain,
    "@lyricscloud/editor": { SerializedSaveController, parseSongForm, DEFAULT_SONG_FORM_MARKERS: [],
      BufferedPositionSaver: class { change() {} flush() { return Promise.resolve(); } dispose() {} },
      createCodeMirrorTextEditor: (options: any) => { editorOptions = options; return editor; },
      ...Object.fromEntries(["createBrowserLyricSync", "createBrowserRhymeSync", "createBrowserPromptSync"].map((name) => [name, async (options: any) => {
        syncOptions = options; options.onStateChange("ready"); options.onEditableChange(true); return sync;
      }])) },
    "../lib/account-cache.js": { registerLogoutSave: () => () => {} },
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
    URLSearchParams, AbortController, setTimeout, clearTimeout
  });
  const display = { font: "system", fontSize: 18, lineHeight: 1.8, letterSpacing: 0, focusModeDefault: false };
  const props = { ownerId: "fixture-owner", initialLyric: initial, initialRhyme: initial, initialPrompt: initial,
    songTitle: "합성 곡", songLyrics: [initial], dashboardHref: "/songs/fixture", returnTo: "/songs", initialFind: "", initialPosition: null,
    initialDisplaySettings: { account: display, effective: display, override: null }, displaySettings: display };
  return {
    copy, feedback, failedRead, body, editor,
    get editorOptions() { return editorOptions; },
    syncState(state: string) { syncOptions.onStateChange(state); },
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
