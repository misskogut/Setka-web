import {iconSvg} from "./standalone-music-icons-v1.mjs";
import {SetkaMusicMixer} from "./standalone-music-audio-v1.mjs";
import {createOrbitUI} from "./standalone-music-orbits-v1.mjs";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const $=id=>document.getElementById(id);
const escapeText=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const BASE_CATEGORIES=[{id:"hand",title:"Рука"},{id:"eye",title:"Открытый глаз"},{id:"sleep",title:"Закрытый глаз"},{id:"8d",title:"8D"}];
const mixer=new SetkaMusicMixer();
let categories=BASE_CATEGORIES,tracks=[],selected=null,visible=false,loading=false,status="";
let root=null,categoriesRow=null,grid=null,catalog=null,orbit=null,note=null,title=null,patternPanels=null;
function trackHTML(track){
 if(track.icon_url&&/^https:\/\/gfchgaphzhxufwdhrcis\.supabase\.co\/storage\/v1\/object\/public\/setka-music\/icons\//.test(track.icon_url))
  return '<img alt="" loading="lazy" src="'+escapeText(track.icon_url)+'">';
 return iconSvg(track.icon_key||"music");
}
function dots(level){
 return level?'<span class="sm-dots" aria-hidden="true">'+new Array(level).fill("<i></i>").join("")+'</span>':"";
}
function redrawCatalog(){
 grid.replaceChildren();
 if(status){const el=document.createElement("p");el.className="sm-status";el.textContent=status;grid.append(el)}
 if(loading)return;
 const display=tracks.filter(t=>!selected||selected==="orbits"||t.category_ids?.includes(selected));
 if(!display.length){
  const e=document.createElement("p");e.className="sm-empty";
  e.textContent=status?"":tracks.length?"В этой категории пока нет звуков.":"Музыка ещё не загружена через админку.";
  grid.append(e);return;
 }
 for(const track of display){
  const state=mixer.items.get(track.id),level=state?.level||0,button=document.createElement("button");
  button.type="button";button.className="sm-track"+(level?" active":"");
  button.setAttribute("aria-label",track.title+" — "+(level?"уровень "+level:"выключен"));
  button.innerHTML='<span class="sm-track-icon">'+trackHTML(track)+'</span>'+dots(level);
  button.onclick=()=>{const old=mixer.items.get(track.id)?.level||0;mixer.change(track,old===3?0:old+1)};
  grid.append(button);
 }
}
function redrawCategories(){
 categoriesRow.replaceChildren();
 for(const c of categories.filter(c=>c.visible!==false)){
  const b=document.createElement("button");b.type="button";
  b.className="sm-category"+(selected===c.id?" active":"");b.setAttribute("aria-label",c.title);
  if(c.icon_path&&/^icons\/[a-f0-9-]{36}\.(svg|png|webp)$/.test(c.icon_path)){
   const img=document.createElement("img");img.alt="";img.src="https://gfchgaphzhxufwdhrcis.supabase.co/storage/v1/object/public/setka-music/"+c.icon_path;b.append(img);
  }else b.innerHTML=iconSvg(c.id==="8d"?"8d":c.id);
  b.onclick=()=>{selected=selected===c.id?null:c.id;redraw()};
  categoriesRow.append(b);
 }
 const o=document.createElement("button");o.type="button";
 o.className="sm-category sm-orbit-category"+(selected==="orbits"?" active":"");
 o.setAttribute("aria-label","Орбиты");o.innerHTML=iconSvg("orbits");
 o.onclick=()=>{selected=selected==="orbits"?null:"orbits";redraw()};
 categoriesRow.append(o);
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
  categories=d.categories;tracks=d.tracks.filter(t=>t.id&&t.audio_url);
  const allowed=new Set(tracks.map(t=>t.id));
  for(const id of [...mixer.items.keys()])if(!allowed.has(id))mixer.remove(id);
 }catch(_){status="Сейчас не удалось загрузить музыкальный каталог."}
 loading=false;redraw();
}
function openMusic(){
 visible=true;patternPanels.hidden=true;patternPanels.style.display="none";root.hidden=false;
 title.textContent="Музыка";
 for(const b of document.querySelectorAll(".library-pager .pager-button"))b.classList.toggle("active",b===note);
 redraw();reload();
}
function hideMusic(){
 if(!visible)return;visible=false;root.hidden=true;patternPanels.hidden=false;patternPanels.style.display="";
 note.classList.remove("active");
}
function install(){
 const library=$("libraryScreen"),pager=library?.querySelector(".library-pager");
 patternPanels=$("librarySwipeArea");title=$("libraryTitle");
 if(!library||!pager||!patternPanels||!title)return;
 note=document.createElement("button");note.type="button";
 note.id="setkaMusicPagerButton";note.className="pager-button";note.setAttribute("aria-label","Музыка");
 note.innerHTML=iconSvg("music");note.onclick=openMusic;pager.append(note);
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
 orbit=createOrbitUI(mixer,trackHTML);root.append(orbit.root);
 const power=document.createElement("button");power.type="button";power.className="sm-power";
 power.title="Выключить все звуки";power.setAttribute("aria-label","Выключить все звуки");
 power.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v10M6 5.5a9 9 0 1 0 12 0"/></svg>';
 power.onclick=()=>{mixer.stopAll();redraw()};root.append(power);library.append(root);
 mixer.changed=message=>{if(message)status=message;if(visible)redraw()};
 mixer.moved=()=>{if(visible&&selected==="orbits")orbit.updatePositions()};
 window.SetkaMusicV1={state:()=>({visible,filter:selected,mode:mixer.mode,speed:mixer.speed,tracks:tracks.length,active:[...mixer.items.values()].map(s=>({id:s.id,level:s.level,angle:s.angle,radius:s.radius}))}),reload,stopAll:()=>mixer.stopAll()};
 window.addEventListener("pageshow",()=>{if(visible)reload()});
 redraw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
