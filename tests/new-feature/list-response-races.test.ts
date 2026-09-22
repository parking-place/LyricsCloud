import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

// Isolate React hooks and network boundaries; run the actual screen handlers/JSX.
// No database, server, production build or browser process is needed here.
function screenFixture(kind: "song" | "rhyme" | "prompt" | "search", initialSearch = "old") {
  const slots: any[] = [];
  let cursor = 0;
  let effects: Array<() => void> = [];
  const timers = new Map<number, { run: () => void; delay: number }>();
  let timerId = 0;
  const requests: Array<{ url: URL; method: string; body: any; resolve: (response: any) => void }> = [];
  const jsx = (type: any, props: any) => ({ type, props });
  const react = {
    Fragment: "fragment",
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
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
  const router = { replace() {} };
  const order = { retryMove: null, movingId: null, draggedId: null };
  const dependencies: Record<string, any> = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/navigation": { useRouter: () => router },
    "@lyricscloud/domain": { SEARCH_RESOURCE_TYPES: ["song", "lyrics", "rhyme_note", "prompt"] },
    "./library-view-mode-selector.js": { useLibraryViewMode: () => ({ viewMode: "card" }) },
    "./copy-feedback.js": { useCopyFeedback: () => ({}) },
    "./library-order-controls.js": { useLibraryCardOrder: () => order },
    "../lib/library-group-positions.js": { buildPinnedGroupPositions: (items: any[]) => new Map(items.map((item, index) => [item.id, { position: index, groupSize: items.length }])) },
    "../lib/search-navigation.js": { buildSearchUrl: (query: string, type: string) => `/search?q=${query}&type=${type}`, buildSearchResultHref: (item: any) => `/resource/${item.id}` }
  };
  const module = { exports: {} as Record<string, (props: any) => any> };
  const file = kind === "search" ? "search-screen" : `${kind}-list-screen`;
  const source = readFileSync(new URL(`../../apps/web/src/components/${file}.tsx`, import.meta.url), "utf8");
  const window = {
    setTimeout: (run: () => void, delay: number) => { timers.set(++timerId, { run, delay }); return timerId; },
    clearTimeout: (id: number) => timers.delete(id), history: { replaceState() {} },
    location: { pathname: "/search", search: "" }, sessionStorage: { getItem: () => null },
    requestAnimationFrame: (run: () => void) => { run(); return 1; }, scrollTo() {}, scrollY: 0
  };
  vm.runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module, exports: module.exports, require: (name: string) => dependencies[name] ?? {}, window,
    URL, URLSearchParams, AbortController, AbortSignal, requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame() {},
    fetch: (url: string, options: any = {}) => new Promise((resolve) => requests.push({ url: new URL(url, "https://lyrics.example"), method: options.method ?? "GET", body: options.body ? JSON.parse(options.body) : null, resolve }))
  });
  const props = kind === "search" ? { ownerId: "owner", initialQuery: initialSearch, initialType: "all" }
    : { initialQuery: { search: initialSearch, status: "", work: "all", sort: "updated_desc", tag: "", song: "", favorite: false, recent: false } };
  const component = module.exports[kind === "search" ? "SearchScreen" : `${kind[0]!.toUpperCase()}${kind.slice(1)}ListScreen`]!;
  return {
    requests,
    render() { cursor = 0; effects = []; const tree = component(props); for (const effect of effects) effect(); return tree; },
    debounce() { for (const [id, timer] of timers) if (timer.delay === 300) { timers.delete(id); timer.run(); } }
  };
}
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const button = (tree: any) => nodes(tree).find((node) => node.type === "button" && /(^| )load-more$|^search-more$/.test(node.props.className ?? ""));
const cards = (tree: any) => nodes(tree).filter((node) => /^(Song|Rhyme|Prompt)Card$/.test(node.type?.name ?? "") || node.props.className === "search-result-card");
const input = (tree: any) => nodes(tree).find((node) => node.type === "input" && node.props.type === "search");
const text = (tree: any): string => tree == null ? "" : Array.isArray(tree) ? tree.map(text).join("") : typeof tree === "object" ? text(tree.props?.children) : String(tree);
const row = (id: string, type = "song") => ({ id, type, title: id, isPinned: false, isFavorite: false, pinOrder: null, updatedAt: "2026-09-22T00:00:00Z", linkedSongIds: [], preview: id, matchField: "title" });
const page = (id: string, nextCursor: string | null = "next") => ({ items: [row(id)], nextCursor, totalCount: 40, orderVersion: 1, filters: { tags: [], songs: [] } });
async function respond(request: { resolve: (value: any) => void }, data: any, ok = true) {
  request.resolve({ ok, json: async () => data });
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

for (const kind of ["song", "rhyme", "prompt", "search"] as const) {
  describe(`${kind} pagination generations`, () => {
    it("ignores obsolete pages during debounce and preserves a newer load-more state", async () => {
      const fixture = screenFixture(kind);
      fixture.render(); await respond(fixture.requests[0]!, page("old-first"));
      let tree = fixture.render(); button(tree).props.onClick();
      const obsolete = fixture.requests.at(-1)!;
      input(tree).props.onChange({ target: { value: "new" } });
      fixture.render();
      await respond(obsolete, page("obsolete"));
      expect(cards(fixture.render()).some((card) => card.props.href === "/resource/obsolete" || card.props.song?.id === "obsolete" || card.props.note?.id === "obsolete" || card.props.prompt?.id === "obsolete")).toBe(false);
      fixture.debounce(); fixture.render(); await respond(fixture.requests.at(-1)!, page("new-first"));
      tree = fixture.render(); expect(button(tree).props.disabled).toBe(false);
      button(tree).props.onClick(); const newMore = fixture.requests.at(-1)!;
      expect(button(fixture.render()).props.disabled).toBe(true);
      await respond(newMore, page("new-more", null));
      expect(cards(fixture.render())).toHaveLength(2);
    });

    it("does not surface old errors or clear a newer pending pagination request", async () => {
      const fixture = screenFixture(kind);
      fixture.render(); await respond(fixture.requests[0]!, page("old-first"));
      let tree = fixture.render(); button(tree).props.onClick(); const obsolete = fixture.requests.at(-1)!;
      input(tree).props.onChange({ target: { value: "new" } }); fixture.render(); fixture.debounce(); fixture.render();
      await respond(fixture.requests.at(-1)!, page("new-first"));
      tree = fixture.render(); expect(button(tree).props.disabled).toBe(false);
      button(tree).props.onClick(); const current = fixture.requests.at(-1)!;
      await respond(obsolete, {}, false);
      tree = fixture.render(); expect(nodes(tree).some((node) => node.props.role === "alert")).toBe(false);
      expect(button(tree).props.disabled).toBe(true);
      await respond(current, page("new-more", null));
      expect(cards(fixture.render())).toHaveLength(2);
    });

    it("reloads safely when input returns to the applied query before debounce", async () => {
      const fixture = screenFixture(kind);
      fixture.render(); await respond(fixture.requests[0]!, page("old-first"));
      input(fixture.render()).props.onChange({ target: { value: "temporary" } });
      input(fixture.render()).props.onChange({ target: { value: "old" } });
      fixture.render();
      const latest = fixture.requests.at(-1)!;
      expect(latest.url.searchParams.get(kind === "search" ? "q" : "search")).toBe("old");
      await respond(latest, page("current"));
      expect(button(fixture.render()).props.disabled).toBe(false);
    });
  });
}

describe("song metadata", () => {
  it("merges sibling changes and rolls back only the failed field", async () => {
    const fixture = screenFixture("song"); fixture.render(); await respond(fixture.requests[0]!, page("song"));
    let card = cards(fixture.render())[0]; card.props.onToggle(card.props.song, "isFavorite"); const favorite = fixture.requests.at(-1)!;
    card = cards(fixture.render())[0]; card.props.onToggle(card.props.song, "isPinned"); const pin = fixture.requests.at(-1)!;
    await respond(pin, { song: { ...row("song"), isPinned: true, pinOrder: 0 } });
    expect(cards(fixture.render())[0].props.song.isFavorite).toBe(true);
    await respond(favorite, {}, false);
    expect(cards(fixture.render())[0].props.song).toMatchObject({ isFavorite: false, isPinned: true, pinOrder: 0 });
  });

  it("queues rapid same-field reversals until the first acknowledgement", async () => {
    const fixture = screenFixture("song"); fixture.render(); await respond(fixture.requests[0]!, page("song"));
    const card = cards(fixture.render())[0];
    card.props.onToggle(card.props.song, "isFavorite"); const first = fixture.requests.at(-1)!;
    card.props.onToggle(card.props.song, "isFavorite");
    expect(fixture.requests.filter((request) => request.method === "PUT")).toHaveLength(1);
    await respond(first, { song: { ...row("song"), isFavorite: true } });
    expect(fixture.requests.at(-1)!.body).toEqual({ value: false });
    await respond(fixture.requests.at(-1)!, { song: row("song") });
    expect(cards(fixture.render())[0].props.song.isFavorite).toBe(false);
  });
});

describe("search interaction ordering", () => {
  it("follows displayed group order when API relevance ranks interleave types", async () => {
    const fixture = screenFixture("search"); fixture.render();
    await respond(fixture.requests[0]!, { items: [row("prompt", "prompt"), row("lyrics", "lyrics"), row("song"), row("rhyme", "rhyme_note")], nextCursor: null });
    const tree = fixture.render(); const links = cards(tree); const focused: string[] = [];
    for (const link of links) link.props.ref({ focus: () => focused.push(link.props.href) });
    const event = { key: "ArrowDown", nativeEvent: {}, preventDefault() {}, isDefaultPrevented: () => false };
    input(tree).props.onKeyDown(event);
    for (const link of links.slice(0, -1)) link.props.onKeyDown(event);
    expect(focused).toEqual(["/resource/song", "/resource/lyrics", "/resource/rhyme", "/resource/prompt"]);
  });

  it("restores only a failed recent-search deletion", async () => {
    const fixture = screenFixture("search", ""); fixture.render();
    const recent = (id: string) => ({ id, query: id, type: "all", searchedAt: "2026-09-22T00:00:00Z" });
    await respond(fixture.requests[0]!, { items: [recent("a"), recent("b"), recent("c")] });
    const start = () => nodes(fixture.render()).find((node) => node.type?.name === "SearchStart");
    start().props.onRemove("a"); const failed = fixture.requests.at(-1)!;
    start().props.onRemove("b"); await respond(fixture.requests.at(-1)!, {});
    await respond(failed, {}, false);
    expect(start().props.recent.map((item: any) => item.id).sort()).toEqual(["a", "c"]);
  });

  it("keeps clear-all separate from individual deletes and invalidates an older recent-history refresh", async () => {
    const fixture = screenFixture("search", ""); fixture.render();
    const recent = (id: string) => ({ id, query: id, type: "all", searchedAt: "2026-09-22T00:00:00Z" });
    await respond(fixture.requests[0]!, { items: [recent("a"), recent("b")] });
    const start = () => nodes(fixture.render()).find((node) => node.type?.name === "SearchStart");
    start().props.onRetry(); fixture.render(); const refresh = fixture.requests.at(-1)!;
    start().props.onRemove("a"); const remove = fixture.requests.at(-1)!;
    expect(start().props.deleting).toBe(true);
    start().props.onClear(); expect(fixture.requests.at(-1)).toBe(remove);
    await respond(remove, {});
    await respond(refresh, { items: [recent("a"), recent("b")] });
    expect(start().props.recent.map((item: any) => item.id)).toEqual(["b"]);
    start().props.onClear(); const clear = fixture.requests.at(-1)!;
    expect(start().props.clearing).toBe(true);
    start().props.onRemove("b"); expect(fixture.requests.at(-1)).toBe(clear);
    await respond(clear, {}, false);
    expect(start().props.recent.map((item: any) => item.id)).toEqual(["b"]);
    expect(start().props.clearing).toBe(false);
  });
});
