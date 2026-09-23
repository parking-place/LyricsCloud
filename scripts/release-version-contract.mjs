const stableVersion = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;

const exactContracts = new Map([
  ["1.1.7a", { packageVersion: "1.1.7", planDirectory: "1.1.7.a", planRoot: "2.Patch-phase", phaseCount: 5 }],
  ["1.1.7b", { packageVersion: "1.1.7", planDirectory: "1.1.7.b", planRoot: "3.Redesign-phase", phaseCount: 5 }]
]);

const registeredPhaseCounts = new Map([
  ["1.0.1", 10],
  ["1.2.2", 6]
]);

export function isProductVersion(version) {
  return typeof version === "string" && (exactContracts.has(version) || stableVersion.test(version));
}

export function getReleaseVersionContract(version, { phaseCount } = {}) {
  if (!isProductVersion(version)) throw new Error("RELEASE_VERSION_INVALID");
  const exact = exactContracts.get(version);
  const registeredCount = exact?.phaseCount ?? registeredPhaseCounts.get(version);
  if (phaseCount !== undefined && (!Number.isSafeInteger(phaseCount) || phaseCount < 1 || phaseCount > 999)) {
    throw new Error("RELEASE_PHASE_COUNT_INVALID");
  }
  if (registeredCount !== undefined && phaseCount !== undefined && registeredCount !== phaseCount) {
    throw new Error("RELEASE_PHASE_COUNT_MISMATCH");
  }
  const redesign = /^1\.2\.[0-8]$/u.test(version);
  return Object.freeze({
    version,
    packageVersion: exact?.packageVersion ?? version,
    planDirectory: exact?.planDirectory ?? version,
    planRoot: exact?.planRoot ?? (redesign ? "3.Redesign-phase" : "2.Patch-phase"),
    phaseCount: registeredCount ?? phaseCount ?? 5
  });
}

export function parseReleasePhasePath(version, phasePath) {
  const contract = getReleaseVersionContract(version);
  const match = /^(?:\.\.\/(2\.Patch-phase|3\.Redesign-phase)\/)?([^/]+)\/([1-9][0-9]*)phase\.md$/u.exec(phasePath);
  if (!match || match[2] !== contract.planDirectory) throw new Error("RELEASE_PHASE_PATH_INVALID");
  const suppliedRoot = match[1];
  if (suppliedRoot && suppliedRoot !== contract.planRoot) throw new Error("RELEASE_PHASE_PATH_INVALID");
  if (!suppliedRoot && (exactContracts.has(version) || /^1\.2\.[0-8]$/u.test(version))) {
    throw new Error("RELEASE_PHASE_PATH_INVALID");
  }
  return Number(match[3]);
}
