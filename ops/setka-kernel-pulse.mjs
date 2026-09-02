import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const MAP_PATH = 'ops/SETKA_KERNEL_MAP.json';
const ACCEPTANCE_PATH = 'ops/SETKA_KERNEL_BASELINE_ACCEPTANCE.json';
const args = new Set(process.argv.slice(2));
const outIndex = process.argv.indexOf('--out');
const outputPath = outIndex >= 0 ? process.argv[outIndex + 1] : null;
const verify = args.has('--verify');
const failOnReview = args.has('--fail-on-review') || verify;

function git(...argv) {
  return execFileSync('git', argv, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function globToRegex(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
      } else {
        out += '[^/]*';
      }
      continue;
    }
    if ('\\.^$+?()[]{}|'.includes(ch)) out += `\\${ch}`;
    else out += ch;
  }
  return new RegExp(`${out}$`);
}

function matchesAny(path, patterns = []) {
  return patterns.some((pattern) => globToRegex(pattern).test(path));
}

function tree(ref) {
  const raw = git('ls-tree', '-r', ref);
  if (!raw) return new Map();
  const result = new Map();
  for (const line of raw.split('\n')) {
    const match = line.match(/^\d+\s+blob\s+([0-9a-f]+)\t(.+)$/);
    if (match) result.set(match[2], match[1]);
  }
  return result;
}

function contentAt(ref, path) {
  try {
    return git('show', `${ref}:${path}`);
  } catch {
    return null;
  }
}

function componentSnapshot(sourceTree, patterns, excludePatterns = []) {
  const files = [...sourceTree.entries()]
    .filter(([path]) => matchesAny(path, patterns) && !matchesAny(path, excludePatterns))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, blob]) => ({ path, blob }));
  const fingerprint = sha256(files.map(({ path, blob }) => `${path}:${blob}`).join('\n'));
  return { fingerprint, files };
}

function isCodePath(path) {
  return /\.(?:mjs|cjs|js)$/.test(path);
}

