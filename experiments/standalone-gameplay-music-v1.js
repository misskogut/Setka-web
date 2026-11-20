(()=>{
"use strict";
// Experimental SETKA + ALMA only. Re-use the same SetkaMusicV1 DOM and mixer.
// Never navigate out of gameplay or create a second audio player.
const game=document.getElementById("gameScreen");
const button=document.getElementById("setkaGameMusicButton");
const sheet=document.getElementById("setkaGameMusicSheet");
const grip=document.getElementById("setkaGameMusicGrip");
const content=document.getElementById("setkaGameMusicContent");
const loading=document.getElementById("setkaGameMusicLoading");
/* The existing audio-reactive module creates a second musical note
   (#st34AudioButton) in the same top-left corner. Keep its native
   microphone/audio-reactivity callbacks intact, but move that one
   button INTO the music sheet header. Only the quick-music note
   remains at the top left of the gameplay. */
const reactiveButton=document.getElementById("st34AudioButton");
const sheetHeader=sheet?.querySelector(".sg-music-header");
if(reactiveButton&&sheetHeader){
 const reactiveSlot=document.createElement("div");
 reactiveSlot.className="sg-music-reactive-slot";
 const help=document.createElement("span");
 help.textContent="Аудиореакция";
 help.className="sg-music-reactive-label";
 reactiveSlot.append(help);
 reactiveSlot.append(reactiveButton);
 sheetHeader.append(reactiveSlot);
 // The relocated original control uses a microphone pictogram, instead of a
 // second note, while the original click handlers and live mode dots persist.
 const svg=reactiveButton.querySelector("svg");
 if(svg){
   svg.setAttribute("viewBox","0 0 24 24");
   svg.innerHTML='<rect x="9" y="2.8" width="6" height="12.2" rx="3"/><path d="M5.8 10.6v1.3a6.2 6.2 0 0 0 12.4 0v-1.3M12 18.3v3.1M8.4 21.4h7.2"/>';
 }
}
const note=document.getElementById("st34Note");
const key=document.getElementById("instructionsButton");
const keySheet=document.getElementById("st34KeySheet");
const noteLayer=document.getElementById("st34Layer");
if(!game||!button||!sheet||!grip||!content)return;
const gameActive=()=>game.classList.contains("active");
const music=()=>window.SetkaMusicV1;
let open=false,closingTimer=0,drag=null,initializedHeight=false;
const SLIDE_MS=320;
const clamp=(n,a,b)=>Math.min(Math.max(n,a),b);
function bounds(){
 const height=game.getBoundingClientRect().height||window.innerHeight;
 const max=Math.max(250,Math.floor(height-190));
 return {min:Math.min(245,max),max};
}
function setHeight(px){
 const {min,max}=bounds();
 sheet.style.setProperty("--setka-music-sheet-height",Math.round(clamp(px,min,max))+"px");
}
function getHeight(){
 return sheet.getBoundingClientRect().height||Math.min(510,window.innerHeight*.56);
}
function setExpanded(value){
 button.setAttribute("aria-expanded",String(value));
 sheet.setAttribute("aria-hidden",String(!value));
 document.body.classList.toggle("setka-game-music-open",value&&gameActive());
}
function cancelClosing(){
 if(closingTimer){clearTimeout(closingTimer);closingTimer=0}
}
function unmount(){
 cancelClosing();
 if(open)return;
 music()?.closeInGame?.();
}
function closeMusic(immediate=false){
 if(!open&&(!music()?.state?.().gameOpen))return;
 open=false;
 setExpanded(false);
 sheet.classList.remove("open");
 if(immediate){unmount();return}
 cancelClosing();
 closingTimer=setTimeout(()=>{closingTimer=0;if(!open)music()?.closeInGame?.()},SLIDE_MS);
}
function mountMusic(){
 if(!gameActive()||!open)return;
 const api=music();
 if(!api?.openInGame?.(content)){
   loading.hidden=false;
   loading.textContent="Музыкальный каталог загружается…";
   return;
 }
 loading.hidden=true;
 if(!initializedHeight){
   initializedHeight=true;
   setHeight(Math.min(510,(game.getBoundingClientRect().height||window.innerHeight)*.57));
 }
}
function openMusic(){
 if(!gameActive())return;
 // The original key and note sheets are mutually exclusive with this panel.
 if(keySheet?.classList.contains("open"))window.SetkaPatternKeyV1?.close?.();
 if(noteLayer&&!noteLayer.classList.contains("hidden")){
   window.SetkaStandaloneV34?.hideLayer?.();
 }
 cancelClosing();
 open=true;
 setExpanded(true);
 mountMusic();
 // Browser needs a committed hidden style for a true bottom slide.
 requestAnimationFrame(()=>{if(open&&gameActive())sheet.classList.add("open")});
}
button.addEventListener("click",event=>{
 event.preventDefault();
 event.stopPropagation();
 if(!gameActive())return;
 if(open)closeMusic();else openMusic();
});
window.addEventListener("setka:music-ready",()=>{
 if(open&&gameActive())mountMusic();
});
window.addEventListener("click",event=>{
 if(!open||!gameActive())return;
 if(event.target?.closest?.("#st34Note,#instructionsButton")){
   closeMusic(true);
 }
},true);
function syncView(){
 if(!gameActive())closeMusic(true);
 else if(open&&(keySheet?.classList.contains("open")||
          (noteLayer&&!noteLayer.classList.contains("hidden"))))closeMusic(true);
}
new MutationObserver(syncView).observe(game,{attributes:true,attributeFilter:["class"]});
if(keySheet)new MutationObserver(syncView).observe(keySheet,{attributes:true,attributeFilter:["class"]});
if(noteLayer)new MutationObserver(syncView).observe(noteLayer,{attributes:true,attributeFilter:["class"]});
window.addEventListener("setka:view",syncView);
window.addEventListener("pagehide",()=>closeMusic(true));
window.addEventListener("resize",()=>{
 if(initializedHeight)setHeight(getHeight());
},{passive:true});
// Identical dock-sheet grip behavior: drag upward to expand, down to collapse
// height. This applies ONLY to the grip, not to category scrolling or orbit
// gestures; these keep their original pointer handlers.
grip.addEventListener("pointerdown",event=>{
 if(!open||(event.pointerType==="mouse"&&event.button!==0))return;
 drag={id:event.pointerId,y:event.clientY,height:getHeight()};
 try{grip.setPointerCapture(event.pointerId)}catch(_){}
 event.preventDefault();event.stopPropagation();
});
grip.addEventListener("pointermove",event=>{
 if(!drag||event.pointerId!==drag.id)return;
 setHeight(drag.height+drag.y-event.clientY);
 event.preventDefault();event.stopPropagation();
});
function endDrag(event){
 if(!drag||event.pointerId!==drag.id)return;
 drag=null;
 event.stopPropagation();
}
grip.addEventListener("pointerup",endDrag);
grip.addEventListener("pointercancel",endDrag);
grip.addEventListener("lostpointercapture",endDrag);
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&open){event.preventDefault();closeMusic()}
});
setExpanded(false);
window.SETKA_GAME_MUSIC_LAB={
 open:openMusic,close:closeMusic,
 status:()=>({game:gameActive(),open,musicLoaded:!!music(),sharedPlayer:!!music()?.state?.().gameOpen,height:getHeight()})
};
})();