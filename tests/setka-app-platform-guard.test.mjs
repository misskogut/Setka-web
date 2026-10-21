import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Generic structural guard: a new pattern must integrate through the shared
// registry, never through hand-coded checks in front/admin/notes modules.
const modulePrefix=/^standalone-pattern-[a-z0-9-]+\.js$/;
const descriptorRx=/^\/\*\s*SETKA_PATTERN_DESCRIPTOR\s*\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR\s*\*\//;
const consumerFiles=[
 'app-v7-multipattern.js',
 'standalone-catalog-v1.js',
 'standalone-pattern-plugins-v1.js',
 'standalone-pattern-key-v1.js',
 'standalone-live-previews-v1.js',
 'standalone-favorites-repair-v34.js',
 'standalone-community-cloud-v38.js',
 'standalone-note-snapshot-fix-v34.js',
 'standalone-public-visual-capsules-v40.js',
 'standalone-multipattern-bridge-v34.js',
 'standalone-visual-cache-v40.js',
 'research-v1/renderer.mjs'
];
function packages(){
 const out=[];
 for(const entry of fs.readdirSync('.',{withFileTypes:true})){
  if(!entry.isFile()||!modulePrefix.test(entry.name))continue;
  const code=fs.readFileSync(entry.name,'utf8');
  const match=code.match(descriptorRx);
  if(!match)continue; // legacy platform helpers are not standalone packages
  out.push({file:entry.name,code,metadata:JSON.parse(match[1])});
 }
 return out.sort((a,b)=>a.file.localeCompare(b.file));
}

test('every new pattern remains a discoverable single-file package',()=>{
 const modules=packages();
 assert.ok(modules.length>=2,'expected real standalone modules');
 const seen=new Set();
 for(const {file,code,metadata:p} of modules){
  assert.equal(p.module,file);
  assert.match(p.id,/^[a-z][a-z0-9-]{2,79}$/);
  assert.equal(file,'standalone-pattern-'+p.id+'.js');
  assert.ok(!seen.has(p.id),'duplicate package ID '+p.id);seen.add(p.id);
  assert.match(p.introducedAt,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(new Date(p.introducedAt).toISOString(),p.introducedAt);
  assert.ok(Array.isArray(p.palettes)&&p.palettes.length===p.colorModes&&p.colorModes>=1&&p.colorModes<=9);
  assert.deepEqual(p.palettes[p.defaults.colorModeIndex],[255,255,255],'first color white: '+p.id);
  assert.ok(Array.isArray(p.controls)&&p.controls.length>0);
  for(const c of p.controls){
   assert.ok([0,1,2].includes(c[6]),'gesture finger count missing: '+p.id+'/'+c[1]);
  }
  assert.ok(code.includes('document.currentScript?.dataset.patternId'),
    'registration must use injected script patternId, not hardcoded module ID: '+file);
  assert.ok(code.includes('registry.bindRenderer(id,render)'),
    'renderer binding must be generic, not a UI workaround: '+file);
 }
});

test('all shared app/research consumers stay ignorant of specific new pattern IDs',()=>{
 const modules=packages();
 for(const consumer of consumerFiles){
  assert.ok(fs.existsSync(consumer),'platform consumer missing or renamed: '+consumer);
  const source=fs.readFileSync(consumer,'utf8');
  for(const {metadata:p} of modules){
   // The descriptor and renderer are allowed to know their own ID.
   // The rest uses registry IDs. Quoted names in shared UI/research code
   // violate zero-touch; new modules must not require app-specific patches.
   for(const q of ["'",'"',String.fromCharCode(96)]){
    assert.ok(!source.includes(q+p.id+q),
      'New module '+p.id+' hardcoded in '+consumer+'. Integrate via descriptor/registry, not per-pattern patch.');
   }
  }
 }
});

test('developer bootstrap and canonical contract point to the durable rules ledger',()=>{
 const agent=fs.readFileSync('AGENTS.md','utf8');
 const canonical=fs.readFileSync('SETKA_APP_CANONICAL_CONTRACT.md','utf8');
 const ledger=fs.readFileSync('docs/SETKA_APP_RULES_LEDGER.md','utf8');
 assert.match(agent,/SETKA_APP_CANONICAL_CONTRACT\.md/);
 assert.match(agent,/docs\/SETKA_APP_RULES_LEDGER\.md/);
 assert.match(canonical,/SETKA_APP_RULES_LEDGER\.md/);
 assert.match(ledger,/No more one-off pattern wiring/);
 assert.match(ledger,/APP-020/);
});
