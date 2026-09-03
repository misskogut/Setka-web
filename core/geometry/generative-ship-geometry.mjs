export const GEOMETRY_SCHEMA_VERSION = 'SETKA_GENERATIVE_SHIP_GEOMETRY_V1';
export const QUADRATIC_LAW_VERSION = 'SETKA_QUADRATIC_COMPLEX_V1';
export const NUMERIC_CONTRACT = 'FLOAT64_JS_V1';
export const FEIGENBAUM_DELTA = 4.66920160910299;
export const FEIGENBAUM_ALPHA = -2.5029078750958928;
export const QUADRATIC_FEIGENBAUM_C_INFINITY = -1.4011551890920506;

function finiteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

export function complex(re = 0, im = 0) {
  return { re: finiteNumber(re, 're'), im: finiteNumber(im, 'im') };
}

export function quadraticStep(z, c) {
  const zr = finiteNumber(z?.re, 'z.re');
  const zi = finiteNumber(z?.im, 'z.im');
  const cr = finiteNumber(c?.re, 'c.re');
  const ci = finiteNumber(c?.im, 'c.im');
  return {
    re: zr * zr - zi * zi + cr,
    im: 2 * zr * zi + ci
  };
}

export function magnitudeSquared(z) {
  const re = finiteNumber(z?.re, 'z.re');
  const im = finiteNumber(z?.im, 'z.im');
  return re * re + im * im;
}

export function logisticParameterToQuadraticC(r) {
  r = finiteNumber(r, 'r');
  return complex((r * (2 - r)) / 4, 0);
}

export function logisticStateToQuadraticZ(x, r) {
  x = finiteNumber(x, 'x');
  r = finiteNumber(r, 'r');
  return complex(r * (0.5 - x), 0);
}

export function logisticStep(x, r) {
  x = finiteNumber(x, 'x');
  r = finiteNumber(r, 'r');
  return r * x * (1 - x);
}

export function materializeCriticalOrbit({ c, steps, escapeRadius = 2, includeInitial = true }) {
  if (!Number.isInteger(steps) || steps < 0) throw new TypeError('steps must be a non-negative integer');
  escapeRadius = finiteNumber(escapeRadius, 'escapeRadius');
  if (escapeRadius <= 0) throw new RangeError('escapeRadius must be > 0');
  const radius2 = escapeRadius * escapeRadius;
  const orbit = [];
  let z = complex(0, 0);
  if (includeInitial) orbit.push(z);
  let escapedAt = null;
  for (let n = 1; n <= steps; n += 1) {
    z = quadraticStep(z, c);
    orbit.push(z);
    if (magnitudeSquared(z) > radius2) {
      escapedAt = n;
      break;
    }
  }
  return {
    schemaVersion: 'SETKA_GEOMETRY_MATERIALIZATION_V1',
    lawVersion: QUADRATIC_LAW_VERSION,
    numericContract: NUMERIC_CONTRACT,
    c: complex(c.re, c.im),
    orbit,
    escapedAt,
    materializationState: 'UNFOLDED'
  };
}

export function escapeTime({ c, maxIterations = 1000, escapeRadius = 2 }) {
  if (!Number.isInteger(maxIterations) || maxIterations < 0) throw new TypeError('maxIterations must be a non-negative integer');
  let z = complex(0, 0);
  const radius2 = finiteNumber(escapeRadius, 'escapeRadius') ** 2;
  for (let n = 1; n <= maxIterations; n += 1) {
    z = quadraticStep(z, c);
    if (magnitudeSquared(z) > radius2) return n;
  }
  return null;
}

export function fullState4D(c, z) {
  return Object.freeze({
    cRe: finiteNumber(c?.re, 'c.re'),
    cIm: finiteNumber(c?.im, 'c.im'),
    zRe: finiteNumber(z?.re, 'z.re'),
    zIm: finiteNumber(z?.im, 'z.im')
  });
}

export function project3D(state4D, { zLens = 'Z_RE' } = {}) {
  const x = finiteNumber(state4D?.cRe, 'state4D.cRe');
  const y = finiteNumber(state4D?.cIm, 'state4D.cIm');
  const zr = finiteNumber(state4D?.zRe, 'state4D.zRe');
  const zi = finiteNumber(state4D?.zIm, 'state4D.zIm');
  const lenses = {
    Z_RE: zr,
    Z_IM: zi,
    Z_MAGNITUDE: Math.hypot(zr, zi)
  };
  if (!(zLens in lenses)) throw new RangeError(`Unsupported zLens: ${zLens}`);
  return { x, y, z: lenses[zLens], zLens, projectionOnly: true };
}

