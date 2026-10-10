import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("device archive merges compare identity and completeness",()=>{
  const src=read("supabase/functions/setka-tester-archive-v37/index.ts");
  assert.match(src,/function noteCompleteness/);
  assert.match(src,/field!=="notes"\|\|noteCompleteness\(x\)>=noteCompleteness\(old\)/);
  assert.match(src,/const k=itemKey\(x,i\+\+,field\)/);
});
test("front cloud merges have the same incomplete-note protection",()=>{
  const src=read("standalone-private-corpus-v40.js");
  assert.match(src,/function noteCompleteness/);
  assert.match(src,/prefix!=="notes"\|\|noteCompleteness\(x\)>=noteCompleteness\(old\)/);
});
test("frozen note replay is the first source for pattern and frame",()=>{
  const src=read("standalone-note-snapshot-fix-v34.js");
  assert.match(src,/note\?\.replaySnapshot\?\.patternId/);
  assert.match(src,/const frames = \[note\?\.replaySnapshot\?\.frame/);
  assert.match(src,/v == null \? NaN : Number\(v\)/);
});
