export const LVA_PLAN_SCHEMA_VERSION = 'SETKA_LEAST_VERIFIED_ACTION_PLAN_V1';
export const LVA_RESULT_SCHEMA_VERSION = 'SETKA_LEAST_VERIFIED_ACTION_RESULT_V1';

export const REQUIRED_HARD_CONSTRAINTS = Object.freeze([
  'CAUSAL_COMPLETENESS',
  'REPLAY_EXACTNESS_WHERE_REQUIRED',
  'PROVENANCE_PRESERVED',
  'SAFETY_SATISFIED',
  'PRIVACY_DISCLOSURE_SATISFIED',
  'AUTHORITY_SATISFIED',
  'RECOVERABILITY_SATISFIED',
  'RECOVERY_AND_CRYOSLEEP_GATES_SATISFIED'
]);

export const CONSTRAINT_STATES = Object.freeze(['PASS', 'FAIL', 'UNKNOWN', 'NOT_APPLICABLE']);
export const EVIDENCE_STATES = Object.freeze(['MEASURED', 'DERIVED_EXACT', 'ESTIMATED_BOUNDED', 'ESTIMATED_UNBOUNDED', 'UNKNOWN']);
export const VERIFIED_EVIDENCE_STATES = new Set(['MEASURED', 'DERIVED_EXACT', 'ESTIMATED_BOUNDED']);

function finiteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a finite non-negative number`);
  return value;
}

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be a finite positive number`);
  return value;
}

function sortedKeys(object) {
  return Object.keys(object ?? {}).sort();
}

function canonicalObject(object) {
  return Object.fromEntries(sortedKeys(object).map((key) => [key, object[key]]));
}

function sameNumericMap(a, b) {
  const ak = sortedKeys(a);
  const bk = sortedKeys(b);
  if (ak.length !== bk.length || ak.some((key, index) => key !== bk[index])) return false;
  return ak.every((key) => Object.is(a[key], b[key]));
}

export function validatePlan(plan) {
  if (!plan || plan.schemaVersion !== LVA_PLAN_SCHEMA_VERSION) throw new TypeError('unsupported LVA plan schema');
  if (!plan.planId || typeof plan.planId !== 'string') throw new TypeError('planId is required');
  if (!plan.hardConstraints || typeof plan.hardConstraints !== 'object') throw new TypeError('hardConstraints are required');
  if (!plan.references || typeof plan.references !== 'object') throw new TypeError('references are required');
  if (!plan.weights || typeof plan.weights !== 'object') throw new TypeError('weights are required');
  if (!Array.isArray(plan.segments) || plan.segments.length === 0) throw new TypeError('segments must be a non-empty array');

  for (const [name, state] of Object.entries(plan.hardConstraints)) {
    if (!CONSTRAINT_STATES.includes(state)) throw new TypeError(`invalid constraint state ${name}: ${state}`);
  }

  for (const [dimension, reference] of Object.entries(plan.references)) finitePositive(reference, `references.${dimension}`);
  for (const [dimension, weight] of Object.entries(plan.weights)) finiteNonNegative(weight, `weights.${dimension}`);

  for (const segment of plan.segments) {
    if (!segment?.segmentId || typeof segment.segmentId !== 'string') throw new TypeError('segmentId is required');
    finiteNonNegative(segment.duration, `segments.${segment.segmentId}.duration`);
    if (!segment.fixed || typeof segment.fixed !== 'object') throw new TypeError(`segments.${segment.segmentId}.fixed is required`);
    if (!segment.rates || typeof segment.rates !== 'object') throw new TypeError(`segments.${segment.segmentId}.rates is required`);
    if (!segment.evidence || typeof segment.evidence !== 'object') throw new TypeError(`segments.${segment.segmentId}.evidence is required`);

    const dimensions = new Set([...sortedKeys(segment.fixed), ...sortedKeys(segment.rates)]);
    for (const dimension of dimensions) {
      const fixed = segment.fixed[dimension] ?? 0;
      const rate = segment.rates[dimension] ?? 0;
      finiteNonNegative(fixed, `segments.${segment.segmentId}.fixed.${dimension}`);
      finiteNonNegative(rate, `segments.${segment.segmentId}.rates.${dimension}`);
      if (!(dimension in plan.references)) throw new TypeError(`missing reference for cost dimension ${dimension}`);
      if (!(dimension in plan.weights)) throw new TypeError(`missing weight for cost dimension ${dimension}`);
      const evidence = segment.evidence[dimension];
      if (!EVIDENCE_STATES.includes(evidence)) throw new TypeError(`invalid or missing evidence for ${segment.segmentId}.${dimension}`);
    }
  }
  return true;
}

