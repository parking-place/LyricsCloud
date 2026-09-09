import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requirePhysical = process.argv.includes("--require-physical");
const release = await readFile(path.join(root, "docs/runbooks/0.9.0-release-candidate.md"), "utf8");
const audit = await readFile(path.join(root, "docs/architecture/0.9.0-UI-AUDIT.md"), "utf8");
const evidenceRoot = path.join(root, "docs/runbooks/evidence/0.9.0-phase5");
const screenNames = [
  "01-auth.png", "02-songs.png", "03-song-form.png", "04-song-dashboard.png", "05-lyrics-editor.png",
  "06-rhyme-notes.png", "07-rhyme-editor.png", "08-prompts.png", "09-prompt-editor.png", "10-search.png",
  "11-recent.png", "12-favorites.png", "13-trash.png", "14-templates.png", "15-settings.png"
];

for (let phaseTask = 1; phaseTask <= 9; phaseTask += 1) {
  const id = `LC-090-P5-${String(phaseTask).padStart(2, "0")}`;
  assert(release.includes(id), `${id} is missing from the release matrix`);
}
for (const viewport of ["pc", "narrow-pc", "tablet", "mobile"]) {
  const names = (await readdir(path.join(evidenceRoot, viewport))).filter((name) => name.endsWith(".png")).sort();
  assert(JSON.stringify(names) === JSON.stringify(screenNames), `${viewport} release screenshots are incomplete`);
}
for (const id of ["ADD-ROOT-01", "ADD-ROOT-02", "ADD-ROOT-03", "ADD-ROOT-04", "ADD-ROOT-05", "ADD-05-01", "ADD-09-01"]) {
  const row = audit.split("\n").find((line) => line.includes(`| ${id} |`));
  assert(row?.includes("구현·검증"), `${id} is not in the final verified state`);
}
assert(audit.includes("미해결 P0/P1은 0개"), "UI audit P0/P1 conclusion is missing");
assert(release.includes("Chromium 151.0.7922.34"), "Chromium evidence is missing");
assert(release.includes("Firefox 153.0"), "Firefox evidence is missing");
assert(release.includes("WebKit 26.5"), "WebKit evidence is missing");

const ios = marker("IOS_PHYSICAL");
const android = marker("ANDROID_PHYSICAL");
if (requirePhysical) {
  assert(ios === "PASS", `IOS_PHYSICAL must be PASS, received ${ios}`);
  assert(android === "PASS", `ANDROID_PHYSICAL must be PASS, received ${android}`);
}

console.log(`0.9.0 Phase 5 release candidate: 15 screens, 4 viewports, 60 PNGs, additions verified; iOS=${ios}, Android=${android}`);

function marker(name) {
  const line = release.split("\n").find((candidate) => candidate.includes(`\`${name}:`));
  const value = line?.match(/: (PASS|PENDING|FAIL)`/)?.[1];
  assert(value, `${name} marker is missing`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
