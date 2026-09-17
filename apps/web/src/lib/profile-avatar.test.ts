import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processProfileAvatar } from "./profile-avatar.js";
import { ProfileInputError } from "./profile-input.js";

describe("private avatar re-encoding", () => {
  it.each(["png", "jpeg", "webp"] as const)("accepts real %s and returns metadata-free 256px WebP", async (format) => {
    const image = sharp({ create: { width: 400, height: 300, channels: 3, background: "#8ca3b7" } });
    const source = await image.toFormat(format).toBuffer();
    const file = new File([source], `untrusted-name.${format}`, { type: "image/svg+xml" });
    const result = await processProfileAvatar(file);
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 256, height: 256 });
    expect(metadata.exif).toBeUndefined();
    expect(result.bytes.length).toBeLessThanOrEqual(200 * 1024);
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([Buffer.from("<svg>script</svg>"), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])])
    ("rejects spoofed or malformed image content", async (bytes) => {
      await expect(processProfileAvatar(new File([bytes], "avatar.png", { type: "image/png" })))
        .rejects.toBeInstanceOf(ProfileInputError);
    });

  it("rejects over-2MiB input before decoding", async () => {
    const tooLarge = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "too-large.png");
    await expect(processProfileAvatar(tooLarge)).rejects.toBeInstanceOf(ProfileInputError);
  });

  it("removes source orientation/EXIF during WebP conversion", async () => {
    const source = await sharp({ create: { width: 5, height: 3, channels: 3, background: "#698495" } })
      .jpeg().withMetadata({ orientation: 6 }).toBuffer();
    expect((await sharp(source).metadata()).exif).toBeDefined();
    const result = await processProfileAvatar(new File([source], "camera.jpg", { type: "image/jpeg" }));
    expect((await sharp(result.bytes).metadata()).exif).toBeUndefined();
  });

  it("rejects decodable images above 16 million pixels", async () => {
    const source = await sharp({ create: { width: 4100, height: 4100, channels: 3, background: "#698495" } })
      .png().toBuffer();
    await expect(processProfileAvatar(new File([source], "huge-pixels.png", { type: "image/png" })))
      .rejects.toBeInstanceOf(ProfileInputError);
  });
});
