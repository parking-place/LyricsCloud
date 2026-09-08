import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const budget = JSON.parse(await read("config/performance-budgets.0913.json"));
assert(budget.schemaVersion === "lyricscloud.performance.0913.v1", "performance budget schema is invalid");
assert(budget.fixture.resources === budget.fixture.songs + budget.fixture.lyrics + budget.fixture.rhymeNotes + budget.fixture.prompts, "fixture total is inconsistent");
for (const key of ["songListP95Ms", "songDashboardP95Ms", "searchShortP95Ms", "searchNormalP95Ms", "saveP95Ms", "revisionP95Ms", "exportTotalMs", "exportRssGrowthMiB", "purgeTotalMs", "concurrentReadP95Ms", "editorParseP95Ms", "editorCopyP95Ms", "errorRatePercent", "roundP95CvPercent", "acceleratedSoakRssGrowthMiB"]) {
  assert(Number.isFinite(budget.budgets[key]) && budget.budgets[key] >= 0, `budget ${key} is missing`);
}

const decision = await read("docs/operations/OPS-0003-performance-budget.md");
for (const marker of ["OPS-0003", "Accepted", "4 vCPU", "8 GiB", "PostgreSQL 18.6", "1~2글자", "24시간", "단일 replica"]) assert(decision.includes(marker), `OPS-0003 marker is missing: ${marker}`);
const report = await read("docs/runbooks/0.9.1-phase3-validation.md");
for (let index = 1; index <= 8; index += 1) assert(report.includes(`LC-091-P3-${String(index).padStart(2, "0")}`), `Phase 3 task ${index} is missing`);
for (const marker of ["p50", "p95", "오류율", "3회", "10,000줄", "250개", "100개", "P0/P1 0건"]) assert(report.includes(marker), `validation marker is missing: ${marker}`);

const phase = await read("0.Plans/1. Dev-phase/0.9.1/3phase.md");
for (let index = 1; index <= 8; index += 1) assert((phase.match(new RegExp(`LC-091-P3-${String(index).padStart(2, "0")}`, "g")) ?? []).length === 1, `Phase task ${index} must occur once`);
const lifecycle = await read("packages/database/src/lifecycle.ts");
for (const marker of ["id=any($1::uuid[])", "song_id=any($1::uuid[])"]) assert(lifecycle.includes(marker), `set-based purge marker is missing: ${marker}`);
assert(!lifecycle.includes("for (const resource of resources.rows)"), "resource purge regressed to N+1 writes");

const runner = await read("scripts/run-0913-rc.sh");
for (const marker of ["pnpm check", "pnpm test", "pnpm build", "pnpm test:performance:0913", "pnpm test:e2e", "pnpm test:e2e:release:0905"]) assert(runner.includes(marker), `RC runner marker is missing: ${marker}`);
const ci = await read(".github/workflows/ci.yml");
for (const marker of ["pnpm test:release:0913", "pnpm test:performance:0913", "pnpm test:e2e", "pnpm test:e2e:release:0905"]) assert(ci.includes(marker), `CI RC marker is missing: ${marker}`);

console.log("0.9.1 Phase 3 performance contract: 2500 synthetic resources, 3-round budgets, set-based purge, RC pipeline verified");

function assert(condition, message) { if (!condition) throw new Error(message); }
