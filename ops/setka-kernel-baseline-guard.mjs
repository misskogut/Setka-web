import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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

const acceptance = JSON.parse(readFileSync(ACCEPTANCE_PATH, 'utf8'));
const head = git('rev-parse', 'HEAD');
const currentBaseline = acceptance.acceptedBaselineCommit;

if (acceptance.schemaVersion !== 'SETKA_KERNEL_BASELINE_ACCEPTANCE_V1') throw new Error('Unsupported baseline acceptance schema');
if (!currentBaseline) throw new Error('Baseline acceptance has no acceptedBaselineCommit');
assertCommit(currentBaseline, 'Current baseline');
if (!isAncestor(currentBaseline, head)) throw new Error('Kernel baseline is not an ancestor of HEAD');

let priorAcceptanceCommit = '';
try {
  priorAcceptanceCommit = git('log', '-1', '--format=%H', 'HEAD^', '--', ACCEPTANCE_PATH);
} catch {
  priorAcceptanceCommit = '';
}

let previousBaseline = null;
if (priorAcceptanceCommit) {
  const priorAcceptance = parseJsonAt(priorAcceptanceCommit, ACCEPTANCE_PATH);
  previousBaseline = priorAcceptance.acceptedBaselineCommit ?? null;
}

const moved = Boolean(previousBaseline && previousBaseline !== currentBaseline);

if (moved) {
  if (acceptance.mode !== 'REVIEWED_TRANSITION') throw new Error('Baseline moved without REVIEWED_TRANSITION evidence');
  if (acceptance.previousBaselineCommit !== previousBaseline) {
    throw new Error(`Acceptance previous baseline mismatch: expected ${previousBaseline}`);
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
  if (!Array.isArray(acceptance.reviewedSemantics) || acceptance.reviewedSemantics.length === 0) {
    throw new Error('Baseline transition requires reviewedSemantics evidence');
  }
  if (!isAncestor(previousBaseline, currentBaseline)) {
    throw new Error('Accepted baseline does not advance from the previous baseline');
  }
} else if (acceptance.mode !== 'BOOTSTRAP' && acceptance.mode !== 'REVIEWED_TRANSITION') {
  throw new Error(`Unsupported acceptance mode: ${acceptance.mode}`);
}

console.log(JSON.stringify({
  schemaVersion: 'SETKA_KERNEL_BASELINE_GUARD_RESULT_V2',
  state: moved ? 'REVIEWED_BASELINE_TRANSITION' : 'BASELINE_UNCHANGED',
  head,
  previousBaseline,
  currentBaseline,
  acceptanceMode: acceptance.mode,
  reviewedBy: acceptance.reviewedBy
}, null, 2));
