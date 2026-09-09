import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { betaCodeDigest, generateBetaCode, normalizeBetaCode } from "./beta-access.js";
import { parseBetaAdminArguments } from "./beta-admin.js";

describe("beta code contract", () => {
  it("normalizes only the exact six-character A-Z0-9 alphabet", () => {
    expect(normalizeBetaCode(" ab12z9 ")).toBe("AB12Z9");
    for (const invalid of ["", "ABC12", "ABC1234", "ABC-12", "ＡＢＣ１２３", "가나다123"]) {
      expect(() => normalizeBetaCode(invalid)).toThrow("BETA_CODE_INVALID");
    }
  });

  it("uses rejection sampling instead of modulo-biased bytes", () => {
    const chunks = [Buffer.from([252, 253, 254, 255, 0, 35, 36, 71, 72, 107, 108, 143])];
    expect(generateBetaCode(() => chunks.shift() ?? Buffer.alloc(12))).toBe("A9A9A9");
  });

  it("binds digest values to the environment", () => {
    const key = Buffer.alloc(32, 7);
    expect(betaCodeDigest("ABC123", "development", key)).not.toBe(betaCodeDigest("ABC123", "release", key));
    expect(betaCodeDigest("abc123", "development", key)).toBe(betaCodeDigest("ABC123", "development", key));
  });

  it("accepts only bounded integer issue counts and explicit commands", () => {
    expect(parseBetaAdminArguments(["betacode"])).toEqual({ operation: "issue", count: 1 });
    expect(parseBetaAdminArguments(["betacode", "-n", "7"])).toEqual({ operation: "issue", count: 7 });
    expect(parseBetaAdminArguments(["betacode", "ls"])).toEqual({ operation: "list" });
    expect(parseBetaAdminArguments(["betacode", "refresh", "--confirm-environment", "release"]))
      .toEqual({ operation: "refresh", confirmEnvironment: "release" });
    for (const args of [
      ["betacode", "-n", "0"], ["betacode", "-n", "-1"], ["betacode", "-n", "1.5"],
      ["betacode", "-n", "101"], ["betacode", "-n", "seven"], ["unknown"]
    ]) expect(() => parseBetaAdminArguments(args)).toThrow();
  });
});
