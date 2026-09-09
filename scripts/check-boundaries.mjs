import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const forbidden = {
  "packages/domain": ["next", "drizzle-orm", "pg", "openid-client", "yjs", "dexie", "workbox", "caddy"],
  "packages/ui": ["drizzle-orm", "pg", "openid-client", "yjs", "dexie"]
};

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }));
  return nested.flat();
}

const violations = [];
for (const [boundary, packages] of Object.entries(forbidden)) {
  const directory = join(root, boundary);
  for (const file of await files(directory)) {
    if (![".ts", ".tsx", ".js", ".mjs"].includes(extname(file))) continue;
    const source = await readFile(file, "utf8");
    for (const dependency of packages) {
      const pattern = new RegExp(`(?:from\\s+|import\\s*\\()(["'])${dependency}(?:/[^"']*)?\\1`);
      if (pattern.test(source)) violations.push(`${relative(root, file)} imports ${dependency}`);
    }
  }
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("Architecture boundaries: OK");
