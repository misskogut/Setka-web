export const SCALING_LAW_SCHEMA_VERSION = 'SETKA_SCALING_LAW_V1';

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be a finite positive number`);
  return value;
}

function finiteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

export function fitPowerLawCandidate(samples) {
  if (!Array.isArray(samples) || samples.length < 3) throw new TypeError('at least three positive x/y samples are required');
  const points = samples.map((sample, index) => ({
    x: finitePositive(sample?.x, `samples[${index}].x`),
    y: finitePositive(sample?.y, `samples[${index}].y`)
  }));
  const lx = points.map((point) => Math.log(point.x));
  const ly = points.map((point) => Math.log(point.y));
  const meanX = lx.reduce((sum, value) => sum + value, 0) / lx.length;
  const meanY = ly.reduce((sum, value) => sum + value, 0) / ly.length;
  let covariance = 0;
  let varianceX = 0;
  let totalY = 0;
  for (let i = 0; i < lx.length; i += 1) {
    covariance += (lx[i] - meanX) * (ly[i] - meanY);
    varianceX += (lx[i] - meanX) ** 2;
    totalY += (ly[i] - meanY) ** 2;
  }
  if (varianceX === 0) throw new RangeError('power-law fit requires varying x values');
  const alpha = covariance / varianceX;
  const logC = meanY - alpha * meanX;
  const predicted = lx.map((value) => logC + alpha * value);
  const residualSumSquares = predicted.reduce((sum, value, index) => sum + (ly[index] - value) ** 2, 0);
  const rSquared = totalY === 0 ? 1 : 1 - residualSumSquares / totalY;
  const rmseLog = Math.sqrt(residualSumSquares / lx.length);
  return Object.freeze({
    schemaVersion: SCALING_LAW_SCHEMA_VERSION,
    model: 'POWER_LAW',
    formula: 'Y=C*X^alpha',
    C: Math.exp(logC),
    alpha,
    sampleCount: points.length,
    xRange: Object.freeze({ min: Math.min(...points.map((point) => point.x)), max: Math.max(...points.map((point) => point.x)) }),
    rSquared,
    rmseLog,
    status: 'CANDIDATE_ONLY',
    alternativeModelComparisonPassed: false,
    extrapolationCertified: false,
    canonicalTruth: false
  });
}

export function classifyScalingExponent(alpha, { epsilon = 0.05 } = {}) {
  alpha = finiteNumber(alpha, 'alpha');
  epsilon = finitePositive(epsilon, 'epsilon');
  if (alpha > 1 + epsilon) return 'SUPERLINEAR_GROWTH_RISK_CANDIDATE';
  if (alpha < 1 - epsilon) return 'SUBLINEAR_GROWTH_CANDIDATE';
  return 'APPROX_LINEAR_GROWTH_CANDIDATE';
}

export function projectPowerLawCandidate(fit, x) {
  if (fit?.schemaVersion !== SCALING_LAW_SCHEMA_VERSION || fit.model !== 'POWER_LAW') throw new TypeError('unsupported scaling model');
  x = finitePositive(x, 'x');
  const y = fit.C * x ** fit.alpha;
  return Object.freeze({
    schemaVersion: SCALING_LAW_SCHEMA_VERSION,
    x,
    y,
    insideObservedRange: x >= fit.xRange.min && x <= fit.xRange.max,
    evidenceState: 'ESTIMATED_UNBOUNDED',
    canonicalTruth: false,
    reason: 'POWER_LAW_CANDIDATE_REQUIRES_RANGE_UNCERTAINTY_AND_ALTERNATIVE_MODEL_COMPARISON_BEFORE_CONSEQUENTIAL_USE'
  });
}

export function certifyScalingModel(fit, {
  alternativeModelComparison,
  validRange,
  uncertaintyBound,
  evidenceState = 'ESTIMATED_BOUNDED'
} = {}) {
  if (fit?.schemaVersion !== SCALING_LAW_SCHEMA_VERSION || fit.model !== 'POWER_LAW') throw new TypeError('unsupported scaling model');
  if (alternativeModelComparison !== 'PASS') {
    return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'ALTERNATIVE_MODEL_COMPARISON_NOT_PASSED', model: fit });
  }
  if (!validRange || !Number.isFinite(validRange.min) || !Number.isFinite(validRange.max) || validRange.min <= 0 || validRange.max < validRange.min) {
    return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'VALID_RANGE_NOT_DECLARED', model: fit });
  }
  if (!Number.isFinite(uncertaintyBound) || uncertaintyBound < 0) {
    return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'UNCERTAINTY_BOUND_NOT_DECLARED', model: fit });
  }
  if (!['MEASURED', 'DERIVED_EXACT', 'ESTIMATED_BOUNDED'].includes(evidenceState)) {
    return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'EVIDENCE_NOT_BOUNDED', model: fit });
  }
  return Object.freeze({
    state: 'CERTIFIED_FOR_DECLARED_RANGE',
    model: Object.freeze({
      ...fit,
      status: 'CERTIFIED_FOR_DECLARED_RANGE',
      alternativeModelComparisonPassed: true,
      validRange: Object.freeze({ min: validRange.min, max: validRange.max }),
      uncertaintyBound,
      evidenceState,
      extrapolationCertified: false,
      canonicalTruth: false
    })
  });
}

export function projectCertifiedScalingModel(certifiedModel, x) {
  if (certifiedModel?.status !== 'CERTIFIED_FOR_DECLARED_RANGE') throw new TypeError('model is not certified for a declared range');
  x = finitePositive(x, 'x');
  if (x < certifiedModel.validRange.min || x > certifiedModel.validRange.max) {
    return Object.freeze({
      schemaVersion: SCALING_LAW_SCHEMA_VERSION,
      state: 'REVIEW_REQUIRED',
      x,
      y: null,
      reason: 'TARGET_SCALE_OUTSIDE_CERTIFIED_RANGE'
    });
  }
  const y = certifiedModel.C * x ** certifiedModel.alpha;
  return Object.freeze({
    schemaVersion: SCALING_LAW_SCHEMA_VERSION,
    state: 'BOUNDED_ESTIMATE',
    x,
    y,
    uncertaintyBound: certifiedModel.uncertaintyBound,
    evidenceState: certifiedModel.evidenceState,
    canonicalTruth: false
  });
}
