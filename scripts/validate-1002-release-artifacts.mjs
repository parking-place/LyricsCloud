import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { validateEnvironment } from "./check-environment-1002.mjs";

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const assertIncludes = (value, expected, message) => assert(value.includes(expected), message);

const version = (await read("VERSION")).trim();
assert(version === "1.0.0", "VERSION must be 1.0.0");
const packages = ["package.json", "apps/web/package.json", "apps/collaboration/package.json", "apps/worker/package.json",
  "packages/auth/package.json", "packages/config/package.json", "packages/database/package.json", "packages/domain/package.json",
  "packages/editor/package.json", "packages/observability/package.json", "packages/ui/package.json"];
for (const path of packages) assert((await json(path)).version === version, `${path} version must equal VERSION`);

const status = await read("0.Plans/1. Dev-phase/STATUS.md");
assertIncludes(status, 'current_version: "1.0.0"', "STATUS current version is not sealed");
const runtime = await read("packages/config/src/index.ts");
assertIncludes(runtime, 'appVersion: env.APP_VERSION ?? "1.0.0"', "runtime default version is not sealed");
assertIncludes(await read("apps/web/next.config.ts"), 'generateBuildId: async () => process.env.NEXT_BUILD_ID ?? "lyricscloud-1.0.0"', "deterministic Next build ID missing");
for (const path of ["compose.yaml", "compose.backup.yaml", ".env.example"]) assertIncludes(await read(path), "1.0.0", `${path} lacks 1.0.0`);

