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
 assert.match(ui,/x\.text=text;x\.updatedAt=/);assert.match(ui,/await C\.noteDeleteConfirm\(card/);
 assert.match(ui,/noteActions\(card,head,n\)/);
 assert.match(ui,/notify\("note_delete"\)/);
});
test('archive functions and research model respect note deletions',()=>{
 for(const p of ['supabase/functions/setka-tester-archive-v37/index.ts','supabase/functions/setka-guest-archive-v1/index.ts'])assert.match(read(p),/filterDeletedNotes/);
 for(const p of ['research-v1/model.mjs','supabase/functions/setka-research-admin-v1/model.mjs'])assert.match(read(p),/!deletedNoteKeys\.has\(n\.id\)/);
});

test('note creation date shares the top row with edit and delete actions',()=>{
 const ui=read('standalone-user-ui-v34.js');
 const render=ui.slice(ui.indexOf('  function renderNoteCard('),ui.indexOf('  function showToday('));
 assert.match(render,/const observed=n\.observedAt\|\|n\.createdAt/);
 assert.match(render,/header\.appendChild\(date\);card\.appendChild\(header\)/);
 assert.ok(render.indexOf('card.appendChild(header)')<render.indexOf('card.appendChild(head)'));
 assert.match(ui,/card\.querySelector\("\.st34-note-header"\)\.appendChild\(controls\)/);
 assert.match(ui,/\.st34-note-header\{display:flex;align-items:center;justify-content:space-between/);
 assert.match(ui,/\.st34-note-actions\[hidden\]\{display:none\}/);
 assert.doesNotMatch(render,/dt\(n\.observedAt\)/);
});

test('note delete confirmation is a separate fixed modal with explicit consent',async()=>{
 const src=read('standalone-inline-actions-v1.js');
 const code=src.slice(src.indexOf('  C.noteDeleteConfirm='),src.lastIndexOf('})();'));
 function el(){return {children:[],isConnected:true,attrs:{},append(...nodes){this.children.push(...nodes)},appendChild(n){this.append(n);return n},setAttribute(k,v){this.attrs[k]=v},focus(){document.activeElement=this},remove(){this.isConnected=false},contains(n){return this===n||this.children.some(c=>c.contains(n))}}}
 const document={body:el(),createElement:el,getElementById(id){return this.body.children.find(n=>n.id===id&&n.isConnected)},addEventListener(){},removeEventListener(){}};
 const listeners={},window={addEventListener(k,v){listeners[k]=v},removeEventListener(k){delete listeners[k]}};
 const C={},root=el();root.closest=()=>null;
 const MutationObserver=class{observe(){}disconnect(){}};
 new Function('C','document','window','MutationObserver',code)(C,document,window,MutationObserver);
 const options={title:'Удалить?',body:'Текст'};
 let p=C.noteDeleteConfirm(root,options),overlay=document.getElementById('st34NoteDeleteConfirm'),panel=overlay.children[0];
 assert.equal(root.children.length,0);assert.equal(panel.attrs.role,'alertdialog');assert.equal(panel.attrs['aria-modal'],'true');
 assert.equal(await C.noteDeleteConfirm(root,options),false);
 panel.children[2].children[0].onclick();assert.equal(await p,false);assert.equal(overlay.isConnected,false);
 p=C.noteDeleteConfirm(root,options);overlay=document.getElementById('st34NoteDeleteConfirm');overlay.children[0].children[2].children[1].onclick();assert.equal(await p,true);
 p=C.noteDeleteConfirm(root,options);listeners.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(await p,false);
 assert.match(src,/#st34NoteDeleteConfirm\{position:fixed;inset:0/);
 assert.doesNotMatch(code,/scrollIntoView|root\.appendChild/);
});
