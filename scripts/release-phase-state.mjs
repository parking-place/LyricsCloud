const stableVersion = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;

/** Validate the single STATUS source without hard-coding one-digit phases or one release line. */
export function validateReleasePhase(status, { requireRelease = false, phase6Plan = '', phaseCount = 10 } = {}) {
  function field(name) {
    const matches = [...status.matchAll(new RegExp(`^${name}:\\s*"([^"\\r\\n]+)"[ \\t]*$`, 'gmu'))];
    if (matches.length !== 1) throw new Error('RELEASE_PHASE_STATE_AMBIGUOUS');
    return matches[0][1];
  }
  const version = field('current_version');
  if (!stableVersion.test(version)) throw new Error('RELEASE_PHASE_VERSION_INVALID');
  const phasePath = field('current_phase');
  const match = /^(?:\.\.\/2\.Patch-phase\/)?([0-9]+\.[0-9]+\.[0-9]+)\/([1-9][0-9]*)phase\.md$/u.exec(phasePath);
  if (!match || match[1] !== version) throw new Error('RELEASE_PHASE_PATH_INVALID');
  const phase = Number(match[2]);
  if (version === '1.0.0') {
    if (phase === 5) return phase;
    if (phase !== 6 || requireRelease) throw new Error('RELEASE_PHASE_NOT_AUTHORIZED');
    for (let i = 1; i <= 8; i++) {
      if (!phase6Plan.includes(`LC-100-P6-${String(i).padStart(2, '0')}`)) throw new Error('RELEASE_PHASE_PLAN_INCOMPLETE');
    }
    return phase;
  }
  if (!Number.isSafeInteger(phaseCount) || phaseCount < 1 || phaseCount > 999 || phase > phaseCount) throw new Error('RELEASE_PHASE_COUNT_INVALID');
  if (requireRelease && (phase !== phaseCount || field('state') !== 'complete')) throw new Error('RELEASE_PHASE_NOT_AUTHORIZED');
  return phase;
}
