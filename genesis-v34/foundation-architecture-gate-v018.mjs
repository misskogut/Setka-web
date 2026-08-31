import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const MANIFEST='foundation-architecture-gate-v018.json';
const WORKFLOW='.github/workflows/foundation-v018-smoke.yml';
const SELF='foundation-architecture-gate-v018.mjs';
const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
const fail=msg=>{throw new Error(`ARCHITECTURE GATE: ${msg}`)};
const sha256=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

if(manifest.version!=='0.1.8'||manifest.policy!=='architecture-gate-v018')fail('invalid manifest identity');
if(!Array.isArray(manifest.activeConstants)||!manifest.activeConstants.length)fail('active constants missing');
if(!Array.isArray(manifest.admissions))fail('admissions missing');

const active=new Set(manifest.activeConstants);
for(const a of manifest.admissions){
  if(a.status!=='admitted')continue;
  if(!['structural','non_structural'].includes(a.classification))fail(`${a.key}: invalid classification`);
  if(!Array.isArray(a.files)||!a.files.length)fail(`${a.key}: files missing`);
  if(a.classification==='structural'){
    if(a.complete!==true)fail(`${a.key}: structural review incomplete`);
    if(!Array.isArray(a.touchedConstants)||!a.touchedConstants.length)fail(`${a.key}: no touched constants`);
    for(const key of a.touchedConstants){
      if(!active.has(key))fail(`${a.key}: unknown/inactive constant ${key}`);
      const assessment=a.assessments?.[key];
      if(assessment==='compatible')continue;
      if(assessment?.status==='law_change' && assessment?.decisionBy==='president' && /^PIN-[A-Z0-9]+$/.test(assessment?.decisionRef||''))continue;
      fail(`${a.key}: constant ${key} has no admissible assessment`);
    }
  }else if(String(a.rationaleRu||'').trim().length<12){
    fail(`${a.key}: non-structural rationale missing`);
  }
}

let changed=[];
try{
  changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{encoding:'utf8'})
    .split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
}catch{
  changed=[];
}
const relevant=path=>{
  if(path===MANIFEST)return false;
  if(path===WORKFLOW||path===SELF||path==='foundation.html'||path==='foundation-president.html')return true;
  return /^foundation-.*\.(?:js|mjs|html|json)$/.test(path);
};
const declarations=[];
for(const a of manifest.admissions){
  if(a.status!=='admitted')continue;
  for(const f of a.files||[])declarations.push({admission:a,...f});
}
for(const path of changed.filter(relevant)){
  if(!fs.existsSync(path))fail(`${path}: deleted architecture-relevant file requires an explicit migration, not silent removal`);
  const hash=sha256(path);
  const hit=declarations.find(x=>x.path===path&&x.sha256===hash);
  if(!hit)fail(`${path}: current content has no exact admitted declaration`);
}

for(const protectedPath of [SELF,WORKFLOW]){
  const hash=sha256(protectedPath);
  if(!declarations.some(x=>x.path===protectedPath&&x.sha256===hash))fail(`${protectedPath}: gate component hash is not admitted`);
}

console.log(`Architecture gate passed: ${changed.filter(relevant).length} changed architecture-relevant file(s) have exact admitted declarations.`);
