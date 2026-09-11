import { describe, expect, it } from "vitest";
import {
  LibraryOrderValidationError, parseLibraryMoveInput, parsePromptListInput, parseRhymeListInput
} from "../../packages/domain/src/index.js";

const requestId = "10000000-0000-4000-8000-000000000001";
const itemId = "10000000-0000-4000-8000-000000000002";
const beforeId = "10000000-0000-4000-8000-000000000003";
const afterId = "10000000-0000-4000-8000-000000000004";

describe("1.0.9 rhyme and prompt manual order contract", () => {
  it("accepts manual lists and the shared visible-anchor command", () => {
    expect(parseRhymeListInput(new URLSearchParams("sort=manual&limit=12"))).toMatchObject({ sort: "manual", limit: 12 });
    expect(parsePromptListInput(new URLSearchParams("sort=manual&limit=12"))).toMatchObject({ sort: "manual", limit: 12 });
    expect(parseLibraryMoveInput({ requestId, itemId, beforeId, afterId, expectedVersion: 4 }))
      .toEqual({ requestId, itemId, beforeId, afterId, expectedVersion: 4 });
  });

  it("rejects ownership fields, arrays, stale shapes and ambiguous anchors", () => {
    for (const input of [
      { requestId, itemId, beforeId: null, afterId: null, expectedVersion: 0 },
      { requestId, itemId, beforeId: itemId, afterId, expectedVersion: 0 },
      { requestId, itemId, beforeId, afterId: beforeId, expectedVersion: 0 },
      { requestId, itemId, beforeId, afterId, expectedVersion: -1 },
      { requestId, itemId, beforeId, afterId, expectedVersion: 1.5 },
      { requestId, itemId, beforeId, afterId, expectedVersion: 0, ownerId: itemId },
      { requestId, itemId, beforeId, afterId, expectedVersion: 0, orderedIds: [itemId] }
    ]) expect(() => parseLibraryMoveInput(input)).toThrow(LibraryOrderValidationError);
  });
});
