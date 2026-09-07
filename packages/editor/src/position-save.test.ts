import { afterEach, describe, expect, it, vi } from "vitest";
import { BufferedPositionSaver } from "./position-save.js";

describe("BufferedPositionSaver", () => {
  afterEach(() => vi.useRealTimers());

  it("coalesces one hundred rapid cursor changes into one latest write", async () => {
    vi.useFakeTimers();
    const writes: number[] = [];
    const saver = new BufferedPositionSaver({ save: async ({ cursor }: { cursor: number }) => { writes.push(cursor); } });
    for (let cursor = 0; cursor < 100; cursor += 1) saver.change({ cursor });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(writes).toEqual([99]);
    await saver.dispose();
  });

  it("writes at the maximum interval during continuous movement and flushes the final value", async () => {
    vi.useFakeTimers();
    const writes: number[] = [];
    const saver = new BufferedPositionSaver({ save: async ({ cursor }: { cursor: number }) => { writes.push(cursor); } });
    for (let cursor = 0; cursor < 150; cursor += 1) {
      saver.change({ cursor });
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(writes.length).toBeLessThanOrEqual(1);
    await saver.flush();
    expect(writes.at(-1)).toBe(149);
    expect(writes.length).toBeLessThanOrEqual(2);
    await saver.dispose();
  });

  it("serializes a newer value behind an in-flight write", async () => {
    let release: (() => void) | undefined;
    let announceStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { announceStarted = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const writes: number[] = [];
    const saver = new BufferedPositionSaver({ save: async ({ cursor }: { cursor: number }) => {
      writes.push(cursor);
      if (cursor === 1) { announceStarted?.(); await gate; }
    } });
    saver.change({ cursor: 1 });
    const first = saver.flush();
    await started;
    saver.change({ cursor: 2 });
    const second = saver.flush();
    release?.();
    await Promise.all([first, second]);
    expect(writes).toEqual([1, 2]);
    await saver.dispose();
  });
});
