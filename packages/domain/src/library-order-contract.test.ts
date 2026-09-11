import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LibraryOrderValidationError, parseLibraryMoveInput } from "./library-order-contract.js";

describe("library manual order move contract", () => {
  it("accepts only the anchor command and preserves nullable boundaries", () => {
    const requestId = randomUUID();
    const itemId = randomUUID();
    const beforeId = randomUUID();
    expect(parseLibraryMoveInput({ requestId, itemId, beforeId, afterId: null, expectedVersion: 7 }))
      .toEqual({ requestId, itemId, beforeId, afterId: null, expectedVersion: 7 });
  });

  it.each([
    [{}, "requestId"],
    [{ requestId: randomUUID(), itemId: randomUUID(), beforeId: null, afterId: null, expectedVersion: 0 }, "anchors"],
    [{ requestId: randomUUID(), itemId: randomUUID(), beforeId: randomUUID(), afterId: null, expectedVersion: -1 }, "expectedVersion"],
    [{ requestId: randomUUID(), itemId: randomUUID(), beforeId: randomUUID(), afterId: null, expectedVersion: 0, ownerId: randomUUID() }, "ownerId"]
  ])("rejects invalid or authority-bearing payload %#", (value, field) => {
    try {
      parseLibraryMoveInput(value);
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(LibraryOrderValidationError);
      expect((error as LibraryOrderValidationError).issues.some((issue) => issue.field === field)).toBe(true);
    }
  });

  it("rejects the item or the same id as anchors", () => {
    const itemId = randomUUID();
    const requestId = randomUUID();
    expect(() => parseLibraryMoveInput({ requestId, itemId, beforeId: itemId, afterId: null, expectedVersion: 0 }))
      .toThrow(LibraryOrderValidationError);
    const anchor = randomUUID();
    expect(() => parseLibraryMoveInput({ requestId, itemId, beforeId: anchor, afterId: anchor, expectedVersion: 0 }))
      .toThrow(LibraryOrderValidationError);
  });
});
