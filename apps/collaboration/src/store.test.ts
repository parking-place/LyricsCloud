import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { materialize } from "./store.js";

describe("collaboration CRDT persistence helpers", () => {
  it("recovers the same UTF-8 body from snapshot and reordered duplicate deltas", () => {
    const seed = new Y.Doc();
    seed.getText("body").insert(0, "[Verse]\n한글 🎵\n");
    const snapshot = Y.encodeStateAsUpdate(seed);
    const left = new Y.Doc(); Y.applyUpdate(left, snapshot);
    const right = new Y.Doc(); Y.applyUpdate(right, snapshot);
    let leftUpdate: Uint8Array<ArrayBufferLike> = new Uint8Array();
    let rightUpdate: Uint8Array<ArrayBufferLike> = new Uint8Array();
    left.on("update", (update) => { leftUpdate = update; });
    right.on("update", (update) => { rightUpdate = update; });
    left.getText("body").insert(left.getText("body").length, "왼쪽\n");
    right.getText("body").insert(0, "오른쪽\n");
    const first = materialize(snapshot, [leftUpdate, rightUpdate, leftUpdate]);
    const second = materialize(snapshot, [rightUpdate, leftUpdate]);
    expect(first.getText("body").toString()).toBe(second.getText("body").toString());
    expect(Y.encodeStateVector(first)).toEqual(Y.encodeStateVector(second));
    for (const document of [seed, left, right, first, second]) document.destroy();
  });
});