export function assessAdmissibility(plan, { requiredConstraints = REQUIRED_HARD_CONSTRAINTS } = {}) {
  validatePlan(plan);
  const failed = [];
  const unknown = [];
  for (const constraint of requiredConstraints) {
    const state = plan.hardConstraints[constraint] ?? 'UNKNOWN';
    if (state === 'FAIL') failed.push(constraint);
    else if (state === 'UNKNOWN') unknown.push(constraint);
  }
  if (failed.length) return { state: 'BLOCK', failed, unknown: [] };
  if (unknown.length) return { state: 'REVIEW_REQUIRED', failed: [], unknown };
  return { state: 'ADMISSIBLE', failed: [], unknown: [] };
}

export function assessCostEvidence(plan) {
  validatePlan(plan);
  const uncertain = [];
  for (const segment of plan.segments) {
    const dimensions = new Set([...sortedKeys(segment.fixed), ...sortedKeys(segment.rates)]);
    for (const dimension of dimensions) {
      const total = (segment.fixed[dimension] ?? 0) + segment.duration * (segment.rates[dimension] ?? 0);
      if (total === 0) continue;
      const evidence = segment.evidence[dimension];
      if (!VERIFIED_EVIDENCE_STATES.has(evidence)) uncertain.push({ segmentId: segment.segmentId, dimension, evidence });
    }
  }
  return uncertain.length
    ? { state: 'REVIEW_REQUIRED', uncertain }
    : { state: 'VERIFIED', uncertain: [] };
}

export function computeAction(plan) {
  validatePlan(plan);
  const rawTotals = {};
  for (const segment of plan.segments) {
    const dimensions = new Set([...sortedKeys(segment.fixed), ...sortedKeys(segment.rates)]);
    for (const dimension of dimensions) {
      rawTotals[dimension] = (rawTotals[dimension] ?? 0)
        + (segment.fixed[dimension] ?? 0)
        + segment.duration * (segment.rates[dimension] ?? 0);
    }
  }

  const normalizedCosts = {};
  const weightedContributions = {};
  let action = 0;
  for (const dimension of sortedKeys(rawTotals)) {
    const normalized = rawTotals[dimension] / finitePositive(plan.references[dimension], `references.${dimension}`);
    const weight = finiteNonNegative(plan.weights[dimension], `weights.${dimension}`);
    const contribution = normalized * weight;
    normalizedCosts[dimension] = normalized;
    weightedContributions[dimension] = contribution;
    action += contribution;
  }

  return Object.freeze({
    schemaVersion: LVA_RESULT_SCHEMA_VERSION,
    planId: plan.planId,
    action,
    rawTotals: Object.freeze(canonicalObject(rawTotals)),
    normalizedCosts: Object.freeze(canonicalObject(normalizedCosts)),
    weightedContributions: Object.freeze(canonicalObject(weightedContributions))
  });
}

export function evaluatePlan(plan, options = {}) {
  const admissibility = assessAdmissibility(plan, options);
  if (admissibility.state === 'BLOCK') {
    return { schemaVersion: LVA_RESULT_SCHEMA_VERSION, planId: plan.planId, state: 'BLOCK', admissibility, evidence: null, action: null };
  }
  const evidence = assessCostEvidence(plan);
  const action = computeAction(plan);
  if (admissibility.state === 'REVIEW_REQUIRED' || evidence.state === 'REVIEW_REQUIRED') {
    return { schemaVersion: LVA_RESULT_SCHEMA_VERSION, planId: plan.planId, state: 'REVIEW_REQUIRED', admissibility, evidence, action };
  }
  return { schemaVersion: LVA_RESULT_SCHEMA_VERSION, planId: plan.planId, state: 'VERIFIED', admissibility, evidence, action };
}

export function sameCostContract(a, b) {
  validatePlan(a);
  validatePlan(b);
  return a.policyVersion === b.policyVersion
    && sameNumericMap(a.references, b.references)
    && sameNumericMap(a.weights, b.weights);
}

