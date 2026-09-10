import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getImagePublication } from "./image-publication-plan.mjs";
import { validateReleasePhase } from "./release-phase-state.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const requireRelease = process.argv.includes("--require-release");
const currentVersion = read("VERSION").trim();
const releasedVersion = "1.0.1";

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
const currentTraceability = read("docs/architecture/1.0.1-FINAL-TRACEABILITY.md");
const currentReleaseNotes = read("docs/releases/1.0.1.md");
const currentReleaseRunbook = read("docs/runbooks/1.0.1-phase10-private-beta-release.md");
const currentManifest = JSON.parse(read("config/release-manifest.1.0.1.json"));
const formalTraceability = read("docs/architecture/1.0.7-FINAL-TRACEABILITY.md");
const formalReleaseNotes = read("docs/releases/1.0.7.md");
const formalReleaseRunbook = read("docs/runbooks/1.0.7-release.md");
const formalReleaseChecklist = read("docs/runbooks/1.0.7-release-checklist.md");
const formalManifest = JSON.parse(read("config/release-manifest.1.0.7.json"));
const candidateTraceability = read("docs/architecture/1.0.7-FINAL-TRACEABILITY.md");

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
assert(workflow.includes("inputs.release == true") && workflow.includes("tags: ${{ steps.publication.outputs.tags }}")
  && workflow.includes("flavor: latest=false"), "tested publication plan is not wired into CI");
const publicationInput = { eventName: "workflow_dispatch", refType: "tag", refName: "v1.0.0", sha: "a".repeat(40), version: "1.0.0", release: true };
const releaseTags = getImagePublication(publicationInput).tags;
for (const tag of ["1.0.0", "Release", "latest", "Release-latest"]) assert(releaseTags.includes(tag), `release tag missing: ${tag}`);
const candidateTags = getImagePublication({ ...publicationInput, refType: "branch", refName: "phase/1.0.0-p6-stabilization", release: false }).tags;
for (const tag of ["1.0.0", "Release", "latest", "Dev", "Dev-latest"]) assert(!candidateTags.includes(tag), `P6 candidate moves protected tag: ${tag}`);
assert(tagScript.includes("release:tag") && tagScript.includes("^v([0-9]+\\.[0-9]+\\.[0-9]+)$"), "release tag guard missing");
try {
  const phase6Plan = status.includes('current_phase: "1.0.0/6phase.md"') ? read("0.Plans/1. Dev-phase/1.0.0/6phase.md") : "";
  validateReleasePhase(status, { requireRelease, phase6Plan, phaseCount: currentVersion === "1.0.1" ? 10 : 5 });
} catch { failures.push("STATUS must identify an allowed historical or current release phase"); }
for (const marker of ["1.0.7 Phase 5", "1.0.7 release notes", "CHANGELOG.md"]) {
  assert(readme.includes(marker), `README release handoff marker missing: ${marker}`);
}
assert(runbookIndex.includes("1.0.0-phase5-release.md"), "runbook index missing Phase 5 release handoff");

const currentRequirementIds = new Set(currentTraceability.match(/NF-REQ-(?:00[1-9]|01[0-9]|02[01])/gu) ?? []);
assert(currentRequirementIds.size === 21, `expected 21 current requirement IDs, found ${currentRequirementIds.size}`);
for (const marker of ["P10 release gate", "미해결 제품 P0/P1 0건", "OPS-100-001", "Windows Chrome·Edge PASS", "Google signup"]) {
  assert(currentTraceability.includes(marker), `1.0.1 traceability marker missing: ${marker}`);
}
for (const marker of ["Private Beta", "Windows Chrome·Edge", "알려진 제한", "OPS-100-001"]) {
  assert(currentReleaseNotes.includes(marker), `1.0.1 release notes marker missing: ${marker}`);
}
for (const marker of ["annotated `v1.0.1`", "publish=true", "release=true", "Release-latest", "application-first rollback"]) {
  assert(currentReleaseRunbook.includes(marker), `1.0.1 release runbook marker missing: ${marker}`);
}
assert(currentManifest.releaseVersion === releasedVersion && currentManifest.database.requiredLatestSchema === "0901_beta_signup.sql",
  "sealed 1.0.1 release manifest boundary invalid");
