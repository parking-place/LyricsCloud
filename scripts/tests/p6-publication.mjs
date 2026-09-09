import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const moduleUrl = new URL('../image-publication-plan.mjs', import.meta.url);
const loaded = await import(moduleUrl).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === moduleUrl.href) return null;
  throw error;
});
function plan(input) { assert.ok(loaded, 'publication boundary is not implemented'); return loaded.getImagePublication(input); }
const sha = 'a'.repeat(40);
const base = { eventName: 'push', refType: 'branch', refName: 'phase/1.0.0-p6-stabilization', version: '1.0.0', sha, release: false };
const protectedTags = new Set(['1.0.0', 'Release', 'latest', 'Release-latest', 'Dev', 'Dev-latest']);

test('P6 candidate publication cannot move any shared or release tag', () => {
  const result = plan(base);
  assert.deepEqual(result.tags, [sha, `candidate-1.0.0-${sha}`]);
  assert.equal(result.channel, 'candidate');
  for (const tag of result.tags) assert.ok(!protectedTags.has(tag));
});
test('explicit manual candidate publication remains isolated', () => {
  assert.deepEqual(plan({ ...base, eventName: 'workflow_dispatch' }).tags, [sha, `candidate-1.0.0-${sha}`]);
});
test('development branches never move a numeric or release alias', () => {
  assert.deepEqual(plan({ ...base, refName: 'phase/1.0.1-p13-work', version: '1.0.1' }).tags,
    [sha, 'dev-1.0.1-p13', 'Dev', 'Dev-latest']);
});
test('an exact manual release moves only immutable and release aliases', () => {
  const tags = plan({ ...base, eventName: 'workflow_dispatch', refType: 'tag', refName: 'v1.0.0', release: true }).tags;
  assert.deepEqual(tags, ['1.0.0', sha, 'Release', 'latest', 'Release-latest']);
  const simulatedDigestByTag = new Map(tags.map(tag => [tag, 'sha256:release-build']));
  assert.deepEqual(new Set(simulatedDigestByTag.values()), new Set(['sha256:release-build']));
});
test('main development publication has no invented Phase tag', () => {
  assert.deepEqual(plan({ ...base, refName: 'main', version: '1.0.1' }).tags, [sha, 'Dev', 'Dev-latest']);
});
test('multi-digit versions and phases are parsed without reserving them', () => {
  assert.deepEqual(plan({ ...base, refName: 'phase/1.12.91-p103-work', version: '1.12.91' }).tags,
    [sha, 'dev-1.12.91-p103', 'Dev', 'Dev-latest']);
});
for (const [name, override] of [
  ['PR', { eventName: 'pull_request' }], ['pull_request_target', { eventName: 'pull_request_target' }],
  ['branch release', { eventName: 'workflow_dispatch', release: true }],
  ['wrong tag', { eventName: 'workflow_dispatch', release: true, refType: 'tag', refName: 'v1.0.1' }],
  ['automatic tag release', { release: true, refType: 'tag', refName: 'v1.0.0' }],
  ['tag without release intent', { eventName: 'workflow_dispatch', refType: 'tag', refName: 'v1.0.0' }],
  ['branch version mismatch', { refName: 'phase/1.0.1-p1-work' }],
  ['SHA newline', { sha: `${sha}\nlatest` }], ['version newline', { version: '1.0.0\nlatest' }],
  ['nonboolean intent', { release: 'true' }], ['prerelease in stable contract', { version: '1.0.0-p6' }]
]) {
  test(`publication rejects ${name}`, () => {
    assert.ok(loaded, 'publication boundary is not implemented');
    assert.throws(() => loaded.getImagePublication({ ...base, ...override }));
  });
}
test('the CLI emits validated metadata directives through a file, not shell interpolation', t => {
  assert.ok(loaded, 'publication boundary is not implemented');
  const dir = mkdtempSync(join(tmpdir(), 'lc-p6-tags-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const output = join(dir, 'output');
  const result = spawnSync(process.execPath, [fileURLToPath(moduleUrl)], { encoding: 'utf8', env: {
    PATH: process.env.PATH, GITHUB_OUTPUT: output, GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: base.refName, GITHUB_SHA: sha,
    PUBLICATION_VERSION: '1.0.0', PUBLICATION_RELEASE: 'false'
  } });
  assert.equal(result.status, 0, result.stderr);
  const contents = readFileSync(output, 'utf8');
  const tags = contents.split('\n').filter(line => line.startsWith('type=raw,value='));
  assert.deepEqual(tags, [`type=raw,value=${sha}`, `type=raw,value=candidate-1.0.0-${sha}`]);
});
test('CI consumes the tested tag plan and disables implicit latest', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes('tags: ${{ steps.publication.outputs.tags }}'));
  assert.ok(workflow.includes('flavor: latest=false'));
  assert.ok(!/^\s*type=raw,value=/mu.test(workflow), 'no bypassing hard-coded tag list');
  assert.ok(workflow.includes('node --test scripts/tests/p6-*.mjs'));
});
test('CI does not auto-publish the P6 branch on push', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const publish = workflow.slice(workflow.indexOf('\n  publish:'));
  assert.ok(publish.includes("!startsWith(github.ref, 'refs/heads/phase/1.0.0-p6-')"));
  assert.ok(publish.includes("github.event_name == 'workflow_dispatch' && inputs.publish == true"));
});
