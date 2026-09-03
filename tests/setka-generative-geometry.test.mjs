import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEIGENBAUM_DELTA,
  QUADRATIC_FEIGENBAUM_C_INFINITY,
  complex,
  quadraticStep,
  logisticStep,
  logisticStateToQuadraticZ,
  logisticParameterToQuadraticC,
  verifyLogisticQuadraticConjugacy,
  materializeCriticalOrbit,
  escapeTime,
  fullState4D,
  project3D,
  feigenbaumNextParameterScale,
  createFoldedSector,
  copySector,
  parameterMoveSector,
  visualMoveProjection,
  unfoldPointSector
} from '../core/geometry/generative-ship-geometry.mjs';

const near = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('quadratic step computes complex square plus c', () => {
  assert.deepEqual(quadraticStep(complex(1, 2), complex(3, 4)), { re: 0, im: 8 });
});

test('logistic map conjugates to the real quadratic family', () => {
  for (const [x, r] of [[0.2, 3.2], [0.41, 3.7], [0.123456, 3.95]]) {
    const result = verifyLogisticQuadraticConjugacy({ x, r });
    assert.equal(result.ok, true);
    const c = logisticParameterToQuadraticC(r);
    near(c.re, (r * (2 - r)) / 4);
    near(c.im, 0);

    const x1 = logisticStep(x, r);
    const z1 = logisticStateToQuadraticZ(x1, r);
    near(result.quadraticNext.re, z1.re);
  }
});

test('critical orbit c=0 stays at zero', () => {
  const out = materializeCriticalOrbit({ c: complex(0, 0), steps: 5 });
  assert.equal(out.escapedAt, null);
  assert.equal(out.orbit.length, 6);
  assert.ok(out.orbit.every((z) => z.re === 0 && z.im === 0));
});

test('critical orbit c=-1 alternates 0 and -1', () => {
  const out = materializeCriticalOrbit({ c: complex(-1, 0), steps: 4 });
  assert.deepEqual(out.orbit.map((z) => z.re), [0, -1, 0, -1, 0]);
});

test('escape-time detects an escaping parameter', () => {
  assert.equal(escapeTime({ c: complex(2, 0), maxIterations: 20 }), 2);
  assert.equal(escapeTime({ c: complex(0, 0), maxIterations: 20 }), null);
});

test('full state is 4D and 3D views are explicitly projections', () => {
  const state = fullState4D(complex(-0.5, 0.2), complex(0.1, -0.3));
  assert.deepEqual(state, { cRe: -0.5, cIm: 0.2, zRe: 0.1, zIm: -0.3 });
  const p = project3D(state, { zLens: 'Z_MAGNITUDE' });
  assert.equal(p.projectionOnly, true);
  near(p.z, Math.hypot(0.1, -0.3));
});

test('Feigenbaum delta is an asymptotic scale hint, not a point generator', () => {
  near(feigenbaumNextParameterScale(FEIGENBAUM_DELTA), 1, 1e-14);
  assert.ok(FEIGENBAUM_DELTA > 4.66 && FEIGENBAUM_DELTA < 4.68);
  assert.ok(QUADRATIC_FEIGENBAUM_C_INFINITY < -1.4 && QUADRATIC_FEIGENBAUM_C_INFINITY > -1.41);
});

test('folded sector unfolds deterministically from its c address', () => {
  const sector = createFoldedSector({ sectorId: 'ENGINE', c: complex(-1, 0) });
  const a = unfoldPointSector(sector, { steps: 6 });
  const b = unfoldPointSector(sector, { steps: 6 });
  assert.deepEqual(a, b);
  assert.equal(sector.materializationState, 'FOLDED');
});

test('copy shares mathematical description but receives new identity', () => {
  const original = createFoldedSector({ sectorId: 'A', c: complex(-1, 0) });
  const copy = copySector(original, { newSectorId: 'B' });
  assert.equal(copy.instanceOf, 'A');
  assert.deepEqual(copy.domain, original.domain);
  assert.notEqual(copy.sectorId, original.sectorId);
});

test('parameter move changes mathematical address and therefore future dynamics', () => {
  const original = createFoldedSector({ sectorId: 'A', c: complex(-1, 0) });
  const moved = parameterMoveSector(original, { c: complex(0, 0) });
  const before = unfoldPointSector(original, { steps: 3 });
  const after = unfoldPointSector(moved, { steps: 3 });
  assert.notDeepEqual(before.orbit, after.orbit);
});

test('visual move never mutates canonical dynamics', () => {
  const state = fullState4D(complex(-1, 0), complex(0, 0));
  const projection = project3D(state, { zLens: 'Z_RE' });
  const moved = visualMoveProjection(projection, { translateX: 12, rotateY: 0.4 });
  assert.equal(moved.canonicalDynamicsMutated, false);
  assert.equal(moved.x, projection.x);
  assert.equal(moved.y, projection.y);
  assert.equal(moved.z, projection.z);
});
