import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function walk(directory) {
  const results = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".private", "node_modules", "test-results", "playwright-report"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

const markdownFiles = walk(root);
const linkPattern = /!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*)?\)/g;
for (const file of markdownFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(linkPattern)) {
    let destination = match[1];
    if (destination.startsWith("<") && destination.endsWith(">")) destination = destination.slice(1, -1);
    if (/^(?:https?:|mailto:|data:)/i.test(destination) || destination.startsWith("#") || destination.startsWith("/")) continue;
    const encodedPath = destination.split("#", 1)[0];
    if (!encodedPath) continue;
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(encodedPath);
    } catch {
      failures.push(`${path.relative(root, file)}: invalid encoded link ${destination}`);
      continue;
    }
    const target = path.resolve(path.dirname(file), decodedPath);
    assert(target.startsWith(`${root}${path.sep}`) || target === root, `${path.relative(root, file)}: link escapes repository ${destination}`);
    assert(existsSync(target), `${path.relative(root, file)}: missing link target ${destination}`);
  }
}

const userGuide = read("docs/user-guide.md");
const uiAudit = read("docs/architecture/0.9.0-UI-AUDIT.md");
const uiNames = [...uiAudit.matchAll(/^\| UI-(?:0[1-9]|1[0-5]) \| ([^|]+) \|/gm)].map((match) => match[1].trim());
assert(uiNames.length === 15, `expected 15 canonical UI names, found ${uiNames.length}`);
for (const name of uiNames) assert(userGuide.includes(name), `user guide missing canonical screen name: ${name}`);

const selfHosting = read("docs/self-hosting.md");
const oauth = read("docs/runbooks/google-oauth-setup.md");
const backup = read("docs/runbooks/backup-restore-upgrade.md");
const support = read("docs/support.md");
const observation = read("docs/operations/OBSERVABILITY-DATA-CLASSIFICATION.md");
const alerts = read("docs/runbooks/observability-alerts.md");
const changelog = read("CHANGELOG.md");
const readme = read("README.md");
const publicationRunbook = read("docs/runbooks/dockerhub-publish.md");
const environmentExample = read(".env.example");
const environmentSchema = JSON.parse(read("config/environment-schema.1.0.0.json"));

for (const variable of ["NODE_ENV", "DATABASE_URL", "APP_VERSION", "BUILD_ID", "APP_ORIGIN", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET"]) {
  assert(Object.hasOwn(environmentSchema.properties, variable), `environment schema missing ${variable}`);
  assert(new RegExp(`^${variable}=`, "m").test(environmentExample), `.env.example missing ${variable}`);
  assert(selfHosting.includes(variable) || oauth.includes(variable), `operator documentation missing ${variable}`);
}

for (const command of [
  "docker compose --env-file .env -f compose.yaml -f compose.selfhost.yaml config --quiet",
  "docker compose --env-file .env -f compose.yaml -f compose.selfhost.yaml build --pull",
  "docker compose --env-file .env -f compose.yaml -f compose.selfhost.yaml up -d --wait",
  "curl --fail --silent http://127.0.0.1:8080/api/health/live",
  "curl --fail --silent http://127.0.0.1:8080/api/health/ready"
]) assert(selfHosting.includes(command), `self-hosting guide missing verified command: ${command}`);

const selfHostCompose = read("compose.selfhost.yaml");
for (const marker of ["target: migrate", "target: collaboration", "target: worker", "NODE_ENV: production", "read_only: true", "volumes: !reset []", "./.private/runtime/auth_allowed_emails"]) {
  assert(selfHostCompose.includes(marker), `compose.selfhost.yaml missing runtime contract: ${marker}`);
}

for (const [document, markers] of [
  [userGuide, ["30일", "7일", "lyricscloud.export.v1", "24시간 RPO", "미전송 초안"]],
  [backup, ["BACKUP_RETENTION_DAYS", "30일", "24시간 RPO", "1.0.1+", "새 빈 DB"]],
  [observation, ["trace/log는 7일", "집계 metric은 30일", "90일", "제목·가사·메모·태그"]],
  [alerts, ["autosave-failure", "search-latency", "purge-failure", "backup-failure", "service-unavailable", "사고 기록 양식"]],
  [support, ["RC-091-001", "RC-100-001", "RC-091-002", "OPS-100-001", "미해결 P0/P1은 0건"]],
  [changelog, ["## [1.0.6 candidate] - 2026-09-11", "## [1.0.5] - 2026-09-10", "Known limitations"]],
  [readme, ["apps/web/public/icons/lyricscloud-mark-dark.svg", "actions/workflows/ci.yml/badge.svg", "1.0.6 Phase 5", "LyricsCloud betacode", "원문 보존"]],
  [publicationRunbook, ["dev-<VERSION>-p<N>", "Release-latest", "dev 발행은 숫자 version", "release 발행은 Dev 계열"]]
]) for (const marker of markers) assert(document.includes(marker), `documentation policy marker missing: ${marker}`);

assert(existsSync(path.join(root, "SECURITY.md")), "SECURITY.md missing");
assert(statSync(path.join(root, "compose.selfhost.yaml")).isFile(), "compose.selfhost.yaml missing");

if (failures.length) {
  console.error(`1.0.6 current documentation validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`1.0.6 current documentation validation PASS (${markdownFiles.length} Markdown files, ${uiNames.length} screens)`);
