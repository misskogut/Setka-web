// SETKA Music · one global track-icon order, independent of category filters.
import {iconSvg} from "../standalone-music-icons-v1.mjs?v=5-vintage-final-20261107";
import {assetIconMask} from "../standalone-music-ui-icons-v2.mjs?v=4-exact-approved-vector-20261106";

const element=(tag,cls,value)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined)node.textContent=value;
 return node;
};

export function mountMusicOrder(root,model,req,reload){
 root.replaceChildren();
 root.append(element("h2","","Общий порядок музыкальных значков"));
 root.append(element("p","muted","Одна последовательность для всех треков. Когда на фронте все фильтры выключены, иконки идут в этом порядке. При выборе категории показываются только её треки, но в том же порядке. Перетаскивайте пальцем и сохраните."));
 const top=element("div","sm-order-topline");
 const all=Array.isArray(model.tracks)?model.tracks:[];
 const byId=new Map(all.map(t=>[t.id,t]));
 const stored=model.global_order||{};
 const order=[...new Set([...(stored.track_ids||[]).filter(id=>byId.has(id)),...all.map(t=>t.id)])];
 const draft={ids:order,dirty:false};
 const categoryLabels=new Map((model.categories||[]).map(c=>[c.id,c.title]));
 top.append(element("span","",all.length+" иконок · общий порядок"));
 top.append(element("span","muted",all.filter(t=>t.published).length+" опубликовано"));
 const gallery=element("div","sm-order-gallery");
 gallery.setAttribute("aria-label","Общий порядок: перемещайте иконки пальцем");
 const actions=element("div","sm-order-actions");
 const save=element("button","sm-order-save","Сохранить порядок");
 save.type="button";
 const reset=element("button","sm-order-discard","Отменить");
 reset.type="button";
 const message=element("p","sm-order-message");
 message.setAttribute("role","status");
 let saving=false;
 root.append(top,gallery,actions,message);
 actions.append(save,reset);
 const render=()=>{
  gallery.replaceChildren();
  for(const id of draft.ids){
   const track=byId.get(id);if(!track)continue;
   const card=element("div","sm-order-card"+(track.published?"":" unpublished"));
   card.dataset.orderId=id;
   const thumb=element("span","sm-order-thumb");
   thumb.innerHTML=assetIconMask(track.icon_path)||iconSvg(track.icon_key||"music");
   const name=element("span","sm-order-name",track.title);
   const categoryText=(track.category_ids||[]).map(x=>categoryLabels.get(x)).filter(Boolean).join(" · ")||"Без категории";
   const category=element("span","sm-order-category-label",categoryText);
   const steps=element("span","sm-order-arrows");
   for(const [direction,symbol] of [[-1,"‹"],[1,"›"]]){
    const button=element("button","sm-order-step",symbol);
    button.type="button";
    button.setAttribute("aria-label",(direction<0?"Переместить раньше: ":"Переместить позже: ")+track.title);
    button.onclick=e=>{
     e.stopPropagation();
     if(saving)return;
     const from=draft.ids.indexOf(id),to=from+direction;
     if(to<0||to>=draft.ids.length)return;
     draft.ids.splice(from,1);draft.ids.splice(to,0,id);
     draft.dirty=true;render();
    };
    steps.append(button);
   }
   card.append(thumb,name,category,steps);
   gallery.append(card);
  }
  save.disabled=saving||!draft.dirty||!draft.ids.length;
  reset.disabled=saving||!draft.dirty;
 };
 if(!all.length){
  gallery.append(element("div","sm-order-empty","Треков пока нет. Добавьте первый ниже — его иконка появится здесь."));
  save.disabled=true;reset.disabled=true;
 }else{
  let gesture=null;
  gallery.addEventListener("pointerdown",event=>{
   if(saving||event.target.closest("button"))return;
   const card=event.target.closest(".sm-order-card");
   if(!card||!gallery.contains(card))return;
   gesture={pointerId:event.pointerId,card,startX:event.clientX,startY:event.clientY,moved:false};
   card.classList.add("dragging");
   gallery.setPointerCapture(event.pointerId);
   event.preventDefault();
  });
  gallery.addEventListener("pointermove",event=>{
   if(!gesture||event.pointerId!==gesture.pointerId)return;
   if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>4)gesture.moved=true;
   if(!gesture.moved)return;
   const target=document.elementFromPoint(event.clientX,event.clientY)?.closest(".sm-order-card");
   if(!target||target===gesture.card||target.parentElement!==gallery)return;
   const r=target.getBoundingClientRect();
   const midpointX=r.left+r.width/2;
   const insertBefore=event.clientY>r.bottom?false:event.clientX<midpointX;
   gallery.insertBefore(gesture.card,insertBefore?target:target.nextSibling);
   const next=[...gallery.children].map(node=>node.dataset.orderId);
   if(next.some((id,i)=>id!==draft.ids[i])){
    draft.ids=next;draft.dirty=true;save.disabled=false;reset.disabled=false;
   }
  });
  const finish=event=>{
   if(!gesture||event.pointerId!==gesture.pointerId)return;
   gesture.card.classList.remove("dragging");
   try{gallery.releasePointerCapture(event.pointerId)}catch(_){}
   gesture=null;
   if(draft.dirty)render();
  };
  gallery.addEventListener("pointerup",finish);
  gallery.addEventListener("pointercancel",finish);
  render();
 }
 save.onclick=async()=>{
  if(saving||!draft.dirty)return;
  saving=true;render();message.textContent="Сохраняем единый порядок на сервере…";
  try{
   await req("save-global-order",{track_ids:draft.ids,expected_revision:stored.revision||1});
   message.textContent="Общий порядок сохранён и применён на фронте.";
   await reload();
  }catch(error){
   saving=false;render();
   message.textContent="Не удалось сохранить: "+error.message+". Обновите музыкальный список и повторите.";
  }
 };
 reset.onclick=()=>{
  if(saving)return;
  draft.ids=[...order];draft.dirty=false;message.textContent="Изменения порядка отменены.";render();
 };
}
