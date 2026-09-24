import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

function fixture() {
  const slots: unknown[] = [];
  let cursor = 0;
  let effects: Array<() => void> = [];
  const requests: Array<{ url: URL; resolve: (response: unknown) => void }> = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: unknown) => { slots[index] = typeof value === "function" ? (value as (previous: unknown) => unknown)(slots[index]) : value; }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect: () => (() => void) | void, deps: unknown[]) {
      const index = cursor++;
      const previous = slots[index] as { deps: unknown[]; cleanup?: () => void } | undefined;
      if (previous && deps.every((value, position) => Object.is(value, previous.deps[position]))) return;
      effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
    }
  };
  const module = { exports: {} as { SongLinkManager: (props: unknown) => unknown } };
  const source = readFileSync(new URL("../../apps/web/src/components/song-link-manager.tsx", import.meta.url), "utf8");
  const window = { setTimeout: (run: () => void) => { timers.set(++timerId, run); return timerId; }, clearTimeout: (id: number) => { timers.delete(id); } };
  vm.runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module, exports: module.exports,
    require: (name: string) => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : { DialogFocusBoundary: () => null },
    window, URLSearchParams, AbortController,
    fetch: (url: string) => new Promise((resolve) => requests.push({ url: new URL(url, "https://lyrics.example"), resolve }))
  });
  let kind = "rhyme_note";
  return {
    requests,
    render() {
      cursor = 0;
      effects = [];
      const tree = module.exports.SongLinkManager({ songId: "song", songTitle: "Song", kind, onKindChange: (next: string) => { kind = next; }, onClose() {}, onChanged() {} });
      for (const effect of effects) effect();
      return tree;
    },
    debounce() { for (const [id, run] of timers) { timers.delete(id); run(); } }
  };
}

function nodes(tree: any): any[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

function page(id: string, nextCursor: string | null = "next") {
  return { items: [{ id, type: "rhyme_note", title: id, preview: "", isLinked: false, updatedAt: "2026-09-24T00:00:00Z" }], totalCount: 2, nextCursor };
}

async function respond(request: { resolve: (response: unknown) => void }, result: unknown, ok = true) {
  request.resolve({ ok, json: async () => result });
  for (let index = 0; index < 12; index++) await Promise.resolve();
}

describe("song link candidate pagination", () => {
  it("discards an old page while a new search is still debouncing", async () => {
    const subject = fixture();
    subject.render();
    await respond(subject.requests[0]!, page("old-first"));
    let tree = subject.render();
    nodes(tree).find((node) => node.props?.className === "song-link-more").props.onClick();
    const obsolete = subject.requests.at(-1)!;
    nodes(tree).find((node) => node.type === "input" && node.props?.placeholder).props.onChange({ target: { value: "new" } });
    tree = subject.render();
    expect(nodes(tree).find((node) => node.props?.className === "song-link-more").props.disabled).toBe(true);
    await respond(obsolete, page("obsolete"));
    expect(nodes(subject.render()).some((node) => node.type === "strong" && node.props.children === "obsolete")).toBe(false);
    subject.debounce();
    subject.render();
    expect(subject.requests.at(-1)!.url.searchParams.get("search")).toBe("new");
    await respond(subject.requests.at(-1)!, page("new-first", null));
    expect(nodes(subject.render()).some((node) => node.type === "strong" && node.props.children === "new-first")).toBe(true);
  });

  it("does not append an obsolete page after switching resource kind", async () => {
    const subject = fixture();
    subject.render();
    await respond(subject.requests[0]!, page("old-first"));
    let tree = subject.render();
    nodes(tree).find((node) => node.props?.className === "song-link-more").props.onClick();
    const obsolete = subject.requests.at(-1)!;
    nodes(tree).find((node) => node.props?.role === "tab" && node.props?.children === "프롬프트").props.onClick();
    subject.render();
    const fresh = subject.requests.at(-1)!;
    expect(fresh.url.searchParams.get("type")).toBe("prompt");
    await respond(fresh, page("new-first", null));
    await respond(obsolete, page("obsolete", "bad-cursor"));
    tree = subject.render();
    const titles = nodes(tree).filter((node) => node.type === "strong").map((node) => node.props.children);
    expect(titles).toContain("new-first");
    expect(titles).not.toContain("obsolete");
    expect(nodes(tree).some((node) => node.props?.className === "song-link-more")).toBe(false);
  });

  it("drops an old page and error after a filter switch without clearing the new pagination", async () => {
    const subject = fixture();
    subject.render();
    await respond(subject.requests[0]!, page("old-first"));
    let tree = subject.render();
    nodes(tree).find((node) => node.props?.className === "song-link-more").props.onClick();
    const obsolete = subject.requests.at(-1)!;
    nodes(tree).find((node) => node.props?.["aria-pressed"] === false && node.props?.children === "연결됨").props.onClick();
    subject.render();
    const fresh = subject.requests.at(-1)!;
    expect(fresh.url.searchParams.get("state")).toBe("linked");
    await respond(fresh, page("new-first"));
    tree = subject.render();
    nodes(tree).find((node) => node.props?.className === "song-link-more").props.onClick();
    const current = subject.requests.at(-1)!;
    await respond(obsolete, {}, false);
    tree = subject.render();
    expect(nodes(tree).some((node) => node.props?.role === "alert")).toBe(false);
    expect(nodes(tree).find((node) => node.props?.className === "song-link-more").props.disabled).toBe(true);
    await respond(current, page("new-more", null));
    const titles = nodes(subject.render()).filter((node) => node.type === "strong").map((node) => node.props.children);
    expect(titles).toContain("new-first");
    expect(titles).toContain("new-more");
    expect(titles).not.toContain("old-first");
  });
});
