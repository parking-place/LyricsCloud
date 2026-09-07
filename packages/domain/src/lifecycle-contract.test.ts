import { describe, expect, it } from "vitest";
import { LifecycleValidationError, parseTrashMutationInput, parseTrashType, remainingTrashDays } from "./lifecycle-contract.js";

const id = "11111111-1111-4111-8111-111111111111";

describe("lifecycle contract", () => {
  it("normalizes filters and duplicate references", () => {
    expect(parseTrashType("lyrics")).toBe("lyrics");
    expect(parseTrashType("unknown")).toBe("all");
    expect(parseTrashMutationInput({
      items: [{ kind: "resource", id }, { kind: "resource", id }],
      confirmedTitles: [{ kind: "resource", id, title: "가사" }]
    }).items).toHaveLength(1);
  });

  it("requires a destination for lyric moves", () => {
    expect(() => parseTrashMutationInput({ items: [{ kind: "resource", id }], confirmedTitles: [], lyricStrategy: "move_to_song" }))
      .toThrow(LifecycleValidationError);
  });

  it("uses ceiling days at the retention boundary", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(remainingTrashDays("2026-01-01T00:00:00.001Z", now)).toBe(1);
    expect(remainingTrashDays("2026-01-01T00:00:00.000Z", now)).toBe(0);
    expect(remainingTrashDays("2025-12-31T23:59:59.999Z", now)).toBe(0);
  });
});
