import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import * as domain from "../../packages/domain/src/index.js";
import { clearOtherAccountCaches } from "../../apps/web/src/lib/account-cache.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../packages/editor/src/index.ts", () => ({ clearOtherOwnerLocalDrafts: vi.fn(async () => {}) }));

// Execute the real components and shared order hook, with only React/browser/network
// boundaries replaced. Deferred replies exercise input and list races without a DB.
function fixture(file: string, name: string, props: any) {
  const slots: any[] = [];
  let cursor = 0;
  let effects: Array<() => void> = [];
  const requests: Array<{ url: string; method: string; body: any; resolve: (value: any) => void }> = [];
  const timers = new Map<number, { run: () => void; delay: number }>();
  const storage = new Map<string, string>();
  let timerId = 0;
  const navigations: string[] = [];
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
    useEffect(effect: () => any, deps: any[]) {
      const index = cursor++;
      const previous = slots[index];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
      effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
    }
  };
  const sessionStorage = { get length() { return storage.size; }, key: (index: number) => [...storage.keys()][index] ?? null,
    getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) };
  const window = {
    setTimeout: (run: () => void, delay: number) => { timers.set(++timerId, { run, delay }); return timerId; },
    clearTimeout: (id: number) => timers.delete(id), history: { replaceState() {} }, sessionStorage,
    addEventListener() {}, removeEventListener() {}, requestAnimationFrame: (run: () => void) => { run(); return 1; }, scrollTo() {}, scrollY: 0
  };
  const dependencies: Record<string, any> = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" }, "@lyricscloud/domain": domain,
    "next/navigation": { useRouter: () => ({ replace: (url: string) => navigations.push(url), refresh() {} }) },
    "./library-view-mode-selector.js": { useLibraryViewMode: () => ({ viewMode: "card" }) },
    "./copy-feedback.js": { useCopyFeedback: () => ({}) }, "./state-panel.js": {}, "../lib/dialog-focus.js": {}
  };
  function load(relative: string): any {
    if (dependencies[relative]) return dependencies[relative];
    const module = { exports: {} };
    const path = relative.startsWith("../lib/") ? relative.replace("../lib/", "lib/") : `components/${relative.replace(/^\.\//, "")}`;
    const extension = path.includes("components/") ? "tsx" : "ts";
    const source = readFileSync(new URL(`../../apps/web/src/${path.replace(/\.js$/, `.${extension}`)}`, import.meta.url), "utf8");
    vm.runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
      module, exports: module.exports, require: load, window, sessionStorage, crypto: { randomUUID }, URL, URLSearchParams, AbortController,
      document: { addEventListener() {}, removeEventListener() {} },
      requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame() {},
      fetch: (url: string, options: any = {}) => new Promise((resolve) => requests.push({ url, method: options.method ?? "GET", body: options.body ? JSON.parse(options.body) : null, resolve }))
    });
    dependencies[relative] = module.exports;
    return module.exports;
  }
  const component = load(`./${file}.js`)[name];
  return {
    requests, storage, sessionStorage, navigations,
    render() { cursor = 0; effects = []; const tree = component(props); for (const effect of effects) effect(); return tree; },
    debounce() { for (const [id, timer] of timers) if (timer.delay === 300) { timers.delete(id); timer.run(); } }
  };
}
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const text = (tree: any): string => tree == null ? "" : Array.isArray(tree) ? tree.map(text).join("") : typeof tree === "object" ? text(tree.props?.children) : String(tree);
const button = (tree: any, label: string) => nodes(tree).find((node) => node.type === "button" && text(node) === label);
const field = (tree: any, label: string) => {
  const group = nodes(tree).find((node) => node.type === "label" && text(node).startsWith(label));
  return nodes(group).find((node) => ["input", "textarea", "select"].includes(node.type));
};
const change = (node: any, value: string) => node.props.onChange({ target: { value } });
async function tick() { for (let i = 0; i < 15; i++) await Promise.resolve(); }
async function respond(request: { resolve: (value: any) => void }, data: any, status = 200) {
  request.resolve({ ok: status >= 200 && status < 300, status, json: async () => data });
  await tick();
}
const workspace = { songId: "song", rowVersion: 1, modelLabel: "custom-before", links: [] as any[] };

