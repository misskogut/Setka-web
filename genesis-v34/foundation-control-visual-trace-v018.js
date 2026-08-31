(()=>{
'use strict';
const CONTROL='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-foundation-control';
const SESSION_KEY='setka:foundation:president:session';
const SURFACE=document.body.dataset.surface==='president'?'president':'user';
const frame=document.getElementById('appFrame');
const nativeFetch=window.fetch.bind(window);
let active=null;
let frameCleanup=[];
let parentCleanup=[];
let buttonObserver=null;

function token(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return''}}
function now(){return performance.now()}
function version(){return document.getElementById('versionSelect')?.value||''}
function page(){try{if(SURFACE==='president'){return frame?.contentDocument?.querySelector('.nav button.active')?.dataset?.page||'president'}const w=frame?.contentWindow,d=frame?.contentDocument;const st=w?.FoundationUser?.state?.();if(st?.currentPattern)return `pattern:${st.currentPattern}`;if(d&&!d.getElementById('viewer')?.classList.contains('hidden'))return'pattern-viewer';return'patterns'}catch{return SURFACE}}
function viewport(){return{width:Math.round(window.innerWidth||0),height:Math.round(window.innerHeight||0),dpr:window.devicePixelRatio||1,visual:visualViewport?{width:Math.round(visualViewport.width),height:Math.round(visualViewport.height),offsetLeft:Math.round(visualViewport.offsetLeft),offsetTop:Math.round(visualViewport.offsetTop),scale:Number(visualViewport.scale||1)}:null}}
function recentInputMs(){return active?Math.max(0,Math.round(now()-active.lastInputAt)):null}
function push(type,data={}){if(!active||active.paused)return;active.events.push({type,t:Math.round(now()-active.startedAt),surface:SURFACE,version:version(),page:page(),recentInputMs:recentInputMs(),...data});active.visualCount++;if(active.events.length>=24)flush().catch(()=>{})}
function clean(list){while(list.length){try{list.pop()()}catch{}}}
function on(target,name,fn,opts){target?.addEventListener?.(name,fn,opts);return()=>target?.removeEventListener?.(name,fn,opts)}
function markInput(){if(active)active.lastInputAt=now()}
function roundedRect(r){return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}}
function diffRect(a,b){if(!a||!b)return 999;return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height))}

function attachParent(){clean(parentCleanup);parentCleanup.push(on(window,'resize',()=>push('shell_resize',{viewport:viewport()}),{passive:true}));parentCleanup.push(on(window,'orientationchange',()=>push('orientation_change',{orientation:screen.orientation?.type||''}),{passive:true}));parentCleanup.push(on(document,'pointerdown',markInput,true));parentCleanup.push(on(document,'touchstart',markInput,{capture:true,passive:true}));if(visualViewport){const vv=()=>push('visual_viewport',{viewport:viewport().visual});parentCleanup.push(on(visualViewport,'resize',vv,{passive:true}));parentCleanup.push(on(visualViewport,'scroll',vv,{passive:true}))}}

