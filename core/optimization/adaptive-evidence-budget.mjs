export const ADAPTIVE_EVIDENCE_BUDGET_VERSION = 'SETKA_ADAPTIVE_EVIDENCE_BUDGET_V1';

function finiteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a finite non-negative number`);
  return value;
}

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be a finite positive number`);
  return value;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function finiteIntegerAtLeastOne(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be an integer >= 1`);
  return value;
}

export function deriveAdaptiveEvidenceBudget({
  assignment,
  boundaryReferenceDistance,
  residualReference = 1e-6,
  maxIterations = 64,
  baseBudget = {},
  maxMultiplier = 8,
  foldThreshold = 0.2
}) {
  if (!assignment || typeof assignment !== 'object') throw new TypeError('assignment is required');
  boundaryReferenceDistance = finitePositive(boundaryReferenceDistance, 'boundaryReferenceDistance');
  residualReference = finitePositive(residualReference, 'residualReference');
  maxIterations = finiteIntegerAtLeastOne(maxIterations, 'maxIterations');
  maxMultiplier = finitePositive(maxMultiplier, 'maxMultiplier');
  if (maxMultiplier < 1) throw new RangeError('maxMultiplier must be >= 1');
  foldThreshold = finiteNonNegative(foldThreshold, 'foldThreshold');
  if (foldThreshold > 1) throw new RangeError('foldThreshold must be <= 1');

  const twins = finiteIntegerAtLeastOne(baseBudget.counterfactualTwins ?? 2, 'baseBudget.counterfactualTwins');
  const proofSamples = finiteIntegerAtLeastOne(baseBudget.proofSamples ?? 4, 'baseBudget.proofSamples');
  const localResolution = finitePositive(baseBudget.localResolution ?? 1, 'baseBudget.localResolution');

  const convergenceState = assignment.convergenceState ?? 'UNKNOWN';
  const distance = assignment.sampledBoundaryDistanceEstimate;
  const residual = assignment.residual;
  const iterations = assignment.iterations;

  if (convergenceState !== 'CONVERGED' || !Number.isFinite(distance) || distance < 0 || !Number.isFinite(residual) || residual < 0 || !Number.isFinite(iterations) || iterations < 0) {
    return Object.freeze({
      schemaVersion: ADAPTIVE_EVIDENCE_BUDGET_VERSION,
      state: 'REVIEW_REQUIRED',
      reason: 'INSUFFICIENT_OR_NONCONVERGED_BASIN_EVIDENCE',
      sampledOnly: true,
      exactBoundaryProven: false,
      criticality: null,
      multiplier: maxMultiplier,
      foldUnrelatedDetail: false,
      budget: Object.freeze({
        counterfactualTwins: Math.ceil(twins * maxMultiplier),
        proofSamples: Math.ceil(proofSamples * maxMultiplier),
        localResolution: localResolution * maxMultiplier
      })
    });
  }

  const boundaryCriticality = 1 / (1 + distance / boundaryReferenceDistance);
  const residualCriticality = clamp01(residual / residualReference);
  const iterationCriticality = clamp01(iterations / maxIterations);
  const criticality = Math.max(boundaryCriticality, residualCriticality, iterationCriticality);
  const multiplier = 1 + criticality * (maxMultiplier - 1);
  const foldUnrelatedDetail = criticality <= foldThreshold;

  return Object.freeze({
    schemaVersion: ADAPTIVE_EVIDENCE_BUDGET_VERSION,
    state: 'DERIVED_FROM_SAMPLED_DIAGNOSTIC',
    sampledOnly: true,
    exactBoundaryProven: false,
    globalStabilityProven: false,
    criticality,
    components: Object.freeze({ boundaryCriticality, residualCriticality, iterationCriticality }),
    multiplier,
    foldUnrelatedDetail,
    budget: Object.freeze({
      counterfactualTwins: Math.ceil(twins * multiplier),
      proofSamples: Math.ceil(proofSamples * multiplier),
      localResolution: localResolution * multiplier
    }),
    rule: 'MORE_SAMPLED_BOUNDARY_OR_CONVERGENCE_SENSITIVITY -> MORE_LOCAL_EVIDENCE_BUDGET; DEEP_VERIFIED_BASIN -> KEEP_UNRELATED_DETAIL_FOLDED'
  });
}

export function compareAdaptiveEvidenceBudgets(a, b) {
  if (!a || !b) throw new TypeError('two budgets are required');
  if (!Number.isFinite(a.criticality) || !Number.isFinite(b.criticality)) {
    return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'NON_NUMERIC_CRITICALITY' });
  }
  return Object.freeze({
    state: 'DERIVED_COMPARISON',
    moreCritical: a.criticality === b.criticality ? null : a.criticality > b.criticality ? 'A' : 'B',
    deltaCriticality: a.criticality - b.criticality,
    exactBoundaryProven: false
  });
}
