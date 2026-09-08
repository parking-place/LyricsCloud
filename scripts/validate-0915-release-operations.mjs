import { readFile, stat } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const [configText, backup, restore, rpo, image, compose, timer, service, decision, runbook, report, phase, ownership, workflow, runner, dashboard, classification, vulnerabilityScan, secretScan, backupTest, upgradeTest, artifactTest] = await Promise.all([
  read("config/release-operations.0915.json"),
  read("infra/backup/backup.sh"),
  read("infra/backup/restore.sh"),
  read("infra/backup/check-rpo.sh"),
  read("infra/backup/Dockerfile"),
  read("compose.backup.yaml"),
  read("infra/backup/systemd/lyricscloud-backup.timer"),
  read("infra/backup/systemd/lyricscloud-backup.service"),
  read("docs/operations/OPS-0002-artifact-verification.md"),
  read("docs/runbooks/backup-restore-upgrade.md"),
  read("docs/runbooks/0.9.1-phase5-validation.md"),
  read("0.Plans/1. Dev-phase/0.9.1/5phase.md"),
  read("0.Plans/1. Dev-phase/Decision-Ownership.md"),
  read(".github/workflows/ci.yml"),
  read("scripts/run-0913-rc.sh"),
  read("config/observability-dashboard.0914.json"),
  read("docs/operations/OBSERVABILITY-DATA-CLASSIFICATION.md"),
  read("scripts/scan-container-vulnerabilities.sh"),
  read("scripts/scan-container-secrets.sh"),
  read("scripts/verify-0915-backup-restore.sh"),
  read("scripts/verify-0915-upgrade-rollback.sh"),
  read("scripts/verify-image-artifact.sh")
]);
const config = JSON.parse(configText);
assert(config.schemaVersion === "lyricscloud.release-operations.0915.v1", "release operations schema is invalid");
assert(config.backup.rpoHours === 24 && config.backup.retentionDays === 30, "ADR-0008 RPO or retention drifted");
assert(config.backup.repositoryBoundary.includes("distinct"), "external repository boundary is missing");
assert(config.rollback.destructiveDownMigration === false, "destructive down migration must remain disabled");
assert(config.rollback.applicationFirstWhenSchemaCompatible === true, "application-first rollback is missing");
assert(/^[0-9a-f]{40}$/u.test(config.previousRc.sourceSha), "previous RC SHA is invalid");
for (const serviceName of ["web", "collaboration", "worker", "migrate"]) {
  assert(new RegExp(`^parkingplace/lyricscloud-${serviceName}@sha256:[0-9a-f]{64}$`, "u").test(config.previousRc.images[serviceName]), `previous ${serviceName} digest is invalid`);
}

for (const marker of ["pg_dump", "--format=custom", "--serializable-deferrable", "age --recipients-file", "sha256sum", "BACKUP_CHECKSUM_INVALID", ".backup.lock", "BACKUP_RETENTION_DAYS", "last-success.json"]) {
  assert(backup.includes(marker), `backup marker missing: ${marker}`);
}
assert(!backup.includes("--file") && !backup.includes(".dump\""), "backup may not create a plaintext dump");
for (const marker of ["RESTORE_CONFIRM", "empty-disposable", "_restore", "pg_restore --list", "RESTORE_TARGET_NOT_EMPTY", "RESTORE_INTEGRITY_FAILED", "relforcerowsecurity", "crdt_orphans"]) {
  assert(restore.includes(marker), `restore marker missing: ${marker}`);
}
assert(rpo.includes("BACKUP_MAX_AGE_HOURS") && rpo.includes("backup_age_seconds") && rpo.includes("BACKUP_RPO_EXCEEDED") && rpo.includes("#rpo-exceeded"), "RPO monitor is incomplete");
assert(image.includes("USER postgres") && image.includes("golang:1.26.8-bookworm@sha256:9fdc884aacc3bec89b20ffc69f4bb369c78210e3e4f600387b5128b12c199f81") && image.includes("filippo.io/age/cmd/age@v1.3.2"), "backup image user, age source version or Go builder digest drifted");
assert(image.includes("rm -f /usr/local/bin/gosu"), "unused vulnerable gosu binary must not remain in the backup runtime image");
assert(!compose.includes("backup_age_identity") && !compose.includes("AGE_IDENTITY_FILE"), "private age identity must not be mounted by the backup job");
for (const marker of ["BACKUP_REPOSITORY_PATH", "type: bind", "postgres_backup_password", "backup_age_recipient", "read_only: true"]) {
  assert(compose.includes(marker), `compose backup boundary missing: ${marker}`);
}
assert(timer.includes("OnCalendar=*-*-* 03:15:00") && timer.includes("Persistent=true"), "daily persistent timer is missing");
assert(service.includes("lyricscloud-check-rpo") && service.includes("NoNewPrivileges=true") && service.includes("ProtectSystem=strict"), "systemd hardening or RPO check is missing");

