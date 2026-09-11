import { describe, expect, it } from "vitest";
import {
  SongOrderConflictError,
  SongOrderNotFoundError,
  SongOrderPinGroupError,
  SongOrderRequestReuseError
} from "@lyricscloud/database";
import { songApiError } from "./song-api.js";

describe("song manual order API errors", () => {
  it.each([
    [new SongOrderConflictError(3), 409, "VERSION_CONFLICT"],
    [new SongOrderPinGroupError(), 409, "CONFLICT"],
    [new SongOrderRequestReuseError(), 409, "CONFLICT"],
    [new SongOrderNotFoundError(), 404, "NOT_FOUND"]
  ] as const)("maps %s without exposing storage details", async (error, status, code) => {
    const response = songApiError(error);
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ error: { code, requestId: expect.any(String) } });
  });
});
