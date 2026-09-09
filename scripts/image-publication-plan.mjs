import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Candidate, development and release aliases stay disjoint. */
export function getImagePublication({ eventName, refType, refName, sha, version, release }) {
  if (!['push', 'workflow_dispatch'].includes(eventName)) throw new Error('PUBLICATION_EVENT_INVALID');
  if (typeof version !== 'string' || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u.test(version)) {
    throw new Error('PUBLICATION_VERSION_INVALID');
  }
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/u.test(sha)) throw new Error('PUBLICATION_SHA_INVALID');
  if (typeof refName !== 'string' || !refName || typeof release !== 'boolean') throw new Error('PUBLICATION_REF_INVALID');
  let tags;
  if (release) {
    if (eventName !== 'workflow_dispatch' || refType !== 'tag' || refName !== `v${version}`) {
      throw new Error('PUBLICATION_RELEASE_REF_REQUIRED');
    }
    tags = [version, sha, 'Release', 'latest', 'Release-latest'];
  } else {
    if (refType !== 'branch') throw new Error('PUBLICATION_BRANCH_REQUIRED');
    const phaseVersion = /^phase\/([0-9]+\.[0-9]+\.[0-9]+)-/u.exec(refName)?.[1];
    if (phaseVersion && phaseVersion !== version) throw new Error('PUBLICATION_BRANCH_VERSION_MISMATCH');
    const phase = /^phase\/[0-9]+\.[0-9]+\.[0-9]+-p([1-9][0-9]*)-/u.exec(refName)?.[1];
    tags = /^phase\/1\.0\.0-p6-/u.test(refName)
      ? [sha, `candidate-${version}-${sha}`]
      : [sha, ...(phase ? [`dev-${version}-p${phase}`] : []), 'Dev', 'Dev-latest'];
  }
  if (tags.some(tag => !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/u.test(tag))) throw new Error('PUBLICATION_TAG_INVALID');
  return { channel: release ? 'release' : /^phase\/1\.0\.0-p6-/u.test(refName) ? 'candidate' : 'dev', tags };
}

function main() {
  const env = process.env;
  if (!['true', 'false'].includes(env.PUBLICATION_RELEASE)) throw new Error('PUBLICATION_INTENT_REQUIRED');
  if (!env.GITHUB_OUTPUT) throw new Error('PUBLICATION_OUTPUT_REQUIRED');
  const result = getImagePublication({ eventName: env.GITHUB_EVENT_NAME, refType: env.GITHUB_REF_TYPE,
    refName: env.GITHUB_REF_NAME, sha: env.GITHUB_SHA, version: env.PUBLICATION_VERSION,
    release: env.PUBLICATION_RELEASE === 'true' });
  // Every emitted value is validated above; no untrusted ref text enters the output file.
  const tags = result.tags.map(tag => `type=raw,value=${tag}`).join('\n');
  appendFileSync(env.GITHUB_OUTPUT, `channel=${result.channel}\ntags<<LC_IMAGE_TAGS\n${tags}\nLC_IMAGE_TAGS\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); }
  catch (error) {
    const code = error instanceof Error && /^PUBLICATION_[A-Z_]+$/u.test(error.message) ? error.message : 'PUBLICATION_PLAN_FAILED';
    console.error(code);
    process.exitCode = 1;
  }
}
