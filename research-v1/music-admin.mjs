import {ICON_NAMES,iconSvg} from "../standalone-music-icons-v1.mjs";
const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-music-v1";
const PUBLIC="https://gfchgaphzhxufwdhrcis.supabase.co/storage/v1/object/public/setka-music/";
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const field=(parent,text,input)=>{const l=el("label","sm-admin-field");l.append(el("span","",text),input);parent.append(l);return input};
const input=(type,value="")=>{const n=document.createElement("input");n.type=type;if(type==="checkbox")n.checked=!!value;else n.value=value??"";return n};
const btn=(text,fn)=>{const n=el("button","",text);n.type="button";n.onclick=fn;return n};
let epoch=0;
export function mountMusicAdmin(container,getAdminKey){
 const generation=++epoch;
 container.replaceChildren(el("p","muted","Загружаем музыкальную библиотеку…"));
 let model={categories:[],tracks:[]},currentTrack=null,currentCategory=null;
 async function req(action,fields={}){
  const res=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,adminKey:getAdminKey(),...fields}),cache:"no-store"});
  const value=await res.json().catch(()=>({}));
  if(!res.ok||!value.ok)throw Error(value.error||"server_unavailable");
  return value;
 }
 async function upload(file){
  if(!file)return null;
  let type=file.type||(file.name.toLowerCase().endsWith(".mp3")?"audio/mpeg":file.name.toLowerCase().endsWith(".svg")?"image/svg+xml":"");
  if(type==="audio/x-wav")type="audio/wav";if(type==="audio/x-m4a"||type==="audio/m4a")type="audio/mp4";
  const intent=await req("upload-intent",{mime:type,size:file.size});
  const data=new FormData();data.append("cacheControl","3600");data.append("file",type===file.type?file:new File([file],file.name,{type}));
  const result=await fetch(intent.upload_url,{method:"PUT",headers:{"x-upsert":"false"},body:data});
  if(!result.ok)throw Error("upload_failed_"+result.status);
  return intent.path;
 }
 const connected=()=>container.isConnected&&epoch===generation;
 async function reload(){
  try{const d=await req("manage");if(!connected())return;model=d;render()}
  catch(e){if(connected())container.replaceChildren(el("p","error","Музыкальный каталог недоступен: "+e.message))}
 }
 function render(){
  if(!connected())return;container.replaceChildren();
  const wrap=el("div","sm-admin");
  const intro=el("p","muted","Все изменения сохраняются на сервере. Аудио и значки загружаются в отдельное хранилище SETKA. Не публикуйте записи без права на их использование.");
  wrap.append(intro);
  const sectionCats=el("section","sm-admin-section"),sectionTracks=el("section","sm-admin-section");
  sectionCats.append(el("h2","","Категории музыки"));
  const catBar=el("div","row");
  catBar.append(btn("Добавить категорию",()=>{currentCategory=null;render()}));
  for(const c of model.categories){
   const b=btn(c.title+" · "+(c.visible?"показана":"скрыта"),()=>{currentCategory=c;render()});catBar.append(b);
   if(!c.is_system)catBar.append(btn("Удалить «"+c.title+"»",async()=>{
    if(!confirm("Удалить категорию «"+c.title+"»? Привязанные к ней треки должны быть сначала переназначены."))return;
    try{await req("delete-category",{id:c.id});currentCategory=null;await reload()}
    catch(e){alert("Не удалось удалить категорию: "+e.message)}
   }));
  }
  sectionCats.append(catBar);renderCategoryForm(sectionCats);
  sectionTracks.append(el("h2","","Музыкальные треки"));
  const toolbar=el("div","row");
  toolbar.append(btn("Новый трек",()=>{currentTrack=null;render()}),btn("Обновить список",reload));
  sectionTracks.append(toolbar);
  const list=el("div","sm-admin-track-list");
  for(const track of model.tracks){
   const item=el("div","sm-admin-track");
   const icon=el("span","sm-admin-icon");
   if(track.icon_url){const im=el("img");im.src=track.icon_url;im.alt="";icon.append(im)}
   else icon.innerHTML=iconSvg(track.icon_key);
   const label=el("span","",track.title+" — "+(track.published?"опубликован":"скрыт"));item.append(icon,label);
   item.append(btn("Изменить",()=>{currentTrack=track;render()}));
   item.append(btn("Удалить",async()=>{
    if(!confirm("Удалить трек «"+track.title+"» из каталога?"))return;
    try{await req("delete-track",{id:track.id});currentTrack=null;await reload()}catch(e){alert("Не удалось удалить: "+e.message)}
   }));
   const player=el("audio");player.controls=true;player.preload="none";player.src=track.audio_url;player.setAttribute("aria-label","Прослушать "+track.title);item.append(player);
   list.append(item);
  }
  if(!model.tracks.length)list.append(el("p","muted","Треки пока не загружены."));
  sectionTracks.append(list);renderTrackForm(sectionTracks);
  wrap.append(sectionCats,sectionTracks);container.append(wrap);
 }
 function renderCategoryForm(section){
  const c=currentCategory||{};
  const form=el("form","sm-admin-form");form.append(el("h3","",c.id?"Редактировать категорию":"Создать категорию"));
  const id=field(form,"ID (латиницей)",input("text",c.id||""));
  id.pattern="[a-z0-9_-]{2,40}";id.required=true;id.readOnly=!!c.id;
  const title=field(form,"Название",input("text",c.title||""));title.required=true;title.maxLength=100;
  const sort=field(form,"Порядок",input("number",c.sort_order||0));
  const visible=field(form,"Отображается на фронте",input("checkbox",c.visible!==false));
  const icon=field(form,"Иконка PNG / SVG / WebP (необязательно)",input("file"));icon.accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp";
  const note=el("p","muted",c.icon_path?"Текущая иконка сохранена. Не выбирайте новый файл, чтобы оставить её.":"Без файла используется встроенный символ SETKA.");
  const msg=el("p","sm-admin-feedback");const save=btn("Сохранить категорию",()=>{});
  save.onclick=async()=>{
   save.disabled=true;msg.textContent="Сохраняем…";
   try{let path=c.icon_path||null;if(icon.files[0])path=await upload(icon.files[0]);
    await req("save-category",{id:id.value.trim(),title:title.value.trim(),sort_order:Number(sort.value)||0,visible:visible.checked,icon_path:path});
    currentCategory=null;await reload();
   }catch(e){msg.textContent="Ошибка: "+e.message}finally{save.disabled=false}
  };
  form.append(note,save,msg);form.onsubmit=e=>e.preventDefault();section.append(form);
 }
 function renderTrackForm(section){
  const t=currentTrack||{};
  const form=el("form","sm-admin-form");form.append(el("h3","",t.id?"Редактировать трек":"Добавить трек"));
  const title=field(form,"Название",input("text",t.title||""));title.required=true;title.maxLength=120;
  const file=field(form,"Аудиофайл (до 20 МБ, MP3/M4A/WAV/OGG)",input("file"));file.accept=".mp3,.m4a,.wav,.ogg,audio/*";if(!t.audio_path)file.required=true;
  const iconSelect=el("select");for(const name of ICON_NAMES){const o=el("option","",name);o.value=name;iconSelect.append(o)}iconSelect.value=t.icon_key||"music";
  field(form,"Значок из набора SETKA",iconSelect);
  const icon=field(form,"Собственный значок SVG/PNG/WebP",input("file"));icon.accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp";
  const checkArea=el("fieldset","sm-admin-cats");checkArea.append(el("legend","","Категории"));
  const checks=[];
  for(const cat of model.categories){const ch=input("checkbox",t.category_ids?.includes(cat.id));checks.push({id:cat.id,ch});
   const l=el("label","");l.append(ch,document.createTextNode(" "+cat.title));checkArea.append(l)}
  form.append(checkArea);
  const sort=field(form,"Порядок",input("number",t.sort_order||0));
  const published=field(form,"Опубликовать на фронте",input("checkbox",!!t.published));
  const loop=field(form,"Зациклить воспроизведение",input("checkbox",t.loop!==false));
  const msg=el("p","sm-admin-feedback");const save=btn("Сохранить трек",()=>{});
  save.onclick=async()=>{
   save.disabled=true;msg.textContent="Загружаем и сохраняем…";
   try{
    let audioPath=t.audio_path,iconPath=t.icon_path||null;
    if(file.files[0])audioPath=await upload(file.files[0]);
    if(icon.files[0])iconPath=await upload(icon.files[0]);
    if(!audioPath)throw Error("Выберите аудиофайл");
    await req("save-track",{id:t.id||undefined,title:title.value.trim(),audio_path:audioPath,
     icon_key:iconSelect.value,icon_path:iconPath,category_ids:checks.filter(x=>x.ch.checked).map(x=>x.id),
     sort_order:Number(sort.value)||0,published:published.checked,loop:loop.checked});
    currentTrack=null;await reload();
   }catch(e){msg.textContent="Ошибка: "+e.message}finally{save.disabled=false}
  };
  form.append(save,msg);form.onsubmit=e=>e.preventDefault();section.append(form);
 }
 reload();
}
