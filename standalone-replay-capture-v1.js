(() => {
  'use strict';
  const C=window.SetkaStandaloneV34,S=window.SetkaApp;if(!C||!S)return;
  const BUILD='v34-research-activity-3',clone=v=>JSON.parse(JSON.stringify(v)),q=s=>document.querySelector(s);
  let timer=0,lastUi='',lastMove=0,observerBusy=false;
  const enabled=()=>{
    const choice=C.getData?.().settings?.replayDetailsEnabled;
    if(typeof choice==='boolean')return choice;
    const account=window.__SETKA_TESTER_CABINET_V40__?.state?.();
    return account?.authenticated===true&&account?.consented===true;
  };
  const viewport=()=>({width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio||1});
  function recordedClip(el){
    const r=el.getBoundingClientRect();let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);
    for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){
      const style=getComputedStyle(p),b=p.getBoundingClientRect();
      if(/^(hidden|clip|scroll|auto)$/.test(style.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right)}
      if(/^(hidden|clip|scroll|auto)$/.test(style.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom)}
    }
    return [left,top,Math.max(0,right-left),Math.max(0,bottom-top)].map(x=>Math.round(x*10)/10);
  }
  function shown(el){if(!el)return false;for(let p=el;p&&p!==document.body;p=p.parentElement){const c=getComputedStyle(p);if(c.display==='none'||c.visibility==='hidden'||c.opacity==='0')return false}const clip=recordedClip(el);return clip[2]>0&&clip[3]>0}
  function box(el){const r=el.getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(x=>Math.round(x*10)/10)}
  function recipe(canvas){
    const tile=canvas.closest('.pattern-tile'),nid=canvas.closest('[data-note-id]')?.dataset.noteId;
    if(nid){const n=C.getData().notes.find(x=>String(x.id)===nid);return n?.replaySnapshot||n?.visualRecipe||n?.state||null}
    if(!tile)return null;const id=tile.dataset.itemId,pid=tile.dataset.patternId,kind=tile.dataset.kind;
    if(kind==='base')return{patternId:pid,patternVersion:S.getPatterns().find(p=>p.id===pid)?.version,config:S.getPatternDefaults(pid),frame:44,preview:true};
    const f=kind==='favorite'?S.getFavorites().find(x=>String(x.id)===id):(C.publicCommunity||[]).find(x=>String(x.id)===id);
    return f?.config?{patternId:f.baseId||f.patternId||f.pattern_id||pid,patternVersion:f.patternVersion||f.pattern_version,config:clone(f.config),frame:f.previewFrame??f.preview_frame??44,preview:true}:null;
  }
  function restricted(){const layer=q("#st34Layer");return !!(layer&&!layer.classList.contains("hidden")&&(layer.querySelector(".st40-form,#st40TesterCabinet,#st40PrivacySettings,input[type=password]")||/пароль|войти|вход|код тестировщика/i.test(layer.querySelector(".st-title")?.textContent||"")))}
  function screen(){
    if(!enabled())return null;
    const layer=q('#st34Layer'),overlay=layer&&!layer.classList.contains('hidden'),st=S.getState(),kind=overlay?'overlay':st.view;
    // Never inspect credentials, account identifiers, recovery forms or typed text.
    if(restricted()){
      const privacy=!!layer?.querySelector('#st40PrivacySettings');
      return{version:1,kind:'restricted',title:privacy?'Настройки приватности':'Защищённый экран кабинета',viewport:viewport(),elements:[],reason:privacy?'privacy-settings-excluded':'credentials-excluded'};
    }
    const roots=overlay?(window.__SETKA_SHEET_LAYOUT_V1__?[q('#libraryScreen.active'),q('.game-ui'),q('#st34SheetBackdrop'),layer,q('#st34Nav')]:[layer,q('#st34Nav')]):st.view==='game'?[q('.game-ui')]:[q('#libraryScreen'),q('#st34Nav')];
    const elements=[];
    for(const root of roots.filter(Boolean)){
      for(const el of [root,...root.querySelectorAll('*')]){
        if(elements.length>=120)break;
        if(!shown(el)||el.closest('#stReplaySettings,[id^=st40],.st40-form,#isolated-test-tools')||el.closest('svg')&&el.tagName.toLowerCase()!=='svg'||el.id==='patternCanvas')continue;
        const style=getComputedStyle(el),r=box(el),clip=recordedClip(el),item={rect:r,...(clip.some((value,i)=>value!==r[i])?{clip}:{}),...(['favoriteButton','modeLabel'].includes(el.id)?{control:el.id}:{})};
        if(el.tagName.toLowerCase()==='svg'){
          const shapes=[...el.querySelectorAll('path,rect,circle,line,polyline,polygon,ellipse')].slice(0,40).map(n=>{
            const attrs={};for(const k of ['d','x','y','width','height','rx','ry','cx','cy','r','x1','y1','x2','y2','points']){const v=n.getAttribute(k);if(v&&/^[-\d.,\sMmLlHhVvCcSsQqTtAaZzEe+]+$/.test(v))attrs[k]=v}
            const c=getComputedStyle(n);return{tag:n.tagName.toLowerCase(),attrs,fill:c.fill,stroke:c.stroke,strokeWidth:parseFloat(c.strokeWidth)||0};
          });elements.push({...item,svg:{viewBox:el.getAttribute('viewBox')||`0 0 ${r[2]} ${r[3]}`,shapes}});continue;
        }
        if(el.tagName==='CANVAS'){const visual=recipe(el);if(visual)elements.push({...item,visual});continue}
        const privateField=el.matches('input,textarea,select');
        const texts=privateField?[]:[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim());
        const text=texts.join(' ').slice(0,350);
        const background=style.backgroundColor,border=style.borderTopWidth;
        if(!text&&background==='rgba(0, 0, 0, 0)'&&parseFloat(border)===0)continue;
        elements.push({...item,text,color:style.color,background,border:parseFloat(border)||0,borderColor:style.borderTopColor,
          radius:parseFloat(style.borderTopLeftRadius)||0,fontSize:parseFloat(style.fontSize)||12,fontWeight:style.fontWeight,
          align:style.textAlign,padding:[parseFloat(style.paddingLeft)||0,parseFloat(style.paddingTop)||0],opacity:Number(style.opacity)||1});
      }
    }
    return{version:1,kind,title:overlay?layer.querySelector('.st-title')?.textContent:q('#libraryTitle')?.textContent,kicker:overlay?layer.querySelector('.st-kicker')?.textContent:null,
      viewport:viewport(),elements,truncated:elements.length>=120,inputsExcluded:true};
  }
  function capture(reason='screen-change'){
    if(!enabled()||document.hidden)return;
    const ui=screen(),key=JSON.stringify(ui);if(key===lastUi)return;lastUi=key;
    const state={...C.stateSnapshot(),viewport:viewport(),ui,rendererVersion:'app-v7-3aa42b2'};
    C.recordEvent('ui_snapshot',{reason,state},true);
    const d=C.getData(),snapshots=d.events.filter(e=>e.type==='ui_snapshot');
    // Bounded local screen history. Trimming is explicit, never claims full coverage.
    if(snapshots.length>80){const old=new Set(snapshots.slice(0,-80).map(e=>e.id));d.events=d.events.filter(e=>!old.has(e.id));d.settings.replayTrimmedScreens=(d.settings.replayTrimmedScreens||0)+old.size;C.save()}
  }
  function schedule(reason){clearTimeout(timer);timer=setTimeout(()=>capture(reason),100)}
  window.addEventListener('setka:standalone-event',e=>{if(e.detail?.type==='screen_pointer_up'){schedule('touch');return}if(['ui_snapshot','screen_pointer_move','screen_pointer_down','ui_tap','replay_consent'].includes(e.detail?.type))return;schedule(e.detail?.type)});
  window.addEventListener('setka:pattern-special',e=>C.recordEvent('pattern_state',{reason:e.detail?.action||'special',state:C.stateSnapshot()}));
  // The production deep-telemetry module already records each pointer once.
  if(!window.__SETKA_V34_DEEP_TELEMETRY__){
    document.addEventListener('pointerdown',e=>pointer('screen_pointer_down',e),{passive:true});
    document.addEventListener('pointerup',e=>pointer('screen_pointer_up',e),{passive:true});
    document.addEventListener('pointercancel',e=>pointer('screen_pointer_cancel',e),{passive:true});
    document.addEventListener('pointermove',e=>{if(!e.buttons||Date.now()-lastMove<200)return;lastMove=Date.now();pointer('screen_pointer_move',e)},{passive:true});
  }
  function pointer(type,e){if(!enabled()||screen()?.kind==='restricted'||e.target.closest('input,textarea,select,#stReplaySettings'))return;C.recordEvent(type,{replayCapture:true,nx:e.clientX/innerWidth,ny:e.clientY/innerHeight,pointerType:e.pointerType,fingers:1,viewport:viewport()},true);if(type==='screen_pointer_up')schedule('touch')}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule('visible')});
  window.addEventListener('resize',()=>schedule('resize'));
  window.addEventListener('setka:sheet-settled',()=>schedule('sheet-settled'));
  window.visualViewport?.addEventListener('resize',()=>schedule('visible-viewport'));
  window.__SETKA_REPLAY_CAPTURE_V1__={screen,capture,enabled,restricted,build:BUILD};
  window.addEventListener('setka:v40-account',()=>{lastUi='';schedule('research-consent')});
})();
