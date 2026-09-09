/** P6 is a review phase, never an authorization to republish the sealed v1.0.0. */
export function validateReleasePhase(status, { requireRelease = false, phase6Plan = '' } = {}) {
  function field(name) {
    const matches = [...status.matchAll(new RegExp(`^${name}:\\s*"([^"\\r\\n]+)"[ \\t]*$`, 'gmu'))];
    if (matches.length !== 1) throw new Error('RELEASE_PHASE_STATE_AMBIGUOUS');
    return matches[0][1];
  }
  if (field('current_version') !== '1.0.0') throw new Error('RELEASE_PHASE_VERSION_INVALID');
  const phase = field('current_phase');
  if (phase === '1.0.0/5phase.md') return 5;
  if (phase !== '1.0.0/6phase.md' || requireRelease) throw new Error('RELEASE_PHASE_NOT_AUTHORIZED');
  for (let i = 1; i <= 8; i++) {
    if (!phase6Plan.includes(`LC-100-P6-${String(i).padStart(2, '0')}`)) throw new Error('RELEASE_PHASE_PLAN_INCOMPLETE');
  }
  return 6;
}
