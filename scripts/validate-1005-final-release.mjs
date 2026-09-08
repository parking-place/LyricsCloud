import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const requireRelease = process.argv.includes("--require-release");

const phasePaths = [1, 2, 3, 4, 5].map((phase) => `0.Plans/1. Dev-phase/1.0.0/${phase}phase.md`);
const phases = phasePaths.map(read);
for (let index = 0; index < 4; index += 1) {
  assert(/상태: \*\*완료(?:\*\*|\s|—)/u.test(phases[index]), `Phase ${index + 1} must be complete`);
}
assert(/상태: \*\*(?:진행 중|검토|완료)\*\*/u.test(phases[4]), "Phase 5 state must be active or complete");
for (let index = 1; index <= 9; index += 1) {
  const id = `LC-100-P5-${String(index).padStart(2, "0")}`;
  assert((phases[4].match(new RegExp(id, "gu")) ?? []).length === 1, `${id} must occur exactly once`);
}

const traceability = read("docs/architecture/1.0.0-FINAL-TRACEABILITY.md");
const requirementIds = new Set(traceability.match(/REQ-(?:AUTH|SONG|LYRIC|RHYME|PROMPT|COMMON)-\d{3}/gu) ?? []);
const uiAudit = read("docs/architecture/0.9.0-UI-AUDIT.md");
const uiIds = new Set(uiAudit.match(/UI-(?:0[1-9]|1[0-5])/gu) ?? []);
const additionIds = new Set(traceability.match(/ADD-(?:ROOT|02|05|09)-\d{2}/gu) ?? []);
assert(requirementIds.size === 71, `expected 71 requirement IDs, found ${requirementIds.size}`);
assert(uiIds.size === 15, `expected 15 UI IDs, found ${uiIds.size}`);
assert(additionIds.size === 8, `expected 8 additional proposal IDs, found ${additionIds.size}`);
for (const marker of ["미해결 P0: 0건", "미해결 P1: 0건", "OPS-100-001", "24시간 RPO를 보장하지 않는다"]) {
  assert(traceability.includes(marker), `traceability marker missing: ${marker}`);
}

const releaseNotes = read("docs/releases/1.0.0.md");
const backlog = read("docs/operations/1.0.1-backlog.md");
const report = read("docs/runbooks/1.0.0-phase5-release.md");
const support = read("docs/support.md");
const phase3 = read("docs/runbooks/1.0.0-phase3-deployment.md");
const governance = read("docs/runbooks/0.9.1-rc-governance.md");
const status = read("0.Plans/1. Dev-phase/STATUS.md");
const workflow = read(".github/workflows/ci.yml");
const tagScript = read("scripts/docker-image-tag.sh");
const readme = read("README.md");
const runbookIndex = read("docs/runbooks/README.md");

for (const marker of ["주요 기능", "설치와 업그레이드", "알려진 제한과 운영 위험", "지원과 보안", "iOS update PASS, Android update PASS", "미해결 P0/P1은 0건"]) {
  assert(releaseNotes.includes(marker), `release notes marker missing: ${marker}`);
}
for (const id of ["OPS-100-001", "RC-091-001", "RC-100-001", "RC-091-002"]) {
  assert(backlog.includes(id), `backlog missing ${id}`);
  assert(support.includes(id), `support policy missing ${id}`);
}
for (const marker of ["annotated `v1.0.0`", "publish=true", "release=true", "Release", "latest", "0802_lifecycle.sql", "실제 Google 비밀번호 입력은 자동화하지 않는다", "backup 경보는 미설치"]) {
  assert(report.includes(marker), `Phase 5 report marker missing: ${marker}`);
}
assert(!phase3.includes("개발 credential은 재사용하지 않는다"), "Phase 3 deployment contradicts approved credential reuse");
assert(phase3.includes("production DB/volume은 분리") && phase3.includes("OPS-100-001"), "Phase 3 approved production boundary missing");
assert(governance.includes("annotated/signature-capable tag") && governance.includes("tag는 이동하지 않고"), "immutable tag governance missing");
assert(workflow.includes("inputs.release == true") && workflow.includes("value=Release") && workflow.includes("value=latest"), "release workflow tags missing");
assert(tagScript.includes("release:tag") && tagScript.includes("^v([0-9]+\\.[0-9]+\\.[0-9]+)$"), "release tag guard missing");
assert(status.includes('current_version: "1.0.0"') && status.includes('current_phase: "1.0.0/5phase.md"'), "STATUS is not on 1.0.0 Phase 5");
for (const marker of ["1.0.0 Phase 5 — 최종 릴리스", "docs/releases/1.0.0.md", "docs/operations/1.0.1-backlog.md"]) {
  assert(readme.includes(marker), `README release handoff marker missing: ${marker}`);
}
assert(runbookIndex.includes("1.0.0-phase5-release.md"), "runbook index missing Phase 5 release handoff");

if (requireRelease) {
  try {
    const objectType = execFileSync("git", ["cat-file", "-t", "refs/tags/v1.0.0"], { cwd: root, encoding: "utf8" }).trim();
    const tagCommit = execFileSync("git", ["rev-parse", "v1.0.0^{commit}"], { cwd: root, encoding: "utf8" }).trim();
    const headCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    assert(objectType === "tag", "v1.0.0 must be an annotated tag object");
    assert(tagCommit === headCommit, "v1.0.0 must point to the approval commit");
  } catch (error) {
    failures.push(`release tag verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error(`1.0.0 Phase 5 final release validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`1.0.0 Phase 5 final release validation PASS (${requirementIds.size} requirements, ${uiIds.size} screens, ${additionIds.size} proposal sources${requireRelease ? ", annotated tag exact" : ""})`);