function normalizeCode(source) {
  let out = '';
  let state = 'code';
  let quote = '';
  let pendingSpace = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (state === 'line-comment') {
      if (ch === '\n') { state = 'code'; pendingSpace = true; }
      continue;
    }
    if (state === 'block-comment') {
      if (ch === '*' && next === '/') { state = 'code'; i += 1; pendingSpace = true; }
      continue;
    }
    if (state === 'string') {
      out += ch;
      if (ch === '\\') {
        if (i + 1 < source.length) out += source[++i];
        continue;
      }
      if (ch === quote) state = 'code';
      continue;
    }
    if (ch === '/' && next === '/') { state = 'line-comment'; i += 1; continue; }
    if (ch === '/' && next === '*') { state = 'block-comment'; i += 1; continue; }
    if (ch === "'" || ch === '"' || ch === '`') {
      if (pendingSpace && out && !/[\s([{,:;=+\-*/%!<>?&|]/.test(out.at(-1))) out += ' ';
      pendingSpace = false;
      state = 'string';
      quote = ch;
      out += ch;
      continue;
    }
    if (/\s/.test(ch)) { pendingSpace = true; continue; }
    if (pendingSpace && out && /[A-Za-z0-9_$]/.test(out.at(-1)) && /[A-Za-z0-9_$]/.test(ch)) out += ' ';
    pendingSpace = false;
    out += ch;
  }
  return out;
}

function exportSegments(source) {
  const re = /\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const matches = [...source.matchAll(re)];
  const result = new Map();
  for (let i = 0; i < matches.length; i += 1) {
    const name = matches[i][1];
    const start = matches[i].index;
    const end = matches[i + 1]?.index ?? source.length;
    result.set(name, sha256(normalizeCode(source.slice(start, end))));
  }
  return result;
}

function structuralDiagnostics(path, baselineRef, headRef, change) {
  if (!isCodePath(path)) return { driftClass: change === 'MODIFIED' ? 'EXACT_CONTENT_DRIFT' : 'SURFACE_DRIFT' };
  const before = contentAt(baselineRef, path);
  const after = contentAt(headRef, path);
  if (before === null || after === null) return { driftClass: 'SURFACE_DRIFT' };
  const baselineStructuralFingerprint = sha256(normalizeCode(before));
  const currentStructuralFingerprint = sha256(normalizeCode(after));
  const leftSymbols = exportSegments(before);
  const rightSymbols = exportSegments(after);
  const symbolNames = [...new Set([...leftSymbols.keys(), ...rightSymbols.keys()])].sort();
  const exportedSymbolChanges = symbolNames
    .filter((name) => leftSymbols.get(name) !== rightSymbols.get(name))
    .map((name) => ({
      name,
      change: !leftSymbols.has(name) ? 'ADDED' : !rightSymbols.has(name) ? 'DELETED' : 'MODIFIED',
      baselineFingerprint: leftSymbols.get(name) ?? null,
      currentFingerprint: rightSymbols.get(name) ?? null
    }));
  const structuralChanged = baselineStructuralFingerprint !== currentStructuralFingerprint;
  return {
    driftClass: structuralChanged ? 'SEMANTIC_OR_STRUCTURAL_DRIFT' : 'TEXTUAL_OR_FORMATTING_DRIFT',
    baselineStructuralFingerprint,
    currentStructuralFingerprint,
    structuralChanged,
    exportedSymbolChanges
  };
}

function diffSnapshots(before, after, baselineRef, headRef) {
  const left = new Map(before.files.map((row) => [row.path, row.blob]));
  const right = new Map(after.files.map((row) => [row.path, row.blob]));
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort();
  return paths
    .filter((path) => left.get(path) !== right.get(path))
    .map((path) => {
      const change = !left.has(path) ? 'ADDED' : !right.has(path) ? 'DELETED' : 'MODIFIED';
      return {
        path,
        change,
        baselineBlob: left.get(path) ?? null,
        currentBlob: right.get(path) ?? null,
        ...structuralDiagnostics(path, baselineRef, headRef, change)
      };
    });
}

function unique(items) {
  return [...new Set(items)].sort();
}

function runNode(argv, label) {
  const started = process.hrtime.bigint();
  console.log(`\n[SETKA check] ${label}`);
  execFileSync(process.execPath, argv, { stdio: 'inherit', maxBuffer: 32 * 1024 * 1024 });
  return Number(process.hrtime.bigint() - started) / 1e6;
}

const acceptance = JSON.parse(readFileSync(ACCEPTANCE_PATH, 'utf8'));
const kernelMap = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
if (acceptance.schemaVersion !== 'SETKA_KERNEL_BASELINE_ACCEPTANCE_V1') throw new Error('Unsupported SETKA baseline acceptance schema');
if (kernelMap.schemaVersion !== 'SETKA_KERNEL_MAP_V2') throw new Error('Unsupported SETKA kernel map schema');

const baselineRef = acceptance.acceptedBaselineCommit;
if (!baselineRef) throw new Error('SETKA baseline acceptance has no acceptedBaselineCommit');
try {
  git('cat-file', '-e', `${baselineRef}^{commit}`);
} catch {
  throw new Error(`Kernel baseline commit ${baselineRef} is unavailable. Use a full git checkout (fetch-depth: 0).`);
}

if (verify) runNode(['ops/setka-kernel-baseline-guard.mjs'], 'baseline transition guard');

const headRef = git('rev-parse', 'HEAD');
const baselineTree = tree(baselineRef);
const currentTree = tree(headRef);
const components = [];

for (const [name, config] of Object.entries(kernelMap.components ?? {})) {
  const before = componentSnapshot(baselineTree, config.patterns ?? [], config.excludePatterns ?? []);
  const after = componentSnapshot(currentTree, config.patterns ?? [], config.excludePatterns ?? []);
  const changes = diffSnapshots(before, after, baselineRef, headRef);
  components.push({
    name,
    criticality: config.criticality ?? 'UNKNOWN',
    drifted: before.fingerprint !== after.fingerprint,
    baselineFingerprint: before.fingerprint,
    currentFingerprint: after.fingerprint,
    baselineFileCount: before.files.length,
    currentFileCount: after.files.length,
    changedFileCount: changes.length,
    changes,
    checkGroups: config.checkGroups ?? [],
    externalChecks: config.externalChecks ?? [],
    manualReviewTargets: config.manualReviewTargets ?? []
  });
}

const coverage = kernelMap.coverage ?? { candidatePatterns: [], ignorePatterns: [] };
const currentCandidates = [...currentTree.keys()]
  .filter((path) => matchesAny(path, coverage.candidatePatterns ?? []) && !matchesAny(path, coverage.ignorePatterns ?? []))
  .sort();
const classified = (path) => Object.values(kernelMap.components ?? {}).some((config) =>
  matchesAny(path, config.patterns ?? []) && !matchesAny(path, config.excludePatterns ?? [])
);
const unclassifiedFiles = currentCandidates.filter((path) => !classified(path));

const drifted = components.filter((component) => component.drifted);
const changedFiles = unique([
  ...drifted.flatMap((component) => component.changes.map((change) => change.path)),
  ...unclassifiedFiles
]);
const checkGroups = unique(drifted.flatMap((component) => component.checkGroups));
const externalChecks = unique(drifted.flatMap((component) => component.externalChecks));
const manualReviewTargets = unique([
  ...drifted.flatMap((component) => component.manualReviewTargets),
  ...(unclassifiedFiles.length ? ['UNCLASSIFIED_KERNEL_SURFACE'] : [])
]);
const addedProtectedFiles = unique(drifted.flatMap((component) => component.changes.filter((change) => change.change === 'ADDED').map((change) => change.path)));
const deletedProtectedFiles = unique(drifted.flatMap((component) => component.changes.filter((change) => change.change === 'DELETED').map((change) => change.path)));
if (addedProtectedFiles.length > 0 && kernelMap.complexityPolicy?.newProtectedFileRequiresReview) {
  manualReviewTargets.push('COMPLEXITY_BUDGET');
}
const totalBaselineFiles = components.reduce((sum, component) => sum + component.baselineFileCount, 0);
const totalChangedMemberships = components.reduce((sum, component) => sum + component.changedFileCount, 0);
const reviewRequired = drifted.length > 0 || unclassifiedFiles.length > 0;
const state = reviewRequired ? 'MANUAL_REVIEW_REQUIRED' : 'GREEN_BASELINE_MATCH';

const checksExecuted = [];
if (verify && reviewRequired) {
  const syntaxTargets = changedFiles.filter((path) => isCodePath(path) && currentTree.has(path));
  for (const path of syntaxTargets) {
    const durationMs = runNode(['--check', path], `syntax ${path}`);
    checksExecuted.push({ id: `SYNTAX:${path}`, durationMs });
  }
  for (const group of checkGroups) {
    const config = kernelMap.checkGroups?.[group];
    if (!config?.argv) throw new Error(`Unknown kernel check group: ${group}`);
    const durationMs = runNode(config.argv, group);
    checksExecuted.push({ id: group, durationMs });
  }
} else if (verify) {
  console.log('\n[SETKA fast path] protected fingerprints match baseline; deep proof suites skipped.');
}

const result = {
  schemaVersion: 'SETKA_KERNEL_PULSE_RESULT_V3',
  state,
  reviewRequired,
  fastPath: !reviewRequired,
  baselineCommit: baselineRef,
  currentCommit: headRef,
  driftedComponents: drifted.map((component) => component.name),
  changedFiles,
  unclassifiedFiles,
  checkGroupsRequired: checkGroups,
  externalChecksRequired: externalChecks,
  manualReviewTargets: unique(manualReviewTargets),
  checksExecuted,
  complexity: {
    addedProtectedFileCount: addedProtectedFiles.length,
    deletedProtectedFileCount: deletedProtectedFiles.length,
    netProtectedFileDelta: addedProtectedFiles.length - deletedProtectedFiles.length,
    addedProtectedFiles,
    deletedProtectedFiles
  },
  metrics: {
    componentCount: components.length,
    driftedComponentCount: drifted.length,
    changedUniqueFileCount: changedFiles.length,
    changedComponentMembershipCount: totalChangedMemberships,
    baselineMonitoredMembershipCount: totalBaselineFiles,
    coverageCandidateCount: currentCandidates.length,
    unclassifiedExecutableCount: unclassifiedFiles.length
  },
  components
};

const json = `${JSON.stringify(result, null, 2)}\n`;
if (outputPath) writeFileSync(outputPath, json);
console.log(`\n${json.trim()}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `state=${state}\nreview_required=${result.reviewRequired}\nfast_path=${result.fastPath}\n`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = components.map((component) =>
    `| ${component.name} | ${component.criticality} | ${component.drifted ? 'DRIFT' : 'MATCH'} | ${component.changedFileCount} |`
  ).join('\n');
  const changed = changedFiles.length ? changedFiles.map((path) => `- \`${path}\``).join('\n') : '- none';
  const routed = checkGroups.length ? checkGroups.map((id) => `- \`${id}\``).join('\n') : '- none';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## SETKA Kernel Pulse\n\n**${state}**${result.fastPath ? ' · FAST PATH' : ''}\n\nBaseline: \`${baselineRef}\`  \nCurrent: \`${headRef}\`\n\n| Component | Criticality | Fingerprint | Changed files |\n|---|---|---:|---:|\n${rows}\n\n### Changed monitored files\n${changed}\n\n### Routed proof groups\n${routed}\n\n### Complexity delta\nAdded: ${addedProtectedFiles.length} · Deleted: ${deletedProtectedFiles.length} · Net: ${result.complexity.netProtectedFileDelta}\n`
  );
}

if (reviewRequired) {
  const reasons = [...drifted.map((component) => component.name), ...(unclassifiedFiles.length ? ['UNCLASSIFIED_KERNEL_SURFACE'] : [])];
  console.warn(`::warning title=SETKA Kernel Pulse::${state}: ${reasons.join(', ')}`);
}

if (failOnReview && reviewRequired) process.exit(2);
