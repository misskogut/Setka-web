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

test('note state links reuse canonical observations without duplicate records',()=>{
 const code=fs.readFileSync('standalone-states-v34.js','utf8');
 const helpers=code.slice(code.indexOf('  function linkedStateRows('),code.indexOf('  C.linkedNoteStates='));
 const {linkedStateRows,linkedNotesFor,attachStateToNote}=new Function(helpers+';return {linkedStateRows,linkedNotesFor,attachStateToNote}')();
 const d={symptoms:[],checkins:[],notes:[]},n={id:'n',observedAt:'2026-01-01T00:00:00Z',text:'test'};d.notes.push(n);let seq=0;const id=p=>p+(++seq),clock='2026-01-02T00:00:00Z';
 const choice={name:'Усталость',intensity:6},check=attachStateToNote(d,n,choice,clock,id,0);
 assert.equal(check.observedAt,n.observedAt);assert.equal(d.checkins.length,1);assert.deepEqual(n.stateCheckinIds,[check.id]);
 assert.equal(attachStateToNote(d,n,choice,clock,id,0).id,check.id);assert.equal(d.checkins.length,1);
 assert.equal(linkedStateRows(d,n)[0].check.intensity,6);assert.equal(linkedNotesFor(d,check.symptomId)[0].note.id,n.id);
 assert.equal(attachStateToNote(d,n,{name:'Усталость',intensity:11},clock,id,0),null);
 const later={id:'n2',observedAt:'2026-02-01T00:00:00Z'};attachStateToNote(d,later,{name:'Усталость',intensity:9},clock,id,0);
 const earlier={id:'n3',observedAt:'2025-12-01T00:00:00Z'};attachStateToNote(d,earlier,{name:'Усталость',intensity:2},clock,id,0);
 assert.equal(d.symptoms[0].lastIntensity,9);
 d.notes=[];assert.equal(linkedNotesFor(d,check.symptomId).length,0);assert.equal(d.checkins.length,3);
});
