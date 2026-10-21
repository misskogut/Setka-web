(() => {
 'use strict';const S=window.SetkaApp,C=window.SetkaStandaloneV34;if(!S||!C)return;
 const API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-admin-v1',KEY='sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv';let busy=false,last=0,refreshTask=null,lastStatus=null;
 const style=document.createElement('style');style.textContent='.pattern-tile{position:relative}.setka-new-pattern{position:absolute;top:5px;right:5px;z-index:3;font:500 8px/1.2 Arial,sans-serif;letter-spacing:.02em;border:1px solid #777;border-radius:9px;padding:3px 5px;background:#111;color:#fff;pointer-events:none}';document.head.append(style);
 // Canonical participant archive is the only source of "opened once".
 // No second localStorage key, launch-time heuristic or per-pattern exception.
 function seenInfo(){
  const d=C.getData(),ids=new Set(),first=new Map();
  function add(id,at){
   if(typeof id!=='string'||!id)return;
   ids.add(id);
   const stamp=at?Date.parse(at):NaN;
   if(Number.isFinite(stamp)&&(!first.has(id)||stamp<first.get(id)))first.set(id,stamp);
  }
  for(const x of d.openedPatterns||[])add(x.patternId,x.firstOpenedAt||x.openedAt||x.createdAt);
  for(const x of d.patternExposures||[])add(x.patternId,x.startedAt||x.observedAt);
  for(const e of d.events||[])if(e.type==='pattern_open')add(e.payload?.state?.patternId||e.payload?.patternId,e.wallAt||e.observedAt);
  return{ids,first};
 }
 function seen(){return seenInfo().ids}
 function orderBaseTiles(info){
  const panel=document.getElementById('allPatternsPanel');if(!panel)return;
  const tiles=[...panel.children].filter(n=>n.matches?.('.pattern-tile[data-kind="base"]'));
  if(tiles.length<2)return;
  const releaseOrder=new Map(window.SetkaPatternRegistryV1?.list?.().map((p,i)=>[p.id,i])||[]);
  const sorted=tiles.slice().sort((a,b)=>{
   const ia=a.dataset.patternId,ib=b.dataset.patternId,va=info.ids.has(ia),vb=info.ids.has(ib);
   if(va!==vb)return va?1:-1; // unopened ("new") always at the top
   if(!va)return (releaseOrder.get(ib)??-1)-(releaseOrder.get(ia)??-1); // newest first
   const ta=info.first.get(ia)??0,tb=info.first.get(ib)??0;
   return ta-tb||((releaseOrder.get(ia)??0)-(releaseOrder.get(ib)??0)); // viewed most recently = last
  });
  if(sorted.every((tile,i)=>tile===tiles[i]))return; // avoid observer loops / preview resets
  const fragment=document.createDocumentFragment();
  for(const tile of sorted)fragment.append(tile); // reuse exact Canvas nodes, no re-render
  panel.append(fragment);
 }
 function decorate(){
  const info=seenInfo();
  document.querySelectorAll('.pattern-tile[data-kind="base"]').forEach(tile=>{
   const badge=tile.querySelector('.setka-new-pattern');
   if(info.ids.has(tile.dataset.patternId)){badge?.remove();return}
   if(!badge){const b=document.createElement('span');b.className='setka-new-pattern';b.textContent='new';b.setAttribute('aria-label','Ещё не открыт');tile.append(b)}
  });
  orderBaseTiles(info);
 }
 window.addEventListener('setka:pattern-open',e=>{const id=e.detail?.state?.patternId||S.getState()?.patternId;if(!id)return;const d=C.getData();d.openedPatterns=Array.isArray(d.openedPatterns)?d.openedPatterns:[];if(!seen().has(id)||!d.openedPatterns.some(x=>x.patternId===id)){if(!d.openedPatterns.some(x=>x.patternId===id))d.openedPatterns.push({id,patternId:id,firstOpenedAt:new Date().toISOString()});C.save();window.dispatchEvent(new CustomEvent('setka:pattern-first-open',{detail:{patternId:id}}))}decorate();});
 const lib=document.getElementById('libraryScreen');if(lib)new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.pattern-tile')||n.querySelector?.('.pattern-tile')))))decorate()}).observe(lib,{childList:true,subtree:true});
 // Reconcile after asynchronous local/private archive hydration as well as
 // another tab saving the first opening. Never discard earlier opening history.
 for(const event of ['setka:v40-private-corpus-restored','setka:personal-archive-restored','setka:states-restored','setka:pattern-first-open'])window.addEventListener(event,decorate);
 function versionNotice(remote){
  const compatible=!remote||remote===window.SetkaPatternRegistryV1?.revision?.();
  const old=document.getElementById('setkaCatalogUpdate');if(compatible){old?.remove();return true}if(old)return false;
  const update=document.createElement('button');update.id='setkaCatalogUpdate';update.type='button';update.textContent='Доступно обновление паттернов';
  update.style.cssText='display:block;margin:8px auto 12px;border:1px solid #777;border-radius:16px;padding:7px 12px;background:#111;color:#fff;font:11px Arial,sans-serif';
  update.onclick=async()=>{update.disabled=true;try{const immediate=C.save(),durable=immediate||await C.whenSaved?.();if(!durable)throw Error('not_saved');location.reload()}catch(_){update.textContent='Сохранение не подтверждено. Повторить';update.disabled=false}};
  document.getElementById('libraryTitle')?.insertAdjacentElement('afterend',update);return false;
 }
 function refresh(force=false){if(refreshTask)return force?refreshTask.then(()=>refresh(false)):refreshTask;refreshTask=(async()=>{busy=true;try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({action:'catalog'}),cache:'no-store'});if(!r.ok)throw Error('catalog_unavailable');const out=await r.json();if(!Array.isArray(out.items))throw Error('catalog_invalid');window.SetkaPatternRegistryV1?.setTitles?.(out.items);window.SetkaPatternRegistryV1?.applyDefaults?.(out.defaults||[]);
 if(out.registryRevision&&out.registryRevision!==window.SetkaPatternRegistryV1?.revision?.())window.dispatchEvent(new CustomEvent("setka:catalog-version-mismatch",{detail:{local:window.SetkaPatternRegistryV1?.revision?.(),remote:out.registryRevision}}));last=Date.now();lastStatus={ok:true,updatedAt:last,registryRevision:out.registryRevision||null,compatible:versionNotice(out.registryRevision)};decorate()}catch(error){lastStatus={ok:false,error:String(error?.message||error)};/* Keep the last confirmed names and settings while offline. */}finally{busy=false;refreshTask=null}})();return refreshTask}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-last>30000)refresh()});window.addEventListener('focus',()=>{if(Date.now()-last>30000)refresh()});setInterval(()=>{if(!document.hidden)refresh()},30000);
 window.__SETKA_PATTERN_CATALOG_V1__={refresh:()=>refresh(true),status:()=>lastStatus,decorate,seen};decorate();refresh();
})();
