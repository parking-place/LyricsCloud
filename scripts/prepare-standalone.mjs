import { cp, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const workspace = process.argv[2];
if (!workspace) throw new Error("workspace path is required");
const root = resolve(import.meta.dirname, "..");
const source = resolve(root, workspace);
const target = resolve(source, ".next/standalone", workspace);

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

await mkdir(resolve(target, ".next"), { recursive: true });
await cp(resolve(source, ".next/static"), resolve(target, ".next/static"), { recursive: true });
if (await exists(resolve(source, "public"))) await cp(resolve(source, "public"), resolve(target, "public"), { recursive: true });
console.log(`Standalone assets: ${workspace}`);
