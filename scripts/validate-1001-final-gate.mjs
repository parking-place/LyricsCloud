import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), "utf8");

const expected = [
  ...ids("AUTH", 5), ...ids("SONG", 11), ...ids("LYRIC", 17),
  ...ids("RHYME", 10), ...ids("PROMPT", 14), ...ids("COMMON", 14),
];
const additions = [
  "ADD-ROOT-01", "ADD-ROOT-02", "ADD-ROOT-03", "ADD-ROOT-04", "ADD-ROOT-05",
  "ADD-02-01", "ADD-05-01", "ADD-09-01",
];

const sketch = await read("0.Plans/Sketch.md");
const section49 = sketch.slice(sketch.indexOf("# 49. 1차 출시 기능 범위"), sketch.indexOf("# 50. 서비스 설계 원칙"));
assertEqual((section49.match(/^- .+$/gm) ?? []).length, 71, "Sketch section 49 bullets");

const canonical = await read("0.Plans/1. Dev-phase/Requirements-Traceability.md");
const canonicalIds = canonical.split("\n")
  .filter((line) => /^\| REQ-[A-Z]+-\d{3} \|/.test(line))
  .map((line) => line.split("|")[1].trim());
assertEqual(canonicalIds, expected, "canonical requirement rows");

const rc = await read("docs/architecture/0.9.1-RC-TRACEABILITY.md");
const finalTrace = await read("docs/architecture/1.0.0-FINAL-TRACEABILITY.md");
for (const id of expected) {
  assertCount(rc, new RegExp(`\\b${id}\\b`, "g"), 1, `RC requirement ${id}`);
  assertCount(finalTrace, new RegExp(`\\b${id}\\b`, "g"), 1, `final requirement ${id}`);
}
for (const id of additions) assertCount(finalTrace, new RegExp(`\\b${id}\\b`, "g"), 1, `final suggestion ${id}`);

const mockupRoot = path.join(root, "0.Plans/Mock-up");
const mockups = (await readdir(mockupRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name));
assertEqual(mockups.length, 15, "numbered mockup README count");

const stack = await read("0.Plans/Implementation-Stack.md");
for (const decision of ["DEC-05-A", "DEC-07-A", "DEC-08-A", "DEC-09-A", "DEC-10-C", "DEC-11-A", "DEC-12-A", "DEC-13-A"]) {
  assertIncludes(stack, `- [X] \`${decision}\``, `selected decision ${decision}`);
  assertCount(finalTrace, new RegExp(`\\b${decision}\\b`, "g"), 1, `final decision ${decision}`);
}

for (const [relative, markers] of Object.entries({
  "docs/security/0.9.1-security-audit.md": ["미해결 P0 0건, P1 0건", "60개 Web API", "32개 DB 테이블"],
  "docs/runbooks/0.9.1-phase3-validation.md": ["현재 미해결 성능 P0/P1 0건", "2,500"],
  "docs/runbooks/0.9.1-phase4-validation.md": ["canary 0건", "iOS update PASS, Android update PASS"],
  "docs/runbooks/0.9.1-phase5-validation.md": ["상태: 완료", "새 P0/P1 운영 결함은 0건", "34214593249"],
})) {
  const evidence = await read(relative);
  for (const marker of markers) assertIncludes(evidence, marker, `${relative} marker`);
}

for (const marker of [
  "미해결 P0: 0건", "미해결 P1: 0건", "open issue 0건",
  "RC-091-001", "RC-100-001", "RC-091-002", "1.0.1",
  "iOS update PASS, Android update PASS", "4cdecf0ca7cd6900882376f41a49d360c1b9e441",
]) assertIncludes(finalTrace, marker, `final trace marker ${marker}`);

const ops = await read("docs/operations/OPS-0004-final-release-gate.md");
for (const marker of [
  "OPS-0004`, **Accepted**", "Evidence author / gate reviewer", "Repository owner / final approver",
  "Operations acceptance owner", "P0/P1은 일정", "gate는 자동 철회",
  "정식 tag·GitHub Release·`main`·release server 변경", "별도 명시적 승인 전까지 대기",
]) assertIncludes(ops, marker, `OPS-0004 marker ${marker}`);

const ownership = await read("0.Plans/1. Dev-phase/Decision-Ownership.md");
assertIncludes(ownership, "[`OPS-0004`](../../docs/operations/OPS-0004-final-release-gate.md)", "OPS-0004 decision link");
assertIncludes(ownership, "| `Accepted` |", "OPS-0004 accepted state");

const phase = await read("0.Plans/1. Dev-phase/1.0.0/1phase.md");
for (let index = 1; index <= 9; index += 1) {
  assertCount(phase, new RegExp(`LC-100-P1-${String(index).padStart(2, "0")}`, "g"), 1, `Phase task ${index}`);
}

const validation = await read("docs/runbooks/1.0.0-phase1-validation.md");
for (let index = 1; index <= 9; index += 1) {
  assertCount(validation, new RegExp(`LC-100-P1-${String(index).padStart(2, "0")}`, "g"), 1, `validation task ${index}`);
}
for (const marker of ["71 requirements", "15 README", "8 suggestion sources", "open issue 0", "iOS update PASS", "Android update PASS"]) {
  assertIncludes(validation, marker, `validation marker ${marker}`);
}

const releaseOperations = await read("scripts/validate-0915-release-operations.mjs");
assertIncludes(releaseOperations, 'await import("./validate-1001-final-gate.mjs")', "CI release operations final gate import");

console.log("1.0.0 Phase 1 gate: 71 requirements, 15 README files, 8 suggestion sources, selected DEC evidence, P0/P1 zero and OPS-0004 accepted");

function ids(group, count) {
  return Array.from({ length: count }, (_, index) => `REQ-${group}-${String(index + 1).padStart(3, "0")}`);
}

function assertCount(value, pattern, count, label) {
  const actual = value.match(pattern)?.length ?? 0;
  if (actual !== count) throw new Error(`${label}: expected ${count}, got ${actual}`);
}

function assertIncludes(value, needle, label) {
  if (!value.includes(needle)) throw new Error(`${label}: missing ${needle}`);
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
