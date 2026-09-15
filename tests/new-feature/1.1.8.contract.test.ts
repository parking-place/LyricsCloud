import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyLyricUpdate,
  createLyricDocument,
  lyricBody
} from "../../packages/editor/src/crdt.js";
import {
  buildLyricCopyPayload,
  copySongFormSections,
  LYRIC_COPY_WARNING_LIMIT
} from "../../packages/editor/src/copy.js";
import { parseSongForm } from "../../packages/editor/src/songform.js";

interface WindowsContractFixture {
  readonly schemaVersion: string;
  readonly sourceSha: string;
  readonly producer: { readonly runtime: string; readonly yjs: string };
  readonly sentenceCopy: { readonly body: string; readonly expected: string };
  readonly songFormCopy: {
    readonly body: string;
    readonly expectedWhole: string;
    readonly selectedSectionIndexes: readonly number[];
    readonly expectedSelected: string;
  };
  readonly warningBoundary: {
    readonly codePoint: string;
    readonly repeat: number;
    readonly expectedLimit: number;
    readonly expectedWarning: boolean;
  };
  readonly yjsSnapshot: {
    readonly sharedType: "body";
    readonly expectedBody: string;
    readonly updateBase64: string;
  };
}

const fixture = JSON.parse(readFileSync(new URL(
  "../native/windows/fixtures/1.1.8-read-copy-yjs-v1.json",
  import.meta.url
), "utf8")) as WindowsContractFixture;

describe("1.1.8 Windows read/copy compatibility spike", () => {
  it("freezes one versioned, synthetic fixture at the 1.1.7 release-record source", () => {
    expect(fixture.schemaVersion).toBe("lyricscloud.windows.contract.v1");
    expect(fixture.sourceSha).toBe("b288dcfd5d3d0a69868b5201c878df7a221e63f3");
    expect(fixture.producer).toEqual({ runtime: "Node.js 24.20.0", yjs: "13.6.32" });
  });

  it("keeps sentence, song-form, Extend, and Unicode warning copy semantics", () => {
    expect(buildLyricCopyPayload(fixture.sentenceCopy.body).payload).toBe(fixture.sentenceCopy.expected);

    const whole = buildLyricCopyPayload(fixture.songFormCopy.body);
    expect(whole.payload).toBe(fixture.songFormCopy.expectedWhole);
    const sections = parseSongForm(fixture.songFormCopy.body);
    expect(copySongFormSections(
      fixture.songFormCopy.body,
      sections,
      fixture.songFormCopy.selectedSectionIndexes.map((index) => sections[index]!.id)
    )).toBe(fixture.songFormCopy.expectedSelected);

    const boundary = fixture.warningBoundary;
    const warning = buildLyricCopyPayload(boundary.codePoint.repeat(boundary.repeat));
    expect(LYRIC_COPY_WARNING_LIMIT).toBe(boundary.expectedLimit);
    expect(warning.codePointCount).toBe(boundary.repeat);
    expect(warning.exceedsRecommendedLimit).toBe(boundary.expectedWarning);
  });

  it("can decode the exact Yjs v1 update as a future native interop input", () => {
    const document = createLyricDocument();
    try {
      applyLyricUpdate(document, Uint8Array.from(Buffer.from(fixture.yjsSnapshot.updateBase64, "base64")));
      expect(lyricBody(document).toString()).toBe(fixture.yjsSnapshot.expectedBody);
    } finally {
      document.destroy();
    }
  });
});
