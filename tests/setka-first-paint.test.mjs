import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const fronts=['standalone-v34.html','standalone-v34-cycle-logo3d.html'];
function source(html){return html.match(/<script id="setka-first-paint">([\s\S]*?)<\/script>/)[1]}
function harness({build='a'.repeat(40),remote=null,redirected=false,ready=true,active=false}={}){
 const attrs=new Set(),listeners={},timers=new Map(),frames=[],replacements=[],events=[];let count=0,removed=false,fetches=0;
 const label={style:{}},button={hidden:true},cover={querySelector:s=>s==='button'?button:label,remove(){removed=true}};
 const nav={querySelectorAll:()=>({length:ready?5:4})};
 const document={documentElement:{setAttribute:k=>attrs.add(k),removeAttribute:k=>attrs.delete(k)},readyState:'loading',body:{classList:{contains:()=>ready}},querySelector:s=>s.includes('meta')?{content:build}:null,getElementById:k=>k==='st34Nav'?nav:k==='setkaBootCover'?cover:null,addEventListener:(k,f)=>listeners[k]=f};
 const location={href:'https://example.test/standalone-v34.html?x=1'+(redirected?'&__setka_refresh=old':'')+'#cycle',replace:s=>replacements.push(s)};
 const window={SetkaApp:{},SetkaStandaloneV34:{getActiveSession:()=>active},__SETKA_SHEET_LAYOUT_V1__:{},dispatchEvent:e=>events.push(e.type)};
 new Function('document','window','location','history','fetch','setTimeout','clearTimeout','requestAnimationFrame','Event','URL','AbortController',source(read(fronts[0])))(document,window,location,{replaceState(){}},async()=>{fetches++;if(remote===null)return new Promise(()=>{});return {ok:true,json:async()=>({build:remote,entry:'standalone-v34.html'})}},f=>{timers.set(++count,f);return count},id=>timers.delete(id),f=>frames.push(f),class{constructor(type){this.type=type}},URL,AbortController);
 return {attrs,listeners,timers,frames,replacements,button,label,events,get removed(){return removed},get fetches(){return fetches}};
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
test('offline release check is bounded and broken shell offers retry',async()=>{
 const h=harness();const promise=h.listeners.DOMContentLoaded();h.timers.values().next().value();await promise;h.frames.shift()();assert.equal(h.removed,true);
 const broken=harness({ready:false,remote:'a'.repeat(40)});await broken.listeners.DOMContentLoaded();broken.frames.shift()();assert.equal(broken.attrs.has('data-setka-boot'),true);assert.equal(broken.button.hidden,false);
});
test('active session is not interrupted by stale manifest',async()=>{
 const h=harness({active:true,remote:'b'.repeat(40)});await h.listeners.DOMContentLoaded();h.frames.shift()();assert.equal(h.replacements.length,0);assert.equal(h.removed,true);
});