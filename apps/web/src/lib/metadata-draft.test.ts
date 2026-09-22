import { describe, expect, it, vi } from "vitest";
import { createMetadataDraftStore, hasOwnerMetadataDrafts, readOwnerMetadataDrafts } from "./metadata-draft.js";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return { get length() { return items.size; }, key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null, setItem: vi.fn((key, value) => { items.set(key, value); }),
    removeItem: (key) => { items.delete(key); }, clear: () => items.clear() };
}

describe("durable metadata revisions", () => {
  it("a late ACK preserves newer input and another tab's independent revision", () => {
    const storage = memoryStorage();
    const first = createMetadataDraftStore("owner", "lyric", "document", storage);
    const second = createMetadataDraftStore("owner", "lyric", "document", storage);
    const submitted = first.write({ title: "submitted", memo: "first memo" });
    const newer = first.write({ title: "newer", memo: "  raw\n[Extend : 3:00]  " });
    const sibling = second.write({ title: "other tab", memo: "other memo" });
    first.acknowledge(submitted);
    expect(readOwnerMetadataDrafts("owner", storage).map(({ title }) => title).sort()).toEqual(["newer", "other tab"]);
    first.acknowledge(newer);
    expect(readOwnerMetadataDrafts("owner", storage)).toMatchObject([{ revision: sibling, title: "other tab" }]);
    second.acknowledge(sibling);
    expect(hasOwnerMetadataDrafts("owner", storage)).toBe(false);
  });

  it("isolates account, document and kind while preserving raw text across a new editor instance", () => {
    const storage = memoryStorage();
    createMetadataDraftStore("one", "lyric", "doc", storage).write({ title: "🎵".repeat(201), memo: " raw\r\n[Extend] " });
    createMetadataDraftStore("two", "lyric", "doc", storage).write({ title: "other account" });
    createMetadataDraftStore("one", "lyric", "other", storage).write({ title: "other document" });
    createMetadataDraftStore("one", "rhyme", "doc", storage).write({ title: "rhyme" });
    const reopened = createMetadataDraftStore("one", "lyric", "doc", storage);
    const saved = reopened.read();
    expect(saved).toMatchObject([{ title: "🎵".repeat(201), memo: " raw\r\n[Extend] " }]);
    expect(saved).toHaveLength(1);
    expect(reopened.restore(createMetadataDraftStore("two", "lyric", "doc", storage).read()[0]!)).toBeNull();
    const restored = reopened.restore(saved[0]!);
    expect(restored).not.toBeNull();
    expect(restored).not.toBe(saved[0]!.revision);
    expect(readOwnerMetadataDrafts("one", storage).filter(({ kind, resourceId }) => kind === "lyric" && resourceId === "doc")).toMatchObject([{ title: "🎵".repeat(201), memo: " raw\r\n[Extend] " }]);
  });

  it("storage failure leaves the previous revision and restoration source intact", () => {
    const storage = memoryStorage();
    const writer = createMetadataDraftStore("owner", "rhyme", "doc", storage);
    writer.write({ title: "recover me" });
    const reopened = createMetadataDraftStore("owner", "rhyme", "doc", storage);
    const saved = reopened.read()[0]!;
    vi.mocked(storage.setItem).mockImplementation(() => { throw new Error("quota"); });
    expect(() => writer.write({ title: "new input" })).toThrow("quota");
    expect(() => reopened.restore(saved)).toThrow("quota");
    expect(reopened.read()).toEqual([saved]);
  });
});
