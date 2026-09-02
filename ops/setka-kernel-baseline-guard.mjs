import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const STATUS_PATH = 'ops/SETKA_KERNEL_STATUS.json';
const ACCEPTANCE_PATH = 'ops/SETKA_KERNEL_BASELINE_ACCEPTANCE.json';

function git(...argv) {
  return execFileSync('git', argv, { encoding: 'utf8' }).trim();
}

function parseJsonAt(ref, path) {
  return JSON.parse(git('show', `${ref}:${path}`));
}

function assertCommit(ref, label) {
  try {
    git('cat-file', '-e', `${ref}^{commit}`);
  } catch {
    throw new Error(`${label} commit ${ref} is unavailable`);
  }
}

function isAncestor(ancestor, descendant) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const status = JSON.parse(readFileSync(STATUS_PATH, 'utf8'));
const acceptance = JSON.parse(readFileSync(ACCEPTANCE_PATH, 'utf8'));
const head = git('rev-parse', 'HEAD');
const currentBaseline = status.baseline?.commit;

if (status.schemaVersion !== 'SETKA_KERNEL_STATUS_V1') throw new Error('Unsupported kernel status schema');
if (acceptance.schemaVersion !== 'SETKA_KERNEL_BASELINE_ACCEPTANCE_V1') throw new Error('Unsupported baseline acceptance schema');
if (!currentBaseline) throw new Error('Kernel status has no baseline commit');
assertCommit(currentBaseline, 'Current baseline');
if (!isAncestor(currentBaseline, head)) throw new Error('Kernel baseline is not an ancestor of HEAD');

let priorStatusCommit = '';
try {
  priorStatusCommit = git('log', '-1', '--format=%H', 'HEAD^', '--', STATUS_PATH);
} catch {
  priorStatusCommit = '';
}

let previousBaseline = currentBaseline;
if (priorStatusCommit) {
  const priorStatus = parseJsonAt(priorStatusCommit, STATUS_PATH);
  previousBaseline = priorStatus.baseline?.commit ?? null;
}

const moved = Boolean(previousBaseline && previousBaseline !== currentBaseline);

if (moved) {
  if (acceptance.mode !== 'REVIEWED_TRANSITION') throw new Error('Baseline moved without REVIEWED_TRANSITION evidence');
  if (acceptance.previousBaselineCommit !== previousBaseline) {
    throw new Error(`Acceptance previous baseline mismatch: expected ${previousBaseline}`);
  }
  if (acceptance.acceptedBaselineCommit !== currentBaseline) {
    throw new Error(`Acceptance target mismatch: expected ${currentBaseline}`);
  }
  if (!acceptance.reviewedBy || !acceptance.reviewContext || !acceptance.reviewRunId) {
    throw new Error('Baseline transition requires reviewer, review context and CI run evidence');
  }
  if (!Array.isArray(acceptance.reviewedComponents) || acceptance.reviewedComponents.length === 0) {
    throw new Error('Baseline transition requires reviewedComponents evidence');
  }
  if (!Array.isArray(acceptance.reviewedFiles) || acceptance.reviewedFiles.length === 0) {
    throw new Error('Baseline transition requires reviewedFiles evidence');
  }
  if (!isAncestor(previousBaseline, currentBaseline)) {
    throw new Error('Accepted baseline does not advance from the previous baseline');
  }
} else {
  if (acceptance.acceptedBaselineCommit !== currentBaseline) {
    throw new Error('Acceptance evidence does not name the active baseline');
  }
}

console.log(JSON.stringify({
  schemaVersion: 'SETKA_KERNEL_BASELINE_GUARD_RESULT_V1',
  state: moved ? 'REVIEWED_BASELINE_TRANSITION' : 'BASELINE_UNCHANGED',
  head,
  previousBaseline,
  currentBaseline,
  acceptanceMode: acceptance.mode,
  reviewedBy: acceptance.reviewedBy
}, null, 2));
