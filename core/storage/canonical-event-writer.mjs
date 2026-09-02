import { admitCanonicalWrite, createWriteBudget } from './write-admission.mjs';

export function createCanonicalEventWriter({ persist, readBack = null, budget = createWriteBudget() }) {
  if (typeof persist !== 'function') throw new TypeError('persist callback is required');
  if (readBack !== null && typeof readBack !== 'function') throw new TypeError('readBack must be a function or null');

  return {
    budget,
    async write(candidate, options = {}) {
      const admission = admitCanonicalWrite(candidate, budget, options);
      if (!admission.allowed) {
        return { persisted: false, verified: false, admission };
      }
      const receipt = await persist(candidate);
      if (!readBack) {
        return { persisted: true, verified: false, admission, receipt, verification: null };
      }
      const verification = await readBack({ candidate, receipt });
      const verified = verification?.verified === true;
      return { persisted: true, verified, admission, receipt, verification };
    }
  };
}
