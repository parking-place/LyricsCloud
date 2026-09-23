import { getReleaseVersionContract, parseReleasePhasePath } from "./release-version-contract.mjs";

/** Validate the single STATUS source without hard-coding one-digit phases or one release line. */
export function validateReleasePhase(status, { requireRelease = false, phase6Plan = '', phaseCount } = {}) {
  function field(name) {
    const matches = [...status.matchAll(new RegExp(`^${name}:\\s*"([^"\\r\\n]+)"[ \\t]*$`, 'gmu'))];
    if (matches.length !== 1) throw new Error('RELEASE_PHASE_STATE_AMBIGUOUS');
    return matches[0][1];
  }
  const version = field('current_version');
  let contract;
  let phase;
  try {
    contract = getReleaseVersionContract(version, { phaseCount });
    phase = parseReleasePhasePath(version, field('current_phase'));
  } catch (error) {
    if (error instanceof Error && error.message === 'RELEASE_VERSION_INVALID') throw new Error('RELEASE_PHASE_VERSION_INVALID');
    throw error;
  }
  if (version === '1.0.0') {
    if (phase === 5) return phase;
    if (phase !== 6 || requireRelease) throw new Error('RELEASE_PHASE_NOT_AUTHORIZED');
    for (let i = 1; i <= 8; i++) {
      if (!phase6Plan.includes(`LC-100-P6-${String(i).padStart(2, '0')}`)) throw new Error('RELEASE_PHASE_PLAN_INCOMPLETE');
    }
    return phase;
  }
  if (phase > contract.phaseCount) throw new Error('RELEASE_PHASE_COUNT_INVALID');
  if (requireRelease && (phase !== contract.phaseCount || field('state') !== 'complete')) throw new Error('RELEASE_PHASE_NOT_AUTHORIZED');
  return phase;
}
