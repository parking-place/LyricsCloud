import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), "utf8");

const routeRoot = path.join(root, "apps/web/src/app/api");
const routeFiles = (await filesBelow(routeRoot)).filter((file) => file.endsWith("/route.ts")).sort();
const routePaths = routeFiles.map((file) => `/api/${path.relative(routeRoot, path.dirname(file)).split(path.sep).join("/")}`);
assertEqual(routePaths.length, 70, "API route files");

const ownership = await read("docs/security/0.9.1-api-ownership-matrix.md");
for (const routePath of routePaths) {
  assertCount(ownership, new RegExp("`" + escapeRegExp(routePath) + "`", "g"), 1, `ownership route ${routePath}`);
}

let mutationCount = 0;
for (const routeFile of routeFiles) {
  const source = await read(path.relative(root, routeFile));
  const starts = [...source.matchAll(/^export async function (POST|PUT|PATCH|DELETE)\b/gm)];
  mutationCount += starts.length;
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index;
    const end = source.indexOf("\nexport async function ", start + 1);
    const handler = source.slice(start, end === -1 ? undefined : end);
    assert(handler.includes("mutationOriginAllowed(request)"), `${routePaths[routeFiles.indexOf(routeFile)]} ${starts[index][1]} lacks Origin guard`);
  }
}
assertEqual(mutationCount, 61, "mutation handlers");

const migrationRoot = path.join(root, "packages/database/migrations");
const migrationFiles = (await filesBelow(migrationRoot)).filter((file) => file.endsWith(".sql"));
const tableNames = new Set();
for (const migrationFile of migrationFiles) {
  const source = await read(path.relative(root, migrationFile));
  for (const match of source.matchAll(/create table(?: if not exists)?\s+([a-z_][a-z0-9_]*)/gi)) tableNames.add(match[1]);
}
assertEqual(tableNames.size, 49, "database tables");
for (const tableName of [...tableNames].sort()) {
  assertCount(ownership, new RegExp("`" + tableName + "`", "g"), 1, `ownership table ${tableName}`);
}

