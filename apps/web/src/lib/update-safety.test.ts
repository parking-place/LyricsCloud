import { describe, expect, it } from "vitest";
import { hasVolatilePendingInput, serviceWorkerScriptUrl } from "./update-safety.js";

describe("1.0.2 stabilization contract", () => {
  it("guards only volatile editor states while durable/server states may update", () => {
    expect(hasVolatilePendingInput("dirty", "ready")).toBe(true);
    expect(hasVolatilePendingInput("saved", "saving-local")).toBe(true);
    expect(hasVolatilePendingInput("saved", "error")).toBe(true);
    expect(hasVolatilePendingInput("saved", "ready")).toBe(false);
    expect(hasVolatilePendingInput("saved", "projection")).toBe(false);
    expect(hasVolatilePendingInput("saved", "offline")).toBe(false);
  });

  it("binds the service worker script URL to the public immutable build id", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";
    expect(serviceWorkerScriptUrl(sha)).toBe(`/sw.js?build=${sha}`);
    expect(serviceWorkerScriptUrl("local dev")).toBe("/sw.js?build=local%20dev");
  });
});
