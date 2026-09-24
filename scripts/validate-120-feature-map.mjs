import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const base = "0.Plans/3.Redesign-phase/1.2.0";
const source = readFileSync(resolve(root, base, "mockup/base/feature-data.js"), "utf8");
const map = readFileSync(resolve(root, base, "FEATURE-MAP.md"), "utf8");
const sourceIds = [...source.matchAll(/"id":\s*"(F-[A-Z0-9-]+)"/g)].map((match) => match[1]);
const rows = [...map.matchAll(/^\| `(F-[A-Z0-9-]+)` \| ([^|]+) \| ([^|]+) \| `([^`]+)` \| ([^|]+) \| ([^|]+) \|$/gm)];
const mapIds = rows.map((match) => match[1]);

assert.equal(sourceIds.length, 207, "mockup inventory changed; review its scope before updating the map");
assert.equal(new Set(sourceIds).size, 207, "duplicate mockup ID");
assert.equal(rows.length, 207, "every feature needs a complete map row");
assert.equal(new Set(mapIds).size, 207, "duplicate map ID");
assert.deepEqual(mapIds, sourceIds, "map must cover every source ID in source order");
for (const [, id, name, route, component, disposition, limitation] of rows) {
  assert.ok(name.trim() && route.trim() && disposition.trim() && limitation.trim(), `${id}: empty mapping field`);
  assert.ok(existsSync(resolve(root, "apps/web/src/components", component)), `${id}: missing ${component}`);
}

console.log("1.2.0 feature map: 207 unique mockup IDs, complete rows and existing component targets PASS");
