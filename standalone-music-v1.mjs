import {iconSvg} from "./standalone-music-icons-v1.mjs?v=8-restored-pre-master-20261107";
import {selectedMusicCategorySVG} from "./standalone-music-approved-icons-v1.mjs?v=nature-optical-size-20261106";
import {uiIconHTML,assetIconMask,UI_ICON_IDS} from "./standalone-music-ui-icons-v2.mjs?v=4-exact-approved-vector-20261106";
import {SetkaMusicMixer} from "./standalone-music-audio-v1.mjs?v=16-lossless-wav-safari-20261112";
import {createOrbitUI} from "./standalone-music-orbits-reference-20261106.mjs?v=15-orbit-centerline-bounds-20261107";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const $=id=>document.getElementById(id);
const escapeText=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const BASE_CATEGORIES=[{id:"hand",title:"Рука"},{id:"eye",title:"Открытый глаз"},{id:"sleep",title:"Закрытый глаз"},{id:"8d",title:"8D"}];
const mixer=new SetkaMusicMixer();
// Only real audio playback events are counted; no identifying listener data.
mixer.onTrackEvent=event=>{
 // Only the audio element's real "playing" callback can emit a guest
 // playback-start count; never record selected icons as audio playback.
 if(event?.event_type==="play"&&typeof event.track_id==="string")
  window.dispatchEvent(new CustomEvent("setka:music-play",{detail:{trackId:event.track_id}}));
 fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"track-event",...event}),keepalive:true}).catch(()=>{});
};
const uiIcons=Object.create(null);
let categories=BASE_CATEGORIES,tracks=[],globalOrder={track_ids:[]},selected=null,visible=false,loading=false,status="";
let root=null,categoriesRow=null,grid=null,catalog=null,orbit=null,note=null,title=null,patternPanels=null,powerButton=null;
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
async function reload(){
 if(loading)return;
 loading=true;status="";redraw();
 try{
  const r=await fetch(API,{cache:"no-store"});if(!r.ok)throw Error("unavailable");
  const d=await r.json();if(!d.ok||!Array.isArray(d.categories)||!Array.isArray(d.tracks))throw Error("invalid_catalog");
  categories=d.categories;tracks=d.tracks.filter(t=>t.id&&t.audio_url);globalOrder=d.global_order||{track_ids:[]};
  for(const key of UI_ICON_IDS)delete uiIcons[key];
  for(const item of Array.isArray(d.ui_icons)?d.ui_icons:[]){
   if(UI_ICON_IDS.includes(item.slot)&&typeof item.icon_path==="string")uiIcons[item.slot]=item.icon_path;
  }
  if(note)note.innerHTML=uiIconHTML("nav-note",uiIcons);
  if(powerButton)powerButton.innerHTML=uiIconHTML("power",uiIcons);
  orbit?.refreshIcons();
  const allowed=new Set(tracks.map(t=>t.id));
  for(const id of [...mixer.items.keys()])if(!allowed.has(id))mixer.remove(id);
 }catch(_){status="Сейчас не удалось загрузить музыкальный каталог."}
 loading=false;redraw();
}
function openMusic(){
 visible=true;root.parentElement?.classList.add("setka-music-open");patternPanels.hidden=true;patternPanels.style.display="none";root.hidden=false;
 title.textContent="Музыка";
 for(const b of document.querySelectorAll(".library-pager .pager-button"))b.classList.toggle("active",b===note);
 redraw();reload();
}
function hideMusic(){
 if(!visible)return;visible=false;root.parentElement?.classList.remove("setka-music-open");root.hidden=true;patternPanels.hidden=false;patternPanels.style.display="";
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
 window.SetkaMusicV1={state:()=>({visible,filter:selected,mode:mixer.mode,speed:mixer.speed,tracks:tracks.length,active:[...mixer.items.values()].map(s=>({id:s.id,level:s.level,angle:s.angle,radius:s.radius,earlyReflections:s.nativeOnly?0:s.reflections?.length||0,spatialized:!s.nativeOnly}))}),
  diagnostics:()=>mixer.diagnostics(),reload,stopAll:()=>mixer.stopAll()};
 window.addEventListener("pageshow",()=>{if(visible)reload()});
 redraw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
