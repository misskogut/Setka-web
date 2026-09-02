import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const reusableRef = './.github/workflows/_setka-synthetic-runner.yml';
const candidates = readdirSync(workflowDir)
  .filter((name) => /synthetic|simulation/i.test(name))
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort();

const results = [];
for (const name of candidates) {
  const path = join(workflowDir, name);
  const content = readFileSync(path, 'utf8');
  const usesCentralGate = content.includes('./.github/actions/setka-cryo-gate');
  const usesReusableGate = content.includes(reusableRef);
  const hasExternalRuntimeIntent = /playwright|synthetic|simulation|foundation-user|runner\.mjs/i.test(content);
  const hasScheduleTrigger = /^\s*schedule\s*:/m.test(content) || /cron\s*:/m.test(content);
  const hasPushTrigger = /^\s*push\s*:/m.test(content);
  const isReusable = name === '_setka-synthetic-runner.yml';
  results.push({ name, usesCentralGate, usesReusableGate, hasExternalRuntimeIntent, hasScheduleTrigger, hasPushTrigger, isReusable });
}

const violations = results.filter((result) => {
  if (!result.hasExternalRuntimeIntent) return false;
  const guarded = result.usesCentralGate || result.usesReusableGate;
  const automatic = result.hasScheduleTrigger || result.hasPushTrigger;
  return !guarded || automatic;
});

console.log(JSON.stringify({ checked: results.length, violations, results }, null, 2));

if (violations.length) {
  console.error('SETKA_WORKFLOW_SAFETY_AUDIT=FAIL');
  process.exit(1);
}
console.log('SETKA_WORKFLOW_SAFETY_AUDIT=PASS');
