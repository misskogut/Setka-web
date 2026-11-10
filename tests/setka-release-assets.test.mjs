import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read=p=>fs.readFileSync(p,'utf8');
const pages=['standalone-v34.html','standalone-research-admin-v1.html'];
const root=process.cwd();
const safePath=(from,ref)=>{
 const clean=ref.split(/[?#]/)[0];
 if(!clean||/^(?:https?:|\/\/|data:|blob:|#)/i.test(ref))return null;
 const absolute=path.resolve(root,path.dirname(from),clean);
 assert.ok(absolute===root||absolute.startsWith(root+path.sep),`Asset escapes project: ${from} -> ${ref}`);
 return path.relative(root,absolute);
};
test('published frontend and admin pages reference real local assets',()=>{
 for(const page of pages){
  const html=read(page);
  assert.match(html,/<meta name="setka-release-build" content="[a-f0-9]{40}"\s*\/>/,`${page}: missing build stamp`);
  for(const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
   const asset=safePath(page,m[1]);
   if(asset&&/\.(?:js|mjs|css|json|svg|png|webp|ico)$/.test(asset))
    assert.ok(fs.existsSync(asset),`${page}: missing asset ${asset}`);
  }
 }
});
test('research admin imports resolve after revision stamping',()=>{
 const files=fs.readdirSync('research-v1').filter(f=>f.endsWith('.mjs'));
 for(const name of files){
  const file='research-v1/'+name,code=read(file);
  for(const m of code.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)){
   const asset=safePath(file,m[1]);
   assert.ok(fs.existsSync(asset),`${file}: missing module ${asset}`);
  }
 }
});
test('release metadata identifies the same revision as frontend and admin',()=>{
 const meta=JSON.parse(read('standalone-release.json'));
 assert.match(meta.build,/^[a-f0-9]{40}$/);
 assert.equal(meta.entry,'standalone-v34.html');
 for(const page of pages)assert.ok(read(page).includes(`name="setka-release-build" content="${meta.build}"`),`${page}: release mismatch`);
});
