import { describe, expect, it } from "vitest";
import {
  SongValidationError,
  parseSongListInput,
  parseSongMoveInput
} from "../../packages/domain/src/index.js";

const itemId = "10000000-0000-4000-8000-000000000001";
const beforeId = "10000000-0000-4000-8000-000000000002";
const afterId = "10000000-0000-4000-8000-000000000003";
const requestId = "10000000-0000-4000-8000-000000000004";

describe("1.0.8 song manual order contract", () => {
  it("accepts manual list ordering and the exact anchor command", () => {
    expect(parseSongListInput(new URLSearchParams("sort=manual&limit=12"))).toEqual({
      work: "all", sort: "manual", limit: 12
    });
    expect(parseSongMoveInput({ requestId, itemId, beforeId, afterId, expectedVersion: 0 })).toEqual({
      requestId, itemId, beforeId, afterId, expectedVersion: 0
    });
    expect(parseSongMoveInput({ requestId, itemId, beforeId: null, afterId, expectedVersion: 7 })).toEqual({
      requestId, itemId, beforeId: null, afterId, expectedVersion: 7
    });
  });

  it("rejects whole arrays, client ownership, invalid versions and ambiguous anchors", () => {
    for (const input of [
      { requestId, itemId, beforeId: null, afterId: null, expectedVersion: 0 },
      { requestId, itemId, beforeId: itemId, afterId, expectedVersion: 0 },
      { requestId, itemId, beforeId, afterId: beforeId, expectedVersion: 0 },
      { requestId, itemId, beforeId, afterId, expectedVersion: -1 },
      { requestId, itemId, beforeId, afterId, expectedVersion: 1.5 },
      { requestId: "bad", itemId, beforeId, afterId, expectedVersion: 0 },
      { requestId, itemId, beforeId, afterId, expectedVersion: 0, ownerId: itemId },
      { requestId, itemId, beforeId, afterId, expectedVersion: 0, orderedIds: [itemId] }
    ]) expect(() => parseSongMoveInput(input)).toThrow(SongValidationError);
  });
});
