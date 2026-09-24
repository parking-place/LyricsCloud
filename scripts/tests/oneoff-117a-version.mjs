import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getImagePublication } from '../image-publication-plan.mjs';
import { validateReleasePhase } from '../release-phase-state.mjs';
import { getReleaseVersionContract } from '../release-version-contract.mjs';

const sha = 'a'.repeat(40);
const base = { eventName: 'push', refType: 'branch', refName: 'phase/1.1.7a-p1-profile-contract', sha,
  version: '1.1.7a', release: false };
const b = { ...base, refName: 'phase/1.1.7b-p1-contract-runtime', version: '1.1.7b' };

test('the approved 1.1.7a history and 1.1.7b contract keep dev and release tags isolated', () => {
  assert.deepEqual(getImagePublication(base).tags, [sha, 'dev-1.1.7a-p1', 'Dev', 'Dev-latest']);
  assert.deepEqual(getImagePublication(b).tags, [sha, 'dev-1.1.7b-p1', 'Dev', 'Dev-latest']);
  assert.deepEqual(getImagePublication({ ...base, eventName: 'workflow_dispatch', refType: 'tag',
    refName: 'v1.1.7a', release: true }).tags,
  ['1.1.7a', sha, 'Release', 'latest', 'Release-latest']);
  assert.deepEqual(getImagePublication({ ...b, eventName: 'workflow_dispatch', refType: 'tag',
    refName: 'v1.1.7b', release: true }).tags,
  ['1.1.7b', sha, 'Release', 'latest', 'Release-latest']);
  for (const version of ['1.1.7c', '1.1.7.a', '1.1.7b\nlatest']) {
    assert.throws(() => getImagePublication({ ...base, version }), /PUBLICATION_VERSION_INVALID/);
  }
  assert.throws(() => getImagePublication({ ...b, refName: 'phase/1.1.7a-p1-invalid' }),
    /PUBLICATION_BRANCH_VERSION_MISMATCH/);
  for (const refName of ['phase/1.1.7b-p6-over-limit', 'phase/1.1.7b-p1', 'phase/1.1.7b-p0-invalid']) {
    assert.throws(() => getImagePublication({ ...b, refName }), /PUBLICATION_(?:PHASE|BRANCH_VERSION)_INVALID/);
  }
  assert.deepEqual(getImagePublication({ ...b, version: '1.2.2', refName: 'phase/1.2.2-p6-redesign' }).tags,
    [sha, 'dev-1.2.2-p6', 'Dev', 'Dev-latest']);
  assert.throws(() => getImagePublication({ ...b, eventName: 'workflow_dispatch', refType: 'tag',
    refName: 'v1.1.7a', release: true }), /PUBLICATION_RELEASE_REF_REQUIRED/);
});

test('STATUS accepts a and b only with their exact product-to-plan mapping', () => {
  const status = (version, root, path, phase = 1, state = 'review') =>
    `current_version: "${version}"\ncurrent_phase: "../${root}/${path}/${phase}phase.md"\nstate: "${state}"\n`;
  assert.equal(validateReleasePhase(status('1.1.7a', '2.Patch-phase', '1.1.7.a')), 1);
  assert.equal(validateReleasePhase(status('1.1.7a', '2.Patch-phase', '1.1.7.a', 5, 'complete'),
    { requireRelease: true, phaseCount: 5 }), 5);
  assert.equal(validateReleasePhase(status('1.1.7b', '3.Redesign-phase', '1.1.7.b')), 1);
  assert.throws(() => validateReleasePhase(status('1.1.7b', '2.Patch-phase', '1.1.7.b')), /RELEASE_PHASE_PATH_INVALID/);
  assert.throws(() => validateReleasePhase(status('1.1.7b', '3.Redesign-phase', '1.1.7.a')), /RELEASE_PHASE_PATH_INVALID/);
  assert.throws(() => validateReleasePhase(status('1.1.7c', '3.Redesign-phase', '1.1.7.c')), /RELEASE_PHASE_VERSION_INVALID/);
  assert.equal(validateReleasePhase(status('1.2.0', '3.Redesign-phase', '1.2.0')), 1);
  assert.equal(validateReleasePhase(status('1.2.0', '3.Redesign-phase', '1.2.0', 5, 'complete')),
    5);
  assert.equal(validateReleasePhase(status('1.2.2', '3.Redesign-phase', '1.2.2', 6, 'complete')),
    6);
  assert.throws(() => validateReleasePhase(status('1.2.0', '2.Patch-phase', '1.2.0')), /RELEASE_PHASE_PATH_INVALID/);
  assert.throws(() => validateReleasePhase(status('1.2.0', '3.Redesign-phase', '1.1.7.b')), /RELEASE_PHASE_PATH_INVALID/);
  assert.throws(() => validateReleasePhase(status('1.2.0', '3.Redesign-phase', '1.2.0', 6)), /RELEASE_PHASE_(?:COUNT|PATH)_INVALID/);
  assert.equal(getReleaseVersionContract('1.2.0').packageVersion, '1.2.0');
  assert.equal(getReleaseVersionContract('1.2.2').phaseCount, 6);
});

test('shell publication guard enforces exact branch and tag without moving old v1.1.7', () => {
  const run = (refType, refName, channel) => spawnSync('bash', ['scripts/docker-image-tag.sh',
    refType, refName, sha, 'web', channel], { encoding: 'utf8' });
  assert.equal(run('branch', 'phase/1.2.0-p1-contract-baseline', 'dev').stdout.trim(), '1.2.0');
  assert.equal(run('tag', 'v1.2.0', 'release').stdout.trim(), '1.2.0');
  assert.notEqual(run('branch', b.refName, 'dev').status, 0);
  assert.notEqual(run('tag', 'v1.1.7b', 'release').status, 0);
  assert.notEqual(run('tag', 'v1.1.7', 'release').status, 0);
  assert.notEqual(run('branch', 'phase/1.1.7a-p1-invalid', 'dev').status, 0);
  assert.notEqual(run('branch', 'phase/1.1.7b-p6-over-limit', 'dev').status, 0);
  assert.notEqual(run('branch', 'phase/1.1.7b-p1', 'dev').status, 0);
});

test('production browser fixture and health assertion use the 1.2.0 product version', () => {
  const browserConfig = readFileSync('playwright.config.ts', 'utf8');
  const healthSpec = readFileSync('tests/e2e/new-feature-1.1.5.spec.ts', 'utf8');
  const baselineSpec = readFileSync('tests/e2e/baseline.spec.ts', 'utf8');
  assert.match(browserConfig, /APP_VERSION: process\.env\.APP_VERSION \?\? "1\.2\.0"/);
  assert.match(browserConfig, /APP_PHASE: process\.env\.APP_PHASE \?\? "p2"/);
  assert.match(healthSpec, /health\.build\.version\)\.toBe\(process\.env\.APP_VERSION \?\? "1\.2\.0"\)/);
  assert.match(baselineSpec, /version: process\.env\.APP_VERSION \?\? "1\.2\.0"/);
});
