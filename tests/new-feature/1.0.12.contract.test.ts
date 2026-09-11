import { describe, expect, it } from "vitest";
import { buildPinnedGroupPositions } from "../../apps/web/src/lib/library-group-positions.js";

describe("1.0.12 library group position contract", () => {
  it("matches the existing pinned and unpinned group definition", () => {
    const items = [
      { id: "u1", isPinned: false },
      { id: "p1", isPinned: true },
      { id: "u2", isPinned: false },
      { id: "p2", isPinned: true },
      { id: "u3", isPinned: false }
    ];

    expect([...buildPinnedGroupPositions(items)]).toEqual([
      ["u1", { position: 0, groupSize: 3 }],
      ["p1", { position: 0, groupSize: 2 }],
      ["u2", { position: 1, groupSize: 3 }],
      ["p2", { position: 1, groupSize: 2 }],
      ["u3", { position: 2, groupSize: 3 }]
    ]);
  });

  it("supports empty and single-group inputs without changing order", () => {
    expect([...buildPinnedGroupPositions([])]).toEqual([]);
    expect([...buildPinnedGroupPositions([
      { id: "a", isPinned: true },
      { id: "b", isPinned: true }
    ])]).toEqual([
      ["a", { position: 0, groupSize: 2 }],
      ["b", { position: 1, groupSize: 2 }]
    ]);
  });

  it("rejects duplicate ids instead of returning an ambiguous move target", () => {
    expect(() => buildPinnedGroupPositions([
      { id: "same", isPinned: false },
      { id: "same", isPinned: true }
    ])).toThrow("Duplicate library item id: same");
  });

  it("reads item fields a bounded number of times for long lists", () => {
    let reads = 0;
    const items = Array.from({ length: 10_000 }, (_, index) => ({
      get id() { reads += 1; return `item-${index}`; },
      get isPinned() { reads += 1; return index % 5 === 0; }
    }));

    expect(buildPinnedGroupPositions(items).size).toBe(10_000);
    expect(reads).toBeLessThanOrEqual(40_000);
  });
});
