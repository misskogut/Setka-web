/* Shared panel geometry only. Never writes pattern configuration or archives. */
(() => {
  'use strict';
  if(window.SetkaPanelResizeV1)return;
  const bindings=new Map();
  const style=document.createElement('style');
  style.textContent=`
    .setka-resize-handle{touch-action:none!important;cursor:ns-resize!important;user-select:none;-webkit-user-select:none;flex-shrink:0}
    .setka-resize-handle:focus-visible{outline:2px solid #fff;outline-offset:-4px;border-radius:16px}
    #st34KeySheet .sk-grip.setka-resize-handle{display:grid;place-items:center;width:100%;height:30px;margin:0;border:0;border-radius:0;background:transparent;padding:0;color:#fff}
    #st34KeySheet .sk-grip.setka-resize-handle::after{content:'';width:38px;height:4px;background:#777;border-radius:3px}
    #st34KeySheet .sk-head{padding-top:0}
    #st34KeySheet.setka-resizable-panel .sk-scroll{flex:1 1 0;min-height:0}
    #st34Layer.setka-resizable-panel>.st-wrap{flex:1 1 0;min-height:0;max-height:none}
    .game-ui:has(#st34KeySheet.setka-panel-compact.open) #st34KeyBackdrop:not(.sk-adjusting){background:rgba(0,0,0,.12)}
    body:has(#st34Layer.setka-panel-compact:not(.hidden)) #st34SheetBackdrop{background:rgba(0,0,0,.08)}
    #st34InfoOverlay:has(.setka-panel-compact){background:rgba(0,0,0,.08);backdrop-filter:none;-webkit-backdrop-filter:none}
    #st34InfoOverlay .st34-sheet.setka-resizable-panel{display:flex;flex-direction:column;overflow:hidden;padding-top:0}
    .setka-info-scroll{flex:1 1 0;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}
    .setka-info-grip{display:grid;place-items:center;width:100%;height:34px;border:0;background:transparent;padding:0}
    .setka-info-grip::after{content:'';width:38px;height:4px;background:#777;border-radius:3px}
  `;
  document.head.append(style);
  function attach(panel,{handle,minHeight=180,maxHeight}={}){
    if(!panel||!handle)return null;
    if(bindings.has(panel))return bindings.get(panel).api;
    const initialHeight=panel.style.height;
    let fraction=null,drag=null,suppressClick=false;
    const maximum=()=>{
      const viewport=window.visualViewport?.height||innerHeight;
      const css=parseFloat(getComputedStyle(panel).maxHeight);
      const configured=typeof maxHeight==='function'?maxHeight():maxHeight;
      return Math.max(1,Math.min(viewport-8,Number.isFinite(configured)?configured:Number.isFinite(css)?css:panel.parentElement.getBoundingClientRect().height-8));
    };
    const limits=()=>{const max=maximum();return {min:Math.min(minHeight,max),max}};
    const report=height=>{
      const {min,max}=limits();
      if(handle.getAttribute('role')==='separator'){
      handle.setAttribute('aria-valuemin',String(Math.round(min)));
      handle.setAttribute('aria-valuemax',String(Math.round(max)));
      handle.setAttribute('aria-valuenow',String(Math.round(height)));
      handle.setAttribute('aria-valuetext',`Высота панели ${Math.round(height)} пикселей`);
      }
      panel.classList.toggle('setka-panel-compact',height<max*.72);
    };
    const setHeight=value=>{
      const {min,max}=limits(),height=Math.max(min,Math.min(max,value));
      fraction=height/max;panel.style.height=`${height}px`;report(height);return height;
    };
    const refresh=()=>{if(fraction!==null)setHeight(fraction*maximum());else if(panel.getBoundingClientRect().height)report(panel.getBoundingClientRect().height)};
    function finish(cancelled=false){
      if(!drag)return;
      const previous=drag;drag=null;
      if(cancelled&&previous.moved){fraction=previous.fraction;panel.style.height=previous.heightStyle;refresh()}
      suppressClick=previous.moved;
      panel.classList.remove('setka-panel-resizing');
      if(handle.hasPointerCapture?.(previous.id))handle.releasePointerCapture(previous.id);
    }
    function down(e){
      if(drag||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
      e.preventDefault();e.stopPropagation();suppressClick=false;
      drag={id:e.pointerId,y:e.clientY,height:panel.getBoundingClientRect().height,heightStyle:panel.style.height,fraction,moved:false};
      try{handle.setPointerCapture(e.pointerId)}catch(_){}
    }
    function move(e){
      if(!drag||e.pointerId!==drag.id)return;
      const dy=e.clientY-drag.y;if(!drag.moved&&Math.abs(dy)<4)return;
      drag.moved=true;e.preventDefault();e.stopPropagation();
      panel.classList.add('setka-panel-resizing');setHeight(drag.height-dy);
    }
    function up(e){if(drag&&e.pointerId===drag.id){e.preventDefault();e.stopPropagation();finish(e.type==='pointercancel')}}
    function lost(e){if(drag&&e.pointerId===drag.id)finish(true)}
    function click(e){if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false}}
    function keyboard(e){
      const {min,max}=limits(),h=panel.getBoundingClientRect().height;
      const value={ArrowUp:h+32,ArrowDown:h-32,Home:min,End:max}[e.key];
      if(value===undefined)return;e.preventDefault();e.stopPropagation();setHeight(value);
    }
    const blur=()=>finish(true);
    handle.classList.add('setka-resize-handle');panel.classList.add('setka-resizable-panel');
    if(handle.id!=='st34SheetGrip'){handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','horizontal')}handle.tabIndex=0;
    handle.setAttribute('aria-description','Потяните вверх или вниз для изменения высоты. Стрелки вверх и вниз также меняют высоту.');
    handle.addEventListener('pointerdown',down);handle.addEventListener('pointermove',move);
    handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);handle.addEventListener('lostpointercapture',lost);
    handle.addEventListener('click',click,true);handle.addEventListener('keydown',keyboard);window.addEventListener('blur',blur);
    const api={refresh,setHeight,destroy(){
      finish(true);bindings.delete(panel);window.removeEventListener('blur',blur);
      for(const [type,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',lost],['keydown',keyboard]])handle.removeEventListener(type,fn);
      handle.removeEventListener('click',click,true);panel.style.height=initialHeight;
    }};
    bindings.set(panel,{api});refresh();return api;
  }
  function update(){for(const [panel,{api}] of bindings){if(!panel.isConnected)api.destroy();else api.refresh()}}
  window.addEventListener('resize',update);window.visualViewport?.addEventListener('resize',update);
  new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
  window.SetkaPanelResizeV1={attach};
})();
