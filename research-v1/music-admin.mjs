import {ICON_NAMES,iconSvg} from "../standalone-music-icons-v1.mjs?v=2";
import {selectedMusicCategorySVG} from "../standalone-music-approved-icons-v1.mjs";
import {UI_ICON_SLOTS,uiIconHTML,assetIconMask} from "../standalone-music-ui-icons-v2.mjs";
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
 let model={categories:[],tracks:[],ui_icons:[]},currentTrack=null,currentCategory=null;
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
 async function validateInterfaceImage(file){
  const type=file.type||(file.name.toLowerCase().endsWith(".png")?"image/png":file.name.toLowerCase().endsWith(".webp")?"image/webp":"");
  if(!["image/png","image/webp"].includes(type)||file.size<1||file.size>2000000)
   throw Error("Для системного значка нужен PNG или WebP до 2 МБ");
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();img.src=url;
   if(img.decode)await img.decode();else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
   if(img.naturalWidth!==img.naturalHeight||img.naturalWidth<128||img.naturalWidth>2048)
    throw Error("Значок должен быть квадратным: от 128×128 до 2048×2048");
   const canvas=document.createElement("canvas");canvas.width=canvas.height=img.naturalWidth;
   const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("Недоступна проверка прозрачности");
   ctx.drawImage(img,0,0);
   const w=canvas.width,pts=[[0,0],[w-1,0],[0,w-1],[w-1,w-1]];
   if(pts.some(([x,y])=>ctx.getImageData(x,y,1,1).data[3]>12))
    throw Error("Уберите фон: углы изображения должны быть прозрачными");
  }finally{URL.revokeObjectURL(url)}
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
  const sectionIcons=el("section","sm-admin-section"),sectionCats=el("section","sm-admin-section"),sectionTracks=el("section","sm-admin-section");
  renderIconEditor(sectionIcons);
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
   icon.innerHTML=assetIconMask(track.icon_path)||iconSvg(track.icon_key);
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
  wrap.append(sectionIcons,sectionCats,sectionTracks);container.append(wrap);
 }
 function renderIconEditor(section){
  section.append(el("h2","","Значки интерфейса"));
  section.append(el("p","muted","Здесь меняются нота, орбита, слушатель, режимы движения, черепаха, заяц и Power. Исходные SVG остаются запасным вариантом. Загружайте квадратные PNG или WebP с прозрачным фоном — SETKA сама задаёт белый цвет, приглушение и свечение."));
  const overrides=Object.fromEntries((model.ui_icons||[]).map(x=>[x.slot,x.icon_path]));
  const gallery=el("div","sm-admin-icon-grid");
  for(const slot of UI_ICON_SLOTS){
   const item=el("div","sm-admin-glyph-card"),preview=el("div","sm-admin-glyph-preview");
   preview.innerHTML=uiIconHTML(slot.id,overrides);
   item.append(preview,el("div","sm-admin-glyph-name",slot.label));
   const picker=input("file");picker.accept=".png,.webp,image/png,image/webp";picker.setAttribute("aria-label","Изображение для "+slot.label);
   item.append(picker);
   const feedback=el("p","sm-admin-feedback");
   const save=btn("Заменить",async()=>{
    if(!picker.files?.[0]){feedback.textContent="Сначала выберите PNG/WebP";return}
    save.disabled=true;feedback.textContent="Проверяю и загружаю…";
    try{
     await validateInterfaceImage(picker.files[0]);
     const path=await upload(picker.files[0]);
     await req("save-ui-icon",{slot:slot.id,icon_path:path});
     await reload();
    }catch(e){feedback.textContent="Ошибка: "+e.message}
    finally{save.disabled=false}
   });
   const controls=el("div","sm-admin-glyph-actions");controls.append(save);
   if(overrides[slot.id]){
    const reset=btn("Вернуть исходный",async()=>{
     reset.disabled=true;feedback.textContent="Возвращаю стандартный значок…";
     try{await req("reset-ui-icon",{slot:slot.id});await reload()}
     catch(e){feedback.textContent="Ошибка: "+e.message;reset.disabled=false}
    });controls.append(reset);
   }
   item.append(controls,feedback);gallery.append(item);
  }
  section.append(gallery);
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
  const iconPreview=el("div","sm-admin-preview-icon");
  iconPreview.innerHTML=assetIconMask(c.icon_path)||selectedMusicCategorySVG(c.id||"hand")||iconSvg(c.id||"hand");
  form.append(iconPreview);
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
