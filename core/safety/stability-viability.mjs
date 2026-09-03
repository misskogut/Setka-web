export const STABILITY_VIABILITY_SCHEMA_VERSION = 'SETKA_STABILITY_VIABILITY_V1';

function finiteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

function finiteNonNegative(value, name) {
  value = finiteNumber(value, name);
  if (value < 0) throw new RangeError(`${name} must be >= 0`);
  return value;
}

function vector(value, name) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${name} must be a non-empty numeric array`);
  return value.map((item, index) => finiteNumber(item, `${name}[${index}]`));
}

function positiveWeights(weights, dimension) {
  if (weights == null) return Array.from({ length: dimension }, () => 1);
  const out = vector(weights, 'weights');
  if (out.length !== dimension) throw new RangeError('weights dimension mismatch');
  for (let i = 0; i < out.length; i += 1) {
    if (out[i] <= 0) throw new RangeError(`weights[${i}] must be > 0`);
  }
  return out;
}

function sameDimension(a, b, nameA, nameB) {
  if (a.length !== b.length) throw new RangeError(`${nameA}/${nameB} dimension mismatch`);
}

export function quadraticLyapunovValue({ state, equilibrium, weights = null }) {
  const x = vector(state, 'state');
  const xStar = vector(equilibrium, 'equilibrium');
  sameDimension(x, xStar, 'state', 'equilibrium');
  const w = positiveWeights(weights, x.length);
  return x.reduce((sum, value, index) => {
    const delta = value - xStar[index];
    return sum + w[index] * delta * delta;
  }, 0);
}

export function assessDiscreteLyapunovTransition({
  state,
  nextState,
  equilibrium,
  weights = null,
  tolerance = 1e-12
}) {
  tolerance = finiteNonNegative(tolerance, 'tolerance');
  const currentV = quadraticLyapunovValue({ state, equilibrium, weights });
  const nextV = quadraticLyapunovValue({ state: nextState, equilibrium, weights });
  const deltaV = nextV - currentV;

  let classification;
  if (currentV <= tolerance) {
    classification = nextV <= tolerance ? 'EQUILIBRIUM_PRESERVED' : 'LEAVES_EQUILIBRIUM';
  } else if (deltaV < -tolerance) {
    classification = 'STRICTLY_DECREASING';
  } else if (deltaV <= tolerance) {
    classification = 'NONINCREASING_WITHIN_TOLERANCE';
  } else {
    classification = 'INCREASING';
  }

  return Object.freeze({
    schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
    method: 'DISCRETE_QUADRATIC_LYAPUNOV',
    currentV,
    nextV,
    deltaV,
    classification,
    provesGlobalStability: false
  });
}

export function verifyLyapunovEvidence({
  transitions,
  equilibrium,
  weights = null,
  tolerance = 1e-12,
  exhaustiveDeclaredFiniteDomain = false,
  declaredStateCount = null
}) {
  if (!Array.isArray(transitions) || transitions.length === 0) throw new TypeError('transitions must be a non-empty array');
  tolerance = finiteNonNegative(tolerance, 'tolerance');

  const assessments = transitions.map((transition, index) => Object.freeze({
    transitionIndex: index,
    ...assessDiscreteLyapunovTransition({
      state: transition?.state,
      nextState: transition?.nextState,
      equilibrium,
      weights,
      tolerance
    })
  }));

  const violating = assessments.filter((item) => item.classification === 'INCREASING' || item.classification === 'LEAVES_EQUILIBRIUM');
  const nonStrict = assessments.filter((item) => item.classification === 'NONINCREASING_WITHIN_TOLERANCE');

  if (violating.length > 0) {
    return Object.freeze({
      schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
      state: 'STABILITY_CANDIDATE_REJECTED',
      method: 'DISCRETE_QUADRATIC_LYAPUNOV',
      sampledOnly: !exhaustiveDeclaredFiniteDomain,
      exactForDeclaredFiniteModel: false,
      violatingTransitionIndexes: Object.freeze(violating.map((item) => item.transitionIndex)),
      assessments: Object.freeze(assessments)
    });
  }

  if (exhaustiveDeclaredFiniteDomain) {
    if (!Number.isInteger(declaredStateCount) || declaredStateCount < 1) {
      return Object.freeze({
        schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
        state: 'REVIEW_REQUIRED',
        reason: 'DECLARED_FINITE_DOMAIN_SIZE_REQUIRED_FOR_EXHAUSTIVE_CLAIM',
        sampledOnly: false,
        exactForDeclaredFiniteModel: false,
        assessments: Object.freeze(assessments)
      });
    }
    if (transitions.length !== declaredStateCount) {
      return Object.freeze({
        schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
        state: 'REVIEW_REQUIRED',
        reason: 'TRANSITION_COUNT_DOES_NOT_MATCH_DECLARED_FINITE_DOMAIN',
        sampledOnly: false,
        exactForDeclaredFiniteModel: false,
        assessments: Object.freeze(assessments)
      });
    }
    if (nonStrict.length > 0) {
      return Object.freeze({
        schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
        state: 'REVIEW_REQUIRED',
        reason: 'STRICT_DECREASE_NOT_PROVEN_FOR_ALL_NON_EQUILIBRIUM_STATES',
        sampledOnly: false,
        exactForDeclaredFiniteModel: false,
        assessments: Object.freeze(assessments)
      });
    }
    return Object.freeze({
      schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
      state: 'EXACT_CERTIFICATE_FOR_DECLARED_FINITE_MODEL',
      method: 'DISCRETE_QUADRATIC_LYAPUNOV',
      sampledOnly: false,
      exactForDeclaredFiniteModel: true,
      universalPhysicalSystemClaim: false,
      assessments: Object.freeze(assessments)
    });
  }

  return Object.freeze({
    schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
    state: 'SAMPLED_STABILITY_EVIDENCE',
    method: 'DISCRETE_QUADRATIC_LYAPUNOV',
    sampledOnly: true,
    exactForDeclaredFiniteModel: false,
    universalPhysicalSystemClaim: false,
    assessments: Object.freeze(assessments)
  });
}

export function assessDiscreteControlBarrierTransition({
  hCurrent,
  hNext,
  alphaRate = 1,
  tolerance = 1e-12
}) {
  hCurrent = finiteNumber(hCurrent, 'hCurrent');
  hNext = finiteNumber(hNext, 'hNext');
  alphaRate = finiteNumber(alphaRate, 'alphaRate');
  tolerance = finiteNonNegative(tolerance, 'tolerance');
  if (alphaRate < 0 || alphaRate > 1) throw new RangeError('alphaRate must be in [0, 1]');

  const deltaH = hNext - hCurrent;
  const requiredDeltaLowerBound = -alphaRate * hCurrent;
  let classification;
  if (hCurrent < -tolerance) classification = 'CURRENT_OUTSIDE_SAFE_SET';
  else if (hNext < -tolerance) classification = 'UNSAFE_NEXT_STATE';
  else if (deltaH + tolerance >= requiredDeltaLowerBound) classification = 'BARRIER_PRESERVED';
  else classification = 'BARRIER_CONDITION_VIOLATED';

  return Object.freeze({
    schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
    method: 'DISCRETE_CONTROL_BARRIER_FUNCTION',
    safeSetConvention: 'h(x)>=0',
    hCurrent,
    hNext,
    deltaH,
    alphaRate,
    requiredDeltaLowerBound,
    classification,
    preservesDeclaredBarrierCondition: classification === 'BARRIER_PRESERVED',
    provesGlobalForwardInvariance: false
  });
}

function uniqueStrings(values, name) {
  if (!Array.isArray(values)) throw new TypeError(`${name} must be an array`);
  const out = [];
  const seen = new Set();
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name}[${i}] must be a non-empty string`);
    if (seen.has(value)) throw new RangeError(`${name} contains duplicate ${value}`);
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function computeFiniteBarrierPreservingActions({
  states,
  actionsByState,
  transitionTable,
  barrierByState,
  alphaRate = 1,
  completeDeclaredFiniteModel = false,
  tolerance = 1e-12
}) {
  const stateIds = uniqueStrings(states, 'states');
  const stateSet = new Set(stateIds);
  if (!actionsByState || typeof actionsByState !== 'object' || Array.isArray(actionsByState)) throw new TypeError('actionsByState must be an object');
  if (!transitionTable || typeof transitionTable !== 'object' || Array.isArray(transitionTable)) throw new TypeError('transitionTable must be an object');
  if (!barrierByState || typeof barrierByState !== 'object' || Array.isArray(barrierByState)) throw new TypeError('barrierByState must be an object');
  alphaRate = finiteNumber(alphaRate, 'alphaRate');
  tolerance = finiteNonNegative(tolerance, 'tolerance');
  if (alphaRate < 0 || alphaRate > 1) throw new RangeError('alphaRate must be in [0, 1]');

  const witnessActions = {};
  const safeSideStateIds = [];
  const statesWithoutWitness = [];
  const assessments = [];

  for (const stateId of stateIds) {
    if (!Object.hasOwn(barrierByState, stateId)) throw new RangeError(`missing barrier value for ${stateId}`);
    const hCurrent = finiteNumber(barrierByState[stateId], `barrierByState.${stateId}`);
    const actions = uniqueStrings(actionsByState[stateId] ?? [], `actionsByState.${stateId}`);
    const safeSide = hCurrent >= -tolerance;
    if (safeSide) safeSideStateIds.push(stateId);
    const preserving = [];

    for (const actionId of actions) {
      const key = `${stateId}|${actionId}`;
      if (!Object.hasOwn(transitionTable, key)) throw new RangeError(`missing transition ${key}`);
      const nextStateId = transitionTable[key];
      if (typeof nextStateId !== 'string' || !stateSet.has(nextStateId)) throw new RangeError(`transition ${key} points outside declared state model`);
      if (!Object.hasOwn(barrierByState, nextStateId)) throw new RangeError(`missing barrier value for ${nextStateId}`);
      const assessment = assessDiscreteControlBarrierTransition({
        hCurrent,
        hNext: finiteNumber(barrierByState[nextStateId], `barrierByState.${nextStateId}`),
        alphaRate,
        tolerance
      });
      assessments.push(Object.freeze({ stateId, actionId, nextStateId, ...assessment }));
      if (assessment.preservesDeclaredBarrierCondition) preserving.push(actionId);
    }

    witnessActions[stateId] = preserving.sort();
    if (safeSide && preserving.length === 0) statesWithoutWitness.push(stateId);
  }

  return Object.freeze({
    schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
    state: completeDeclaredFiniteModel ? 'EXACT_BARRIER_ACTION_FILTER_FOR_DECLARED_FINITE_MODEL' : 'SAMPLED_OR_PARTIAL_BARRIER_EVIDENCE',
    method: 'DISCRETE_CONTROL_BARRIER_FUNCTION',
    exactForDeclaredFiniteModel: Boolean(completeDeclaredFiniteModel),
    continuousOrUnmodeledWorldClaim: false,
    declaredSafeSideControlInvariant: Boolean(completeDeclaredFiniteModel) && statesWithoutWitness.length === 0,
    safeSideStateIds: Object.freeze(safeSideStateIds.sort()),
    statesWithoutWitness: Object.freeze(statesWithoutWitness.sort()),
    witnessActions: Object.freeze(witnessActions),
    assessments: Object.freeze(assessments)
  });
}

