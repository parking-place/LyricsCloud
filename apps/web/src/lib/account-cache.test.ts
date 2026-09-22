import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAccountCache, clearOtherAccountCaches, guardWorkspaceNavigation } from "./account-cache.js";
import { createMetadataDraftStore } from "./metadata-draft.js";

vi.mock("@lyricscloud/editor", () => ({ clearOtherOwnerLocalDrafts: vi.fn(), clearOwnerLocalDrafts: vi.fn(), hasOwnerPendingDrafts: vi.fn(async () => false) }));

function storage(initial: Record<string, string>): Storage {
  const items = new Map(Object.entries(initial));
  return { get length() { return items.size; }, key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null, setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); }, clear: () => items.clear() };
}

afterEach(() => vi.unstubAllGlobals());

describe("account draft cleanup", () => {
  it("protects a closed editor's metadata even when no body draft or mounted input is pending", async () => {
    const localStorage = storage({});
    const draft = createMetadataDraftStore("owner", "lyric", "doc", localStorage);
    const revision = draft.write({ title: "unsent title", memo: "unsent memo" });
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("document", { querySelector: () => null });
    expect(await guardWorkspaceNavigation("owner", false)).toBe(false);
    expect(await guardWorkspaceNavigation("other", false)).toBe(true);
    draft.acknowledge(revision);
    expect(await guardWorkspaceNavigation("owner", false)).toBe(true);
  });
  it.each(["logout", "switch"])("removes legacy Suno session drafts on %s without clearing unrelated storage", async (action) => {
    const localStorage = storage({ "lc:owner:metadata:lyric:document:revision": "owned", "lc:other:metadata:lyric:document:revision": "other", theme: "dark" });
    const sessionStorage = storage({ "lyricscloud:suno-link-draft:old-document": "legacy", "lc:owner:suno-link-draft:document": "owned",
      "lc:other:suno-link-draft:document": "same-owner pending", unrelated: "keep" });
    vi.stubGlobal("window", { localStorage, sessionStorage });
    if (action === "logout") await clearAccountCache("owner");
    else await clearOtherAccountCaches("other");
    expect(sessionStorage.getItem("lyricscloud:suno-link-draft:old-document")).toBeNull();
    expect(sessionStorage.getItem("lc:owner:suno-link-draft:document")).toBeNull();
    // The switch branch mounts the shell as "other", so its scoped draft survives.
    expect(sessionStorage.getItem("lc:other:suno-link-draft:document")).toBe("same-owner pending");
    expect(localStorage.getItem("lc:owner:metadata:lyric:document:revision")).toBeNull();
    expect(localStorage.getItem("lc:other:metadata:lyric:document:revision")).toBe("other");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(sessionStorage.getItem("unrelated")).toBe("keep");
  });
});
