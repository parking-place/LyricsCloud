import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NOTO_SANS_KR_ASSET_URL, NOTO_SANS_KR_FAMILY, NOTO_SANS_KR_FALLBACK, NOTO_SANS_KR_LICENSE_URL, WRITING_FONT_OPTIONS, writingDisplayStyle, writingDisplayVariables, writingFontFamily } from "./font-assets.js";

const publicRoot = resolve(process.cwd(), "apps/web/public");

describe("1.0.14 self-hosted font assets", () => {
  it("pins the official Regular OTF and OFL notice by content hash", async () => {
    const asset = await readFile(resolve(publicRoot, NOTO_SANS_KR_ASSET_URL.slice(1)));
    const license = await readFile(resolve(publicRoot, NOTO_SANS_KR_LICENSE_URL.slice(1)));
    expect((await stat(resolve(publicRoot, NOTO_SANS_KR_ASSET_URL.slice(1)))).size).toBe(4_644_748);
    expect(createHash("sha256").update(asset).digest("hex")).toBe("69975a0ac8472717870aefeab0a4d52739308d90856b9955313b2ad5e0148d68");
    expect(createHash("sha256").update(license).digest("hex")).toBe("6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2");
    expect(license.toString("utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1");
  });

  it("uses the private family name with a visible system fallback", () => {
    expect(NOTO_SANS_KR_FAMILY).toBe("LyricsCloud Noto Sans KR");
    expect(NOTO_SANS_KR_FALLBACK).toContain("system-ui");
    expect(NOTO_SANS_KR_ASSET_URL).toMatch(/\.[0-9a-f]{8}\.otf$/u);
    expect(NOTO_SANS_KR_ASSET_URL.startsWith("/fonts/")).toBe(true);
  });

  it("maps the persisted writing option without changing content", () => {
    expect(WRITING_FONT_OPTIONS.map(({ value }) => value)).toContain("noto_sans_kr");
    expect(writingFontFamily("noto_sans_kr")).toBe(NOTO_SANS_KR_FALLBACK);
    expect(writingDisplayStyle({ font: "noto_sans_kr", fontSize: 20, lineHeight: 1.8, letterSpacing: 0.01 })).toEqual({
      fontFamily: NOTO_SANS_KR_FALLBACK, fontSize: "20px", lineHeight: 1.8, letterSpacing: "0.01em"
    });
    expect(writingDisplayVariables({ font: "noto_sans_kr", fontSize: 20, lineHeight: 1.8, letterSpacing: 0.01 })).toMatchObject({
      "--lyric-font-family": NOTO_SANS_KR_FALLBACK, "--lyric-font-size": "20px"
    });
  });
});
