import { createHash } from 'node:crypto';

function normalizeNumber(value) {
  if (!Number.isFinite(value)) throw new TypeError('Non-finite numbers are not canonical replay values');
  return Object.is(value, -0) ? 0 : value;
}

export function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return normalizeNumber(value);
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  throw new TypeError(`Unsupported canonical value type: ${typeof value}`);
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Object(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}