describe("R04 delayed Suno acknowledgements", () => {
  it("keeps a newer model name and admits only one immediate save command", async () => {
    const f = fixture("suno-workspace-panel", "SunoWorkspacePanel", { ownerId: "owner", songId: "song", initialWorkspace: workspace });
    change(field(f.render(), "사용자 지정 모델명"), "custom-submitted");
    const save = button(f.render(), "모델 저장"); save.props.onClick(); save.props.onClick();
    expect(f.requests).toHaveLength(1);
    change(field(f.render(), "사용자 지정 모델명"), "custom-still-writing"); f.render();
    await respond(f.requests[0]!, { workspace: { ...workspace, rowVersion: 2, modelLabel: "custom-submitted" } });
    expect(field(f.render(), "사용자 지정 모델명").props.value).toBe("custom-still-writing");
    button(f.render(), "모델 저장").props.onClick();
    expect(f.requests.at(-1)!.body.modelLabel).toBe("custom-still-writing");
  });

  it("retains later link text and continues the created link instead of creating it twice", async () => {
    const f = fixture("suno-workspace-panel", "SunoWorkspacePanel", { ownerId: "owner", songId: "song", initialWorkspace: workspace });
    const otherKey = "lc:other:suno-link-draft:song:create:new";
    const legacyKey = "lyricscloud:suno-link-draft:legacy-document:create:new";
    for (const key of [otherKey, legacyKey]) f.storage.set(key, JSON.stringify({ mode: "create", title: "다른 계정의 초안", note: "가져오면 안 되는 메모" }));
    async function resolveSession() {
      vi.stubGlobal("window", { sessionStorage: f.sessionStorage, localStorage: { length: 0 } });
      try { await clearOtherAccountCaches("owner"); } finally { vi.unstubAllGlobals(); }
    }
    button(f.render(), "첫 링크 추가").props.onClick();
    expect(field(f.render(), "메모").props.value).toBe("");
    change(field(f.render(), "Suno URL"), "https://suno.com/song/recovery-example");
    change(field(f.render(), "표시 제목"), "후렴 첫 안");
    change(field(f.render(), "메모"), "전송한 메모");
    button(f.render(), "링크 저장").props.onClick();
    change(field(f.render(), "메모"), "응답을 기다리며 쓴 다음 비교 메모"); f.render();
    await resolveSession(); // A delayed AppShell session must not erase this fresh draft.
    expect(JSON.parse(f.storage.get("lc:owner:suno-link-draft:song:create:new") ?? "null")).toMatchObject({ title: "후렴 첫 안", note: "응답을 기다리며 쓴 다음 비교 메모" });
    expect(f.storage.has(otherKey) || f.storage.has(legacyKey)).toBe(false);
    const link = { id: "link", url: "https://suno.com/song/recovery-example", title: "후렴 첫 안", note: "전송한 메모" };
    await respond(f.requests[0]!, { workspace: { ...workspace, rowVersion: 2, links: [link] } });
    expect(field(f.render(), "메모")?.props.value).toBe("응답을 기다리며 쓴 다음 비교 메모");
    expect([...f.storage.values()].some((value) => value.includes("응답을 기다리며 쓴 다음 비교 메모"))).toBe(true);
    button(f.render(), "링크 저장").props.onClick();
    expect(f.requests.at(-1)!.body).toMatchObject({ command: "update_link", linkId: "link", note: "응답을 기다리며 쓴 다음 비교 메모" });
    change(field(f.render(), "메모"), "수정 저장을 기다리며 더 쓴 메모"); f.render();
    await respond(f.requests.at(-1)!, { workspace: { ...workspace, rowVersion: 3, links: [{ ...link, note: "응답을 기다리며 쓴 다음 비교 메모" }] } });
    await resolveSession();
    expect(JSON.parse(f.storage.get("lc:owner:suno-link-draft:song:edit:link") ?? "null")).toMatchObject({ note: "수정 저장을 기다리며 더 쓴 메모" });
    button(f.render(), "닫기").props.onClick();
    button(f.render(), "수정").props.onClick();
    expect(field(f.render(), "메모").props.value).toBe("수정 저장을 기다리며 더 쓴 메모");
    button(f.render(), "링크 저장").props.onClick();
    await respond(f.requests.at(-1)!, { workspace: { ...workspace, rowVersion: 4, links: [{ ...link, note: "수정 저장을 기다리며 더 쓴 메모" }] } });
    expect(nodes(f.render()).some((node) => node.props.role === "dialog")).toBe(false);
  });
});

