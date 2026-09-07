import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const auditPath = path.join(root, "docs/architecture/0.9.0-UI-AUDIT.md");
const audit = await readFile(auditPath, "utf8");

const expectedScreens = Array.from({ length: 15 }, (_, index) => String(index + 1).padStart(2, "0"));
const mockupRoot = path.join(root, "0.Plans/Mock-up");
const mockupDirectories = (await readdir(mockupRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .map((entry) => entry.name.slice(0, 2))
  .sort();
assertEqual(mockupDirectories, expectedScreens, "mockup directories");

for (const number of expectedScreens) {
  assertCount(audit, new RegExp(`\\| UI-${number} \\|`, "g"), 1, `UI-${number}`);
  assertCount(audit, new RegExp(`\\| STATE-${number} \\|`, "g"), 1, `STATE-${number}`);
}

const additions = ["ADD-ROOT-01", "ADD-ROOT-02", "ADD-ROOT-03", "ADD-ROOT-04", "ADD-ROOT-05", "ADD-05-01", "ADD-09-01"];
for (const id of additions) assertCount(audit, new RegExp(`\\| ${id} \\|`, "g"), 1, id);

const viewports = ["pc", "narrow-pc", "tablet", "mobile"];
const evidenceRoot = path.join(root, "docs/runbooks/evidence/0.9.0-phase1");
for (const viewport of viewports) {
  const names = (await readdir(path.join(evidenceRoot, viewport))).filter((name) => name.endsWith(".png")).sort();
  assertEqual(names, expectedScreens.map((number) => `${number}-${screenSlug(number)}.png`), `${viewport} screenshots`);
  for (const name of names) {
    const signature = await readFile(path.join(evidenceRoot, viewport, name));
    if (signature.length < 8 || signature.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`${viewport}/${name} is not a PNG`);
  }
}

console.log("0.9.0 Phase 1 UI audit: 15 screens, 15 state rows, 7 source suggestions, 4 viewports, 60 PNGs OK");

function screenSlug(number) {
  return ({
    "01": "auth", "02": "songs", "03": "song-form", "04": "song-dashboard", "05": "lyrics-editor",
    "06": "rhyme-notes", "07": "rhyme-editor", "08": "prompts", "09": "prompt-editor", "10": "search",
    "11": "recent", "12": "favorites", "13": "trash", "14": "templates", "15": "settings"
  })[number];
}

function assertCount(value, pattern, expected, label) {
  const actual = value.match(pattern)?.length ?? 0;
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
