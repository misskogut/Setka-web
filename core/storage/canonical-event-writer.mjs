import { admitCanonicalWrite, createWriteBudget } from './write-admission.mjs';

export function createCanonicalEventWriter({ persist, budget = createWriteBudget() }) {
  if (typeof persist !== 'function') throw new TypeError('persist callback is required');

  return {
    budget,
    async write(candidate) {
      const admission = admitCanonicalWrite(candidate, budget);
      if (!admission.allowed) {
        return { persisted: false, admission };
      }
      const receipt = await persist(candidate);
      return { persisted: true, admission, receipt };
    }
  };
}