const lockfile = await read("pnpm-lock.yaml");
const environment = await read("config/environment-schema.1.0.0.json");
const migrationsText = await read("config/migrations.1.0.0.json");
const licensesText = await read("config/licenses.1.0.0.json");
const environmentSchema = JSON.parse(environment);
const migrations = JSON.parse(migrationsText);
const licenses = JSON.parse(licensesText);
const manifest = await json("config/release-manifest.1.0.0.json");
assert(manifest.source.lockfileSha256 === hash(lockfile), "release lockfile checksum changed");
assert(manifest.environment.schemaSha256 === hash(environment), "environment schema checksum changed");
assert(manifest.database.manifestSha256 === hash(migrationsText), "migration manifest checksum changed");
assert(manifest.licenses.inventorySha256 === hash(licensesText), "license inventory checksum changed");
assert(licenses.lockfileSha256 === hash(lockfile), "license inventory lockfile checksum changed");
assert(Object.values(licenses.licenses).flat().length === licenses.totalPackages, "license inventory count changed");
assert(licenses.review.unknownLicenses.length === 0 && licenses.review.blockedLicenses.length === 0, "license review has blockers");
assert(environmentSchema.properties.APP_VERSION.const === version, "environment APP_VERSION differs");
assert(environmentSchema.properties.BUILD_ID.pattern === "^[0-9a-f]{40}$", "production BUILD_ID contract missing");
for (const name of ["DATABASE_URL", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET"]) assert(environmentSchema.properties[name]["x-secret"] === true, `${name} must be secret`);
for (const service of ["web", "collaboration", "worker", "migrate", "backup"]) {
  assert(Array.isArray(environmentSchema["x-required-by-service"][service]), `${service} environment requirements missing`);
}
const commonEnvironment = { NODE_ENV: "production", DATABASE_URL: "postgresql://user:secret@db/app", APP_VERSION: version, BUILD_ID: "a".repeat(40) };
assert(validateEnvironment("web", { ...commonEnvironment, APP_ORIGIN: "https://lyrics.example", GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "secret", SESSION_SECRET: "s".repeat(32), AUTH_ALLOWED_EMAILS_FILE: "/run/secrets/allowed", COLLABORATION_INTERNAL_URL: "http://collaboration:3001" }), "valid web environment rejected");
assert(validateEnvironment("collaboration", { ...commonEnvironment, APP_ORIGIN: "https://lyrics.example", COLLABORATION_PORT: "3001" }), "valid collaboration environment rejected");
assert(validateEnvironment("worker", { ...commonEnvironment, WORKER_HEALTH_PORT: "3002" }), "valid worker environment rejected");
assert(validateEnvironment("migrate", commonEnvironment), "valid migration environment rejected");
assert(validateEnvironment("backup", { NODE_ENV: "production", APP_VERSION: version, BUILD_ID: "a".repeat(40), BACKUP_STORAGE_ID: "external-1",
  BACKUP_REPOSITORY_DIR: "/backup/repository", PGPASSWORD_FILE: "/run/secrets/postgres", AGE_RECIPIENT_FILE: "/run/secrets/age" }), "valid backup environment rejected");
try {
  validateEnvironment("web", { ...commonEnvironment, APP_ORIGIN: "http://unsafe.example" });
  assert(false, "invalid production web environment was accepted");
} catch (error) {
  assert(error instanceof Error && error.message.includes("APP_ORIGIN") && error.message.includes("GOOGLE_CLIENT_SECRET"), "invalid key report is incomplete");
  assert(!String(error).includes("postgresql://user:secret"), "environment error leaked a value");
}

const migrationFiles = (await readdir(new URL("../packages/database/migrations", import.meta.url))).filter((name) => name.endsWith(".sql")).sort();
assert(JSON.stringify(migrationFiles) === JSON.stringify(migrations.applyOrder.map(({ name }) => name)), "migration order changed");
for (const entry of migrations.applyOrder) assert(hash(await read(`packages/database/migrations/${entry.name}`)) === entry.sha256, `${entry.name} checksum changed`);
assert(migrations.latestSchema === migrationFiles.at(-1), "latest migration differs");
assert(migrations.rollback.destructiveDownMigrationAllowed === false, "destructive down migration must remain disabled");

assert(manifest.releaseVersion === version && manifest.productionAuthorized === false, "release authorization boundary invalid");
assert(manifest.source.commit === "$GIT_SHA" && manifest.source.builtAt === "$BUILT_AT", "release source placeholders missing");
for (const service of ["web", "collaboration", "worker", "migrate"]) {
  const image = manifest.images[service];
  assert(image.repository === `parkingplace/lyricscloud-${service}`, `${service} repository invalid`);
  assert(image.digest === `$${service.toUpperCase()}_DIGEST`, `${service} digest placeholder invalid`);
  assert(image.user === "65532", `${service} nonroot identity missing`);
}
assert(manifest.artifactPolicy.deployByDigestOnly === true, "digest-only deployment is required");
assert(manifest.attestations.signatureVerified && manifest.attestations.provenanceVerified && manifest.attestations.sbomAttached, "artifact attestations missing");
assertIncludes(manifest.approval.productionDeployment, "separate explicit user authorization", "production approval boundary missing");

const dockerfiles = `${await read("infra/docker/Dockerfile.web")}\n${await read("infra/docker/Dockerfile.service")}`;
assertIncludes(dockerfiles, "distroless/nodejs24-debian13:nonroot@sha256:", "pinned nonroot runtime missing");
assert((dockerfiles.match(/HEALTHCHECK/g) ?? []).length === 3, "three long-running image healthchecks required");
const collaboration = await read("apps/collaboration/src/server.ts");
const worker = await read("apps/worker/src/server.ts");
for (const signal of ["SIGINT", "SIGTERM"]) {
  assertIncludes(collaboration, signal, `collaboration ${signal} handler missing`);
  assertIncludes(worker, signal, `worker ${signal} handler missing`);
}
const compose = await read("compose.yaml");
const backupCompose = await read("compose.backup.yaml");
assertIncludes(compose, "postgres_data:/var/lib/postgresql", "PostgreSQL persistent boundary missing");
assertIncludes(backupCompose, "target: /backup/repository", "backup persistent boundary missing");
assertIncludes(backupCompose, "read_only: true", "backup read-only root missing");
const dockerignore = await read(".dockerignore");
for (const entry of [".env", ".private", "data", "backups", "exports", "logs"]) assert(dockerignore.split(/\r?\n/).includes(entry), `.dockerignore must exclude ${entry}`);
for (const path of ["scripts/check-environment-1002.mjs", "scripts/generate-1002-release-manifest.mjs", "scripts/verify-1002-reproducible-images.sh",
  "scripts/docker-image-tag.sh", "scripts/verify-image-artifact.sh", "scripts/scan-container-vulnerabilities.sh", "scripts/scan-container-secrets.sh",
  "scripts/verify-production-images.sh", "scripts/verify-0915-upgrade-rollback.sh"]) await read(path);

console.log(`1.0.0 Phase 2 artifact contract: ${packages.length} package versions, ${migrationFiles.length} sealed migrations, 4 digest-only signed images, environment schema verified`);
