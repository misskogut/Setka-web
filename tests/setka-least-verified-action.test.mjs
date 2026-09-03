import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_HARD_CONSTRAINTS,
  computeAction,
  evaluatePlan,
  paretoDominates,
  paretoFrontier,
  chooseLeastVerifiedAction,
  probeLocalStationarity
} from '../core/optimization/least-verified-action.mjs';
import {
  fitPowerLawCandidate,
  classifyScalingExponent,
  projectPowerLawCandidate,
  certifyScalingModel,
  projectCertifiedScalingModel
} from '../core/optimization/scaling-law.mjs';
import {
  deriveAdaptiveEvidenceBudget,
  compareAdaptiveEvidenceBudgets
} from '../core/optimization/adaptive-evidence-budget.mjs';

function constraints(overrides = {}) {
  return Object.fromEntries(REQUIRED_HARD_CONSTRAINTS.map((key) => [key, overrides[key] ?? 'PASS']));
}

function plan({
  id,
  fixed = {},
  rates = {},
  duration = 1,
  evidence = {},
  hard = {},
  references = { COMPUTE: 10, MONEY: 10, LATENCY: 10 },
  weights = { COMPUTE: 1, MONEY: 1, LATENCY: 1 },
  policyVersion = 'LVA_TEST_POLICY_V1',
  horizon = '10-runs'
}) {
  const dims = new Set([...Object.keys(fixed), ...Object.keys(rates)]);
  const ev = { ...evidence };
  for (const dim of dims) ev[dim] ??= 'MEASURED';
  return {
    schemaVersion: 'SETKA_LEAST_VERIFIED_ACTION_PLAN_V1',
    planId: id,
    branchId: null,
    policyVersion,
    evaluationHorizon: horizon,
    hardConstraints: constraints(hard),
    references,
    weights,
    segments: [{ segmentId: 's1', duration, fixed, rates, evidence: ev }],
    provenance: null
  };
}

test('hard constraint failure blocks even numerically cheapest plan', () => {
  const unsafe = plan({ id: 'unsafe', fixed: { MONEY: 0 }, hard: { SAFETY_SATISFIED: 'FAIL' } });
  const safe = plan({ id: 'safe', fixed: { MONEY: 10 } });
  assert.equal(evaluatePlan(unsafe).state, 'BLOCK');
  assert.equal(chooseLeastVerifiedAction([unsafe, safe]).winner.planId, 'safe');
});

test('unknown required hard constraint fails closed to review', () => {
  const p = plan({ id: 'unknown-hard', fixed: { COMPUTE: 1 }, hard: { CAUSAL_COMPLETENESS: 'UNKNOWN' } });
  assert.equal(evaluatePlan(p).state, 'REVIEW_REQUIRED');
});

test('action uses normalized weighted fixed plus rate costs', () => {
  const p = plan({
    id: 'math',
    fixed: { COMPUTE: 10, MONEY: 5 },
    rates: { COMPUTE: 2, LATENCY: 1 },
    duration: 5
  });
  const r = computeAction(p);
  assert.equal(r.rawTotals.COMPUTE, 20);
  assert.equal(r.rawTotals.MONEY, 5);
  assert.equal(r.rawTotals.LATENCY, 5);
  assert.equal(r.action, 3);
});

test('whole-horizon action can prefer upfront investment over locally cheaper recurring path', () => {
  const noIndex = plan({ id: 'scan-every-time', rates: { COMPUTE: 10 }, duration: 10 });
  const buildIndex = plan({ id: 'build-index', fixed: { COMPUTE: 30 }, rates: { COMPUTE: 2 }, duration: 10 });
  const result = chooseLeastVerifiedAction([noIndex, buildIndex]);
  assert.equal(result.state, 'VERIFIED_WINNER');
  assert.equal(result.winner.planId, 'build-index');
  assert.ok(result.winner.action < computeAction(noIndex).action);
});

test('Pareto domination removes strictly worse verified candidate', () => {
  const a = plan({ id: 'a', fixed: { COMPUTE: 2, MONEY: 2 } });
  const b = plan({ id: 'b', fixed: { COMPUTE: 3, MONEY: 2 } });
  assert.equal(paretoDominates(a, b), true);
  assert.deepEqual(paretoFrontier([a, b]).map((x) => x.planId), ['a']);
});

test('equal least action is review, not invented deterministic winner', () => {
  const a = plan({ id: 'a', fixed: { COMPUTE: 2 } });
  const b = plan({ id: 'b', fixed: { COMPUTE: 2 } });
  const result = chooseLeastVerifiedAction([a, b]);
  assert.equal(result.state, 'REVIEW_REQUIRED');
  assert.equal(result.reason, 'ACTION_TIE_WITHIN_TOLERANCE');
});

test('unbounded or unknown cost evidence cannot silently win', () => {
  const uncertain = plan({ id: 'uncertain', fixed: { MONEY: 1 }, evidence: { MONEY: 'ESTIMATED_UNBOUNDED' } });
  const verified = plan({ id: 'verified', fixed: { MONEY: 2 } });
  assert.equal(evaluatePlan(uncertain).state, 'REVIEW_REQUIRED');
  assert.equal(chooseLeastVerifiedAction([uncertain, verified]).winner.planId, 'verified');
});

test('mismatched cost contracts require review', () => {
  const a = plan({ id: 'a', fixed: { COMPUTE: 1 } });
  const b = plan({ id: 'b', fixed: { COMPUTE: 1 }, weights: { COMPUTE: 2, MONEY: 1, LATENCY: 1 } });
  const result = chooseLeastVerifiedAction([a, b]);
  assert.equal(result.state, 'REVIEW_REQUIRED');
  assert.equal(result.reason, 'COST_CONTRACT_MISMATCH');
});