export function paretoDominates(planA, planB, { epsilon = 1e-12 } = {}) {
  epsilon = finiteNonNegative(epsilon, 'epsilon');
  if (!sameCostContract(planA, planB)) throw new TypeError('plans must share the same cost contract for Pareto comparison');
  const a = computeAction(planA).normalizedCosts;
  const b = computeAction(planB).normalizedCosts;
  const dimensions = [...new Set([...sortedKeys(a), ...sortedKeys(b)])];
  let strictlyBetter = false;
  for (const dimension of dimensions) {
    const av = a[dimension] ?? 0;
    const bv = b[dimension] ?? 0;
    if (av > bv + epsilon) return false;
    if (av < bv - epsilon) strictlyBetter = true;
  }
  return strictlyBetter;
}

export function paretoFrontier(plans, options = {}) {
  if (!Array.isArray(plans) || plans.length === 0) return [];
  for (const plan of plans) validatePlan(plan);
  const eligible = plans.filter((plan) => evaluatePlan(plan, options).state === 'VERIFIED');
  return eligible.filter((candidate, i) => !eligible.some((other, j) => i !== j && paretoDominates(other, candidate, options)));
}

export function chooseLeastVerifiedAction(plans, { epsilon = 1e-12, ...options } = {}) {
  epsilon = finiteNonNegative(epsilon, 'epsilon');
  if (!Array.isArray(plans) || plans.length === 0) throw new TypeError('plans must be a non-empty array');
  const evaluations = plans.map((plan) => evaluatePlan(plan, options));
  const verifiedPlans = plans.filter((_, index) => evaluations[index].state === 'VERIFIED');

  if (!verifiedPlans.length) {
    const state = evaluations.some((result) => result.state === 'REVIEW_REQUIRED') ? 'REVIEW_REQUIRED' : 'BLOCK';
    return { schemaVersion: LVA_RESULT_SCHEMA_VERSION, state, winner: null, frontier: [], evaluations };
  }

  const contractAnchor = verifiedPlans[0];
  if (verifiedPlans.some((plan) => !sameCostContract(contractAnchor, plan))) {
    return { schemaVersion: LVA_RESULT_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'COST_CONTRACT_MISMATCH', winner: null, frontier: [], evaluations };
  }

  const frontier = paretoFrontier(verifiedPlans, { epsilon, ...options });
  const ranked = frontier
    .map((plan) => ({ plan, result: computeAction(plan) }))
    .sort((a, b) => a.result.action - b.result.action || a.plan.planId.localeCompare(b.plan.planId));

  const best = ranked[0];
  const tied = ranked.filter((entry) => Math.abs(entry.result.action - best.result.action) <= epsilon);
  if (tied.length > 1) {
    return {
      schemaVersion: LVA_RESULT_SCHEMA_VERSION,
      state: 'REVIEW_REQUIRED',
      reason: 'ACTION_TIE_WITHIN_TOLERANCE',
      winner: null,
      tiedPlanIds: tied.map((entry) => entry.plan.planId),
      frontier: frontier.map((plan) => plan.planId),
      evaluations
    };
  }

  return {
    schemaVersion: LVA_RESULT_SCHEMA_VERSION,
    state: 'VERIFIED_WINNER',
    winner: { planId: best.plan.planId, action: best.result.action },
    frontier: frontier.map((plan) => plan.planId),
    evaluations
  };
}

export function probeLocalStationarity(currentPlan, neighborPlans, { tolerance = 1e-9, ...options } = {}) {
  tolerance = finiteNonNegative(tolerance, 'tolerance');
  const current = evaluatePlan(currentPlan, options);
  if (current.state !== 'VERIFIED') return { state: current.state, stationary: null, reason: 'CURRENT_PLAN_NOT_VERIFIED' };
  const currentAction = current.action.action;
  const improving = [];
  for (const neighbor of neighborPlans ?? []) {
    const evaluated = evaluatePlan(neighbor, options);
    if (evaluated.state !== 'VERIFIED') continue;
    if (!sameCostContract(currentPlan, neighbor)) continue;
    const deltaAction = evaluated.action.action - currentAction;
    if (deltaAction < -tolerance) improving.push({ planId: neighbor.planId, deltaAction });
  }
  improving.sort((a, b) => a.deltaAction - b.deltaAction);
  return {
    schemaVersion: LVA_RESULT_SCHEMA_VERSION,
    state: 'VERIFIED_DIAGNOSTIC',
    stationary: improving.length === 0,
    sampledOnly: true,
    globalOptimalityProven: false,
    currentAction,
    improvingNeighbors: improving
  };
}
