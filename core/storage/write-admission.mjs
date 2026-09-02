const ALWAYS_PERSIST = new Set([
  'GENESIS',
  'PARAM_CHANGE',
  'EXTERNAL_INPUT',
  'MODE_CHANGE',
  'CAUSAL_EVENT',
  'CHECKPOINT',
  'CAPSULE',
  'RUN_END'
]);

const NEVER_PERSIST_AS_CANON = new Set([
  'DETERMINISTIC_STEP',
  'AUTOPILOT_COORDINATE',
  'NO_ACTIVITY',
  'DERIVED_METRIC',
  'MATERIALIZED_POINT',
  'CACHE_ROW'
]);

export function classifyWrite(candidate) {
  const type = candidate?.eventType ?? candidate?.kind;
  if (ALWAYS_PERSIST.has(type)) return { decision: 'PERSIST', reason: 'canonical causal information' };
  if (NEVER_PERSIST_AS_CANON.has(type)) return { decision: 'DERIVE_OR_CACHE', reason: 'reproducible or non-causal materialization' };
  return { decision: 'REVIEW', reason: 'unknown semantic class; fail closed' };
}

export function createWriteBudget(options = {}) {
  return {
    maxCanonicalEventsPerRun: options.maxCanonicalEventsPerRun ?? 10000,
    maxCanonicalBytesPerRun: options.maxCanonicalBytesPerRun ?? 10 * 1024 * 1024,
    maxSingleEventBytes: options.maxSingleEventBytes ?? 256 * 1024,
    usedEvents: 0,
    usedBytes: 0
  };
}

export function admitCanonicalWrite(candidate, budget) {
  const classification = classifyWrite(candidate);
  if (classification.decision !== 'PERSIST') {
    return { allowed: false, ...classification };
  }

  const bytes = Buffer.byteLength(JSON.stringify(candidate), 'utf8');
  if (bytes > budget.maxSingleEventBytes) {
    return { allowed: false, decision: 'BRAKE', reason: `single event ${bytes}B exceeds ${budget.maxSingleEventBytes}B` };
  }
  if (budget.usedEvents + 1 > budget.maxCanonicalEventsPerRun) {
    return { allowed: false, decision: 'BRAKE', reason: 'canonical event budget exhausted' };
  }
  if (budget.usedBytes + bytes > budget.maxCanonicalBytesPerRun) {
    return { allowed: false, decision: 'BRAKE', reason: 'canonical byte budget exhausted' };
  }

  budget.usedEvents += 1;
  budget.usedBytes += bytes;
  return { allowed: true, decision: 'PERSIST', reason: classification.reason, bytes };
}
