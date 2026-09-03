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
