import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const baseName = 'lyricscloud-20260909T000000Z-0123456789abcdef0123456789abcdef.dump.age';
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'lc-p6-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = join(dir, 'repository'); const bin = join(dir, 'bin');
  mkdirSync(repo); mkdirSync(bin);
  writeFileSync(join(repo, '.lyricscloud-backup-storage-id'), 'p6-fixture\n');
  const recipient = join(dir, 'recipient'); const password = join(dir, 'password'); const identity = join(dir, 'identity');
  writeFileSync(recipient, `age1${'a'.repeat(55)}\n`);
  writeFileSync(password, 'synthetic-test-only\n');
  writeFileSync(identity, 'AGE-SECRET-KEY-SYNTHETIC-TEST-ONLY\n', { mode: 0o600 });
  const env = { PATH: `${bin}:${process.env.PATH}`, HOME: dir, LC_ALL: 'C', NODE_ENV: 'test',
    BACKUP_REPOSITORY_DIR: repo, BACKUP_STORAGE_ID: 'p6-fixture', BACKUP_MIN_FREE_BYTES: '0',
    PGHOST: 'synthetic.invalid', PGPORT: '5432', PGUSER: 'p6', PGDATABASE: 'p6_restore',
    AGE_RECIPIENT_FILE: recipient, AGE_IDENTITY_FILE: identity, PGPASSWORD_FILE: password,
    RESTORE_CONFIRM: 'empty-disposable', APP_VERSION: '1.0.0', BUILD_ID: 'p6-test',
    RPO_NOW_EPOCH: String(Date.parse('2026-09-09T00:00:30Z') / 1000) };
  function stub(name, script) { const p = join(bin, name); writeFileSync(p, `#!/usr/bin/env bash\nset -euo pipefail\n${script}\n`); chmodSync(p, 0o755); }
  // Database/crypto are isolated; tests assert production shell control flow and real filesystem effects.
  stub('psql', `case "$*" in
    *'select count(*) from pg_class'*) printf '0\\n';;
    *'schema_migrations'*) printf '0802_lifecycle.sql\\n';;
    *'do $$'*) :;;
    *) cat >/dev/null; printf '%s\\n' "\${P6_INTEGRITY:-1|1|0|0|0|0|0|4|0|0}";;
  esac`);
  stub('pg_dump', `if [[ "\${1:-}" == '--version' ]]; then printf 'pg_dump (PostgreSQL) 18\\n'; else printf 'synthetic dump'; fi`);
  stub('pg_restore', 'cat >/dev/null');
  stub('age', `if [[ "\${1:-}" == '--version' ]]; then printf 'v1.3.2\\n';
  elif [[ "\${1:-}" == '--decrypt' ]]; then cat "\${@: -1}";
  else out=""; while [[ $# -gt 0 ]]; do if [[ "$1" == '--output' ]]; then out="$2"; shift; fi; shift; done; cat >"$out"; fi`);
  return { repo, env, stub, recipient, identity,
    run: (name, overrides = {}) => spawnSync('bash', [join(root, 'infra/backup', name)], { env: { ...env, ...overrides }, encoding: 'utf8', timeout: 8000 }) };
}
function archive(f, { content = 'synthetic encrypted bytes', createdAt = '2026-09-09T00:00:00Z', size, checksum, name = baseName, verified = true } = {}) {
  const file = join(f.repo, name); writeFileSync(file, content);
  const bytes = Buffer.byteLength(content); const digest = createHash('sha256').update(content).digest('hex');
  const manifest = { schemaVersion: 'lyricscloud.backup.manifest.v1', databaseSchemaVersion: '0802_lifecycle.sql',
    createdAt, storageId: 'p6-fixture', encryptedFile: name, encryptedSizeBytes: size ?? bytes, sha256: checksum ?? digest };
  const status = { schemaVersion: 'lyricscloud.backup.status.v1', createdAt, encryptedFile: name, encryptedSizeBytes: size ?? bytes, checksumVerified: verified };
  writeFileSync(file.replace(/\.dump\.age$/u, '.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(f.repo, 'last-success.json'), JSON.stringify(status) + '\n');
  return file;
}
function ok(result) { assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr); }
function failed(result) { assert.equal(result.error, undefined); assert.notEqual(result.status, 0, result.stdout); }

test('REVIEW-11: a losing backup must not remove another backup lock', t => {
  const f = fixture(t); mkdirSync(join(f.repo, '.backup.lock'));
  failed(f.run('backup.sh'));
  assert.ok(existsSync(join(f.repo, '.backup.lock')), 'the lock owner is still running');
  failed(f.run('backup.sh'));
  assert.ok(existsSync(join(f.repo, '.backup.lock')), 'a third backup must also remain excluded');
});
test('an acquired lock is released after a later validation error', t => {
  const f = fixture(t); rmSync(f.recipient); failed(f.run('backup.sh'));
  assert.equal(existsSync(join(f.repo, '.backup.lock')), false);
});
test('a completed backup releases its own lock and publishes a status with an archive', t => {
  const f = fixture(t); ok(f.run('backup.sh'));
  assert.equal(existsSync(join(f.repo, '.backup.lock')), false);
  const status = JSON.parse(readFileSync(join(f.repo, 'last-success.json'), 'utf8'));
  assert.ok(existsSync(join(f.repo, status.encryptedFile)));
  assert.ok(status.encryptedSizeBytes > 0);
  ok(f.run('check-rpo.sh', { RPO_NOW_EPOCH: String(Math.floor(Date.now() / 1000)) }));
});
test('REVIEW-12: missing archive cannot count as a current verified backup', t => {
  const f = fixture(t); const file = archive(f); rmSync(file); failed(f.run('check-rpo.sh'));
});
test('REVIEW-12: same-length archive corruption must be rejected', t => {
  const f = fixture(t); const file = archive(f); const bytes = readFileSync(file); bytes[0] ^= 1; writeFileSync(file, bytes);
  failed(f.run('check-rpo.sh'));
});
test('REVIEW-12: zero-size archive cannot count as a backup', t => {
  const f = fixture(t); archive(f, { content: '', size: 0 }); failed(f.run('check-rpo.sh'));
});
test('a fresh archive matching its manifest passes without exposing file names', t => {
  const f = fixture(t); archive(f); const result = f.run('check-rpo.sh'); ok(result);
  assert.match(result.stdout, /"metric":"backup_checksum_verified","value":1/u);
  assert.ok(!result.stdout.includes(baseName));
});
test('missing manifest fails closed', t => {
  const f = fixture(t); const file = archive(f); rmSync(file.replace('.dump.age', '.manifest.json')); failed(f.run('check-rpo.sh'));
});
test('incorrect recorded size fails closed', t => {
  const f = fixture(t); archive(f, { size: 999 }); failed(f.run('check-rpo.sh'));
});
test('a symlink archive is not accepted as the repository-owned archive', t => {
  const f = fixture(t); const file = archive(f); const bytes = readFileSync(file); rmSync(file);
  const target = join(f.repo, '..', 'other-archive'); writeFileSync(target, bytes); symlinkSync(target, file); failed(f.run('check-rpo.sh'));
});
for (const [name, options] of [['old', { createdAt: '2026-09-07T00:00:00Z' }], ['future', { createdAt: '2026-09-10T00:00:00Z' }], ['unverified', { verified: false }]]) {
  test(`${name} backup status remains rejected`, t => { const f = fixture(t); archive(f, options); failed(f.run('check-rpo.sh')); });
}
for (const counts of ['0|0|0|0|0|0|0|4|0|0', '1|0|0|0|0|0|0|4|0|0', '2|3|1|2|4|0|0|4|0|0']) {
  test(`REVIEW-13: valid restore counts ${counts} are accepted`, t => {
    const f = fixture(t); const file = archive(f); const result = f.run('restore.sh', { BACKUP_ARCHIVE: file, P6_INTEGRITY: counts }); ok(result);
    assert.match(result.stdout, /"restoreValidation":"PASS"/u);
  });
}
for (const counts of ['0|0|0|0|0|0|0|3|0|0', '0|0|0|0|0|0|0|4|1|0', '0|0|0|0|0|0|0|4|0|1', 'invalid|0|0|0|0|0|0|4|0|0', '0|0|-1|0|0|0|0|4|0|0']) {
  test(`invalid restore integrity remains rejected: ${counts}`, t => {
    const f = fixture(t); const file = archive(f); failed(f.run('restore.sh', { BACKUP_ARCHIVE: file, P6_INTEGRITY: counts }));
  });
}