function attachFrame(){clean(frameCleanup);if(!active||!frame)return;try{
 const w=frame.contentWindow,d=frame.contentDocument;if(!w||!d)return;
 frameCleanup.push(on(d,'pointerdown',markInput,true));frameCleanup.push(on(d,'touchstart',markInput,{capture:true,passive:true}));
 const scroll=()=>push('content_scroll',{x:Math.round(w.scrollX||0),y:Math.round(w.scrollY||0),mainX:Math.round(d.querySelector('.main')?.scrollLeft||0),mainY:Math.round(d.querySelector('.main')?.scrollTop||0)});
 frameCleanup.push(on(w,'scroll',scroll,{capture:true,passive:true}));const main=d.querySelector('.main');if(main)frameCleanup.push(on(main,'scroll',scroll,{passive:true}));
 if(w.visualViewport){const vv=()=>push('frame_visual_viewport',{width:Math.round(w.visualViewport.width),height:Math.round(w.visualViewport.height),offsetLeft:Math.round(w.visualViewport.offsetLeft),offsetTop:Math.round(w.visualViewport.offsetTop),scale:Number(w.visualViewport.scale||1)});frameCleanup.push(on(w.visualViewport,'resize',vv,{passive:true}));frameCleanup.push(on(w.visualViewport,'scroll',vv,{passive:true}))}
 if(w.PerformanceObserver){try{const po=new w.PerformanceObserver(list=>{for(const e of list.getEntries()){push('layout_shift',{value:Number(e.value||0),hadRecentInput:Boolean(e.hadRecentInput),sourceCount:Array.isArray(e.sources)?e.sources.length:0})}});po.observe({type:'layout-shift',buffered:false});frameCleanup.push(()=>po.disconnect())}catch{}}
 const watched=[d.documentElement,d.body,d.querySelector('#app'),d.querySelector('.app'),d.querySelector('.main'),d.querySelector('.page:not(.hidden)')].filter(Boolean);const last=new Map();for(const el of watched)last.set(el,roundedRect(el.getBoundingClientRect()));
 const timer=w.setInterval(()=>{if(!active||active.paused)return;for(const el of watched){if(!el.isConnected)continue;const prev=last.get(el),next=roundedRect(el.getBoundingClientRect());const delta=diffRect(prev,next);if(delta>=4){push('element_shift',{target:el.id?`#${el.id}`:(el.className?'.'+String(el.className).trim().split(/\s+/).join('.') : el.tagName.toLowerCase()),from:prev,to:next,delta});last.set(el,next)}}},220);frameCleanup.push(()=>w.clearInterval(timer));
 if(w.ResizeObserver){const ro=new w.ResizeObserver(entries=>{for(const e of entries){const r=roundedRect(e.target.getBoundingClientRect());push('element_resize',{target:e.target.id?`#${e.target.id}`:(e.target.className?'.'+String(e.target.className).trim().split(/\s+/).join('.') : e.target.tagName.toLowerCase()),rect:r})}});watched.forEach(el=>ro.observe(el));frameCleanup.push(()=>ro.disconnect())}
 let mutationCount=0,mutationTimer=0;if(w.MutationObserver){const mo=new w.MutationObserver(ms=>{mutationCount+=ms.length;if(!mutationTimer)mutationTimer=w.setTimeout(()=>{if(mutationCount)push('dom_mutation',{count:mutationCount});mutationCount=0;mutationTimer=0},450)});mo.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-expanded']});frameCleanup.push(()=>{mo.disconnect();if(mutationTimer)w.clearTimeout(mutationTimer)})}
 push('visual_observer_attached',{frame:{width:w.innerWidth,height:w.innerHeight,scrollX:w.scrollX,scrollY:w.scrollY}});
 }catch(e){push('visual_observer_error',{message:String(e?.message||e)})}}

async function flush(){if(!active||!active.events.length)return;const events=active.events.splice(0,active.events.length),seq=active.seq++;const t=token();if(!t){active.events.unshift(...events);return}const body={action:'trace_append',traceCode:active.traceCode,checkpoint:active.checkpoint,frontVersion:active.frontVersion,segmentKey:active.segmentKey,chunkSeq:seq,viewport:viewport(),summary:{surface:SURFACE,viewingVersion:version(),page:page(),visualObserver:true,visualEventCount:active.visualCount,sessionElapsedEndMs:Math.round(now()-active.startedAt)},events};try{const r=await nativeFetch(CONTROL,{method:'POST',headers:{'content-type':'application/json','x-setka-session':t},body:JSON.stringify(body)});if(!r.ok)throw new Error('trace_append '+r.status)}catch(e){active.seq=Math.max(0,active.seq-1);active.events.unshift(...events);throw e}}

function startObserver(traceCode,req){stopObserver(false);active={traceCode,checkpoint:req.checkpoint||`foundation-v${version()}`,frontVersion:req.frontVersion||`foundation-${SURFACE}-v${version()}`,segmentKey:`VIS-${crypto.randomUUID().slice(0,12).toUpperCase()}`,seq:0,events:[],startedAt:now(),lastInputAt:-1e9,visualCount:0,paused:false,flushTimer:0};attachParent();attachFrame();active.flushTimer=setInterval(()=>flush().catch(()=>{}),2400);push('visual_trace_start',{viewport:viewport()})}
function pauseObserver(){if(!active||active.paused)return;push('visual_trace_pause',{});active.paused=true;flush().catch(()=>{})}
function resumeObserver(){if(!active||!active.paused)return;active.paused=false;active.lastInputAt=now();push('visual_trace_resume',{});attachFrame()}
function stopObserver(flushFirst=true){if(!active)return;const a=active;if(flushFirst){a.paused=false;push('visual_trace_stop',{});flush().catch(()=>{})}clearInterval(a.flushTimer);clean(frameCleanup);clean(parentCleanup);active=null}

function watchRecordButton(){const b=document.getElementById('recordTool');if(!b||buttonObserver)return;let prev=b.textContent||'';buttonObserver=new MutationObserver(()=>{const txt=b.textContent||'';if(txt===prev)return;prev=txt;if(!active)return;if(txt.includes('Продолжить'))pauseObserver();else if(txt.includes('Остановить'))resumeObserver();else if(txt.includes('Записать путь'))stopObserver(true)});buttonObserver.observe(b,{childList:true,characterData:true,subtree:true})}
watchRecordButton();frame?.addEventListener('load',()=>{if(active&&!active.paused)attachFrame()});

window.fetch=async function(input,init){let action='',payload=null,isControl=false;try{const url=typeof input==='string'?input:input?.url||'';isControl=String(url).startsWith(CONTROL);if(isControl&&init?.body){payload=JSON.parse(String(init.body));action=payload?.action||''}}catch{}
 if(isControl&&action==='trace_finalize'&&active)await flush().catch(()=>{});
 const response=await nativeFetch(input,init);
 if(isControl&&action==='trace_start'&&response.ok){try{const d=await response.clone().json();if(d?.traceCode)startObserver(d.traceCode,payload||{})}catch{}}
 if(isControl&&action==='trace_finalize'&&response.ok)stopObserver(false);
 return response;
};
window.FoundationVisualTraceV018={active:()=>Boolean(active),flush:()=>flush(),version:'visual-observer-1'};
})();