const productionSources = [];
for (const sourceRoot of ["apps", "packages"]) {
  for (const file of await filesBelow(path.join(root, sourceRoot))) {
    const relative = path.relative(root, file);
    if (relative.split(path.sep).some((segment) => [".next", "node_modules", "dist", "coverage"].includes(segment))) continue;
    if (!/\.(?:ts|tsx|js|jsx|mjs)$/.test(file) || /(?:\.test\.|\.spec\.)/.test(file)) continue;
    productionSources.push([relative, await read(relative)]);
  }
}
const dangerousHtml = productionSources.flatMap(([file, source]) => [...source.matchAll(/dangerouslySetInnerHTML/g)].map(() => file));
assertEqual(dangerousHtml, ["apps/web/src/app/layout.tsx"], "dangerouslySetInnerHTML allowlist");
const layout = await read("apps/web/src/app/layout.tsx");
assertIncludes(layout, "nonce={nonce}", "theme script nonce");
for (const [file, source] of productionSources) {
  assert(!/\.innerHTML\s*=/.test(source), `${file} contains an innerHTML assignment`);
  assert(!/\beval\s*\(/.test(source), `${file} contains eval()`);
  assert(!/new\s+Function\b/.test(source), `${file} contains new Function`);
}

const requestSecurity = await read("apps/web/src/lib/request-security.ts");
assertIncludes(requestSecurity, "MAX_API_BODY_BYTES = 1024 * 1024", "1 MiB API body limit");
assertIncludes(requestSecurity, '"Retry-After"', "rate-limit retry header");
assertIncludes(requestSecurity, 'request.headers.get("cf-connecting-ip")', "Cloudflare client address precedence");
assertIncludes(requestSecurity, "this.#buckets.size <= 8_000", "rate-limit bucket bound");
const proxy = await read("apps/web/src/proxy.ts");
for (const marker of ["apiBodyExceedsLimit(request)", "PAYLOAD_TOO_LARGE", "'nonce-${nonce}'", "object-src 'none'", "frame-ancestors 'none'"]) {
  assertIncludes(proxy, marker, `proxy marker ${marker}`);
}
const rateContracts = [
  ["apps/web/src/app/api/auth/login/route.ts", "auth-login:${requestClientKey(request)}", "40, 5 * 60_000"],
  ["apps/web/src/app/api/auth/callback/route.ts", "auth-callback:${requestClientKey(request)}", "40, 5 * 60_000"],
  ["apps/web/src/app/api/search/route.ts", "search:${auth.userId}", "120, 60_000"],
  ["apps/web/src/app/api/export/route.ts", "export:${auth.userId}", "6, 60_000"]
];
for (const [file, key, limit] of rateContracts) {
  const source = await read(file);
  assertIncludes(source, key, `${file} rate key`);
  assertIncludes(source, limit, `${file} rate limit`);
}

const distroless = "gcr.io/distroless/nodejs24-debian13:nonroot@sha256:774b7d020b24214835769e24c3544835526cd0288f0b094eae48e8b2c2429a79";
const webDockerfile = await read("infra/docker/Dockerfile.web");
const serviceDockerfile = await read("infra/docker/Dockerfile.service");
assertCount(webDockerfile, new RegExp(escapeRegExp(distroless), "g"), 1, "web Distroless digest");
assertCount(serviceDockerfile, new RegExp(escapeRegExp(distroless), "g"), 1, "service Distroless digest");
for (const [label, source] of [["web", webDockerfile], ["service", serviceDockerfile]]) {
  assertIncludes(source, "--chown=65532:65532", `${label} nonroot ownership`);
  assertIncludes(source, "HEALTHCHECK", `${label} baked healthcheck`);
}
for (const marker of ["collaboration.mjs", "worker.mjs", "migrate.mjs"]) assertIncludes(serviceDockerfile, marker, `bundled ${marker}`);
const compose = await read("compose.development-server.yaml");
assertCount(compose, /^\s+read_only: true$/gm, 4, "read-only production services");
assertCount(compose, /^\s+tmpfs:$/gm, 4, "production tmpfs declarations");
for (const target of ["collaboration", "worker", "migrate"]) assertIncludes(compose, `target: ${target}`, `production Compose target ${target}`);
for (const command of ["/app/apps/web/server.js", "/app/collaboration.mjs", "/app/worker.mjs", "/app/migrate.mjs"]) {
  assertIncludes(compose, command, `production Compose command ${command}`);
}
assertCount(compose, /\/nodejs\/bin\/node/g, 3, "Distroless Compose healthchecks");
assertIncludes(compose, "file: ./.private/runtime/auth_allowed_emails", "Distroless-readable runtime allowlist");
const imageVerification = await read("scripts/verify-production-images.sh");
for (const marker of ["--read-only", ".Config.User", ".HostConfig.ReadonlyRootfs"]) assertIncludes(imageVerification, marker, `image verification ${marker}`);
for (const marker of ["/run/secrets/auth_allowed_emails", "/api/auth/session", "image-smoke-session"]) {
  assertIncludes(imageVerification, marker, `production auth image verification ${marker}`);
}
const deployment = await read("scripts/deploy-development.sh");
assertIncludes(deployment, "docker inspect --format", "Distroless deployment environment inspection");
assertCount(deployment, /\/nodejs\/bin\/node/g, 2, "Distroless deployment probes");
for (const marker of ["install -o 65532 -g 65532 -m 400", "65532:65532:400", "{{.Config.User}}", '!= "65532"']) {
  assertIncludes(deployment, marker, `Distroless runtime secret marker ${marker}`);
}

for (const packageFile of ["apps/collaboration/package.json", "apps/worker/package.json", "packages/database/package.json"]) {
  const manifest = JSON.parse(await read(packageFile));
  assert(!manifest.dependencies?.tsx, `${packageFile} must not ship tsx`);
  assertEqual(manifest.devDependencies?.tsx, "4.20.6", `${packageFile} development tsx`);
}
const databasePackage = JSON.parse(await read("packages/database/package.json"));
assertEqual(databasePackage.dependencies["drizzle-orm"], "0.45.2", "Drizzle security version");

const ci = await read(".github/workflows/ci.yml");
for (const marker of [
  "pnpm audit --prod --audit-level high", "zricethezav/gitleaks:v8.28.0@sha256:",
  "pnpm test:security:0912", "scan-container-vulnerabilities.sh", "scan-container-secrets.sh"
]) assertIncludes(ci, marker, `CI security gate ${marker}`);

const audit = await read("docs/security/0.9.1-security-audit.md");
for (let index = 1; index <= 6; index += 1) assertIncludes(audit, `SEC-091-${String(index).padStart(3, "0")}`, `finding ${index}`);
for (const marker of ["미해결 P0 0건, P1 0건", "Gitleaks", "Trivy", "--ignore-unfixed", "rate limiter는 단일 Node instance"]) {
  assertIncludes(audit, marker, `audit marker ${marker}`);
}
const phase = await read("0.Plans/1. Dev-phase/0.9.1/2phase.md");
for (let index = 1; index <= 9; index += 1) assertCount(phase, new RegExp(`LC-091-P2-${String(index).padStart(2, "0")}`, "g"), 1, `Phase task ${index}`);
const e2e = await read("tests/e2e/security-hardening.spec.ts");
for (const marker of ["PAYLOAD_TOO_LARGE", "RATE_LIMITED", "<script>", "javascript:", 'headers()["retry-after"]']) {
  assertIncludes(e2e, marker, `security E2E marker ${marker}`);
}

console.log(`0.9.1 Phase 2 security hardening: ${routePaths.length} routes, ${mutationCount} mutation guards, ${tableNames.size} tables, P0/P1=0`);

async function filesBelow(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesBelow(full));
    else result.push(full);
  }
  return result;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertCount(value, pattern, count, label) {
  const actual = value.match(pattern)?.length ?? 0;
  if (actual !== count) throw new Error(`${label}: expected ${count}, got ${actual}`);
}

function assertIncludes(value, needle, label) {
  assert(value.includes(needle), `${label}: missing ${needle}`);
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
