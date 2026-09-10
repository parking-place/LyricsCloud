import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_VIEW_MODE,
  LibraryViewSettingsValidationError,
  libraryViewSettingDefault,
  parseLibraryViewResourceType,
  parseUpdateLibraryViewSettingInput,
  withLibraryViewMode
} from "../../packages/domain/src/index.js";

describe("1.0.7 library view settings contract", () => {
  it("accepts only the three library types and four closed view modes", () => {
    expect(parseLibraryViewResourceType("songs")).toBe("songs");
    expect(parseLibraryViewResourceType("rhymes")).toBe("rhymes");
    expect(parseLibraryViewResourceType("prompts")).toBe("prompts");
    expect(() => parseLibraryViewResourceType("lyrics")).toThrow(LibraryViewSettingsValidationError);

    for (const viewMode of ["list", "grid-small", "grid-medium", "grid-large"] as const) {
      expect(parseUpdateLibraryViewSettingInput({ viewMode, rowVersion: 0 })).toEqual({ viewMode, rowVersion: 0 });
    }
    for (const input of [
      { viewMode: "grid", rowVersion: 0 },
      { viewMode: "list", rowVersion: -1 },
      { viewMode: "list", rowVersion: 1.5 },
      { viewMode: "list", rowVersion: 0, ownerId: "not-accepted" }
    ]) expect(() => parseUpdateLibraryViewSettingInput(input)).toThrow(LibraryViewSettingsValidationError);
  });

  it("uses a read-only list default with no persisted row", () => {
    expect(DEFAULT_LIBRARY_VIEW_MODE).toBe("list");
    expect(libraryViewSettingDefault("songs")).toEqual({
      resourceType: "songs", viewMode: "list", rowVersion: 0, updatedAt: null
    });
  });

  it("changes only viewMode and preserves loaded items and query state identities", () => {
    const items = [{ id: "A" }, { id: "B" }, { id: "C" }] as const;
    const query = { search: "한글", filter: "active", sort: "updated_desc", cursor: "next" } as const;
    const current = { viewMode: "list" as const, items, query, selectedId: "B", scrollTop: 240 };
    const next = withLibraryViewMode(current, "grid-large");
    expect(next).toEqual({ ...current, viewMode: "grid-large" });
    expect(next.items).toBe(items);
    expect(next.query).toBe(query);
  });
});
