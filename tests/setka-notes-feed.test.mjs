import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('standalone-user-ui-v34.js','utf8');
const sheets=fs.readFileSync('standalone-sheets-v1.js','utf8');
test('notes sort by observation date rather than merge order or edit date',()=>{
 const code=src.slice(src.indexOf('  function chronologicalNotes('),src.indexOf('  // Refresh just the timeline'));
 const sort=new Function(code+';return chronologicalNotes')();
 const a=[{id:'new',observedAt:'2026-11-25T12:00:00Z'},{id:'old',observedAt:'2026-10-01T00:00:00Z',updatedAt:'2026-12-01T12:00:00Z'},{id:'middle',createdAt:'2026-11-01T00:00:00Z'},{id:'unknown'}];
 assert.deepEqual(sort(a).map(x=>x.id),['new','middle','old','unknown']);
 assert.deepEqual(a.map(x=>x.id),['new','old','middle','unknown']);
});
test('composer stays above timeline, refreshes only feed and clears saved text',()=>{
 const notes=src.slice(src.indexOf('  function showNotes(){'),src.indexOf('  function showSessions(){'));
 assert.ok(notes.indexOf('b.appendChild(form)')<notes.indexOf('b.appendChild(list)'));
 assert.doesNotMatch(notes,/field\.focus\(|add\.onclick/);
 assert.match(notes,/field\.value="";field\.blur\(\)/);
 assert.match(src,/if\(title==="Заметки"\)refreshNotesFeed\(\)/);
 assert.match(sheets,/if\(key==='notes'\)C\.refreshNotesFeed/);
 assert.match(sheets,/!editor\.value\.trim\(\)/);
});
test('keyboard follows the focused existing note rather than the new composer',()=>{
 const code=sheets.slice(sheets.indexOf('  let keyboardForm=null;'),sheets.indexOf("  wrap.addEventListener('focusin'"));
 const classes=new Set(),style={setProperty(){}},layer={style,classList:{contains:k=>classes.has(k),toggle:(k,v)=>v?classes.add(k):classes.delete(k)}};
 const newForm={getBoundingClientRect:()=>({top:-300,bottom:-100}),closest:()=>null};
 const header={getBoundingClientRect:()=>({top:420-wrap.scrollTop})};
 const editForm={getBoundingClientRect:()=>({top:460-wrap.scrollTop,bottom:610-wrap.scrollTop}),closest:()=>({querySelector:()=>header})};
 const wrap={scrollTop:0,contains:f=>f===newForm||f===editForm,getBoundingClientRect:()=>({top:50,bottom:320,height:270})};
 const document={body:{style},activeElement:{closest:()=>editForm}};
 const window={visualViewport:{height:340,offsetTop:0}};
 const viewport=new Function('window','document','innerHeight','visible','wrap','layer',code+';return viewport')(window,document,844,()=>true,wrap,layer);
 viewport();assert.equal(wrap.scrollTop,364);assert.equal(classes.has('st-note-keyboard'),true);
 document.activeElement={closest:()=>null};viewport();assert.equal(wrap.scrollTop,364);
 document.activeElement={closest:()=>newForm};viewport();assert.ok(wrap.scrollTop<364);
 window.visualViewport.height=844;viewport();assert.equal(classes.has('st-note-keyboard'),false);
});
