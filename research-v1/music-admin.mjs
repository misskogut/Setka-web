import {ICON_NAMES,iconSvg} from "../standalone-music-icons-v1.mjs?v=5-vintage-final-20261107";
import {mountMusicOrder} from "./music-order.mjs?v=6-vintage-final-20261107";
import {selectedMusicCategorySVG} from "../standalone-music-approved-icons-v1.mjs?v=nature-optical-size-20261106";
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
  const extensions={mp3:"audio/mpeg",m4a:"audio/mp4",wav:"audio/wav",ogg:"audio/ogg",png:"image/png",webp:"image/webp",svg:"image/svg+xml"};
  const ext=file.name.toLowerCase().split(".").pop();
  let type=file.type||extensions[ext]||"";
  if(type==="audio/mp3")type="audio/mpeg";
  if(type==="audio/x-wav")type="audio/wav";
  if(type==="audio/x-m4a"||type==="audio/m4a")type="audio/mp4";
  if(!["audio/mpeg","audio/mp4","audio/wav","audio/ogg","image/png","image/webp","image/svg+xml"].includes(type))
   type=extensions[ext]||type;
  if(!type||file.size<1||file.size>(type.startsWith("audio/")?20000000:2000000))
   throw Error("Неподдерживаемый формат или размер файла");
  const intent=await req("upload-intent",{mime:type,size:file.size});
  const data=new FormData();data.append("cacheControl","3600");data.append("",type===file.type?file:new File([file],file.name,{type}));
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
  const sectionOrder=el("section","sm-admin-section sm-admin-order"),sectionIcons=el("section","sm-admin-section"),sectionCats=el("section","sm-admin-section"),sectionTracks=el("section","sm-admin-section");
  mountMusicOrder(sectionOrder,model,req,reload);
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
  toolbar.append(btn("Новый трек",()=>{currentTrack=null;render();requestAnimationFrame(()=>container.querySelector(".sm-admin-track-form")?.scrollIntoView({behavior:"smooth",block:"start"}))}),btn("Обновить список",reload));
  sectionTracks.append(toolbar);
  const list=el("div","sm-admin-track-list");
  for(const track of model.tracks){
   const item=el("div","sm-admin-track");
   const icon=el("span","sm-admin-icon");
   icon.innerHTML=assetIconMask(track.icon_path)||iconSvg(track.icon_key);
   const label=el("span","",track.title+" — "+(track.published?"опубликован":"скрыт"));item.append(icon,label);
   item.append(btn("Изменить",()=>{currentTrack=track;render();requestAnimationFrame(()=>container.querySelector(".sm-admin-track-form")?.scrollIntoView({behavior:"smooth",block:"start"}))}));
   item.append(btn("Удалить",async()=>{
    if(!confirm("Удалить трек «"+track.title+"» из каталога?"))return;
    try{await req("delete-track",{id:track.id});currentTrack=null;await reload()}catch(e){alert("Не удалось удалить: "+e.message)}
   }));
   const player=el("audio");player.controls=true;player.preload="none";player.src=track.audio_url;player.setAttribute("aria-label","Прослушать "+track.title);item.append(player);
   const stats=(model.stats||[]).find(x=>x.track_id===track.id);
   const details=el("details","sm-track-stat-details");
   const summary=el("summary","","Статистика · "+Number(stats?.plays||0).toLocaleString("ru-RU")+" запусков");
   details.append(summary);
   const metrics=el("div","sm-track-stat-metrics");
   const addMetric=(name,value)=>{const b=el("div","sm-track-stat-metric");b.append(el("strong","",String(value)),el("span","",name));metrics.append(b)};
   addMetric("Запусков",Number(stats?.plays||0).toLocaleString("ru-RU"));
   addMetric("За 7 дней",Number(stats?.plays_7d||0).toLocaleString("ru-RU"));
   addMetric("Прослушано ≥95%",Number(stats?.completions||0).toLocaleString("ru-RU"));
   addMetric("Длительность",Number(track.duration_seconds)>0?Math.round(Number(track.duration_seconds))+" с":"—");
   if(stats?.last_activity_at)addMetric("Последняя активность",new Date(stats.last_activity_at).toLocaleDateString("ru-RU"));
   details.append(metrics);
   details.append(el("p","muted","Статистика фиксируется при реальном запуске аудио и после 95% длительности. Без идентификации слушателей."));
   item.append(details);
   list.append(item);
  }
   if(!model.tracks.length)list.append(el("p","muted","Треки пока не загружены. Ниже можно добавить первый трек, иконку и выбрать категории."));
  sectionTracks.append(list);renderTrackForm(sectionTracks);
  wrap.append(sectionOrder,sectionTracks,sectionCats,sectionIcons);container.append(wrap);
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
  const form=el("form","sm-admin-form sm-admin-track-form");form.append(el("h3","",t.id?"Редактировать трек":"Добавить трек"));
  const title=field(form,"Название",input("text",t.title||""));title.required=true;title.maxLength=120;
  const file=field(form,"Оригинальный аудиофайл (до 20 МБ, MP3/M4A/WAV/OGG)",input("file"));file.accept=".mp3,.m4a,.wav,.ogg,audio/*";if(!t.audio_path)file.required=true;
  form.append(el("p","sm-admin-lossless-note muted","Загружаем исходный файл без перекодирования, сжатия и изменения битрейта. Для максимального качества можно использовать WAV. MP3/M4A сохраняются в исходном виде."));
  // One protected server-managed picker: hiding a glyph removes it from choices,
  // not from existing tracks or from the immutable renderer dictionary.
  let selectedIconKey=ICON_NAMES.includes(t.icon_key)?t.icon_key:"music";
  const iconField=el("div","sm-admin-field sm-admin-icon-picker-field");
  const picker=el("details","sm-admin-icon-picker");
  const summary=el("summary","sm-admin-icon-picker-current");
  const gallery=el("div","sm-admin-icon-options");
  gallery.setAttribute("role","group");
  gallery.setAttribute("aria-label","Иконки из коллекции SETKA");
  const hiddenRegion=el("div","sm-admin-hidden-icon-section");
  const iconNotice=el("p","sm-admin-feedback sm-admin-icon-feedback");
  const iconButtons=[];
  const hiddenSet=new Set((model.hidden_icon_keys||[]).filter(key=>ICON_NAMES.includes(key)));
  const usedCount=key=>(model.tracks||[]).filter(track=>track.icon_key===key&&!track.icon_path).length;
  const showSelection=()=>{
   summary.replaceChildren();
   const art=el("span","sm-admin-icon-selected-art");art.innerHTML=iconSvg(selectedIconKey);
   const selectedName=hiddenSet.has(selectedIconKey)?selectedIconKey+" · скрыт в библиотеке":selectedIconKey;
   summary.append(art,el("span","sm-admin-icon-selected-name",selectedName));
   summary.setAttribute("aria-label","Текущий значок: "+selectedName+". Открыть галерею");
   for(const b of iconButtons){
    const active=b.dataset.iconKey===selectedIconKey;
    b.classList.toggle("is-active",active);
    b.setAttribute("aria-pressed",String(active));
   }
  };
  const changeVisibility=async(name,hide,trigger)=>{
   const usage=usedCount(name);
   if(hide&&!confirm("Удалить значок «"+name+"» из библиотеки?"+(usage?"\nОн используется в "+usage+" трек(ах). Эти треки продолжат показывать исходный значок.":"")+"\nЗначок можно будет восстановить."))return;
   trigger.disabled=true;
   iconNotice.textContent=hide?"Убираем из коллекции…":"Восстанавливаем…";
   try{
    await req(hide?"hide-icon":"restore-icon",{icon_key:name});
    const fresh=await req("manage");
    const nowHidden=Array.isArray(fresh.hidden_icon_keys)&&fresh.hidden_icon_keys.includes(name);
    if(nowHidden!==hide)throw Error("Изменение пока не подтверждено сервером");
    model=fresh;
    hiddenSet.clear();for(const key of fresh.hidden_icon_keys||[])if(ICON_NAMES.includes(key))hiddenSet.add(key);
    if(hide&&selectedIconKey===name&&!t.id)selectedIconKey="music";
    renderOptions();
    iconNotice.textContent=hide?"Удалено из выбора. Назначенные трекам значки сохранены.":"Значок возвращён в коллекцию.";
   }catch(e){trigger.disabled=false;iconNotice.textContent="Не удалось изменить библиотеку: "+e.message}
  };
  const renderOptions=()=>{
   gallery.replaceChildren();hiddenRegion.replaceChildren();iconButtons.length=0;
   for(const name of ICON_NAMES){
    if(hiddenSet.has(name))continue;
    const cell=el("div","sm-admin-icon-option-cell");
    const choice=btn("",()=>{
     selectedIconKey=name;showSelection();picker.open=false;summary.focus();
    });
    choice.className="sm-admin-icon-option";
    choice.dataset.iconKey=name;
    choice.setAttribute("aria-label","Выбрать значок "+name);
    const art=el("span","sm-admin-icon-option-art");art.innerHTML=iconSvg(name);
    choice.append(art,el("span","sm-admin-icon-option-name",name));
    iconButtons.push(choice);cell.append(choice);
    if(name!=="music"){
     const remove=btn("Удалить",()=>changeVisibility(name,true,remove));
     remove.className="sm-admin-icon-delete";
     remove.setAttribute("aria-label","Удалить значок из библиотеки: "+name);
     cell.append(remove);
    }
    gallery.append(cell);
   }
   if(hiddenSet.size){
    hiddenRegion.append(el("strong","","Удалённые из библиотеки · "+hiddenSet.size));
    const archived=el("div","sm-admin-hidden-icon-list");
    for(const name of ICON_NAMES){
     if(!hiddenSet.has(name))continue;
     const restore=btn("",()=>changeVisibility(name,false,restore));
     restore.className="sm-admin-icon-restore";
     restore.setAttribute("aria-label","Восстановить значок "+name);
     const art=el("span","sm-admin-icon-option-art");art.innerHTML=iconSvg(name);
     restore.append(art,el("span","",name+" · Восстановить"));
     archived.append(restore);
    }
    hiddenRegion.append(archived);
   }
   showSelection();
  };
  picker.append(summary,gallery);
  iconField.append(el("span","","Значок из набора SETKA"),picker,hiddenRegion,iconNotice);
  form.append(iconField);
  renderOptions();
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
    const chosenCategories=checks.filter(x=>x.ch.checked).map(x=>x.id);
    if(!chosenCategories.length)throw Error("Выберите хотя бы одну категорию для размещения трека");
    if(!title.value.trim())throw Error("Введите название трека");
    let audioPath=t.audio_path,iconPath=t.icon_path||null;
    if(file.files[0])audioPath=await upload(file.files[0]);
    if(icon.files[0])iconPath=await upload(icon.files[0]);
    if(!audioPath)throw Error("Выберите аудиофайл");
    await req("save-track",{id:t.id||undefined,title:title.value.trim(),audio_path:audioPath,
     icon_key:selectedIconKey,icon_path:iconPath,category_ids:chosenCategories,
     sort_order:Number(sort.value)||0,published:published.checked,loop:loop.checked});
    currentTrack=null;await reload();
   }catch(e){msg.textContent="Ошибка: "+e.message}finally{save.disabled=false}
  };
  form.append(save,msg);form.onsubmit=e=>e.preventDefault();section.append(form);
 }
 reload();
}
