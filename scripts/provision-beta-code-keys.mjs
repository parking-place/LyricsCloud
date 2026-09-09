#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve(process.argv[2] ?? ".private/runtime");
const targets = ["beta_code_index_key", "beta_code_aead_key"].map((name) => resolve(directory, name));
await mkdir(directory, { recursive: true, mode: 0o700 });

for (const target of targets) {
  try {
    const info = await stat(target);
    if (!info.isFile() || (info.mode & 0o077) !== 0) throw new Error("BETA_KEY_FILE_PERMISSIONS_INVALID");
    process.stdout.write(`preserved ${target}\n`);
    continue;
  } catch (error) {
    if (error instanceof Error && error.message === "BETA_KEY_FILE_PERMISSIONS_INVALID") throw error;
  }
  const temporary = `${target}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    const handle = await open(temporary, "wx", 0o600);
    try { await handle.writeFile(`${randomBytes(32).toString("base64url")}\n`, "utf8"); }
    finally { await handle.close(); }
    await rename(temporary, target);
    process.stdout.write(`created ${target}\n`);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}
