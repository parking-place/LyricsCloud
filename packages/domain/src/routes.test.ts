import { describe, expect, it } from "vitest";
import { productRoutes } from "./routes.js";

describe("product route manifest", () => {
  it("maps each mock-up screen exactly once", () => {
    expect(productRoutes).toHaveLength(15);
    expect(new Set(productRoutes.map(({ screen }) => screen)).size).toBe(15);
    expect(new Set(productRoutes.map(({ path }) => path)).size).toBe(15);
  });
  it("only exposes the login screen publicly", () => {
    expect(productRoutes.filter(({ access }) => access === "public").map(({ screen }) => screen)).toEqual(["01-auth"]);
  });
});