it("R05 keeps independent template drafts across both format round trips", async () => {
  const f = fixture("template-screen", "TemplateScreen", { initialQuery: { type: "prompt", source: "user", sort: "updated_desc" } });
  f.render(); await respond(f.requests[0]!, { items: [] });
  button(f.render(), "＋ 새 템플릿").props.onClick();
  change(field(f.render(), "템플릿 제목"), "새벽 노래");
  change(field(f.render(), "쉼표로 구분한"), "dream pop, 부드러운 보컬");
  field(f.render(), "문장형").props.onChange();
  change(field(f.render(), "프롬프트 문장"), "새벽 풍경을 부드럽게 노래해 주세요.");
  field(f.render(), "태그형").props.onChange();
  expect(field(f.render(), "쉼표로 구분한").props.value).toBe("dream pop, 부드러운 보컬");
  field(f.render(), "문장형").props.onChange();
  expect(field(f.render(), "프롬프트 문장").props.value).toBe("새벽 풍경을 부드럽게 노래해 주세요.");
  nodes(f.render()).find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  expect(f.requests.at(-1)!.body).toMatchObject({ promptMode: "sentence", promptText: "새벽 풍경을 부드럽게 노래해 주세요." });
  expect(nodes(f.render()).find((node) => node.type === "fieldset").props.disabled).toBe(true);
});

const row = (id: string, extra: any = {}) => ({ id, title: id, isPinned: false, isFavorite: false, pinOrder: null, updatedAt: "2026-09-22T00:00:00Z", ...extra });
const page = (...ids: string[]) => ({ items: ids.map((id) => row(id)), nextCursor: null, totalCount: ids.length, orderVersion: 1, filters: { tags: [], songs: [] } });
const cards = (tree: any) => nodes(tree).filter((node) => /^(Song|Rhyme|Prompt|Saved)Card$/.test(node.type?.name ?? ""));
const cardId = (card: any) => (card.props.song ?? card.props.note ?? card.props.prompt ?? card.props.item).id;
const listFixture = (kind: string) => fixture(`${kind}-list-screen`, `${kind[0]!.toUpperCase()}${kind.slice(1)}ListScreen`, {
  initialQuery: { search: "", status: "", work: "all", sort: "updated_desc", tag: "", song: "", favorite: false, recent: false }
});

for (const kind of ["song", "rhyme", "prompt"]) {
  it(`R12 ${kind}: accepts a move when displayed neighbours have reversed persisted ranks`, async () => {
    const f = listFixture(kind); f.render();
    // Recently updated display is the reverse of the already persisted manual order.
    const persisted = ["새벽", "아침", "저녁", "밤"];
    await respond(f.requests[0]!, page(...[...persisted].reverse()));
    cards(f.render())[0].props.onMove("next");
    const move = f.requests.at(-1)!.body;
    const without = persisted.filter((id) => id !== move.itemId);
    const before = move.beforeId === null ? -1 : without.indexOf(move.beforeId);
    const after = move.afterId === null ? -1 : without.indexOf(move.afterId);
    // This is the server rank contract, not the display array's neighbour order.
    expect(before >= 0 && after >= before, "the server must not reject reversed anchors").toBe(false);
    const at = before >= 0 ? before : after + 1;
    without.splice(at, 0, move.itemId);
    expect(without.indexOf("밤") + 1).toBe(without.indexOf("아침"));
    await respond(f.requests.at(-1)!, { orderVersion: 2 });
    f.render();
    expect(f.requests.at(-1)!.url).toContain("sort=manual");
  });

  it(`R13 ${kind}: a changed query invalidates an in-flight rollback and its retry`, async () => {
    const f = listFixture(kind); f.render(); await respond(f.requests[0]!, page("오래된 A", "오래된 B"));
    cards(f.render())[0].props.onMove("next"); const obsolete = f.requests.at(-1)!;
    change(nodes(f.render()).find((node) => node.type === "input" && node.props.type === "search"), "새 검색");
    f.render(); f.debounce(); f.render();
    await respond(f.requests.at(-1)!, page("새 검색 결과"));
    await respond(obsolete, {}, 503);
    expect(cards(f.render()).map(cardId)).toEqual(["새 검색 결과"]);
    expect(button(f.render(), "같은 이동 다시 시도")).toBeUndefined();
  });

  it(`R13 ${kind}: failed-query retry cannot replay an older failed move`, async () => {
    const f = listFixture(kind); f.render(); await respond(f.requests[0]!, page("원래 A", "원래 B"));
    cards(f.render())[0].props.onMove("next"); await respond(f.requests.at(-1)!, {}, 503);
    const oldRetry = button(f.render(), "같은 이동 다시 시도"); expect(oldRetry).toBeDefined();
    change(nodes(f.render()).find((node) => node.type === "input" && node.props.type === "search"), "다른 검색");
    f.render(); f.debounce(); f.render(); await respond(f.requests.at(-1)!, {}, 503);
    expect(button(f.render(), "같은 이동 다시 시도")).toBeUndefined();
    const count = f.requests.length; oldRetry.props.onClick();
    expect(f.requests).toHaveLength(count);
  });
}

