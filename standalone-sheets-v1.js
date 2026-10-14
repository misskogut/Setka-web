(() => {
  'use strict';
  const C=window.SetkaStandaloneV34,S=window.SetkaApp;
  const layer=document.getElementById('st34Layer'),nav=document.getElementById('st34Nav'),game=document.getElementById('gameScreen');
  const wrap=layer?.querySelector('.st-wrap');
  if(!C||!S||!layer||!nav||!game||!wrap||window.__SETKA_SHEET_LAYOUT_V1__)return;
  const tabs=[
    {key:'today',label:'Сегодня',icon:'<circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path>',open:()=>C.showToday()},
    {key:'notes',label:'Заметки',icon:'<path d="M12 5v14M5 12h14"></path>',open:()=>C.showNotes()},
    {key:'pulse',label:'Пульс',icon:'<path d="M20 5.8a5 5 0 0 0-8 1 5 5 0 0 0-8-1C1 9.6 6 14.9 12 19c6-4.1 11-9.4 8-13.2Z"></path>',open:()=>C.showPhysio()},
    {key:'symptoms',label:'Состояния',icon:'<path d="m12 3 8 9-8 9-8-9Z"></path>',open:()=>C.showSymptoms()},
    {key:'me',label:'Я',icon:'<circle cx="12" cy="8" r="4"></circle><path d="M5 21v-2a7 7 0 0 1 14 0v2"></path>',open:()=>C.showMe()}
  ];
  const pageByTitle={'Сегодня':'today','Заметки':'notes','Записать мысль':'notes','Пульс':'pulse','Состояния':'symptoms','Симптомы':'symptoms','Я':'me'};
  function panelPage(screenTitle=title(),kicker=wrap.querySelector('.st-kicker')?.textContent){return pageByTitle[screenTitle]||(['ПЕРЕД СЕССИЕЙ','ОЦЕНКА ПОСЛЕ','ГОТОВО'].includes(kicker)?'today':null)}
  const visible=()=>!layer.classList.contains('hidden');
  const title=()=>wrap.querySelector('.st-title')?.textContent?.trim()||'';
  let page=pageByTitle[title()]||'today',contentPage=page,frame=0,savedRoute=null,fromDock=false;
  const drafts=new Map(),savedComposers=new WeakSet();
  document.body.classList.add('setka-sheet-layout');
  nav.setAttribute('role','navigation');nav.setAttribute('aria-label','Основные разделы SETKA');
  nav.innerHTML=tabs.map(t=>`<button type="button" data-p="${t.key}" aria-label="${t.label}" aria-controls="st34Layer" aria-expanded="false"><span class="st-dock-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg></span><span class="st-dock-label">${t.label}</span></button>`).join('');
  layer.setAttribute('role','region');
  const grip=document.createElement('button');grip.type='button';grip.id='st34SheetGrip';grip.className='st-sheet-grip';grip.setAttribute('aria-label','Свернуть карточку');grip.innerHTML='<span aria-hidden="true"></span>';layer.prepend(grip);
  const backdrop=document.createElement('button');backdrop.type='button';backdrop.id='st34SheetBackdrop';backdrop.className='hidden';backdrop.tabIndex=-1;backdrop.setAttribute('aria-label','Свернуть открытую карточку');document.body.appendChild(backdrop);

  function sync(){
    if(visible()){page=panelPage()||page;contentPage=page}
    const opened=visible();
    layer.setAttribute('aria-hidden',String(!opened));backdrop.classList.toggle('hidden',!opened);
    const heading=wrap.querySelector('.st-title');if(heading){heading.id='st34SheetTitle';layer.setAttribute('aria-labelledby',heading.id)}
    for(const button of nav.querySelectorAll('[data-p]')){
      const active=opened&&button.dataset.p===page;
      button.classList.toggle('active',active);button.setAttribute('aria-expanded',String(active));
    }
    C.updateGameControls();
  }
  function queueSync(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})}
  function saveDraft(){
    if(title()!=='Записать мысль'||!wrap.querySelector('textarea')||wrap.querySelector('.st40-form'))return;
    if(savedComposers.has(wrap.querySelector('textarea')))return;
    // Retain only live DOM nodes for an unsaved note. No text or credentials
    // are copied into browser storage or analytics by the sheet controller.
    drafts.set('notes',{nodes:[...wrap.childNodes],scrollTop:wrap.scrollTop,route:window.SetkaStandaloneNavigationV34?.getCurrentPanel?.()});
  }
  const nativeHide=C.hideLayer.bind(C);
  function close(reason='toggle'){
    if(!visible())return;
    saveDraft();savedRoute=window.SetkaStandaloneNavigationV34?.getCurrentPanel?.();
    C.recordEvent('nav',{page,action:'collapse',presentation:'bottom-sheet-v1'},false);
    nativeHide();
    if(S.getState()?.view==='library')window.SetkaStandaloneNavigationV34?.markPanel?.({kind:'library',page:S.getState().libraryPage||'all'});
    window.dispatchEvent(new CustomEvent('setka:sheet-presentation',{detail:{open:false,page,reason}}));sync();
  }
  C.hideLayer=function(){saveDraft();nativeHide();sync()};
  const nativeScreen=C.screen.bind(C);
  C.screen=function(screenTitle,copy='',kicker='SETKA',back){
    const rootBack=back===C.showPatterns||(fromDock&&pageByTitle[screenTitle]===page);
    const body=nativeScreen(screenTitle,copy,kicker,rootBack?()=>close('back'):back);
    page=panelPage(screenTitle,kicker)||page;contentPage=page;wrap.scrollTop=0;savedRoute=null;sync();
    return body;
  };
  function activate(key){
    const tab=tabs.find(t=>t.key===key);if(!tab)return;
    if(visible()&&page===key){close();return}
    saveDraft();
    C.recordEvent('nav',{page:key,action:visible()?'switch':'expand',presentation:'bottom-sheet-v1'},false);
    const draft=drafts.get(key);
    const canReopen=!visible()&&contentPage===key&&!!wrap.querySelector('#stBody');
    page=key;
    if(draft){
      wrap.replaceChildren(...draft.nodes);layer.classList.remove('hidden');contentPage=key;wrap.scrollTop=draft.scrollTop;
      window.SetkaStandaloneNavigationV34?.markPanel?.(draft.route);
      window.dispatchEvent(new CustomEvent('setka:overlay-visibility',{detail:{visible:true,title:title()}}));
    }else if(canReopen){
      layer.classList.remove('hidden');window.SetkaStandaloneNavigationV34?.markPanel?.(savedRoute);
      window.dispatchEvent(new CustomEvent('setka:overlay-visibility',{detail:{visible:true,title:title()}}));
    }else{fromDock=true;try{tab.open();contentPage=key}finally{fromDock=false}}
    sync();window.dispatchEvent(new CustomEvent('setka:sheet-presentation',{detail:{open:true,page}}));
  }
  // Window capture owns dock routing before the older document-level listeners.
  // Their working section renderers stay intact and are called above.
  window.addEventListener('click',e=>{
    const button=e.target?.closest?.('#st34Nav button[data-p]');if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();activate(button.dataset.p);
  },true);
  grip.onclick=()=>close('handle');backdrop.onclick=()=>close('outside');
  let down=null;
  grip.addEventListener('pointerdown',e=>{down={id:e.pointerId,y:e.clientY};grip.setPointerCapture?.(e.pointerId)});
  grip.addEventListener('pointerup',e=>{if(down&&e.pointerId===down.id&&e.clientY-down.y>45)close('handle-swipe');down=null});
  grip.addEventListener('pointercancel',()=>{down=null});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&visible()&&!document.querySelector('#st34InfoOverlay,#st34Choice,.modal-backdrop.active'))close('escape')});
  new MutationObserver(queueSync).observe(layer,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  new MutationObserver(queueSync).observe(game,{attributes:true,attributeFilter:['class']});
  window.addEventListener('setka:standalone-event',e=>{
    if(e.detail?.type==='note_create'){
      const editor=wrap.querySelector('textarea');if(editor)savedComposers.add(editor);
      drafts.delete('notes');contentPage=null;
    }
  });
  layer.addEventListener('transitionend',e=>{
    if(e.target===layer&&e.propertyName==='transform')window.dispatchEvent(new CustomEvent('setka:sheet-settled',{detail:{open:visible(),page}}));
  });
  function viewport(){
    const v=window.visualViewport,height=v?.height||innerHeight,offset=v?.offsetTop||0;
    document.body.style.setProperty('--setka-visible-height',`${height}px`);
    document.body.style.setProperty('--setka-keyboard-inset',`${Math.max(0,innerHeight-height-offset)}px`);
  }
  window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);
  window.__SETKA_SHEET_LAYOUT_V1__={version:'1.2.0',close,activate};viewport();sync();
})();
