import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const core=read('standalone-core-v34.js');
const helpers=core.slice(core.indexOf('function mergeNoteDeletions('),core.indexOf('  function mergePersonalRows('));
const {mergeNoteDeletions,filterDeletedNotes}=new Function(helpers+';return {mergeNoteDeletions,filterDeletedNotes}')();
test('deleted IDs survive stale cloud snapshots and old backups',()=>{
 const a={noteDeletionsV1:{n1:'2026-11-25T10:00:00Z'}},b={noteDeletionsV1:{n2:'2026-11-25T11:00:00Z'}};
 const d=mergeNoteDeletions(a,b,{});assert.deepEqual(filterDeletedNotes([{id:'n1'},{id:'n2'},{id:'n3'}],d),[{id:'n3'}]);
 assert.equal(mergeNoteDeletions(a,{noteDeletionsV1:{n1:'2026-10-01T00:00:00Z'}}).n1,a.noteDeletionsV1.n1);
 assert.match(core,/merged\.notes=filterDeletedNotes/);
 assert.match(read('standalone-private-corpus-v40.js'),/d\.notes=C\.filterDeletedNotes/);
});
test('note edit changes text and revision only, removal requires confirmation',()=>{
 const ui=read('standalone-user-ui-v34.js');
 assert.match(ui,/Редактировать заметку/);assert.match(ui,/Удалить заметку/);
 assert.match(ui,/x\.text=text;x\.updatedAt=/);assert.match(ui,/await C\.inlineConfirm\(card/);
 assert.match(ui,/noteActions\(card,head,n\)/);
 assert.match(ui,/notify\("note_delete"\)/);
});
test('archive functions and research model respect note deletions',()=>{
 for(const p of ['supabase/functions/setka-tester-archive-v37/index.ts','supabase/functions/setka-guest-archive-v1/index.ts'])assert.match(read(p),/filterDeletedNotes/);
 for(const p of ['research-v1/model.mjs','supabase/functions/setka-research-admin-v1/model.mjs'])assert.match(read(p),/!deletedNoteKeys\.has\(n\.id\)/);
});
