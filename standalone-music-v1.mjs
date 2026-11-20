import {iconSvg} from "./standalone-music-icons-v1.mjs?v=8-restored-pre-master-20261107";
import {selectedMusicCategorySVG} from "./standalone-music-approved-icons-v1.mjs?v=nature-optical-size-20261106";
import {uiIconHTML,assetIconMask,UI_ICON_IDS} from "./standalone-music-ui-icons-v2.mjs?v=4-exact-approved-vector-20261106";
import {SetkaMusicMixer} from "./standalone-music-audio-v1.mjs?v=18-native-release-fallback-20261115";
import {createOrbitUI} from "./standalone-music-orbits-reference-20261106.mjs?v=15-orbit-centerline-bounds-20261107";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const $=id=>document.getElementById(id);
const escapeText=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const BASE_CATEGORIES=[{id:"hand",title:"Рука"},{id:"eye",title:"Открытый глаз"},{id:"sleep",title:"Закрытый глаз"},{id:"8d",title:"8D"}];
let musicSnapshotActive=false;
const mixer=new SetkaMusicMixer();
// Only real audio playback events are counted; no identifying listener data.
mixer.onTrackEvent=event=>{
 if(typeof navigator!=="undefined"&&navigator.webdriver===true&&
  typeof location!=="undefined"&&/^(?:misskogut\.github\.io|(?:www\.)?setka-app\.com)$/.test(location.hostname))return;
 // Only the audio element's real "playing" callback can emit a guest
 // playback-start count; never record selected icons as audio playback.
 if(event?.event_type==="play"&&typeof event.track_id==="string")
  window.dispatchEvent(new CustomEvent("setka:music-play",{detail:{trackId:event.track_id}}));
 if(musicSnapshotActive)return; // Never flood blocked Supabase with fallback playback events.
 fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"track-event",...event}),keepalive:true}).catch(()=>{});
};
const uiIcons=Object.create(null);
let categories=BASE_CATEGORIES,tracks=[],globalOrder={track_ids:[]},selected=null,visible=false,loading=false,status="";
let catalogRetryCount=0,catalogRetryTimer=null;
let root=null,categoriesRow=null,grid=null,catalog=null,orbit=null,note=null,title=null,patternPanels=null,powerButton=null;
let gameHost=null; // Only the experimental cycle game uses this optional shared-player mount.
function trackHTML(track){
 const custom=assetIconMask(track.icon_path);
 return custom||iconSvg(track.icon_key||"music");
}
function dots(level){
 return level?'<span class="sm-dots" aria-hidden="true">'+new Array(level).fill("<i></i>").join("")+'</span>':"";
}
function redrawCatalog(){
 grid.replaceChildren();
 if(status){const el=document.createElement("p");el.className="sm-status";el.textContent=status;grid.append(el)}
 if(loading)return;
 const display=tracks.filter(t=>!selected||selected==="orbits"||t.category_ids?.includes(selected));
 // The one admin-defined order applies to the unfiltered gallery and every filtered category.
 const priority=new Map((globalOrder.track_ids||[]).map((id,index)=>[id,index]));
 display.sort((a,b)=>(priority.get(a.id)??1e9)-(priority.get(b.id)??1e9));
 if(!display.length){
  const e=document.createElement("p");e.className="sm-empty";
  e.textContent=status?"":tracks.length?"В этой категории пока нет звуков.":"Музыка ещё не загружена через админку.";
  grid.append(e);return;
 }
 for(const track of display){
  const state=mixer.items.get(track.id),level=state?.level||0,button=document.createElement("button");
  button.type="button";button.className="sm-track"+(level?" active":"");
  button.setAttribute("aria-label",track.title+" — "+(level?"уровень "+level:"выключен"));
  button.innerHTML='<span class="sm-track-icon">'+trackHTML(track)+dots(level)+'</span>';
  button.onclick=()=>{const old=mixer.items.get(track.id)?.level||0;mixer.change(track,old===3?0:old+1)};
  grid.append(button);
 }
}
function redrawCategories(){
 // Preserve scroll offset while rebuilding categories; tapped items offscreen
 // should not cause the strip to jump back to its initial leftmost position.
 const previousScroll=categoriesRow.scrollLeft;
 categoriesRow.replaceChildren();
 for(const c of categories.filter(c=>c.visible!==false)){
  const b=document.createElement("button");b.type="button";
  b.className="sm-category"+(selected===c.id?" active":"");b.setAttribute("aria-label",c.title);
  b.innerHTML=assetIconMask(c.icon_path)||selectedMusicCategorySVG(c.id)||iconSvg(c.id==="8d"?"8d":c.id);
  b.onclick=()=>{selected=selected===c.id?null:c.id;redraw()};
  categoriesRow.append(b);
 }
 const o=document.createElement("button");o.type="button";
 o.className="sm-category sm-orbit-category"+(selected==="orbits"?" active":"");
 o.setAttribute("aria-label","Орбиты");o.innerHTML=uiIconHTML("orbit-tab",uiIcons);
 o.onclick=()=>{selected=selected==="orbits"?null:"orbits";redraw()};
 categoriesRow.append(o);
 categoriesRow.scrollLeft=previousScroll;
}
function redraw(){
 if(!root)return;redrawCategories();
 const inOrbits=selected==="orbits";
 catalog.hidden=inOrbits;orbit.root.hidden=!inOrbits;
 if(inOrbits)orbit.render();else redrawCatalog();
}
// Offline fallback is an immutable, published-only catalogue. The actual audio
// files remain in GitHub Releases; no secrets, unpublished tracks or user data.
const FALLBACK_AUDIO_BASE="https://github.com/misskogut/Setka-web/releases/download/setka-original-music-20261107/";
async function readPublishedMusicSnapshot(){
 const r=await fetch(new URL("./standalone-music-public-snapshot-v1.json",import.meta.url),{cache:"no-store"});
 if(!r.ok)throw Error("fallback_catalog_unavailable");
 const d=await r.json();
 if(d?.format!=="setka-public-music-static-fallback-v1"||!Array.isArray(d.categories)||
    !Array.isArray(d.tracks)||!d.tracks.length||d.tracks.length>100||
    !Array.isArray(d.global_order?.track_ids)||!Array.isArray(d.ui_icons))throw Error("fallback_catalog_invalid");
 const seen=new Set();
 for(const t of d.tracks){
  const hash=String(t.external_source_hash||"").toLowerCase(),path=String(t.external_source_path||"");
  const ext=/\.mp3$/i.test(path)?".mp3":/\.wav$/i.test(path)?".wav":null;
  if(!/^[0-9a-f-]{36}$/.test(String(t.id))||seen.has(t.id)||!ext||
     !/^[0-9a-f]{64}$/.test(hash)||!Number.isSafeInteger(Number(t.external_source_bytes))||
     Number(t.external_source_bytes)<=0||t.audio_url!==FALLBACK_AUDIO_BASE+"setka-original-"+hash.slice(0,24)+ext)
     throw Error("fallback_track_invalid");
  seen.add(t.id);
 }
 if(d.global_order.track_ids.some(id=>!seen.has(id)))throw Error("fallback_order_invalid");
 return d;
}
async function reload(){
 if(loading)return;
 loading=true;status="";redraw();
 try{
  // A transient Supabase or GitHub Release metadata timeout must not leave
  // the music panel permanently empty. Always require a valid real catalog.
  let d=null,lastError=null,usingSnapshot=false;
  for(let attempt=0;attempt<2;attempt++){
   const controller=new AbortController(),clock=setTimeout(()=>controller.abort(),18000);
   try{
    const r=await fetch(API,{cache:"no-store",signal:controller.signal});
    if(!r.ok){if(r.status===402){lastError=Error("service_restricted_402");break}throw Error("unavailable")};
    const response=await r.json();
    if(!response.ok||!Array.isArray(response.categories)||!Array.isArray(response.tracks))
     throw Error("invalid_catalog");
    d=response;break;
   }catch(error){lastError=error}
   finally{clearTimeout(clock)}
   if(attempt===0)await new Promise(done=>setTimeout(done,600));
  }
  if(!d){
   // Preserve any previously confirmed live catalogue on transient errors.
   if(tracks.length&&!musicSnapshotActive)throw lastError||Error("unavailable");
   d=await readPublishedMusicSnapshot();usingSnapshot=true;
  }
  categories=d.categories;tracks=d.tracks.filter(t=>t.id&&t.audio_url);globalOrder=d.global_order||{track_ids:[]};
  musicSnapshotActive=usingSnapshot;
  status=usingSnapshot?"Резервная музыка: показана последняя подтверждённая версия. Некоторые функции 3D могут быть недоступны без сервера.":"";
  catalogRetryCount=0;clearTimeout(catalogRetryTimer);catalogRetryTimer=null;
  for(const key of UI_ICON_IDS)delete uiIcons[key];
  for(const item of Array.isArray(d.ui_icons)?d.ui_icons:[]){
   if(UI_ICON_IDS.includes(item.slot)&&typeof item.icon_path==="string")uiIcons[item.slot]=item.icon_path;
  }
  if(note)note.innerHTML=uiIconHTML("nav-note",uiIcons);
  if(powerButton)powerButton.innerHTML=uiIconHTML("power",uiIcons);
  orbit?.refreshIcons();
  const allowed=new Set(tracks.map(t=>t.id));
  for(const id of [...mixer.items.keys()])if(!allowed.has(id))mixer.remove(id);
 }catch(_){
  status="Сейчас не удалось загрузить музыкальный каталог.";
  if(visible&&catalogRetryCount<3){
   const delay=[1200,3500,8500][catalogRetryCount++];
   clearTimeout(catalogRetryTimer);
   catalogRetryTimer=setTimeout(()=>{catalogRetryTimer=null;if(visible)void reload()},delay);
  }
 }
 loading=false;redraw();
}
// Move the SINGLE, live music UI (and its one mixer) into the game sheet.
// No duplicated tracks, no second audio engine and no library navigation.
function openInGame(host){
 if(!root||!host||!host.isConnected)return false;
 const library=$("libraryScreen");
 if(root.parentElement===library&&visible){
  library.classList.remove("setka-music-open");
  patternPanels.hidden=false;patternPanels.style.display="";
  note?.classList.remove("active");
  if(title?.textContent==="Музыка")title.textContent="Сквиши";
 }
 gameHost=host;
 if(root.parentElement!==host)host.appendChild(root);
 root.hidden=false;visible=true;
 redraw();
 if(!tracks.length&&!loading)void reload();
 return true;
}
function closeInGame(){
 if(!gameHost||!root)return false;
 root.hidden=true;
 const library=$("libraryScreen");
 if(library&&root.parentElement!==library)library.appendChild(root);
 gameHost=null;visible=false;
 clearTimeout(catalogRetryTimer);catalogRetryTimer=null;
 return true; // Audio already playing intentionally continues uninterrupted.
}
function openMusic(){
 if(gameHost)closeInGame();
 visible=true;root.parentElement?.classList.add("setka-music-open");patternPanels.hidden=true;patternPanels.style.display="none";root.hidden=false;
 title.textContent="Музыка";
 for(const b of document.querySelectorAll(".library-pager .pager-button"))b.classList.toggle("active",b===note);
 catalogRetryCount=0;clearTimeout(catalogRetryTimer);catalogRetryTimer=null;
 redraw();reload();
}
function hideMusic(){
 if(gameHost||!visible)return;
 visible=false;clearTimeout(catalogRetryTimer);catalogRetryTimer=null;root.parentElement?.classList.remove("setka-music-open");root.hidden=true;patternPanels.hidden=false;patternPanels.style.display="";
 note.classList.remove("active");
}
function install(){
 // Music is a permanent fourth library destination, including ordinary URLs.
 // Keep the note in HTML so it never disappears before module initialization.
 const library=$("libraryScreen"),pager=library?.querySelector(".library-pager");
 patternPanels=$("librarySwipeArea");title=$("libraryTitle");
 if(!library||!pager||!patternPanels||!title)return;
 note=$("setkaMusicPagerButton");
 if(!note){
  // Safe compatibility for other standalone shells sharing the music module.
  note=document.createElement("button");note.type="button";
  note.id="setkaMusicPagerButton";note.className="pager-button";note.setAttribute("aria-label","Музыка");
  pager.append(note);
 }
 note.innerHTML=uiIconHTML("nav-note",uiIcons);
 note.onclick=openMusic;
 for(const id of ["libraryPagerButton","communityPagerButton","favoritesPagerButton"])
  $(id)?.addEventListener("click",hideMusic,true);
 const app=window.SetkaApp;
 if(app?.setLibraryPage){const original=app.setLibraryPage.bind(app);
  app.setLibraryPage=(...args)=>{hideMusic();return original(...args)}}
 root=document.createElement("section");root.id="setkaMusicPage";root.hidden=true;
 root.setAttribute("aria-label","Музыка SETKA");
 categoriesRow=document.createElement("div");categoriesRow.className="sm-categories";
 categoriesRow.setAttribute("role","group");categoriesRow.setAttribute("aria-label","Категории музыки");
 root.append(categoriesRow);
 catalog=document.createElement("div");catalog.className="sm-catalog";
 grid=document.createElement("div");grid.className="sm-grid";catalog.append(grid);root.append(catalog);
 orbit=createOrbitUI(mixer,trackHTML,uiIcons);root.append(orbit.root);
 const power=document.createElement("button");power.type="button";power.className="sm-power";
 power.title="Выключить все звуки";power.setAttribute("aria-label","Выключить все звуки");
 power.innerHTML=uiIconHTML("power",uiIcons);powerButton=power;
 power.onclick=()=>{mixer.stopAll();redraw()};root.append(power);library.append(root);
 mixer.changed=message=>{if(message)status=message;if(visible)redraw()};
 mixer.moved=()=>{if(visible&&selected==="orbits")orbit.updatePositions()};
 window.SetkaMusicV1={state:()=>({visible,gameOpen:!!gameHost,filter:selected,mode:mixer.mode,speed:mixer.speed,offlineSnapshot:musicSnapshotActive,tracks:tracks.length,active:[...mixer.items.values()].map(s=>({id:s.id,level:s.level,angle:s.angle,radius:s.radius,earlyReflections:s.nativeOnly?0:s.reflections?.length||0,spatialized:!s.nativeOnly}))}),
  diagnostics:()=>mixer.diagnostics(),reload,stopAll:()=>mixer.stopAll(),
  openInGame,closeInGame};
 window.dispatchEvent(new Event("setka:music-ready"));
 window.addEventListener("pageshow",()=>{if(visible)reload()});
 redraw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
