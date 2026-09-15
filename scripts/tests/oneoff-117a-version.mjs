import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { getImagePublication } from '../image-publication-plan.mjs';
import { validateReleasePhase } from '../release-phase-state.mjs';

const sha = 'a'.repeat(40);
const base = { eventName: 'push', refType: 'branch', refName: 'phase/1.1.7a-p1-profile-contract', sha,
  version: '1.1.7a', release: false };

test('only the approved 1.1.7a exception can publish development and release tags', () => {
  assert.deepEqual(getImagePublication(base).tags, [sha, 'dev-1.1.7a-p1', 'Dev', 'Dev-latest']);
  assert.deepEqual(getImagePublication({ ...base, eventName: 'workflow_dispatch', refType: 'tag',
    refName: 'v1.1.7a', release: true }).tags,
  ['1.1.7a', sha, 'Release', 'latest', 'Release-latest']);
  for (const version of ['1.1.7b', '1.1.7.a', '1.1.7a\nlatest']) {
    assert.throws(() => getImagePublication({ ...base, version }), /PUBLICATION_VERSION_INVALID/);
  }
  assert.throws(() => getImagePublication({ ...base, refName: 'phase/1.1.7b-p1-invalid' }),
    /PUBLICATION_BRANCH_VERSION_INVALID/);
  assert.throws(() => getImagePublication({ ...base, eventName: 'workflow_dispatch', refType: 'tag',
    refName: 'v1.1.7b', release: true }), /PUBLICATION_RELEASE_REF_REQUIRED/);
});

test('STATUS accepts the one-off product label only with its requested planning folder', () => {
  const status = (version, path, phase = 1, state = 'review') =>
    `current_version: "${version}"\ncurrent_phase: "../2.Patch-phase/${path}/${phase}phase.md"\nstate: "${state}"\n`;
  assert.equal(validateReleasePhase(status('1.1.7a', '1.1.7.a')), 1);
  assert.equal(validateReleasePhase(status('1.1.7a', '1.1.7.a', 5, 'complete'),
    { requireRelease: true, phaseCount: 5 }), 5);
  assert.throws(() => validateReleasePhase(status('1.1.7b', '1.1.7.a')), /RELEASE_PHASE_VERSION_INVALID/);
  assert.throws(() => validateReleasePhase(status('1.1.7a', '1.1.7a')), /RELEASE_PHASE_PATH_INVALID/);
});

test('shell publication guard enforces exact branch and tag without moving old v1.1.7', () => {
  const run = (refType, refName, channel) => spawnSync('bash', ['scripts/docker-image-tag.sh',
    refType, refName, sha, 'web', channel], { encoding: 'utf8' });
  assert.equal(run('branch', base.refName, 'dev').stdout.trim(), '1.1.7a');
  assert.equal(run('tag', 'v1.1.7a', 'release').stdout.trim(), '1.1.7a');
  assert.notEqual(run('tag', 'v1.1.7', 'release').status, 0);
  assert.notEqual(run('branch', 'phase/1.1.7b-p1-invalid', 'dev').status, 0);
});
