import { describe, expect, it, vi } from "vitest";
import { SerializedSaveController, type SaveState, type TextDraft } from "./autosave.js";

const initial = { title: "초안", body: "[Verse]\n처음" };

describe("SerializedSaveController", () => {
  it("waits for composition end and sends plain document snapshots only", async () => {
    vi.useFakeTimers();
    const saves: TextDraft[] = [];
    const controller = new SerializedSaveController({ initialDraft: initial, initialRowVersion: 3,
      save: async (draft) => { saves.push(draft); return { rowVersion: 4 }; } });
    controller.change({ ...initial, body: "ㅎ" }, { composing: true });
    controller.change({ ...initial, body: "한" }, { composing: true });
    await vi.advanceTimersByTimeAsync(6_000);
    expect(saves).toEqual([]);
    controller.compositionEnd();
    await vi.advanceTimersByTimeAsync(900);
    expect(saves).toEqual([{ ...initial, body: "한" }]);
    expect(controller.state.status).toBe("saved");
    vi.useRealTimers();
  });

  it("serializes writes and does not call an older response the latest saved state", async () => {
    vi.useFakeTimers();
    const releases: Array<() => void> = [];
    const calls: Array<{ draft: TextDraft; version: number }> = [];
    const states: SaveState[] = [];
    const controller = new SerializedSaveController({ initialDraft: initial, initialRowVersion: 1,
      save: (draft, version) => new Promise((resolve) => { calls.push({ draft, version }); releases.push(() => resolve({ rowVersion: version + 1 })); }),
      onStateChange: (state) => states.push(state) });
    controller.change({ ...initial, body: "A" });
    await vi.advanceTimersByTimeAsync(900);
    controller.change({ ...initial, body: "AB" });
    await vi.advanceTimersByTimeAsync(900);
    expect(calls).toHaveLength(1);
    releases[0]!();
    for (let turn = 0; turn < 8 && calls.length < 2; turn += 1) await Promise.resolve();
    expect(states.at(-1)?.status).not.toBe("saved");
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ draft: { ...initial, body: "AB" }, version: 2 });
    releases[1]!();
    await controller.flush();
    expect(controller.state.status).toBe("saved");
    expect(controller.rowVersion).toBe(3);
    vi.useRealTimers();
  });

  it("keeps failed content and retries the same latest draft", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const controller = new SerializedSaveController({ initialDraft: initial, initialRowVersion: 5,
      save: async () => { attempts += 1; if (attempts === 1) throw new Error("offline"); return { rowVersion: 6 }; } });
    controller.change({ title: "새 제목", body: "보존할 내용" });
    await vi.advanceTimersByTimeAsync(900);
    expect(controller.state.status).toBe("error");
    expect(controller.draft).toEqual({ title: "새 제목", body: "보존할 내용" });
    await controller.retry();
    expect(attempts).toBe(2);
    expect(controller.state.status).toBe("saved");
    vi.useRealTimers();
  });

  it("flushes within the maximum wait while changes continue", async () => {
    vi.useFakeTimers();
    const saves: TextDraft[] = [];
    const controller = new SerializedSaveController({ initialDraft: initial, initialRowVersion: 1,
      save: async (draft) => { saves.push(draft); return { rowVersion: 2 }; } });
    for (let second = 1; second <= 5; second += 1) {
      controller.change({ ...initial, body: String(second) });
      await vi.advanceTimersByTimeAsync(800);
    }
    await vi.advanceTimersByTimeAsync(1_000);
    expect(saves).toHaveLength(1);
    expect(saves[0]?.body).toBe("5");
    vi.useRealTimers();
  });

  it("serializes adapter-neutral metadata with text under the same row version", async () => {
    const saves: Array<{ title: string; body: string; memo: string; status: string; favorite: boolean }> = [];
    const controller = new SerializedSaveController({
      initialDraft: { ...initial, memo: "", status: "draft", favorite: false }, initialRowVersion: 7,
      save: async (draft, version) => { saves.push(draft); return { rowVersion: version + 1 }; }
    });
    controller.change({ ...controller.draft, memo: "다음 작업", status: "revising", favorite: true });
    await controller.flush();
    expect(saves).toEqual([{ ...initial, memo: "다음 작업", status: "revising", favorite: true }]);
    expect(controller.rowVersion).toBe(8);
  });
});
