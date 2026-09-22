import { describe, expect, it } from "vitest";
import { exportArchiveFilename, safeExportFilename, safeMarkdownHeading, validateExportDocument } from "./export-contract.js";

describe("export contract", () => {
  it("creates stable collision-resistant filenames for Korean and unsafe titles", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    expect(safeExportFilename(" 새벽/비:*? \u0000 ", id, "md")).toBe("새벽_비____--11111111.md");
    expect(safeExportFilename("CON", id, "txt")).toBe("_CON--11111111.txt");
    expect(safeExportFilename("같은 제목", id, "txt")).not.toBe(safeExportFilename("같은 제목", "99999999-2222-4333-8444-555555555555", "txt"));
  });

  it("keeps archive names and headings portable", () => {
    expect(exportArchiveFilename(new Date("2026-09-07T12:00:00Z"))).toBe("lyricscloud-export-20260907.zip");
    expect(safeMarkdownHeading("첫 줄\n둘째 줄")).toBe("첫 줄 둘째 줄");
  });

  it("validates schema versions and relationship targets", () => {
    const base = { schemaVersion: "lyricscloud.export.v1", exportedAt: "2026-09-07T00:00:00.000Z" };
    expect(validateExportDocument({ ...base, records: [
      { section: "resources", data: { id: "song" } }, { section: "resources", data: { id: "lyric" } },
      { section: "songs", data: { resource_id: "song" } }, { section: "lyrics", data: { resource_id: "lyric", song_id: "song" } }
    ] }).records).toHaveLength(4);
    expect(() => validateExportDocument({ ...base, records: [{ section: "lyrics", data: { resource_id: "missing", song_id: "missing" } }] })).toThrow("EXPORT_REFERENCE_INVALID");
    expect(() => validateExportDocument({ ...base, schemaVersion: "future", records: [] })).toThrow("EXPORT_SCHEMA_INVALID");
  });

  it("accepts historical v1 and current Suno/photo records while rejecting dangling references", () => {
    const base = { schemaVersion: "lyricscloud.export.v1", exportedAt: "2026-09-22T00:00:00.000Z" };
    const records = [
      { section: "resources", data: { id: "song", type: "song" } },
      { section: "songs", data: { resource_id: "song" } },
      { section: "songSunoWorkspaces", data: { song_resource_id: "song", model_label: "custom-v6" } },
      { section: "songSunoLinks", data: { id: "link", song_resource_id: "song", url: "https://suno.com/s/fixture" } },
      { section: "profile", data: { avatar_photo_id: "photo" } },
      { section: "profileAvatarPhotos", data: { id: "photo", webp_base64: "Zml4dHVyZQ==" } }
    ];
    expect(validateExportDocument({ ...base, records }).records).toEqual(records);
    expect(() => validateExportDocument({ ...base, records: [
      ...records.slice(0, 2), { section: "profile", data: { display_name: "Legacy profile" } }
    ] })).not.toThrow();
    for (const section of ["resources", "songs", "songSunoWorkspaces", "profileAvatarPhotos"]) {
      expect(() => validateExportDocument({ ...base, records: records.filter((row) => row.section !== section) })).toThrow("EXPORT_REFERENCE_INVALID");
    }
    for (const songId of [null, "missing", undefined]) {
      expect(() => validateExportDocument({ ...base, records: records.map((row) => row.section === "songSunoLinks"
        ? { ...row, data: { ...row.data, song_resource_id: songId } } : row) })).toThrow("EXPORT_REFERENCE_INVALID:song_resource_id");
    }
    expect(() => validateExportDocument({ ...base, records: records.map((row) => row.section === "resources"
      ? { ...row, data: { id: "song", type: "lyrics" } } : row) })).toThrow("EXPORT_REFERENCE_INVALID:song_resource_id");
  });
});
