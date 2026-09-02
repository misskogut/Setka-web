import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const POLICY_PATH = 'ops/SETKA_KERNEL_MISSION_POLICY.json';
const ACCEPTANCE_PATH = 'ops/SETKA_KERNEL_BASELINE_ACCEPTANCE.json';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function git(...argv) {
  return execFileSync('git', argv, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}

function unique(values) {
  return [...new Set(values)].sort();
}

function worstState(states) {
  const rank = { ALIGNED: 0, OPTIMIZE: 1, REVIEW_REQUIRED: 2, BLOCK: 3 };
  return states.reduce((worst, state) => (rank[state] > rank[worst] ? state : worst), 'ALIGNED');
}

function hint(policy, signal) {
  return policy.optimizationHints?.[signal] ?? null;
}

function validatePolicy(policy) {
  if (policy.schemaVersion !== 'SETKA_KERNEL_MISSION_POLICY_V1') throw new Error('Unsupported mission policy schema');
  if (!Array.isArray(policy.missionDimensions) || !policy.missionDimensions.length) throw new Error('Mission policy has no dimensions');
}

function validateProposal(proposal, policy) {
  if (proposal.schemaVersion !== policy.proposalContract.schemaVersion) throw new Error('Unsupported change proposal schema');
  if (!policy.proposalContract.allowedChangeClasses.includes(proposal.changeClass)) throw new Error(`Unknown changeClass: ${proposal.changeClass}`);
  if (!proposal.impacts || typeof proposal.impacts !== 'object') throw new Error('Proposal impacts are required');
  for (const field of policy.proposalContract.requiredImpactFields) {
    const value = proposal.impacts[field];
    if (!policy.proposalContract.allowedImpactValues.includes(value)) throw new Error(`Invalid impact ${field}: ${value}`);
  }
}

function assessProposal(proposal, policy) {
  validateProposal(proposal, policy);
  const signals = [];
  const states = ['ALIGNED'];

  for (const signal of proposal.signals ?? []) {
    if (policy.hardBlockSignals.includes(signal)) { signals.push(signal); states.push('BLOCK'); }
    else if (policy.reviewSignals.includes(signal)) { signals.push(signal); states.push('REVIEW_REQUIRED'); }
    else if (policy.optimizationSignals.includes(signal)) { signals.push(signal); states.push('OPTIMIZE'); }
  }

  const impacts = proposal.impacts;
  if (Object.values(impacts).includes('UNKNOWN')) {
    signals.push('UNKNOWN_MISSION_IMPACT');
    states.push('REVIEW_REQUIRED');
  }
  if (impacts.replayExactness === 'DEGRADE') {
    signals.push('REPLAY_SEMANTICS_DEGRADE');
    states.push('REVIEW_REQUIRED');
  }
  if (impacts.recoverability === 'DEGRADE') {
    signals.push('RECOVERABILITY_DEGRADE');
    states.push('REVIEW_REQUIRED');
  }
  if (proposal.addsMandatoryVendorDependencies > 0) {
    signals.push('NEW_MANDATORY_VENDOR_DEPENDENCY');
    states.push('OPTIMIZE');
  }
  if (proposal.addsPermanentKernelFiles > 0) {
    signals.push('NEW_PERMANENT_KERNEL_MASS');
    states.push('OPTIMIZE');
  }
  if (proposal.changeClass !== 'CONNECTOR' && proposal.nativeBeforeConnectorBenchmark === true) {
    signals.push('NATIVE_BUILD_BEFORE_CONNECTOR_TEST');
    states.push('OPTIMIZE');
  }
  if (proposal.benchmarkDefined === false) {
    signals.push('CAPABILITY_WITHOUT_BENCHMARK');
    states.push('OPTIMIZE');
  }

  const deduped = unique(signals);
  const state = worstState(states);
  return {
    schemaVersion: 'SETKA_MISSION_GATE_RESULT_V1',
    mode: 'PROPOSAL_PREFLIGHT',
    state,
    title: proposal.title ?? null,
    changeClass: proposal.changeClass,
    signals: deduped,
    optimizationHints: deduped.map((signal) => hint(policy, signal)).filter(Boolean),
    impacts,
    deterministicDecision: true,
    aiEscalation: state === 'ALIGNED' ? 'NOT_NEEDED' : 'ONLY_IF_STATIC_EVIDENCE_OR_HUMAN_REVIEW_CANNOT_RESOLVE'
  };
}

function parseNameStatus(raw) {
  if (!raw) return [];
  return raw.split('\n').map((line) => {
    const parts = line.split('\t');
    const status = parts[0];
    if (status.startsWith('R') || status.startsWith('C')) return { status: status[0], path: parts.at(-1), from: parts[1] };
    return { status: status[0], path: parts[1] };
  }).filter((row) => row.path);
}

function isUnder(path, prefixes = []) {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

function assessDiff(policy) {
  const acceptance = readJson(ACCEPTANCE_PATH);
  const baseline = acceptance.acceptedBaselineCommit;
  if (!baseline) throw new Error('No accepted kernel baseline');
  const head = git('rev-parse', 'HEAD');
  const changes = parseNameStatus(git('diff', '--name-status', `${baseline}..${head}`));
  const diffPolicy = policy.diffPolicy ?? {};
  const signals = [];
  const states = ['ALIGNED'];

  const addedMass = changes.filter((row) => row.status === 'A' && isUnder(row.path, diffPolicy.massRoots) && !(diffPolicy.documentationSuffixes ?? []).some((suffix) => row.path.endsWith(suffix)));
  if (addedMass.length) {
    signals.push('NEW_PERMANENT_KERNEL_MASS');
    states.push('OPTIMIZE');
  }
  if (changes.some((row) => isUnder(row.path, diffPolicy.storageRiskPrefixes))) {
    signals.push('UNKNOWN_CAUSAL_CLASSIFICATION');
    states.push('REVIEW_REQUIRED');
  }
  if (changes.some((row) => isUnder(row.path, diffPolicy.replayRiskPrefixes))) {
    signals.push('UNKNOWN_MISSION_IMPACT');
    states.push('REVIEW_REQUIRED');
  }
  if (changes.some((row) => isUnder(row.path, diffPolicy.safetyRiskPrefixes))) {
    signals.push('SAFETY_SEMANTICS_CHANGE');
    states.push('REVIEW_REQUIRED');
  }
  if (changes.some((row) => (diffPolicy.dependencyFiles ?? []).includes(row.path))) {
    signals.push('NEW_MANDATORY_VENDOR_DEPENDENCY');
    states.push('OPTIMIZE');
  }

  const deduped = unique(signals);
  const state = worstState(states);
  return {
    schemaVersion: 'SETKA_MISSION_GATE_RESULT_V1',
    mode: 'KERNEL_DIFF_DIAGNOSTIC',
    state,
    baselineCommit: baseline,
    currentCommit: head,
    changedFileCount: changes.length,
    addedPermanentMass: addedMass.map((row) => row.path),
    signals: deduped,
    optimizationHints: deduped.map((signal) => hint(policy, signal)).filter(Boolean),
    deterministicDecision: true,
    aiEscalation: state === 'ALIGNED' ? 'NOT_NEEDED' : 'ONLY_IF_STATIC_EVIDENCE_OR_HUMAN_REVIEW_CANNOT_RESOLVE'
  };
}

function selftest(policy) {
  const baseImpacts = {
    causalCompleteness: 'NEUTRAL',
    replayExactness: 'NEUTRAL',
    portability: 'NEUTRAL',
    sovereignty: 'NEUTRAL',
    connectorNeutrality: 'NEUTRAL',
    resourceEfficiency: 'NEUTRAL',
    recoverability: 'NEUTRAL'
  };
  const tests = [
    {
      name: 'aligned connector',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Connector', changeClass: 'CONNECTOR', impacts: { ...baseImpacts, connectorNeutrality: 'IMPROVE' }, addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'ALIGNED'
    },
    {
      name: 'derived canonical hard block',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Dense write', changeClass: 'STORAGE', impacts: baseImpacts, signals: ['PERSIST_DERIVED_AS_CANON_WITHOUT_PROOF'], addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'BLOCK'
    },
    {
      name: 'unknown impact review',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Unknown', changeClass: 'FEATURE', impacts: { ...baseImpacts, portability: 'UNKNOWN' }, addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'REVIEW_REQUIRED'
    },
    {
      name: 'vendor dependency optimize',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Vendor', changeClass: 'FEATURE', impacts: baseImpacts, addsMandatoryVendorDependencies: 1, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'OPTIMIZE'
    },
    {
      name: 'mass optimize',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Mass', changeClass: 'FEATURE', impacts: baseImpacts, addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 2, benchmarkDefined: true },
      expected: 'OPTIMIZE'
    },
    {
      name: 'cross-tenant private raw hard block',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Private raw uplink', changeClass: 'SECURITY', impacts: baseImpacts, signals: ['CROSS_TENANT_PRIVATE_RAW_DISCLOSURE'], addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'BLOCK'
    },
    {
      name: 'reidentification risk review',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Derived disclosure', changeClass: 'SECURITY', impacts: baseImpacts, signals: ['REIDENTIFICATION_RISK_UNRESOLVED'], addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'REVIEW_REQUIRED'
    },
    {
      name: 'full child history uplink optimize',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Child history uplink', changeClass: 'STORAGE', impacts: baseImpacts, signals: ['FULL_CHILD_HISTORY_UPLINK_WHERE_CAPSULE_SUFFICES'], addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'OPTIMIZE'
    },
    {
      name: 'unproven structural deletion hard block',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Drop explicit graph before proof', changeClass: 'STORAGE', impacts: baseImpacts, signals: ['DROP_EXPLICIT_STRUCTURE_WITHOUT_EXACT_RECONSTRUCTION_PROOF'], addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'BLOCK'
    },
    {
      name: 'unknown generator coverage review',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Unknown partition coverage', changeClass: 'RUNTIME', impacts: baseImpacts, signals: ['PROCEDURAL_GENERATOR_COVERAGE_OR_COLLISION_UNKNOWN'], addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'REVIEW_REQUIRED'
    },
    {
      name: 'explicit structure optimize',
      proposal: { schemaVersion: 'SETKA_CHANGE_PROPOSAL_V1', title: 'Procedural graph candidate', changeClass: 'STORAGE', impacts: { ...baseImpacts, resourceEfficiency: 'IMPROVE' }, signals: ['EXPLICIT_STRUCTURE_WHERE_VERIFIED_GENERATOR_SUFFICES'], addsMandatoryVendorDependencies: 0, addsPermanentKernelFiles: 0, benchmarkDefined: true },
      expected: 'OPTIMIZE'
    }
  ];

  for (const test of tests) {
    const result = assessProposal(test.proposal, policy);
    if (result.state !== test.expected) throw new Error(`${test.name}: expected ${test.expected}, got ${result.state}`);
  }
  return { schemaVersion: 'SETKA_MISSION_GATE_SELFTEST_V1', state: 'PASS', cases: tests.length };
}

function emitAnnotation(result) {
  const diagnostic = result.diagnostic ?? result;
  if (!diagnostic?.state || diagnostic.mode === undefined && result.schemaVersion?.includes('SELFTEST')) return;
  const signals = (diagnostic.signals ?? []).join(', ') || 'none';
  const hintText = (diagnostic.optimizationHints ?? [])[0] ?? 'No optimization hint required.';
  if (diagnostic.state === 'OPTIMIZE') {
    console.log(`::warning title=SETKA Mission Gate::OPTIMIZE — ${signals}. ${hintText}`);
  } else if (diagnostic.state === 'REVIEW_REQUIRED') {
    console.log(`::warning title=SETKA Mission Gate::REVIEW_REQUIRED — ${signals}. ${hintText}`);
  } else if (diagnostic.state === 'BLOCK') {
    console.log(`::error title=SETKA Mission Gate::BLOCK — ${signals}. ${hintText}`);
  } else if (process.env.GITHUB_ACTIONS) {
    console.log('::notice title=SETKA Mission Gate::ALIGNED — no known mission regression signal detected.');
  }
}

const policy = readJson(POLICY_PATH);
validatePolicy(policy);
const args = process.argv.slice(2);

let result;
if (args.includes('--check')) {
  result = {
    schemaVersion: 'SETKA_MISSION_GATE_CHECK_V1',
    selftest: selftest(policy),
    diagnostic: assessDiff(policy)
  };
} else if (args.includes('--selftest')) {
  result = selftest(policy);
} else if (args.includes('--proposal')) {
  const index = args.indexOf('--proposal');
  const path = args[index + 1];
  if (!path) throw new Error('--proposal requires a JSON path');
  result = assessProposal(readJson(path), policy);
} else {
  result = assessDiff(policy);
}

console.log(JSON.stringify(result, null, 2));
emitAnnotation(result);

const decisionState = result.diagnostic?.state ?? result.state;
if (args.includes('--verify') && ['REVIEW_REQUIRED', 'BLOCK'].includes(decisionState)) process.exit(2);