test('local stationarity probe finds verified lower-action neighbor', () => {
  const current = plan({ id: 'current', fixed: { COMPUTE: 8 } });
  const worse = plan({ id: 'worse', fixed: { COMPUTE: 9 } });
  const better = plan({ id: 'better', fixed: { COMPUTE: 5 } });
  const result = probeLocalStationarity(current, [worse, better]);
  assert.equal(result.state, 'VERIFIED_DIAGNOSTIC');
  assert.equal(result.stationary, false);
  assert.equal(result.improvingNeighbors[0].planId, 'better');
  assert.equal(result.globalOptimalityProven, false);
});

test('no sampled improvement is explicitly not global-optimality proof', () => {
  const current = plan({ id: 'current', fixed: { COMPUTE: 5 } });
  const neighbor = plan({ id: 'neighbor', fixed: { COMPUTE: 6 } });
  const result = probeLocalStationarity(current, [neighbor]);
  assert.equal(result.stationary, true);
  assert.equal(result.sampledOnly, true);
  assert.equal(result.globalOptimalityProven, false);
});

test('power-law fit is explicitly only a candidate model', () => {
  const fit = fitPowerLawCandidate([
    { x: 1, y: 2 },
    { x: 2, y: 8 },
    { x: 4, y: 32 },
    { x: 8, y: 128 }
  ]);
  assert.ok(Math.abs(fit.alpha - 2) < 1e-12);
  assert.ok(Math.abs(fit.C - 2) < 1e-12);
  assert.equal(fit.status, 'CANDIDATE_ONLY');
  assert.equal(fit.canonicalTruth, false);
  assert.equal(classifyScalingExponent(fit.alpha), 'SUPERLINEAR_GROWTH_RISK_CANDIDATE');
});

test('uncertified power-law projection remains unbounded evidence and cannot silently drive LVA', () => {
  const fit = fitPowerLawCandidate([
    { x: 1, y: 1 },
    { x: 2, y: 4 },
    { x: 4, y: 16 }
  ]);
  const estimate = projectPowerLawCandidate(fit, 8);
  assert.equal(estimate.evidenceState, 'ESTIMATED_UNBOUNDED');
  const uncertain = plan({ id: 'scaled-uncertain', fixed: { COMPUTE: estimate.y }, evidence: { COMPUTE: estimate.evidenceState } });
  assert.equal(evaluatePlan(uncertain).state, 'REVIEW_REQUIRED');
});

test('power-law model requires alternative comparison, range and bounded uncertainty before bounded use', () => {
  const fit = fitPowerLawCandidate([
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 4, y: 8 }
  ]);
  assert.equal(certifyScalingModel(fit, { alternativeModelComparison: 'FAIL' }).state, 'REVIEW_REQUIRED');
  const certified = certifyScalingModel(fit, {
    alternativeModelComparison: 'PASS',
    validRange: { min: 1, max: 16 },
    uncertaintyBound: 0.1
  });
  assert.equal(certified.state, 'CERTIFIED_FOR_DECLARED_RANGE');
  const projection = projectCertifiedScalingModel(certified.model, 8);
  assert.equal(projection.state, 'BOUNDED_ESTIMATE');
  assert.ok(Math.abs(projection.y - 16) < 1e-12);
  assert.equal(projectCertifiedScalingModel(certified.model, 32).state, 'REVIEW_REQUIRED');
});

test('near sampled basin boundary receives larger evidence budget than deep basin state', () => {
  const common = {
    convergenceState: 'CONVERGED',
    residual: 1e-12,
    iterations: 4
  };
  const nearBoundary = deriveAdaptiveEvidenceBudget({
    assignment: { ...common, sampledBoundaryDistanceEstimate: 0.01 },
    boundaryReferenceDistance: 0.1,
    baseBudget: { counterfactualTwins: 2, proofSamples: 4, localResolution: 1 },
    maxMultiplier: 8
  });
  const deepBasin = deriveAdaptiveEvidenceBudget({
    assignment: { ...common, sampledBoundaryDistanceEstimate: 10 },
    boundaryReferenceDistance: 0.1,
    baseBudget: { counterfactualTwins: 2, proofSamples: 4, localResolution: 1 },
    maxMultiplier: 8
  });
  assert.ok(nearBoundary.criticality > deepBasin.criticality);
  assert.ok(nearBoundary.budget.counterfactualTwins > deepBasin.budget.counterfactualTwins);
  assert.equal(compareAdaptiveEvidenceBudgets(nearBoundary, deepBasin).moreCritical, 'A');
  assert.equal(nearBoundary.exactBoundaryProven, false);
});

test('deep stable basin may fold unrelated detail while uncertain basin fails closed', () => {
  const deep = deriveAdaptiveEvidenceBudget({
    assignment: { convergenceState: 'CONVERGED', sampledBoundaryDistanceEstimate: 100, residual: 0, iterations: 0 },
    boundaryReferenceDistance: 0.1,
    foldThreshold: 0.2
  });
  assert.equal(deep.foldUnrelatedDetail, true);
  const unknown = deriveAdaptiveEvidenceBudget({
    assignment: { convergenceState: 'MAX_ITERATIONS', sampledBoundaryDistanceEstimate: null, residual: 1, iterations: 64 },
    boundaryReferenceDistance: 0.1
  });
  assert.equal(unknown.state, 'REVIEW_REQUIRED');
  assert.equal(unknown.foldUnrelatedDetail, false);
});
