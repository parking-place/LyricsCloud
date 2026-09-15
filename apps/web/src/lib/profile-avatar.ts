import { createHash } from "node:crypto";
import sharp from "sharp";
import { ProfileInputError } from "./profile-input.js";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;
const MAX_OUTPUT_BYTES = 200 * 1024;

export interface ProcessedAvatar {
  readonly bytes: Buffer;
  readonly sha256: string;
}

export async function processProfileAvatar(file: File): Promise<ProcessedAvatar> {
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_INPUT_BYTES)
    throw new ProfileInputError(["avatar"]);
  const original = Buffer.from(await file.arrayBuffer());
  if (!supportedSignature(original)) throw new ProfileInputError(["avatar"]);
  try {
    const image = sharp(original, { limitInputPixels: MAX_PIXELS, failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS
      || (metadata.pages ?? 1) !== 1 || !["png", "jpeg", "webp"].includes(metadata.format))
      throw new ProfileInputError(["avatar"]);
    const bytes = await image.rotate().resize(256, 256, { fit: "cover" })
      .webp({ quality: 80, effort: 4 }).toBuffer();
    if (bytes.length < 1 || bytes.length > MAX_OUTPUT_BYTES)
      throw new ProfileInputError(["avatar"]);
    return { bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
  } catch (error) {
    if (error instanceof ProfileInputError) throw error;
    throw new ProfileInputError(["avatar"]);
  }
}

function supportedSignature(bytes: Buffer): boolean {
  return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    || (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP");
}
