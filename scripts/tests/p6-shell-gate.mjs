import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// Execute the actual syntax-check fragment from CI in a disposable fixture.
// bash -n scripts/*.sh parses only the first expanded file; the rest are arguments.
function syntaxGate(t, invalidPath) {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const section = workflow.split('      - name: Shell and Docker cleanup contract\n')[1];
  assert.ok(section, 'shell gate must remain in CI');
  const code = section.split('        run: |\n')[1].split('          ./scripts/cleanup-docker.sh')[0];
  assert.ok(code.trim(), 'empty shell gate');
  const dir = mkdtempSync(join(tmpdir(), 'lc-p6-shell-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'scripts')); mkdirSync(join(dir, 'infra/backup'), { recursive: true });
  for (const file of ['scripts/a.sh', 'scripts/z.sh', 'infra/backup/a.sh', 'infra/backup/z.sh']) {
    writeFileSync(join(dir, file), file === invalidPath ? 'if then\n' : '#!/usr/bin/env bash\nprintf ok\\n\n');
  }
  return spawnSync('bash', ['-e', '-c', code], { cwd: dir, encoding: 'utf8', timeout: 3000 });
}
for (const path of ['scripts/z.sh', 'infra/backup/z.sh']) {
  test(`CI shell syntax gate rejects a non-first invalid file: ${path}`, t => {
    const result = syntaxGate(t, path);
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0, 'invalid second file was not parsed');
  });
}
test('CI shell syntax gate accepts all valid fixtures', t => {
  const result = syntaxGate(t); assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
});
