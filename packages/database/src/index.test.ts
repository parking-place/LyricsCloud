import { describe, expect, it } from "vitest";
import { classifyDatabaseError, DatabaseHealthError } from "./index.js";

describe("database health diagnostics", () => {
  it.each([
    ["28P01", "DATABASE_AUTH_FAILED"],
    ["ETIMEDOUT", "DATABASE_TIMEOUT"],
    ["ECONNREFUSED", "DATABASE_UNAVAILABLE"],
    ["42P01", "DATABASE_SCHEMA_OUTDATED"],
    ["XX000", "DATABASE_QUERY_FAILED"]
  ] as const)("maps %s without exposing a driver message", (driverCode, expected) => {
    expect(classifyDatabaseError({ code: driverCode, message: "sensitive connection details" })).toBe(expected);
    expect(new DatabaseHealthError(expected).message).toBe(expected);
  });

  it("recognizes wrapped connection failures", () => {
    expect(classifyDatabaseError(new Error("connect ECONNREFUSED 127.0.0.1"))).toBe("DATABASE_UNAVAILABLE");
  });
});