for (const marker of ["OPS-0002", "Accepted", "Docker Hub", "keyless", "cosign", "Sigstore", "SLSA", "SBOM", "sha256", "id-token: write", "예외 승인은 허용하지 않으며"]) {
  assert(decision.includes(marker), `OPS-0002 marker missing: ${marker}`);
}
for (const marker of ["30일", "24시간", "빈 격리", "300초", "180초", "migration", "rollback", "roll-forward", "cosign verify", "@sha256", "private identity"]) {
  assert(runbook.includes(marker), `runbook marker missing: ${marker}`);
}
for (let index = 1; index <= 10; index += 1) {
  const id = `LC-091-P5-${String(index).padStart(2, "0")}`;
  assert((phase.match(new RegExp(id, "g")) ?? []).length === 1, `${id} must occur once in the phase plan`);
  assert(report.includes(id), `${id} is missing from the validation report`);
}
assert(ownership.includes("OPS-0002-artifact-verification.md") && ownership.includes("`Accepted`"), "OPS-0002 ownership index is not accepted");
for (const marker of ["pnpm test:release:0915", "verify-0915-backup-restore.sh", "verify-0915-upgrade-rollback.sh", "provenance: mode=max", "sbom: true", "id-token: write", "verify-image-artifact.sh"]) {
  assert(workflow.includes(marker), `CI release operations marker missing: ${marker}`);
}
assert(runner.includes("pnpm test:release:0915"), "RC runner does not include Phase 5 contract");
assert(vulnerabilityScan.includes("web collaboration worker migrate backup") && secretScan.includes("web collaboration worker migrate backup"), "backup image must be included in vulnerability and secret layer scans");
for (const marker of ["scheduledBackups\":2", "BACKUP_STORAGE_UNAVAILABLE", "BACKUP_CAPACITY_LOW", "RESTORE_CHECKSUM_INVALID", "RESTORE_DECRYPT_OR_ARCHIVE_INVALID", "productSmoke\":\"PASS", "plaintextCanaryMatches\":0"]) {
  assert(backupTest.includes(marker), `backup/restore acceptance marker missing: ${marker}`);
}
for (const marker of ["previousRc", "synthetic_failed_migration", "health_failed", "applicationRollbackDurationMs", "dataCanary\":\"PRESERVED", "rollForward\":\"PASS"]) {
  assert(upgradeTest.includes(marker), `upgrade/rollback acceptance marker missing: ${marker}`);
}
for (const marker of ["cosign sign", "cosign verify", "registry-referrers-mode=oci-1-1", "experimental-oci11", "certificate-identity", "certificate-oidc-issuer", "Provenance.SLSA", "GITHUB_SHA"]) {
  assert(artifactTest.includes(marker), `artifact verifier marker missing: ${marker}`);
}
const dashboardConfig = JSON.parse(dashboard);
for (const metric of ["backup_failure_count", "backup_age_seconds", "backup_size_bytes"]) {
  assert(dashboardConfig.panels.some((panel) => panel.metric === metric), `backup dashboard metric missing: ${metric}`);
}
assert(classification.includes("ciphertext 크기") && classification.includes("archive 이름"), "backup telemetry privacy boundary is missing");

for (const path of ["infra/backup/backup.sh", "infra/backup/restore.sh", "infra/backup/check-rpo.sh", "scripts/verify-0915-backup-restore.sh", "scripts/verify-0915-upgrade-rollback.sh", "scripts/verify-image-artifact.sh"]) {
  assert(((await stat(new URL(`../${path}`, import.meta.url))).mode & 0o111) !== 0, `${path} must be executable`);
}

console.log("0.9.1 Phase 5 contract: encrypted daily backup, isolated restore, failure injection, digest rollback and keyless artifact verification verified");
