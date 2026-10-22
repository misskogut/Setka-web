import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
const source=read("supabase/functions/setka-community-patterns-v38/index.ts");
const from=source.indexOf("const INTENTS=new Set("),to=source.indexOf("\nDeno.serve(async req=>{",from);
assert.ok(from>=0&&to>from);
// The Edge function resolves its allowlist from the published registry.
const registryContext={window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(read("standalone-pattern-registry-v1.js"),registryContext);
const known=registryContext.window.SetkaPatternRegistryV1.ids();
const startAggregation=source.indexOf("const MIN_GROUP_ACCOUNTS=",from);
assert.ok(startAggregation>from);
const code=(source.slice(from,source.indexOf("const KNOWN_PATTERNS=",from))+
  "const KNOWN_PATTERNS=new Set("+JSON.stringify(known)+");\n"+
  source.slice(startAggregation,to))
  .replaceAll("new Map<string,any>()","new Map()")
  .replaceAll("new Set<string>()","new Set()")
  .replace("function communityIntentSummary(accounts:any[],archives:any[])","function communityIntentSummary(accounts,archives)")
  ;
const env={Set,Map,JSON,Math,Number,String,Array,N:Number};
vm.createContext(env);vm.runInContext(code+"\nthis.aggregateGoals=communityIntentSummary;",env);
const who=(tid,consent=true,registered=true)=>({tester_id:tid,active:true,password_set_at:registered?"2026-10-01":null,consent_at:consent?"2026-10-01":null,consent_version:"research-v2-2026-09-17"});
function one(tid,count=2,pid="tentacle-orbit",intent="sleep"){
  const sessions=Array.from({length:count},(_,i)=>({id:tid+"-"+i,requestKey:intent}));
  return{tester_id:tid,payload:{sessions,notes:[{text:"SECRET PRIVATE NOTE"}],patternExposures:sessions.flatMap(s=>Array.from({length:7},(_,i)=>({patternId:pid,sessionId:s.id,exposureId:s.id+"-"+i})))}};
}
test("individual goals NEVER enter public pattern card, despite many episodes",()=>{
 const out=env.aggregateGoals([who("A")],[one("A",20)]);
 assert.equal(out.length,0);
});
test("only 3+ consenting accounts and 5+ distinct sessions expose a category",()=>{
 const a=[who("A"),who("B"),who("C")],p=[one("A"),one("B"),one("C")];
 const out=env.aggregateGoals(a,p);
 assert.equal(out.length,1);assert.equal(out[0].scenarios[0].key,"sleep");
 assert.equal(out[0].scenarios[0].count,6);
 assert.equal(out[0].scenarios[0].share,1);
 assert.equal(JSON.stringify(out).includes("SECRET"),false);
 assert.equal(JSON.stringify(out).includes("tester_id"),false);
});
test("no consent and smaller category never appear as a public goal",()=>{
 const accounts=[who("A"),who("B"),who("C"),who("D",false)];
 const archives=[one("A",2),one("B",2),one("C",2),one("D",9,"tentacle-orbit","focus")];
 const out=env.aggregateGoals(accounts,archives);
 assert.equal(out.length,1);
 assert.deepEqual(Array.from(out[0].scenarios,x=>x.key),["sleep"]);
});
test("one registered account and historical guest devices cannot synthesize a public cohort",()=>{
 const account=who("real"),anonymous=who("guest",true,false);
 const out=env.aggregateGoals([account,anonymous],[one("real",8),one("guest",8)]);
 assert.equal(out.length,0,"only one registered account exists; never create a synthetic group");
});
test("current community Edge function does not import any legacy device favorites or exposures",()=>{
 assert.doesNotMatch(source,/import\s*\{\s*historicalSavedCatalog\s*\}/);
 assert.doesNotMatch(source,/historicalFavorites\s*\(/);
 assert.doesNotMatch(source,/historicalRows\s*\(/);
 assert.doesNotMatch(source,/prototype_v35_favorites/);
 assert.doesNotMatch(source,/prototype_v35_pattern_exposures/);
 assert.doesNotMatch(source,/items\.push\(\{\.\.\.x,\s*id:`historical-/);
 assert.match(source,/prototype_v41_config_metrics_current/);
 assert.match(source,/if\(!Number\.isInteger\(Number\(x\.save_accounts\)\)\|\|Number\(x\.save_accounts\)<=0\)continue/);
 const client=read("standalone-community-cloud-v38.js");
 assert.doesNotMatch(client,/legacySaveCount/);
 assert.match(client,/x\.historical!==true/);
 assert.match(client,/Number\.isInteger\(Number\(x\.saveCount\)\)/);
});