const currentReleaseTags = getImagePublication({ eventName: "workflow_dispatch", refType: "tag", refName: `v${releasedVersion}`,
  sha: "b".repeat(40), version: releasedVersion, release: true }).tags;
for (const tag of [releasedVersion, "Release", "latest", "Release-latest"]) assert(currentReleaseTags.includes(tag), `sealed release tag missing: ${tag}`);
const currentDevTags = getImagePublication({ eventName: "push", refType: "branch", refName: "phase/1.0.7-p5-library-view-release",
  sha: "b".repeat(40), version: currentVersion, release: false }).tags;
for (const tag of [currentVersion, "1.0.2", releasedVersion, "Release", "latest", "Release-latest"]) assert(!currentDevTags.includes(tag), `P5 dev moves protected tag: ${tag}`);
for (const marker of ["APP_VERSION: 1.0.7", "APP_PHASE: p5", "test:migration:1001", "test:environment:101"]) {
  assert(workflow.includes(marker), `P5 CI marker missing: ${marker}`);
}
for (const marker of ["NF-REQ-029", "AC-1.0.7-01", "AC-1.0.7-04", "P0/P1", "OPS-100-001", "1001_library_view_settings.sql"]) {
  assert(candidateTraceability.includes(marker), `1.0.7 traceability marker missing: ${marker}`);
}
for (const marker of ["P5", "P0/P1", "OPS-100-001", "동일 SHA 개발 인수"]) {
  assert(formalTraceability.includes(marker), `1.0.7 traceability marker missing: ${marker}`);
}
for (const marker of ["목록", "그리드", "계정", "알려진 제한", "OPS-100-001"]) {
  assert(formalReleaseNotes.includes(marker), `1.0.7 release notes marker missing: ${marker}`);
}
for (const marker of ["annotated `v1.0.7`", "publish=true", "release=true", "Release-latest", "application-first rollback"]) {
  assert(formalReleaseRunbook.includes(marker), `1.0.7 release runbook marker missing: ${marker}`);
}
for (const marker of ["main", "annotated `v1.0.7`", "exact digest", "OPS-100-001"]) {
  assert(formalReleaseChecklist.includes(marker), `1.0.7 release checklist marker missing: ${marker}`);
}
assert(formalManifest.releaseVersion === "1.0.7" && formalManifest.releaseChannel === "release"
  && formalManifest.productionAuthorized === true && formalManifest.database.requiredLatestSchema === "1001_library_view_settings.sql",
  "1.0.7 formal release manifest boundary invalid");
const formalReleaseTags = getImagePublication({ eventName: "workflow_dispatch", refType: "tag", refName: "v1.0.7",
  sha: "c".repeat(40), version: "1.0.7", release: true }).tags;
for (const tag of ["1.0.7", "Release", "latest", "Release-latest"]) {
  assert(formalReleaseTags.includes(tag), `1.0.7 release tag missing: ${tag}`);
}

if (requireRelease) {
  try {
    const tagName = `v${currentVersion}`;
    const objectType = execFileSync("git", ["cat-file", "-t", `refs/tags/${tagName}`], { cwd: root, encoding: "utf8" }).trim();
    const tagCommit = execFileSync("git", ["rev-parse", `${tagName}^{commit}`], { cwd: root, encoding: "utf8" }).trim();
    const headCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    assert(objectType === "tag", `${tagName} must be an annotated tag object`);
    assert(tagCommit === headCommit, `${tagName} must point to the approval commit`);
  } catch (error) {
    failures.push(`release tag verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error(`1.0.0 Phase 5 final release validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`1.0.0 historical artifacts plus ${currentVersion} release boundary validation PASS (${currentRequirementIds.size} current requirements, ${requirementIds.size} historical requirements, ${uiIds.size} screens, ${additionIds.size} proposal sources${requireRelease ? ", annotated tag exact" : ""})`);
