import { describe, expect, it } from "vitest";
import { formatBuildLabel } from "./build-metadata.js";

describe("build label", () => {
  it("formats immutable releases without a phase", () => {
    expect(formatBuildLabel({ version: "1.0.1", channel: "release", phase: null })).toBe("v1.0.1 Release");
  });

  it("formats development builds with a multi-digit phase", () => {
    expect(formatBuildLabel({ version: "1.1.12", channel: "dev", phase: "p13" })).toBe("v1.1.12-p13 dev");
  });
});