export function feigenbaumNextParameterScale(previousScale) {
  previousScale = finiteNumber(previousScale, 'previousScale');
  if (previousScale < 0) throw new RangeError('previousScale must be >= 0');
  return previousScale / FEIGENBAUM_DELTA;
}

export function createFoldedSector({ sectorId, c, lawVersion = QUADRATIC_LAW_VERSION, parentSectorId = null, branchId = null, instanceOf = null }) {
  if (!sectorId || typeof sectorId !== 'string') throw new TypeError('sectorId is required');
  return Object.freeze({
    schemaVersion: GEOMETRY_SCHEMA_VERSION,
    sectorId,
    parentSectorId,
    branchId,
    instanceOf,
    domain: { kind: 'POINT', c: complex(c.re, c.im) },
    lawVersion,
    numericContract: NUMERIC_CONTRACT,
    materializationState: 'FOLDED'
  });
}

export function copySector(sector, { newSectorId, branchId = sector?.branchId ?? null } = {}) {
  assertFoldedSector(sector);
  if (!newSectorId || typeof newSectorId !== 'string') throw new TypeError('newSectorId is required');
  return Object.freeze({
    ...sector,
    sectorId: newSectorId,
    instanceOf: sector.instanceOf ?? sector.sectorId,
    branchId,
    materializationState: 'FOLDED'
  });
}

export function parameterMoveSector(sector, { c, branchId = sector?.branchId ?? null } = {}) {
  assertFoldedSector(sector);
  return Object.freeze({
    ...sector,
    domain: { kind: 'POINT', c: complex(c.re, c.im) },
    branchId,
    materializationState: 'FOLDED',
    dynamicPassport: undefined,
    proofHash: undefined
  });
}

export function visualMoveProjection(projection, transform = {}) {
  if (!projection?.projectionOnly) throw new TypeError('visual move accepts projection-only materialization');
  return {
    ...projection,
    visualTransform: { ...transform },
    canonicalDynamicsMutated: false
  };
}

export function assertFoldedSector(sector) {
  if (!sector || sector.schemaVersion !== GEOMETRY_SCHEMA_VERSION) throw new TypeError('unsupported geometry sector');
  if (!sector.sectorId) throw new TypeError('sectorId is required');
  if (sector.lawVersion !== QUADRATIC_LAW_VERSION) throw new TypeError('incompatible lawVersion');
  if (sector.numericContract !== NUMERIC_CONTRACT) throw new TypeError('incompatible numericContract');
  if (sector.domain?.kind !== 'POINT') throw new TypeError('this primitive currently supports POINT sectors only');
  complex(sector.domain.c?.re, sector.domain.c?.im);
  if (sector.materializationState !== 'FOLDED' && sector.materializationState !== 'GHOST') {
    throw new TypeError('sector must be folded/ghost before canonical transform');
  }
  return true;
}

export function unfoldPointSector(sector, { steps, escapeRadius = 2 } = {}) {
  assertFoldedSector(sector);
  const materialization = materializeCriticalOrbit({ c: sector.domain.c, steps, escapeRadius });
  return {
    sectorId: sector.sectorId,
    branchId: sector.branchId ?? null,
    sourceMaterializationState: sector.materializationState,
    ...materialization
  };
}

export function verifyLogisticQuadraticConjugacy({ x, r, epsilon = 1e-12 }) {
  epsilon = finiteNumber(epsilon, 'epsilon');
  const z = logisticStateToQuadraticZ(x, r);
  const c = logisticParameterToQuadraticC(r);
  const quadraticNext = quadraticStep(z, c);
  const logisticNextX = logisticStep(x, r);
  const transformedNext = logisticStateToQuadraticZ(logisticNextX, r);
  const error = Math.hypot(quadraticNext.re - transformedNext.re, quadraticNext.im - transformedNext.im);
  return { ok: error <= epsilon, error, z, c, quadraticNext, transformedNext };
}
