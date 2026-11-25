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