describe("R16 failed saved-resource changes", () => {
  const saved = (id: string) => row(id, { type: "song", isFavorite: true });
  const favorites = () => fixture("favorites-screen", "FavoritesScreen", {
    initialItems: [saved("돌아올 곡"), saved("해제할 곡")], songs: [], query: { type: "all", scope: "favorites", status: "all" }
  });
  it("restores only the failed removal, leaving another successful removal intact", async () => {
    const f = favorites(); let card = cards(f.render())[0]; card.props.onToggle(card.props.item, "isFavorite"); await tick();
    const failed = f.requests.at(-1)!;
    card = cards(f.render())[0]; card.props.onToggle(card.props.item, "isFavorite"); await tick();
    await respond(f.requests.at(-1)!, { resource: { ...saved("해제할 곡"), isFavorite: false } });
    await respond(failed, {}, 503);
    expect(cards(f.render()).map(cardId)).toEqual(["돌아올 곡"]);
    expect(text(f.render())).toContain("복원");
  });
  it("restores a favorite without undoing a newer pin on the same row", async () => {
    const f = favorites(); const card = cards(f.render())[0];
    card.props.onToggle(card.props.item, "isFavorite"); await tick(); const failed = f.requests.at(-1)!;
    card.props.onToggle(card.props.item, "isPinned"); await tick();
    await respond(failed, {}, 503); await tick();
    const pin = f.requests.find((request) => request.url.endsWith("/pin"))!;
    await respond(pin, { resource: { ...saved("돌아올 곡"), isPinned: true, pinOrder: 0 } });
    expect(cards(f.render()).find((value) => cardId(value) === "돌아올 곡")?.props.item).toMatchObject({ isFavorite: true, isPinned: true });
  });
});

it("R17 reports acknowledged song fields and retries only unsaved changes", async () => {
  const song = { id: "song", title: "원래 제목", description: "", workNotes: "", status: "idea", color: null, isPinned: false, isFavorite: false };
  const f = fixture("song-form", "SongForm", { song, returnTo: "/songs" });
  change(nodes(f.render()).find((node) => node.props.name === "title"), "수정한 제목");
  button(f.render(), "파랑").props.onClick();
  const switches = nodes(f.render()).filter((node) => node.type === "input" && node.props.type === "checkbox");
  switches[0].props.onChange({ target: { checked: true } }); switches[1].props.onChange({ target: { checked: true } });
  const submit = () => nodes(f.render()).find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  void submit();
  await respond(f.requests.at(-1)!, { song: { ...song, title: "수정한 제목" } });
  await respond(f.requests.at(-1)!, {}); // color acknowledged
  await respond(f.requests.at(-1)!, {}, 503); // pin failed; favorite not sent yet
  const message = text(nodes(f.render()).find((node) => node.props.role === "alert"));
  expect(message).toContain("저장 완료: 기본 정보, 표시 색상");
  expect(message).toContain("미완료: 고정, 즐겨찾기");
  expect(f.navigations).toEqual([]);
  change(nodes(f.render()).find((node) => node.props.name === "workNotes"), "실패 뒤 덧붙인 메모");
  const beforeRetry = f.requests.length; void submit();
  await respond(f.requests.at(-1)!, { song: {} });
  await respond(f.requests.at(-1)!, {});
  await respond(f.requests.at(-1)!, {});
  expect(f.requests.slice(beforeRetry).map((request) => request.url)).toEqual(["/api/songs/song", "/api/songs/song/pin", "/api/songs/song/favorite"]);
  expect(f.requests[beforeRetry]!.body.workNotes).toBe("실패 뒤 덧붙인 메모");
  expect(f.navigations).toEqual(["/songs/song?returnTo=%2Fsongs"]);
});
