import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const snapshot=JSON.parse(fs.readFileSync('standalone-catalog-public-snapshot-v1.json','utf8'));
const source=fs.readFileSync('standalone-catalog-fallback-v1.js','utf8');
const html=fs.readFileSync('standalone-v34.html','utf8');

function setup(initialRevision=-1){
  const calls=[];
  let revision=initialRevision;
  const R={
    publicationRevision:()=>revision,
    applyPublication:(items,rev)=>{calls.push(['publication',items,rev]);revision=rev},
    applyOrder:(order)=>calls.push(['order',order]),
    setTitles:(items)=>calls.push(['titles',items]),
    applyDefaults:(items)=>calls.push(['defaults',items])
  };
  const win={SetkaPatternRegistryV1:R,dispatchEvent:()=>{},
    __SETKA_PATTERN_CATALOG_V1__:{decorate:()=>calls.push(['decorate'])}};
  const context={window:win,URL,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},
    location:{href:'https://misskogut.github.io/Setka-web/standalone-v34.html'},
    fetch:async()=>({ok:true,json:async()=>snapshot})};
  vm.runInNewContext(source,context,{filename:'standalone-catalog-fallback-v1.js'});
  return {calls,revision:()=>revision,load:()=>win.__SETKA_PUBLIC_CATALOG_FALLBACK_V1__.apply()};
}

test('published-only static snapshot never exposes testing or disabled patterns',()=>{
  assert.equal(snapshot.format,'setka-public-catalog-static-fallback-v1');
  assert.ok(snapshot.items.length>0);
  assert.equal(new Set(snapshot.items.map(x=>x.pattern_id)).size,snapshot.items.length);
  for(const id of ['gravity-atom','breathing-fractal']){
    assert.ok(!snapshot.items.some(x=>x.pattern_id===id),id+' must not be public');
    assert.ok(!snapshot.defaults.some(x=>x.pattern_id===id),id+' defaults must not be public');
  }
  assert.ok(Number.isSafeInteger(snapshot.publicationRevision));
  assert.ok(html.indexOf('standalone-catalog-fallback-v1.js')<html.indexOf('standalone-catalog-v1.js'));
});

test('offline fallback restores the last published version',async()=>{
  const x=setup();
  assert.equal(x.calls.length,0,'fallback must not run before a live error');
  await x.load();
  assert.equal(x.revision(),snapshot.publicationRevision);
  const applied=x.calls.find(row=>row[0]==='publication');
  assert.ok(applied);
  assert.equal(applied[1].length,snapshot.items.length);
  assert.ok(x.calls.some(row=>row[0]==='decorate'));
});

test('offline fallback never replaces a newer live revision',async()=>{
  const x=setup(snapshot.publicationRevision+1);
  await x.load();
  assert.equal(x.calls.filter(row=>row[0]==='publication').length,0);
  assert.equal(x.revision(),snapshot.publicationRevision+1);
});
