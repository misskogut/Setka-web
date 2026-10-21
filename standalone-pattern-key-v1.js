(()=>{
"use strict";
const App=window.SetkaApp,game=document.getElementById("gameScreen"),key=document.getElementById("instructionsButton");
if(!App||!game||!key||!App.setConfigPatch)return;
// Control definitions live only in the shared pattern registry.
const registry=window.SetkaPatternRegistryV1;
const maps=new Proxy({}, {get(_target,patternId){return registry?.controls?.(patternId)||[];}});
const style=document.createElement("style");
style.textContent="\n#st34KeyBackdrop{position:absolute;inset:0;background:rgba(0,0,0,.48);display:none;z-index:950;pointer-events:auto}\n#st34KeyBackdrop.open{display:block}\n#st34KeyBackdrop{transition:background-color .12s ease}\n#st34KeyBackdrop.sk-adjusting{background:rgba(0,0,0,0)}\n#st34KeySheet{position:absolute;left:0;right:0;bottom:0;z-index:951;height:min(82%,720px);background:#101010;border:1px solid #424242;border-bottom:none;border-radius:25px 25px 0 0;display:none;flex-direction:column;pointer-events:auto;color:#fff;font-family:-apple-system,BlinkMacSystemFont,\"SF Pro Display\",Arial,sans-serif;box-shadow:0 -12px 45px #0008}\n#st34KeySheet.open{display:flex}\n#st34KeySheet{transition:background-color .12s ease,border-color .12s ease,box-shadow .12s ease}\n#st34KeySheet.sk-adjusting{background:rgba(16,16,16,.015);border-color:transparent;box-shadow:none}\n#st34KeySheet .sk-head,#st34KeySheet .sk-actions,#st34KeySheet .sk-section,#st34KeySheet .sk-setting{transition:opacity .12s ease}\n#st34KeySheet.sk-adjusting .sk-head,#st34KeySheet.sk-adjusting .sk-actions,#st34KeySheet.sk-adjusting .sk-section{opacity:.015;pointer-events:none}\n#st34KeySheet.sk-adjusting .sk-setting{opacity:.015;pointer-events:none}\n#st34KeySheet.sk-adjusting .sk-setting.sk-active{opacity:.32;pointer-events:auto}\n#st34KeySheet *{box-sizing:border-box}\n#st34KeySheet button,#st34KeySheet input{font:inherit}\n#st34KeySheet .sk-head{padding:12px 19px 15px;border-bottom:1px solid #2a2a2a;flex:0 0 auto}\n#st34KeySheet .sk-grip{width:37px;height:4px;background:#555;border-radius:3px;margin:0 auto 16px}\n#st34KeySheet .sk-row{display:flex;align-items:center;gap:12px;justify-content:space-between}\n#st34KeySheet .sk-kicker{font-size:9px;letter-spacing:1.8px;color:#888;margin-bottom:6px}\n#st34KeySheet .sk-title{font-size:21px;font-weight:650;line-height:1.2}\n#st34KeySheet .sk-description{font-size:12px;line-height:1.5;color:#aaa;margin:10px 0 0}\n#st34KeySheet .sk-close{width:35px;height:35px;border:1px solid #444;border-radius:50%;background:transparent;color:#fff;font-size:20px;display:grid;place-items:center;padding:0;flex-shrink:0}\n#st34KeySheet .sk-scroll{overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:0;padding:10px 19px 20px}\n#st34KeySheet .sk-section{font-size:10px;font-weight:650;letter-spacing:1.2px;color:#ccc;margin:17px 0 9px}\n#st34KeySheet .sk-setting{border-bottom:1px solid #2b2b2b;padding:10px 0}\n#st34KeySheet .sk-setting-row{display:flex;align-items:center;gap:9px}\n#st34KeySheet .sk-gesture{min-width:91px;flex:0 0 91px;border:1px solid #333;background:#242424;border-radius:8px;text-align:center;padding:7px 5px;font-size:10px;white-space:normal;line-height:1.3;color:#ddd}\n#st34KeySheet .sk-label{flex:1;min-width:0;font-size:12px;color:#e5e5e5}\n#st34KeySheet .sk-value{font-size:11px;color:#c8c8c8;min-width:36px;text-align:right;font-variant-numeric:tabular-nums}\n#st34KeySheet .sk-range{width:100%;margin:12px 0 3px;accent-color:#fff;touch-action:auto}\n#st34KeySheet .sk-actions{display:flex;gap:10px;border-top:1px solid #292929;padding:12px 18px max(18px,env(safe-area-inset-bottom,18px))}\n#st34KeySheet .sk-action{flex:1;border:1px solid #555;border-radius:14px;min-height:44px;background:transparent;color:#fff;font-size:12px;font-weight:600}\n#st34KeySheet .sk-action.primary{background:#fff;color:#000;border-color:#fff}\n#st34KeySheet .sk-close:focus-visible,#st34KeySheet button:focus-visible{outline:2px solid #fff;outline-offset:3px}\n";
document.head.appendChild(style);
const backdrop=document.createElement("div");backdrop.id="st34KeyBackdrop";
const sheet=document.createElement("section");sheet.id="st34KeySheet";
sheet.setAttribute("aria-label","Управление паттерном");
sheet.innerHTML='<div class="sk-head"><div class="sk-grip"></div><div class="sk-row"><div><div class="sk-kicker">SETKA · КЛЮЧ УПРАВЛЕНИЯ</div><div class="sk-title">Управление паттерном</div></div><button class="sk-close" type="button" aria-label="Закрыть настройки">×</button></div><p class="sk-description">Каждый параметр можно менять бегунком. Подпись слева показывает дополнительный жест на самом паттерне, если он есть.</p></div><div class="sk-scroll"></div><div class="sk-actions"><button class="sk-action" type="button" data-action="reset">Сбросить</button><button class="sk-action primary" type="button" data-action="close">Готово</button></div>';
game.querySelector(".game-ui")?.append(backdrop,sheet);
const close=()=>{endSliderDrag();sheet.classList.remove("open");backdrop.classList.remove("open");key.setAttribute("aria-expanded","false")};
const open=()=>{if(sheet.classList.contains("open"))return close();rebuild();sheet.classList.add("open");backdrop.classList.add("open");key.setAttribute("aria-expanded","true")};
let currentPattern=null,entries=[],activePointerId=null;
function endSliderDrag(){
 activePointerId=null;sheet.classList.remove("sk-adjusting");backdrop.classList.remove("sk-adjusting");
 sheet.querySelector(".sk-setting.sk-active")?.classList.remove("sk-active");
}
function finishSliderDrag(e){if(activePointerId!==null&&(!e||e.pointerId===activePointerId))endSliderDrag()}
window.addEventListener("pointerup",finishSliderDrag,true);
window.addEventListener("pointercancel",finishSliderDrag,true);
window.addEventListener("blur",endSliderDrag);
document.addEventListener("visibilitychange",()=>{if(document.hidden)endSliderDrag()});
const format=(n,s)=>Number.isInteger(n)?String(n):Number(n).toFixed(s<.01?3:s<.1?2:1);
function rebuild(){
 endSliderDrag();
 const state=App.getState?.()||{},id=state.patternId;
 currentPattern=id;
 const list=sheet.querySelector(".sk-scroll");list.replaceChildren();entries=[];
 let group=null;
 for(const [label,k,min,max,step,gesture,fingers] of maps[id]||[]){
   // The final field is the number of fingers, never an animation coefficient.
   const kind=fingers===0?"slider":gesture==="Тап"?"tap":fingers===2?"two":"one";
   if(kind!==group){
     const head=document.createElement("div");head.className="sk-section";
     head.textContent=kind==="slider"?"ТОЛЬКО БЕГУНКОМ":kind==="tap"?"КАСАНИЕ":kind==="two"?"СВАЙП · 2 ПАЛЬЦАМИ":"СВАЙП · 1 ПАЛЬЦЕМ";
     list.append(head);group=kind;
   }
   const box=document.createElement("div");box.className="sk-setting";
   const line=document.createElement("div");line.className="sk-setting-row";
   const badge=document.createElement("span");badge.className="sk-gesture";badge.textContent=kind==="slider"?"Бегунок":kind==="tap"?"Тап по паттерну":gesture==="Пинч"?"Свести / развести":gesture;
   const title=document.createElement("label");title.className="sk-label";title.textContent=label;
   const val=document.createElement("output");val.className="sk-value";
   const input=document.createElement("input");input.type="range";input.className="sk-range";
   input.min=min;input.max=max;input.step=step;input.value=state.config?.[k]??min;
   input.id="sk-live-"+k;title.htmlFor=input.id;input.setAttribute("aria-label",label);
   input.addEventListener("pointerdown",e=>{
     if(activePointerId!==null||(e.pointerType==="mouse"&&e.button!==0))return;
     activePointerId=e.pointerId;box.classList.add("sk-active");
     sheet.classList.add("sk-adjusting");backdrop.classList.add("sk-adjusting");
   });
   input.addEventListener("input",()=>{const result=App.setConfigPatch({[k]:Number(input.value)});val.textContent=format(result[k],step)});
   line.append(badge,title,val);box.append(line,input);list.append(box);
   entries.push({k,step,input,val});
 }
 sync();
}
function sync(){
 const state=App.getState?.()||{},c=state.config||{};
 if(currentPattern!==state.patternId){if(sheet.classList.contains("open"))rebuild();return}
 for(const {k,step,input,val} of entries){
   if(Number.isFinite(c[k])){if(document.activeElement!==input)input.value=c[k];val.textContent=format(c[k],step)}
 }
}
key.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();open()},{capture:true});
backdrop.addEventListener("click",close);
sheet.querySelector(".sk-close").addEventListener("click",close);
sheet.querySelector('[data-action="close"]').addEventListener("click",close);
sheet.querySelector('[data-action="reset"]').addEventListener("click",()=>{
 const id=App.getState?.()?.patternId,initial=App.getPatternDefaults?.(id);
 if(initial)App.setConfigPatch(initial);
 sync();
});
window.addEventListener("setka:view",e=>{if(e.detail?.view!=="game")close()});
window.addEventListener("setka:gesture-move",sync);
window.addEventListener("setka:color",sync);
window.addEventListener("setka:pattern-open",()=>{if(sheet.classList.contains("open"))rebuild()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheet.classList.contains("open")){e.preventDefault();close()}});
window.SetkaPatternKeyV1={open,close,status:()=>({open:sheet.classList.contains("open"),patternId:currentPattern,controls:entries.length})};
})();