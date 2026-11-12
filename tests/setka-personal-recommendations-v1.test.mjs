import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('standalone-analysis-v34.js','utf8');
function fixture({session,goal='relax'}){
 const suggestions=[],scheduled=[];
 let active=goal?{requestKey:goal,phase:'measured'}:null;
 const data={sessions:[session],physio:{samples:[]}};
 const C={getActiveSession:()=>active,getData:()=>data,publicCommunity:[],esc:String,fmt:String};
 const Setka={getPatterns:()=>[{id:'medusa',defaults:{patternId:'medusa'}},{id:'gravity-atom',defaults:{patternId:'gravity-atom'}}],
  configKey:(_config,id)=>id+'|default',setRecommendations:x=>suggestions.push(x)};
 const window={SetkaStandaloneV34:C,SetkaApp:Setka,addEventListener:()=>{}};
 const document={head:{appendChild:()=>{}},createElement:()=>({style:{},textContent:''})};
 vm.runInNewContext(src,{window,document,setTimeout:(f)=>scheduled.push(f),setInterval:()=>{},requestAnimationFrame:()=>{}});
 return {suggestions,recalc:()=>scheduled.at(-1)(),setGoal:value=>{active=value?{requestKey:value,phase:'measured'}:null}};
}
const record=({pre=2,post=4,helped=2,phase='measured'}={})=>({
 completed:true,sessionType:'outcome',requestKey:'relax',preState:pre,postState:post,helped,
 usage:[{patternId:'medusa',config:{patternId:'medusa',speed:99},
  configKey:'medusa|custom-99',durationMs:240000,phase,saved:true}]
});
test('personalized pattern is recognized across customized settings, not only default hash',()=>{
 const h=fixture({session:record()});h.recalc();
 assert.deepEqual(Array.from(h.suggestions.at(-1).patterns),['medusa']);
 assert.equal(h.suggestions.at(-1).community.length,0);
});
test('negative isolated subjective result does not pretend the pattern is beneficial',()=>{
 const h=fixture({session:record({pre:5,post:1,helped:0})});h.recalc();
 assert.deepEqual(Array.from(h.suggestions.at(-1).patterns),[]);
});
test('free "Просто исследую" and no active goal never present efficacy-shaped recommendations',()=>{
 const h=fixture({session:record(),goal:'explore'});h.recalc();
 assert.deepEqual(Array.from(h.suggestions.at(-1).patterns),[]);
 h.setGoal(null);h.recalc();
 assert.deepEqual(Array.from(h.suggestions.at(-1).patterns),[]);
});
test('only measured phase can drive outcome recommendations',()=>{
 const h=fixture({session:record({phase:'exploration'})});h.recalc();
 assert.deepEqual(Array.from(h.suggestions.at(-1).patterns),[]);
 assert.match(src,/const isolated=new Set\(measured\.map\(identify\)\.filter\(Boolean\)\)\.size===1/);
});
