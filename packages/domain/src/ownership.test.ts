import { describe, expect, it } from "vitest";
import type { UserId } from "./types.js";
import { bindOwnerContext } from "./ownership.js";

const alice = "00000000-0000-4000-8000-0000000000a1" as UserId;
const bob = "00000000-0000-4000-8000-0000000000b2" as UserId;

describe("owned create command boundary", () => {
  it("requires authenticated owner context", () => {
    expect(() => bindOwnerContext(undefined as never, { title: "새 곡" })).toThrow("AUTH_CONTEXT_REQUIRED");
  });

  it("derives ownerId from context and discards a forged client value", () => {
    const forged = { title: "새 곡", ownerId: bob } as unknown as { title: string };
    expect(bindOwnerContext({ userId: alice }, forged)).toEqual({ title: "새 곡", ownerId: alice });
  });
});
