import test from 'node:test';
import assert from 'node:assert/strict';
import {
  quadraticLyapunovValue,
  assessDiscreteLyapunovTransition,
  verifyLyapunovEvidence,
  assessDiscreteControlBarrierTransition,
  computeFiniteBarrierPreservingActions,
  computeFiniteViabilityKernel
} from '../core/safety/stability-viability.mjs';

test('quadratic Lyapunov value is zero only at declared equilibrium for positive weights', () => {
  assert.equal(quadraticLyapunovValue({ state: [0, 0], equilibrium: [0, 0], weights: [1, 2] }), 0);
  assert.equal(quadraticLyapunovValue({ state: [2, -1], equilibrium: [0, 0], weights: [1, 2] }), 6);
});

test('discrete Lyapunov transition detects strict decrease', () => {
  const out = assessDiscreteLyapunovTransition({
    state: [2],
    nextState: [1],
    equilibrium: [0]
  });
  assert.equal(out.classification, 'STRICTLY_DECREASING');
  assert.equal(out.currentV, 4);
  assert.equal(out.nextV, 1);
  assert.equal(out.deltaV, -3);
  assert.equal(out.provesGlobalStability, false);
});

test('sampled decreasing transitions remain sampled evidence, not global theorem', () => {
  const out = verifyLyapunovEvidence({
    equilibrium: [0],
    transitions: [
      { state: [2], nextState: [1] },
      { state: [1], nextState: [0] },
      { state: [0], nextState: [0] }
    ]
  });
  assert.equal(out.state, 'SAMPLED_STABILITY_EVIDENCE');
  assert.equal(out.sampledOnly, true);
  assert.equal(out.exactForDeclaredFiniteModel, false);
});

test('exhaustive declared finite model can receive an exact finite-model Lyapunov certificate', () => {
  const out = verifyLyapunovEvidence({
    equilibrium: [0],
    exhaustiveDeclaredFiniteDomain: true,
    declaredStateCount: 3,
    transitions: [
      { state: [2], nextState: [1] },
      { state: [1], nextState: [0] },
      { state: [0], nextState: [0] }
    ]
  });
  assert.equal(out.state, 'EXACT_CERTIFICATE_FOR_DECLARED_FINITE_MODEL');
  assert.equal(out.exactForDeclaredFiniteModel, true);
  assert.equal(out.universalPhysicalSystemClaim, false);
});

test('increasing Lyapunov transition rejects the stability candidate', () => {
  const out = verifyLyapunovEvidence({
    equilibrium: [0],
    transitions: [
      { state: [1], nextState: [2] }
    ]
  });
  assert.equal(out.state, 'STABILITY_CANDIDATE_REJECTED');
  assert.deepEqual(out.violatingTransitionIndexes, [0]);
});

test('discrete control barrier preserves declared safe side when h condition is satisfied', () => {
  const out = assessDiscreteControlBarrierTransition({ hCurrent: 2, hNext: 1.2, alphaRate: 0.5 });
  assert.equal(out.classification, 'BARRIER_PRESERVED');
  assert.equal(out.preservesDeclaredBarrierCondition, true);
  assert.equal(out.provesGlobalForwardInvariance, false);
});

test('discrete control barrier blocks transition to negative safe-set side', () => {
  const out = assessDiscreteControlBarrierTransition({ hCurrent: 0.3, hNext: -0.01, alphaRate: 1 });
  assert.equal(out.classification, 'UNSAFE_NEXT_STATE');
  assert.equal(out.preservesDeclaredBarrierCondition, false);
});

test('finite barrier filter derives witness actions and exactness only for declared complete finite model', () => {
  const out = computeFiniteBarrierPreservingActions({
    states: ['A', 'B', 'FAIL'],
    actionsByState: {
      A: ['stay', 'risk'],
      B: ['toA'],
      FAIL: ['stay']
    },
    transitionTable: {
      'A|stay': 'A',
      'A|risk': 'FAIL',
      'B|toA': 'A',
      'FAIL|stay': 'FAIL'
    },
    barrierByState: { A: 1, B: 0.5, FAIL: -1 },
    alphaRate: 1,
    completeDeclaredFiniteModel: true
  });
  assert.equal(out.state, 'EXACT_BARRIER_ACTION_FILTER_FOR_DECLARED_FINITE_MODEL');
  assert.deepEqual(out.witnessActions.A, ['stay']);
  assert.deepEqual(out.witnessActions.B, ['toA']);
  assert.deepEqual(out.safeSideStateIds, ['A', 'B']);
  assert.equal(out.declaredSafeSideControlInvariant, true);
  assert.equal(out.continuousOrUnmodeledWorldClaim, false);
});

test('finite viability kernel removes safe states that cannot remain safe', () => {
  const out = computeFiniteViabilityKernel({
    states: ['A', 'B', 'C', 'FAIL'],
    safeStateIds: ['A', 'B', 'C'],
    actionsByState: {
      A: ['stay', 'toB'],
      B: ['toC'],
      C: ['fail'],
      FAIL: ['stay']
    },
    transitionTable: {
      'A|stay': 'A',
      'A|toB': 'B',
      'B|toC': 'C',
      'C|fail': 'FAIL',
      'FAIL|stay': 'FAIL'
    }
  });
  assert.equal(out.state, 'EXACT_VIABILITY_KERNEL_FOR_DECLARED_FINITE_MODEL');
  assert.deepEqual(out.viableStateIds, ['A']);
  assert.deepEqual(out.witnessActions.A, ['stay']);
  assert.equal(out.continuousOrUnmodeledWorldClaim, false);
});

test('finite viability calculation fails closed when declared transitions are incomplete', () => {
  assert.throws(() => computeFiniteViabilityKernel({
    states: ['A', 'B'],
    safeStateIds: ['A'],
    actionsByState: { A: ['go'], B: [] },
    transitionTable: {}
  }), /missing transition A\|go/);
});
