// SETKA Music · four independent front-end orders, touch/pointer friendly.
import {iconSvg} from "../standalone-music-icons-v1.mjs?v=2";
import {assetIconMask} from "../standalone-music-ui-icons-v2.mjs?v=4-exact-approved-vector-20261106";

const TABS=[["hand","Природные"],["eye","Открытый глаз"],["sleep","Закрытый глаз"],["8d","8D"]];
let activeCategory="hand";
const drafts=new Map();
const text=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!=null)e.textContent=value;return e};
const orderedTracks=(model,cat)=>{
  const items=model.tracks.filter(t=>Array.isArray(t.category_ids)&&t.category_ids.includes(cat));
  const saved=(model.orders||[]).find(o=>o.category_id===cat);
  const priorities=[...(saved?.track_ids||[]),...items.map(t=>t.id)];
  const rank=new Map(priorities.map((id,i)=>[id,i]));
  return items.sort((a,b)=>(rank.get(a.id)??1e9)-(rank.get(b.id)??1e9));
};

export function mountMusicOrder(root,model,req,reload){
 root.replaceChildren();
 root.append(text("h2","","Порядок музыкальных значков"));
 root.append(text("p","muted","Расположение иконок на фронте SETKA. В каждой из четырёх категорий свой порядок. Перемещайте миниатюры пальцем или стрелками, затем сохраните."));
 const tabs=text("div","sm-order-tabs");
 tabs.setAttribute("role","tablist");
 const body=text("div","sm-order-body");
 const message=text("p","sm-order-message");
 message.setAttribute("role","status");
 root.append(tabs,body,message);
 let busy=false;
 function draw(){
  tabs.replaceChildren();body.replaceChildren();
  for(const [id,title] of TABS){
   const tab=text("button","sm-order-tab"+(activeCategory===id?" active":""),title);
   tab.type="button";tab.setAttribute("role","tab");tab.setAttribute("aria-selected",activeCategory===id?"true":"false");
   tab.onclick=()=>{if(!busy){activeCategory=id;message.textContent="";draw()}};
   tabs.append(tab);
  }
  const cat=activeCategory;
  const all=orderedTracks(model,cat);
  const byId=new Map(all.map(t=>[t.id,t]));
  const server=(model.orders||[]).find(o=>o.category_id===cat);
  const source=drafts.get(cat)?.ids||all.map(t=>t.id);
  const ids=[...new Set([...source.filter(id=>byId.has(id)),...all.map(t=>t.id)])];
  const draft=drafts.get(cat)||{ids,dirty:false};
  draft.ids=ids;drafts.set(cat,draft);
  const top=text("div","sm-order-topline");
  top.append(text("span","",all.length+" иконок · порядок только для этой вкладки"));
  const countPublished=all.filter(t=>t.published).length;
  top.append(text("span","muted",countPublished+" опубликовано"));
  body.append(top);
  if(!all.length){
   const empty=text("div","sm-order-empty","Пока нет треков. Добавьте первый ниже, выберите эту категорию — миниатюра появится здесь.");
   body.append(empty);
  }else{
   const gallery=text("div","sm-order-gallery");
   gallery.setAttribute("aria-label","Переставьте иконки пальцем");
   for(const id of ids){
    const t=byId.get(id),card=text("div","sm-order-card"+(t.published?"":" unpublished"));
    card.dataset.orderId=id;
    const thumb=text("span","sm-order-thumb");
    thumb.innerHTML=assetIconMask(t.icon_path)||iconSvg(t.icon_key||"music");
    const name=text("span","sm-order-name",t.title);
    const controls=text("span","sm-order-arrows");
    for(const [direction,symbol] of [[-1,"‹"],[1,"›"]]){
     const b=text("button","sm-order-step",symbol);b.type="button";
     b.setAttribute("aria-label",(direction<0?"Сдвинуть раньше: ":"Сдвинуть позже: ")+t.title);
     b.onclick=e=>{e.stopPropagation();if(busy)return;const at=draft.ids.indexOf(id),to=at+direction;
      if(to<0||to>=draft.ids.length)return;
      draft.ids.splice(at,1);draft.ids.splice(to,0,id);draft.dirty=true;draw();
     };
     controls.append(b);
    }
    card.append(thumb,name,controls);gallery.append(card);
   }
   let pointer=null;
   gallery.addEventListener("pointerdown",e=>{
    if(busy||e.target.closest("button"))return;
    const card=e.target.closest(".sm-order-card");if(!card||!gallery.contains(card))return;
    pointer={id:e.pointerId,card,originX:e.clientX,originY:e.clientY,moved:false};
    card.classList.add("dragging");
    card.setPointerCapture(e.pointerId);
    e.preventDefault();
   });
   gallery.addEventListener("pointermove",e=>{
    if(!pointer||pointer.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-pointer.originX,e.clientY-pointer.originY)>5)pointer.moved=true;
    if(!pointer.moved)return;
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".sm-order-card");
    if(!target||target===pointer.card||target.parentElement!==gallery)return;
    const bounds=target.getBoundingClientRect();
    const midpoint=bounds.left+bounds.width/2;
    const before=e.clientX<midpoint;
    gallery.insertBefore(pointer.card,before?target:target.nextSibling);
    const next=[...gallery.children].map(el=>el.dataset.orderId);
    if(next.some((id,i)=>id!==draft.ids[i])){draft.ids=next;draft.dirty=true}
   });
   const finish=e=>{
    if(!pointer||e.pointerId!==pointer.id)return;
    pointer.card.classList.remove("dragging");
    try{pointer.card.releasePointerCapture(e.pointerId)}catch(_){}
    pointer=null;
    if(draft.dirty)draw();
   };
   gallery.addEventListener("pointerup",finish);
   gallery.addEventListener("pointercancel",finish);
   body.append(gallery);
  }
  const actions=text("div","sm-order-actions");
  const save=text("button","sm-order-save","Сохранить порядок");save.type="button";
  save.disabled=busy||!draft.dirty||!all.length;
  save.onclick=async()=>{
   if(busy||!draft.dirty)return;busy=true;save.disabled=true;message.textContent="Сохраняем порядок на сервере…";
   try{
    await req("save-order",{category_id:cat,track_ids:draft.ids,expected_revision:server?.revision||0});
    drafts.delete(cat);message.textContent="Порядок сохранён. Эти позиции применены на фронте.";
    await reload();
   }catch(e){message.textContent="Не удалось сохранить: "+e.message+" · обновите список и повторите.";busy=false;draw()}
  };
  const discard=text("button","sm-order-discard","Отменить");discard.type="button";discard.disabled=busy||!draft.dirty;
  discard.onclick=()=>{drafts.delete(cat);message.textContent="Черновик порядка отменён.";draw()};
  actions.append(save,discard);body.append(actions);
 }
 draw();
}