export function computeFiniteViabilityKernel({
  states,
  safeStateIds,
  actionsByState,
  transitionTable,
  maxPasses = null
}) {
  const stateIds = uniqueStrings(states, 'states');
  const safeIds = uniqueStrings(safeStateIds, 'safeStateIds');
  const stateSet = new Set(stateIds);
  for (const stateId of safeIds) {
    if (!stateSet.has(stateId)) throw new RangeError(`safe state ${stateId} is outside declared state model`);
  }
  if (!actionsByState || typeof actionsByState !== 'object' || Array.isArray(actionsByState)) throw new TypeError('actionsByState must be an object');
  if (!transitionTable || typeof transitionTable !== 'object' || Array.isArray(transitionTable)) throw new TypeError('transitionTable must be an object');
  if (maxPasses == null) maxPasses = stateIds.length + 1;
  if (!Number.isInteger(maxPasses) || maxPasses < 1) throw new TypeError('maxPasses must be an integer >= 1');

  for (const stateId of stateIds) {
    const actions = actionsByState[stateId] ?? [];
    uniqueStrings(actions, `actionsByState.${stateId}`);
    for (const actionId of actions) {
      const key = `${stateId}|${actionId}`;
      if (!Object.hasOwn(transitionTable, key)) throw new RangeError(`missing transition ${key}`);
      const next = transitionTable[key];
      if (typeof next !== 'string' || !stateSet.has(next)) throw new RangeError(`transition ${key} points outside declared state model`);
    }
  }

  let kernel = new Set(safeIds);
  let passes = 0;
  let changed = true;
  while (changed && passes < maxPasses) {
    passes += 1;
    changed = false;
    const nextKernel = new Set();
    for (const stateId of kernel) {
      const actions = actionsByState[stateId] ?? [];
      const hasViableAction = actions.some((actionId) => kernel.has(transitionTable[`${stateId}|${actionId}`]));
      if (hasViableAction) nextKernel.add(stateId);
      else changed = true;
    }
    kernel = nextKernel;
  }

  if (changed) {
    return Object.freeze({
      schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
      state: 'REVIEW_REQUIRED',
      reason: 'FIXED_POINT_NOT_REACHED_WITHIN_MAX_PASSES',
      exactForDeclaredFiniteModel: false,
      passes,
      viableStateIds: Object.freeze([...kernel].sort())
    });
  }

  const witnessActions = {};
  for (const stateId of [...kernel].sort()) {
    const actions = actionsByState[stateId] ?? [];
    witnessActions[stateId] = actions.filter((actionId) => kernel.has(transitionTable[`${stateId}|${actionId}`])).sort();
  }

  return Object.freeze({
    schemaVersion: STABILITY_VIABILITY_SCHEMA_VERSION,
    state: 'EXACT_VIABILITY_KERNEL_FOR_DECLARED_FINITE_MODEL',
    method: 'BACKWARD_CONTROLLED_INVARIANCE_FIXED_POINT',
    exactForDeclaredFiniteModel: true,
    continuousOrUnmodeledWorldClaim: false,
    passes,
    safeStateCount: safeIds.length,
    viableStateCount: kernel.size,
    viableStateIds: Object.freeze([...kernel].sort()),
    witnessActions: Object.freeze(witnessActions)
  });
}
