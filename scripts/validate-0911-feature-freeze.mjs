import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), "utf8");

const sketch = await read("0.Plans/Sketch.md");
const section49 = sketch.slice(sketch.indexOf("# 49. 1차 출시 기능 범위"), sketch.indexOf("# 50. 서비스 설계 원칙"));
const bullets = section49.match(/^- .+$/gm) ?? [];
assertEqual(bullets.length, 71, "Sketch section 49 bullets");

const expected = [
  ...ids("AUTH", 5), ...ids("SONG", 11), ...ids("LYRIC", 17),
  ...ids("RHYME", 10), ...ids("PROMPT", 14), ...ids("COMMON", 14)
];
const trace = await read("0.Plans/1. Dev-phase/Requirements-Traceability.md");
const traceRows = trace.split("\n").filter((line) => /^\| REQ-[A-Z]+-\d{3} \|/.test(line));
const traceIds = traceRows.map((line) => line.split("|")[1].trim());
assertEqual(traceIds, expected, "canonical requirement rows");
for (const row of traceRows) {
  const columns = row.split("|").map((value) => value.trim());
  if (!columns[4] || !columns[5] || !/\d\.\d\.\d/.test(columns[4]) || !/\d\.\d\.\d/.test(columns[5])) {
    throw new Error(`orphan implementation or verification evidence: ${columns[1]}`);
  }
}

const rc = await read("docs/architecture/0.9.1-RC-TRACEABILITY.md");
for (const id of expected) assertCount(rc, new RegExp(`\\b${id}\\b`, "g"), 1, `RC disposition ${id}`);

const mockupRoot = path.join(root, "0.Plans/Mock-up");
const directories = (await readdir(mockupRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();
assertEqual(directories.length, 15, "numbered mockup README count");
const extraSources = [];
for (const directory of directories) {
  const contents = await read(`0.Plans/Mock-up/${directory}/README.md`);
  if (contents.includes("## 추가 제안")) extraSources.push(directory.slice(0, 2));
}
assertEqual(extraSources, ["02", "05", "09"], "numbered README suggestion sources");

const mockupIndex = await read("0.Plans/Mock-up/README.md");
const supplement = mockupIndex.slice(mockupIndex.indexOf("## 기획에 보완한 항목"));
assertEqual((supplement.match(/^- .+$/gm) ?? []).length, 5, "root mockup suggestions");

const additions = [
  "ADD-ROOT-01", "ADD-ROOT-02", "ADD-ROOT-03", "ADD-ROOT-04", "ADD-ROOT-05",
  "ADD-02-01", "ADD-05-01", "ADD-09-01"
];
const audit = await read("docs/architecture/0.9.0-UI-AUDIT.md");
for (const id of additions) {
  assertCount(rc, new RegExp(`\\b${id}\\b`, "g"), 1, `RC suggestion ${id}`);
  assertCount(audit, new RegExp(`\\| ${id} \\|`, "g"), 1, `UI audit suggestion ${id}`);
}

const governance = await read("docs/runbooks/0.9.1-rc-governance.md");
for (const marker of [
  "OPS-0001` / `Accepted", "phase/0.9.1-p<phase>-<slug>", "v1.0.0-rc.<n>",
  "재현된 결함 수정", "보안·데이터 보호 하드닝", "성능·안정성 수정", "테스트·문서 수정",
  "P0/P1 0건", "현재 요청에서 정식 릴리즈와 release server 변경을 명시적으로 승인"
]) assertIncludes(governance, marker, `OPS-0001 marker ${marker}`);

const ownership = await read("0.Plans/1. Dev-phase/Decision-Ownership.md");
assertIncludes(ownership, "[`OPS-0001`](../../docs/runbooks/0.9.1-rc-governance.md)", "OPS-0001 link");
assertIncludes(ownership, "| `Accepted` |", "accepted decision state");

const phase = await read("0.Plans/1. Dev-phase/0.9.1/1phase.md");
for (let index = 1; index <= 8; index += 1) {
  assertCount(phase, new RegExp(`LC-091-P1-${String(index).padStart(2, "0")}`, "g"), 1, `Phase task ${index}`);
}

console.log("0.9.1 Phase 1 freeze: 71 requirements, 15 README files, 8 suggestion sources, 0 orphans, OPS-0001 accepted");

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
