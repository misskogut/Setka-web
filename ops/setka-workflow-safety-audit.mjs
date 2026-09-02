import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const candidates = readdirSync(workflowDir)
  .filter((name) => /synthetic|simulation/i.test(name))
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort();

const results = [];
for (const name of candidates) {
  const path = join(workflowDir, name);
  const content = readFileSync(path, 'utf8');
  const usesCentralGate = content.includes('./.github/actions/setka-cryo-gate');
  const hasExternalRuntimeIntent = /playwright|synthetic|simulation|foundation-user|runner\.mjs/i.test(content);
  results.push({ name, usesCentralGate, hasExternalRuntimeIntent });
}

const violations = results.filter((result) => result.hasExternalRuntimeIntent && !result.usesCentralGate);
console.log(JSON.stringify({ checked: results.length, violations, results }, null, 2));

if (violations.length) {
  console.error('SETKA_WORKFLOW_SAFETY_AUDIT=FAIL');
  process.exit(1);
}
console.log('SETKA_WORKFLOW_SAFETY_AUDIT=PASS');
