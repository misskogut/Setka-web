test("info icon pointer is not captured by the parent pattern tile", () => {
  const js=read("app-v7-multipattern.js");
  assert.match(js,/pointerdown",e=>\{if\(e\.target\.closest\?\.\("\.st34-info"\)\)return;/);
  assert.match(js,/pointerup",e=>\{cancel\(\);if\(e\.target\.closest\?\.\("\.st34-info"\)\)return;/);
});

test("old hardcoded octopus methodology never intercepts info buttons", () => {
  const html=read("standalone-v34.html");
  assert.doesNotMatch(html,/<script[^>]+src=["']standalone-methodology-v34[.]js/);
  assert.match(html,/<script[^>]+src=["']standalone-advanced-v34[.]js/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");

function localStatsWith(dataObject, favorites = []) {
  const source = read("standalone-advanced-v34.js");
  const from = source.indexOf("  function localStats(t){");
  const to = source.indexOf("  async function remoteStats(t){", from);
  assert.ok(from >= 0 && to > from, "canonical per-pattern stats implementation is present");
  const code = source.slice(from, to);
  const sandbox = {
    data: () => dataObject,
    Setka: {getFavorites: () => favorites, configKey: (c, id) => id + "|" + c.variant},
  };
  return vm.runInNewContext(code + "\nlocalStats;", sandbox);
}

test("pattern totals use relevant exposure intervals, never all time in a mixed-pattern session", () => {
  const data = {
    sessions: [{id:"session-one",requestKey:"focus",measuredActiveMs:900000}],
    patternExposures: [
      {patternId:"dandelion",configKey:"dandelion|a",sessionId:"session-one",requestKey:"sleep",durationMs:10000},
      {patternId:"tentacle-orbit",configKey:"tentacle-orbit|a",sessionId:"session-one",requestKey:"focus",durationMs:800000},
      {patternId:"dandelion",configKey:"dandelion|b",sessionId:"session-one",requestKey:"focus",durationMs:20000},
    ]
  };
  const fn=localStatsWith(data,[{baseId:"dandelion",config:{variant:"a"}}]);
  const base=fn({kind:"base",patternId:"dandelion"});
  assert.equal(base.totalUsageMs,30000);
  assert.equal(base.sessions,1);
  assert.equal(base.exposures,2);
  assert.equal(base.likeCount,1);
  assert.equal(base.savedConfigurations,1);
  assert.equal(base.configurationSaves,1);
  assert.equal(base.topIntents[0].key,"focus");
  assert.equal(base.topIntents[0].count,1);
  assert.equal(base.topIntents[0].share,1);
  assert.equal(base.scenarioSessions,1);
  const exact=fn({kind:"community",patternId:"dandelion",configKey:"dandelion|a"});
  assert.equal(exact.totalUsageMs,10000);
  assert.equal(exact.exposures,1);
  assert.equal(exact.configSaveCount,1);
});

test("missing exposure history is not invented from session duration", () => {
  const fn=localStatsWith({sessions:[{id:"s",measuredActiveMs:180000}],events:[],patternExposures:[]});
  const x=fn({kind:"base",patternId:"stereo-dna"});
  assert.equal(x.totalUsageMs,0);
  assert.equal(x.sessions,0);
  assert.equal(x.exposures,0);
});

test("personal note cards and repair/moderation use immutable note IDs", () => {
  const ui=read("standalone-user-ui-v34.js"), repair=read("standalone-note-snapshot-fix-v34.js");
  const moderation=read("standalone-tester-community-v34.js");
  assert.match(ui,/card\.dataset\.noteId=String\(n\.id\)/);
  assert.match(ui,/Setka\.renderPreview\?\.\(canvas,clone\(n\.config\),n\.frame\?\?44,n\.patternId/);
  assert.match(repair,/const id=card\.dataset\.noteId/);
  assert.match(moderation,/const id=card\.dataset\.noteId/);
  assert.doesNotMatch(repair,/same\.find\(n => \{ try \{ return meta/);
  assert.doesNotMatch(moderation,/notes\.filter\(n => String\(n\?\.text/);
  assert.match(repair,/card\.classList\.contains\("st37-public-card"\)/);
});

test("snapshot identity is persisted before the asynchronous visual cache writes", () => {
  const js=read("standalone-note-snapshot-fix-v34.js");
  const block=js.slice(js.indexOf("  function bindMomentToNote("),js.indexOf("  function installLiveBinding()"));
  assert.match(block,/note\.replaySnapshot = \{version:2,patternId:pid/);
  assert.match(block,/C\.save\?\.\(\)/);
  assert.ok(block.indexOf("C.save?.()") < block.indexOf("Promise.resolve(moment.cachePromise)"));
  assert.doesNotMatch(block,/await moment\.cachePromise/);
});

test("community Notes tab survives a pattern library re-render", () => {
  const js=read("standalone-community-cloud-v38.js");
  assert.match(js,/new MutationObserver\(\(\)=>\{/);
  assert.match(js,/mode\(\)!=="notes"/);
  assert.match(js,/communityPanel\.querySelector\(":scope > #st40CommunityNotes"\)/);
  assert.match(js,/if\(!communityPanel\.querySelector/);
});

test("Stereo DNA preview gets visible center-cropped points, not 300 compressed into a dot", () => {
  const js=read("app-v7-multipattern.js");
  assert.match(js,/const previewPoints=thumb\?Math\.min\(72,c\.numPoints\)/);
  assert.match(js,/drawDnaSpiral\(t,-c\.eyeSeparation\/2,-c\.stereoAngle,previewConfig,phase,previewPoints\)/);
  assert.match(js,/getPatternTitle:id=>IDS\.has\(id\)\?/);
});

test("one pattern counts a scenario once per session even if dozens of configuration changes", () => {
  const exposures=[];
  for(let i=0;i<238;i++)exposures.push({patternId:"dandelion",configKey:"dandelion|"+i,
    sessionId:i<100?"a":i<180?"b":"c",requestKey:"sleep",durationMs:150});
  exposures.push({patternId:"dandelion",configKey:"dandelion|other",sessionId:"d",requestKey:"focus",durationMs:10000});
  const fn=localStatsWith({sessions:[{id:"a",requestKey:"sleep"},{id:"b",requestKey:"sleep"},{id:"c",requestKey:"sleep"},{id:"d",requestKey:"focus"}],patternExposures:exposures});
  const x=fn({kind:"base",patternId:"dandelion"});
  assert.equal(x.exposures,239);
  assert.equal(x.scenarioSessions,4);
  assert.equal(x.topIntents[0].key,"sleep");
  assert.equal(x.topIntents[0].count,3);
  assert.equal(x.topIntents[0].share,.75);
  assert.equal(x.topIntents[1].key,"focus");
  assert.equal(x.topIntents[1].count,1);
  assert.equal(x.totalUsageMs,45700);
});

test("source scopes stay distinct: cloud totals do not substitute a different pattern's intents", () => {
  const js=read("standalone-advanced-v34.js");
  assert.match(js,/const scenarios=local\.topIntents\|\|\[\]/);
  assert.match(js,/scenarioSessions/);
  assert.match(js,/один сценарий считается один раз на сессию/i);
  assert.match(js,/Облачная сводка подключённых тестировщиков не содержит распределения целей/i);
  assert.match(js,/patternId:target\.patternId/);
});

test("zero-valued pattern parameters survive config normalization", () => {
  const js=read("app-v7-multipattern.js");
  assert.match(js,/backgroundAlpha:clamp\(Math\.round\(Number\(c\.backgroundAlpha\?\?d\.backgroundAlpha\)\),0,255\)/);
  assert.match(js,/baseRadius:clamp\(Number\(c\.baseRadius\?\?d\.baseRadius\),0,100\)/);
});

test("passive on-screen watch time continues without touches and excludes overlays", () => {
  const core=read("standalone-core-v34.js"), runtime=read("standalone-runtime-v34.js");
  assert.doesNotMatch(core,/now-lastInteraction<=30000/);
  assert.match(core,/!document.hidden&&game.classList.contains\("active"\)&&layer.classList.contains\("hidden"\)/);
  assert.match(core,/activeSession.plannedSeconds\*1000-\(activeSession.measuredActiveMs\|\|0\)/);
  assert.match(runtime,/setka:overlay-visibility/);
  assert.match(runtime,/instructions-open/);
});

test("mixed-pattern feedback isn't counted as each pattern's own effect; recommendations consider seven bases", () => {
  const js=read("standalone-analysis-v34.js");
  assert.match(js,/const isolated=allMeasuredKeys.size===1/);
  assert.match(js,/if\(isolated&&delta!=null&&Number.isFinite\(delta\)\)/);
  assert.match(js,/for\(const pattern of Setka.getPatterns\?\.\(\)\|\|\[\]\)/);
  assert.match(js,/patterns:chosen.filter\(x=>x.kind==="base"\).map\(x=>x.id\)/);
});

test("null post-state is not falsely interpreted as a valid self-report", () => {
  const js=read("standalone-user-ui-v34.js");
  assert.match(js,/s.preState!=null&&s.postState!=null&&Number.isFinite\(Number\(s.preState\)\)/);
});
