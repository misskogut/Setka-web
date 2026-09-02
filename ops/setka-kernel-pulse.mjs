import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const STATUS_PATH = 'ops/SETKA_KERNEL_STATUS.json';
const MAP_PATH = 'ops/SETKA_KERNEL_MAP.json';
const args = new Set(process.argv.slice(2));
const outIndex = process.argv.indexOf('--out');
const outputPath = outIndex >= 0 ? process.argv[outIndex + 1] : null;
const failOnReview = args.has('--fail-on-review');

function git(...argv) {
  return execFileSync('git', argv, { encoding: 'utf8' }).trim();
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

function matchesAny(path, patterns) {
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

function componentSnapshot(sourceTree, patterns) {
  const files = [...sourceTree.entries()]
    .filter(([path]) => matchesAny(path, patterns))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, blob]) => ({ path, blob }));
  const fingerprint = sha256(files.map(({ path, blob }) => `${path}:${blob}`).join('\n'));
  return { fingerprint, files };
}

function diffSnapshots(before, after) {
  const left = new Map(before.files.map((row) => [row.path, row.blob]));
  const right = new Map(after.files.map((row) => [row.path, row.blob]));
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort();
  return paths
    .filter((path) => left.get(path) !== right.get(path))
    .map((path) => ({
      path,
      change: !left.has(path) ? 'ADDED' : !right.has(path) ? 'DELETED' : 'MODIFIED',
      baselineBlob: left.get(path) ?? null,
      currentBlob: right.get(path) ?? null
    }));
}

function unique(items) {
  return [...new Set(items)].sort();
}

const status = JSON.parse(readFileSync(STATUS_PATH, 'utf8'));
const kernelMap = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
if (status.schemaVersion !== 'SETKA_KERNEL_STATUS_V1') throw new Error('Unsupported SETKA kernel status schema');
if (kernelMap.schemaVersion !== 'SETKA_KERNEL_MAP_V1') throw new Error('Unsupported SETKA kernel map schema');

const baselineRef = status.baseline?.commit;
if (!baselineRef) throw new Error('SETKA kernel status has no baseline commit');

try {
  git('cat-file', '-e', `${baselineRef}^{commit}`);
} catch {
  throw new Error(`Kernel baseline commit ${baselineRef} is unavailable. Use a full git checkout (fetch-depth: 0).`);
}

const headRef = git('rev-parse', 'HEAD');
const baselineTree = tree(baselineRef);
const currentTree = tree(headRef);
const components = [];

for (const [name, config] of Object.entries(kernelMap.components ?? {})) {
  const before = componentSnapshot(baselineTree, config.patterns ?? []);
  const after = componentSnapshot(currentTree, config.patterns ?? []);
  const changes = diffSnapshots(before, after);
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
    automaticChecks: config.automaticChecks ?? [],
    manualReviewTargets: config.manualReviewTargets ?? []
  });
}

const drifted = components.filter((component) => component.drifted);
const changedFiles = unique(drifted.flatMap((component) => component.changes.map((change) => change.path)));
const automaticChecks = unique(drifted.flatMap((component) => component.automaticChecks));
const manualReviewTargets = unique(drifted.flatMap((component) => component.manualReviewTargets));
const totalBaselineFiles = components.reduce((sum, component) => sum + component.baselineFileCount, 0);
const totalChangedMemberships = components.reduce((sum, component) => sum + component.changedFileCount, 0);
const state = drifted.length ? 'MANUAL_REVIEW_REQUIRED' : 'GREEN_BASELINE_MATCH';

const result = {
  schemaVersion: 'SETKA_KERNEL_PULSE_RESULT_V1',
  state,
  reviewRequired: drifted.length > 0,
  baselineCommit: baselineRef,
  currentCommit: headRef,
  driftedComponents: drifted.map((component) => component.name),
  changedFiles,
  automaticChecksRequired: automaticChecks,
  manualReviewTargets,
  metrics: {
    componentCount: components.length,
    driftedComponentCount: drifted.length,
    changedUniqueFileCount: changedFiles.length,
    changedComponentMembershipCount: totalChangedMemberships,
    baselineMonitoredMembershipCount: totalBaselineFiles
  },
  components
};

const json = `${JSON.stringify(result, null, 2)}\n`;
if (outputPath) writeFileSync(outputPath, json);
console.log(json.trim());

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `state=${state}\nreview_required=${result.reviewRequired}\n`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = components.map((component) =>
    `| ${component.name} | ${component.criticality} | ${component.drifted ? 'DRIFT' : 'MATCH'} | ${component.changedFileCount} |`
  ).join('\n');
  const changed = changedFiles.length ? changedFiles.map((path) => `- \`${path}\``).join('\n') : '- none';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## SETKA Kernel Pulse\n\n**${state}**\n\nBaseline: \`${baselineRef}\`  \nCurrent: \`${headRef}\`\n\n| Component | Criticality | Fingerprint | Changed files |\n|---|---|---:|---:|\n${rows}\n\n### Changed monitored files\n${changed}\n`
  );
}

if (result.reviewRequired) {
  console.warn(`::warning title=SETKA Kernel Pulse::${state}: ${drifted.map((component) => component.name).join(', ')}`);
}

if (failOnReview && result.reviewRequired) process.exit(2);
