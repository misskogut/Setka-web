import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const fronts=['standalone-v34.html','standalone-v34-cycle-logo3d.html'];
function source(html){return html.match(/<script id="setka-first-paint">([\s\S]*?)<\/script>/)[1]}
function harness({build='a'.repeat(40),remote=null,redirected=false,ready=true,active=false,logo=false,front=fronts[0]}={}){
 const attrs=new Set(),listeners={},timers=new Map(),frames=[],replacements=[],events=[];let count=0,removed=false,fetches=0;
 const label={style:{}},button={hidden:true},cover={querySelector:s=>s==='button'?button:label,remove(){removed=true}};
 let uiReady=ready;const nav={querySelectorAll:()=>({length:uiReady?5:4})};
 const document={documentElement:{setAttribute:k=>attrs.add(k),removeAttribute:k=>attrs.delete(k)},readyState:'loading',body:{classList:{contains:()=>uiReady}},querySelector:s=>s.includes('meta')?{content:build}:null,getElementById:k=>k==='st34Nav'?nav:k==='setkaBootCover'?cover:k==='setkaVerticalLogo'&&logo?{}:null,addEventListener:(k,f)=>listeners[k]=f};
 const location={href:'https://example.test/standalone-v34.html?x=1'+(redirected?'&__setka_refresh=old':'')+'#cycle',replace:s=>replacements.push(s)};
 const window={SetkaApp:{},SetkaStandaloneV34:{getActiveSession:()=>active},__SETKA_SHEET_LAYOUT_V1__:{},dispatchEvent:e=>events.push(e.type)};
 new Function('document','window','location','history','fetch','setTimeout','clearTimeout','requestAnimationFrame','Event','URL','AbortController',source(read(front)))(document,window,location,{replaceState(){}},async()=>{fetches++;if(remote===null)return new Promise(()=>{});return {ok:true,json:async()=>({build:remote,entry:'standalone-v34.html'})}},f=>{timers.set(++count,f);return count},id=>timers.delete(id),f=>frames.push(f),class{constructor(type){this.type=type}},URL,AbortController);
 return {attrs,listeners,timers,frames,replacements,button,label,events,setReady(){uiReady=true},setLogoReady(){window.SETKA_CYCLE_LAB={};window.SETKA_VERTICAL_LOGO_LAB={}},get removed(){return removed},get fetches(){return fetches}};
}
test('old shell is covered before app markup in both frontends',()=>{
 for(const p of fronts){const html=read(p);assert.ok(html.indexOf('id="setka-first-paint-css"')<html.indexOf('<body>'));assert.ok(html.indexOf('id="setkaBootCover"')<html.indexOf('<main id="app">'));assert.match(html,/body > :not\(#setkaBootCover\)\{opacity:0!important/);assert.doesNotMatch(source(html),/addEventListener\("load"/)}
});
test('current release reveals only after DOM and final dock are ready',async()=>{
 const h=harness({remote:'a'.repeat(40)});assert.equal(h.attrs.has('data-setka-boot'),true);assert.equal(h.fetches,1);
 await h.listeners.DOMContentLoaded();assert.equal(h.attrs.has('data-setka-boot'),true);h.frames.shift()();
 assert.equal(h.attrs.has('data-setka-boot'),false);assert.equal(h.removed,true);assert.deepEqual(h.events,['setka:first-paint-ready']);
});
test('stale release redirects before showing stale UI; redirect is one-shot',async()=>{
 const h=harness({remote:'b'.repeat(40)});await h.listeners.DOMContentLoaded();assert.equal(h.attrs.has('data-setka-boot'),true);assert.equal(h.frames.length,0);assert.match(h.replacements[0],/__setka_refresh=bbbbbbbbbbbb/);assert.match(h.replacements[0],/x=1/);assert.match(h.replacements[0],/#cycle$/);
 const next=harness({redirected:true});await next.listeners.DOMContentLoaded();next.frames.shift()();assert.equal(next.fetches,0);assert.equal(next.removed,true);
});
test('offline release check is bounded',async()=>{
 const h=harness();const promise=h.listeners.DOMContentLoaded();h.timers.values().next().value();await promise;h.frames.shift()();assert.equal(h.removed,true);
});
test('late dock initialization reveals both actual entry scripts',async()=>{
 for(const front of fronts){const h=harness({front,ready:false,remote:'a'.repeat(40)});await h.listeners.DOMContentLoaded();h.frames.shift()();assert.equal(h.removed,false);h.setReady();h.frames.shift()();assert.equal(h.removed,true);assert.deepEqual(h.events,['setka:first-paint-ready']);}
});
test('missing optional logo initialization cannot permanently block the UI',async()=>{
 const h=harness({front:fronts[1],logo:true,remote:'a'.repeat(40)});await h.listeners.DOMContentLoaded();h.frames.shift()();assert.equal(h.removed,false);
 const fallback=[...h.timers.values()].at(-1);fallback();assert.equal(h.removed,true);assert.equal(h.attrs.has('data-setka-boot'),false);h.frames.shift()();assert.deepEqual(h.events,['setka:first-paint-ready']);
});
test('late logo initialization is accepted before timeout',async()=>{
 const h=harness({front:fronts[1],logo:true,remote:'a'.repeat(40)});await h.listeners.DOMContentLoaded();h.frames.shift()();h.setLogoReady();h.frames.shift()();assert.equal(h.removed,true);
});
test('watchdog reveals UI even when the animation frame does not run',async()=>{
 const h=harness({ready:false,remote:'a'.repeat(40)});await h.listeners.DOMContentLoaded();h.timers.values().next().value();assert.equal(h.removed,true);h.frames.shift()();assert.deepEqual(h.events,['setka:first-paint-ready']);
});
test('active session is not interrupted by stale manifest',async()=>{
 const h=harness({active:true,remote:'b'.repeat(40)});await h.listeners.DOMContentLoaded();h.frames.shift()();assert.equal(h.replacements.length,0);assert.equal(h.removed,true);
});