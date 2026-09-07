import { describe, expect, it } from "vitest";
import { createExportArchive } from "./export-archive.js";

describe("export archive", () => {
  it("streams a valid stored ZIP and closes a completed snapshot", async () => {
    let closed: boolean | undefined;
    const snapshot = {
      exportedAt: new Date("2026-09-07T12:00:00Z"),
      async *records() { yield { section: "resources", data: { id: "one" } }; },
      async *readableResources() { yield { id: "11111111-2222-4333-8444-555555555555", type: "lyrics", title: "가사/하나", deletedAt: null, songId: "song", status: "draft", description: "", workNotes: "", body: "한글 본문", memo: "메모", plainText: "" }; },
      async *readableTemplates() {}, async settings() { return { theme: "dark" }; },
      async close(success: boolean) { closed = success; }
    };
    const chunks = [];
    for await (const chunk of createExportArchive(snapshot as never)) chunks.push(Buffer.from(chunk));
    const archive = Buffer.concat(chunks);
    expect(archive.readUInt32LE(0)).toBe(0x04034b50);
    expect(archive.includes(Buffer.from("lyricscloud-export.json"))).toBe(true);
    expect(archive.includes(Buffer.from("lyrics/가사_하나--11111111.txt"))).toBe(true);
    expect(archive.includes(Buffer.from("한글 본문"))).toBe(true);
    expect(archive.readUInt32LE(archive.length - 22)).toBe(0x06054b50);
    expect(closed).toBe(true);
  });

  it("rolls back the snapshot when the consumer cancels", async () => {
    let closed: boolean | undefined;
    const snapshot = {
      exportedAt: new Date(), async *records() { yield { section: "x", data: {} }; },
      async *readableResources() {}, async *readableTemplates() {}, async settings() { return {}; },
      async close(success: boolean) { closed = success; }
    };
    const stream = createExportArchive(snapshot as never);
    await stream.next(); await stream.return(undefined);
    expect(closed).toBe(false);
  });
});
