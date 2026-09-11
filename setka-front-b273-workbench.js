(() => {
  const VERSION = 'B2.7.3';
  const STORAGE_KEY = 'setka.front.b273.visual.v1';
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
  const state = { editing:false, selectedRef:null, drag:null, z:180, vaultOpen:false, candidates:[] };

  const readStore = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  };
  const store = readStore();
  store.positions ||= {};
  const saveStore = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {} };

  document.documentElement.dataset.setkaFrontPatch = 'B2.7.3-SAFE-WORKBENCH';
  document.documentElement.dataset.setkaFrontVersion = VERSION;
  document.title = `SETKA · FRONT ${VERSION} · DATA B1`;

  const style = document.createElement('style');
  style.textContent = `
    #setka-layout-toolbar,#setka-projection-anchor,#setka-projection-toolbar-extension,#setka-b271-grower,#setka-b272-vault,#setka-b272-selection{display:none!important}
    #setka-b273-layoutbar{position:fixed;z-index:100020;left:50%;top:calc(var(--safe-top) + 8px);transform:translateX(-50%);display:none;align-items:center;gap:6px;padding:6px;border:1px solid rgba(135,233,255,.52);border-radius:10px;background:rgba(5,7,8,.97);backdrop-filter:blur(16px);box-shadow:0 16px 50px rgba(0,0,0,.42)}
    #setka-b273-layoutbar.open{display:flex}
    #setka-b273-layoutbar span{padding:0 5px;color:var(--cyan);font-size:8px;letter-spacing:.08em;white-space:nowrap}
    #setka-b273-layoutbar button,#setka-b273-vault button,#setka-b273-selection button{border:1px solid var(--line);background:#0b0e10;color:var(--text);border-radius:7px;padding:7px 9px;font:8px/1 monospace;cursor:pointer}
    #setka-b273-layoutbar [data-act="done"]{border-color:rgba(157,255,190,.55);color:var(--green)}
    #layout-toggle.b273-active{border-color:rgba(135,233,255,.72)!important;color:var(--cyan)!important;box-shadow:0 0 0 1px rgba(135,233,255,.16) inset!important}
    #setka-b273-vault-toggle{position:fixed;z-index:100022;right:10px;top:calc(var(--safe-top) + 8px);width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(135,233,255,.45);border-radius:10px;background:rgba(5,7,8,.92);color:var(--cyan);font:13px/1 monospace;cursor:pointer;backdrop-filter:blur(14px);box-shadow:0 8px 30px rgba(0,0,0,.3)}
    #setka-b273-vault-toggle.open{border-color:rgba(157,255,190,.72);color:var(--green)}
    #setka-b273-vault-toggle[data-hidden-count]:not([data-hidden-count="0"])::after{content:attr(data-hidden-count);position:absolute;right:-5px;top:-5px;min-width:15px;height:15px;padding:0 3px;display:grid;place-items:center;border:1px solid rgba(157,255,190,.7);border-radius:999px;background:#07100a;color:var(--green);font:7px/1 monospace}
    #setka-b273-vault{position:fixed;z-index:100021;right:10px;top:calc(var(--safe-top) + 50px);width:min(390px,calc(100vw - 20px));max-height:min(650px,calc(100vh - 92px));display:none;overflow:hidden;border:1px solid rgba(135,233,255,.42);border-radius:13px;background:rgba(5,7,8,.98);backdrop-filter:blur(18px);box-shadow:0 24px 80px rgba(0,0,0,.56)}
    #setka-b273-vault.open{display:block}
    #setka-b273-vault .head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;border-bottom:1px solid var(--line)}
    #setka-b273-vault .head strong{font-size:8px;letter-spacing:.12em;color:var(--cyan)}
    #setka-b273-vault .scroll{max-height:590px;overflow:auto;padding:9px}
    #setka-b273-vault .section{margin:0 0 14px}
    #setka-b273-vault .section-title{margin:0 0 7px;color:var(--muted);font-size:7px;letter-spacing:.12em;text-transform:uppercase}
    #setka-b273-vault .row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(39,48,54,.55)}
    #setka-b273-vault .row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;font-weight:500}
    #setka-b273-vault .row small{display:block;margin-top:3px;color:var(--muted);font-size:6.5px;line-height:1.35;overflow-wrap:anywhere}
    #setka-b273-vault .empty{padding:10px;border:1px dashed rgba(39,48,54,.8);border-radius:8px;color:var(--muted);font:8px/1.5 monospace}
    #setka-b273-vault .query{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}
    #setka-b273-vault input{min-width:0;border:1px solid var(--line);border-radius:8px;background:#080b0d;color:var(--text);padding:9px 10px;font:10px/1.3 system-ui,sans-serif;outline:none}
    #setka-b273-vault .status{margin-top:7px;color:var(--muted);font:7px/1.45 monospace}
    #setka-b273-vault .truth{margin-top:8px;padding:8px;border:1px solid rgba(157,255,190,.22);border-radius:8px;color:#a8c8b3;font:7px/1.45 monospace}
    #setka-b273-selection{position:fixed;z-index:100023;display:none;align-items:center;gap:4px;padding:4px;border:1px solid rgba(135,233,255,.5);border-radius:8px;background:rgba(5,7,8,.98);box-shadow:0 10px 32px rgba(0,0,0,.4);backdrop-filter:blur(12px)}
    #setka-b273-selection.open{display:flex}
    #setka-b273-selection span{max-width:150px;padding:0 5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cyan);font:7px/1 monospace}
    #setka-b273-selection [data-act="remove"]{border-color:rgba(255,141,141,.4);color:var(--red)}
    [data-setka-projection-ref].setka-b273-selected{outline:1px solid rgba(135,233,255,.95)!important;outline-offset:3px!important;box-shadow:0 0 0 1px rgba(135,233,255,.16),0 0 26px rgba(135,233,255,.13)!important}
    .setka-b273-free{position:fixed!important;right:auto!important;bottom:auto!important;transform:none!important;margin:0!important;transition:none!important;pointer-events:auto!important}
    html.setka-b273-editing [data-setka-projection-ref]{cursor:grab!important;touch-action:none!important}
    body.setka-b273-dragging,body.setka-b273-dragging *{cursor:grabbing!important;user-select:none!important}
    @media(max-width:760px){#setka-b273-layoutbar{top:auto;bottom:calc(var(--safe-bottom) + 8px);max-width:calc(100vw - 20px);overflow:auto}#setka-b273-vault{top:10px;right:10px;max-height:calc(100vh - 20px)}#setka-b273-vault .scroll{max-height:calc(100vh - 68px)}}
  `;
  document.head.appendChild(style);

  const projectionApi = () => window.SETKA_FRONT_PROJECTIONS || null;
  const allProjectionElements = () => qsa('[data-setka-projection-ref]').filter(el => !el.closest('#setka-b273-vault,#setka-b273-selection,#setka-b273-layoutbar'));
  const lookup = ref => allProjectionElements().find(el => el.dataset.setkaProjectionRef === ref) || null;
  const record = ref => projectionApi()?.list?.().find(x => x.projectionRef === ref) || null;
  const label = ref => record(ref)?.label || ref || 'Элемент';

  function ensureLayoutBar(){
    let bar = qs('#setka-b273-layoutbar');
    if(bar) return bar;
    bar = document.createElement('div');
    bar.id = 'setka-b273-layoutbar';
    bar.dataset.layoutUi = '1';
    bar.innerHTML = '<span>РАСКЛАДКА · ВЫБЕРИ И ТАЩИ ЭЛЕМЕНТ</span><button type="button" data-act="done">ГОТОВО</button>';
    document.body.appendChild(bar);
    bar.querySelector('[data-act="done"]').addEventListener('click',()=>setEditing(false));
    return bar;
  }

  function installLayoutToggle(){
    let old = qs('#layout-toggle');
    if(!old){
      old = document.createElement('button'); old.id='layout-toggle'; old.className='action'; old.type='button'; old.innerHTML='✣ <span>Раскладка</span>';
      (qs('.top-actions') || document.body).appendChild(old);
    }
    const btn = old.cloneNode(true);
    btn.dataset.layoutUi = '1';
    btn.title = 'Раскладка: выбрать, переместить, переименовать или убрать элемент';
    old.replaceWith(btn);
    btn.addEventListener('click',event=>{ event.preventDefault(); event.stopPropagation(); setEditing(!state.editing); });
    return btn;
  }

  function setEditing(on){
    state.editing = Boolean(on);
    document.documentElement.classList.toggle('setka-b273-editing',state.editing);
    document.documentElement.classList.toggle('setka-layout-editing',state.editing);
    ensureLayoutBar().classList.toggle('open',state.editing);
    const btn = qs('#layout-toggle');
    btn?.classList.toggle('b273-active',state.editing);
    btn?.setAttribute('aria-pressed',state.editing?'true':'false');
    if(!state.editing) select(null);
  }

  function ensureSelection(){
    let menu = qs('#setka-b273-selection');
    if(menu) return menu;
    menu = document.createElement('div'); menu.id='setka-b273-selection'; menu.dataset.layoutUi='1';
    menu.innerHTML='<span></span><button type="button" data-act="rename">ИМЯ</button><button type="button" data-act="remove">УБРАТЬ</button>';
    document.body.appendChild(menu);
    menu.querySelector('[data-act="rename"]').addEventListener('click',()=>{
      const ref=state.selectedRef, el=lookup(ref); if(!ref||!el) return;
      if(el.dataset.setkaProjectionRenameable==='0') return;
      const next=window.prompt('Новое имя элемента',label(ref));
      if(next!==null && String(next).trim()) projectionApi()?.rename?.(ref,String(next).trim());
      positionSelection(); renderVault();
    });
    menu.querySelector('[data-act="remove"]').addEventListener('click',()=>{
      const ref=state.selectedRef; if(!ref) return;
      projectionApi()?.remove?.(ref); select(null); renderVault();
    });
    return menu;
  }

  function select(ref){
    state.selectedRef=ref||null;
    qsa('.setka-b273-selected').forEach(el=>el.classList.remove('setka-b273-selected'));
    const menu=ensureSelection(), el=lookup(state.selectedRef);
    if(!state.editing || !el){ menu.classList.remove('open'); return; }
    el.classList.add('setka-b273-selected');
    menu.querySelector('span').textContent=label(state.selectedRef);
    menu.querySelector('[data-act="rename"]').disabled=el.dataset.setkaProjectionRenameable==='0';
    menu.classList.add('open'); positionSelection();
  }

  function positionSelection(){
    const menu=ensureSelection(), el=lookup(state.selectedRef);
    if(!state.editing||!el){ menu.classList.remove('open'); return; }
    const r=el.getBoundingClientRect(), mr=menu.getBoundingClientRect();
    const left=clamp(r.left,8,Math.max(8,innerWidth-mr.width-8));
    let top=r.top-mr.height-7; if(top<8) top=Math.min(innerHeight-mr.height-8,r.bottom+7);
    menu.style.left=`${left}px`; menu.style.top=`${Math.max(8,top)}px`;
  }

  function startDrag(event,el){
    const ref=el?.dataset?.setkaProjectionRef;
    if(!state.editing||!ref||event.button>0) return;
    event.preventDefault(); event.stopImmediatePropagation(); select(ref);
    const r=el.getBoundingClientRect(); state.z=Math.max(state.z+1,Number(el.style.zIndex)||0,181);
    if(el.parentElement!==document.body) document.body.appendChild(el);
    el.classList.add('setka-b273-free');
    Object.assign(el.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,zIndex:String(state.z)});
    state.drag={ref,el,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,left:r.left,top:r.top,width:r.width,height:r.height};
    document.body.classList.add('setka-b273-dragging');
    try{el.setPointerCapture?.(event.pointerId)}catch{}
  }
  function moveDrag(event){
    const d=state.drag; if(!d||d.pointerId!==event.pointerId) return; event.preventDefault();
    const left=clamp(d.left+event.clientX-d.startX,8,Math.max(8,innerWidth-d.width-8));
    const top=clamp(d.top+event.clientY-d.startY,8,Math.max(8,innerHeight-d.height-8));
    d.el.style.left=`${left}px`; d.el.style.top=`${top}px`; positionSelection();
  }
  function endDrag(event){
    const d=state.drag; if(!d||d.pointerId!==event.pointerId) return;
    const r=d.el.getBoundingClientRect();
    store.positions[d.ref]={left:r.left,top:r.top,width:r.width,height:r.height,z:Number(d.el.style.zIndex)||state.z}; saveStore();
    state.drag=null; document.body.classList.remove('setka-b273-dragging'); positionSelection();
  }

  document.addEventListener('pointerdown',event=>{
    if(!state.editing) return;
    if(event.target.closest?.('#setka-b273-vault,#setka-b273-selection,#setka-b273-layoutbar,#setka-b273-vault-toggle,#layout-toggle')) return;
    const el=event.target.closest?.('[data-setka-projection-ref]');
    if(!el){select(null);return;} startDrag(event,el);
  },true);
  window.addEventListener('pointermove',moveDrag,{passive:false});
  window.addEventListener('pointerup',endDrag,{passive:false});
  window.addEventListener('pointercancel',endDrag,{passive:false});

  function hiddenItems(){ return (projectionApi()?.list?.()||[]).filter(x=>x.hidden); }
  function proven(spec){
    const b=spec?.binding||{},e=spec?.evidence||{};
    return spec?.systemGenerated===true&&e?.exists===true&&typeof b.sourceTable==='string'&&b.sourceTable.startsWith('foundation.')&&typeof b.sourceRef==='string'&&b.sourceRef.length>0&&typeof b.bindingKind==='string'&&b.bindingKind.length>0;
  }

  function ensureVaultButton(){
    let btn=qs('#setka-b273-vault-toggle'); if(btn) return btn;
    btn=document.createElement('button'); btn.id='setka-b273-vault-toggle'; btn.type='button'; btn.dataset.layoutUi='1'; btn.textContent='✣';
    btn.title='Контейнер элементов: убрать, вернуть или добавить из системы'; document.body.appendChild(btn);
    btn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggleVault();}); return btn;
  }
  function ensureVault(){
    let box=qs('#setka-b273-vault'); if(box) return box;
    box=document.createElement('section'); box.id='setka-b273-vault'; box.dataset.layoutUi='1';
    box.innerHTML=`<div class="head"><strong>ЭЛЕМЕНТЫ ВЕРСТАКА</strong><button type="button" data-close>ЗАКРЫТЬ</button></div><div class="scroll"><section class="section"><h3 class="section-title">УБРАННЫЕ С ЭКРАНА</h3><div data-hidden></div></section><section class="section"><h3 class="section-title">МОЖНО ДОБАВИТЬ ИЗ СИСТЕМЫ</h3><div class="query"><input type="text" autocomplete="off" spellcheck="false" placeholder="Что нужно сейчас?"><button type="button" data-search>НАЙТИ</button></div><div class="status" data-status>Только доказанные backend-элементы.</div><div data-candidates></div><div class="truth">TRUTH GATE · положение, имя и скрытие относятся только к проекции. Системная привязка остаётся неизменной.</div></section></div>`;
    document.body.appendChild(box);
    box.querySelector('[data-close]').addEventListener('click',()=>toggleVault(false));
    box.querySelector('[data-search]').addEventListener('click',searchCandidates);
    box.querySelector('input').addEventListener('keydown',e=>{if(e.key==='Enter')searchCandidates()}); return box;
  }
  function renderHidden(){
    const host=ensureVault().querySelector('[data-hidden]'),items=hiddenItems(); ensureVaultButton().dataset.hiddenCount=String(items.length);
    if(!items.length){host.innerHTML='<div class="empty">Убранных элементов нет.</div>';return;} host.innerHTML='';
    items.forEach(item=>{const row=document.createElement('div');row.className='row';row.innerHTML='<div><b></b><small></small></div><button type="button">ВЕРНУТЬ</button>';row.querySelector('b').textContent=item.label||item.projectionRef;row.querySelector('small').textContent=item.binding?.sourceRef||item.projectionRef;row.querySelector('button').addEventListener('click',()=>{projectionApi()?.restore?.(item.projectionRef);renderVault()});host.appendChild(row)});
  }
  function renderCandidates(){
    const host=ensureVault().querySelector('[data-candidates]');host.innerHTML='';
    state.candidates.forEach(spec=>{const row=document.createElement('div');row.className='row';row.innerHTML='<div><b></b><small></small></div><button type="button">ДОБАВИТЬ</button>';row.querySelector('b').textContent=spec.label||spec.projectionRef;row.querySelector('small').textContent=`${spec.binding?.bindingKind||'SYSTEM'} · ${spec.binding?.sourceRef||'—'}`;row.querySelector('button').addEventListener('click',()=>{if(!proven(spec))return;const api=projectionApi();const pinned={...spec,persistence:'pinned'};api?.upsert?.(pinned);api?.pin?.(pinned.projectionRef,true);state.candidates=state.candidates.filter(x=>x.projectionRef!==spec.projectionRef);renderVault()});host.appendChild(row)});
  }
  function renderVault(){renderHidden();renderCandidates();}
  async function searchCandidates(){
    const box=ensureVault(),input=box.querySelector('input'),intent=String(input.value||'').trim(),status=box.querySelector('[data-status]');
    if(!intent){status.textContent='Напиши, что нужно из системы.';return;} status.textContent='SETKA проверяет реальные функции / сущности / связи…';
    try{const q=new URLSearchParams({intent,mode:qs('.mode-button.active')?.dataset?.mode||'INTEGRATION',limit:'10'});const r=await fetch(`/api/b27/project?${q}`,{cache:'no-store'});const d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.state||`HTTP_${r.status}`);state.candidates=(Array.isArray(d.projections)?d.projections:[]).filter(proven);status.textContent=state.candidates.length?`${state.candidates.length} доказанных кандидатов`:`Нет доказанных кандидатов · ${d.state||'NO_MATCH'}`;renderCandidates()}catch(e){status.textContent=`ОШИБКА · ${e.message}`;console.error(e)}
  }
  function toggleVault(force){
    const box=ensureVault();state.vaultOpen=typeof force==='boolean'?force:!state.vaultOpen;box.classList.toggle('open',state.vaultOpen);ensureVaultButton().classList.toggle('open',state.vaultOpen);if(state.vaultOpen){renderVault();setTimeout(()=>box.querySelector('input')?.focus(),0)}
  }

  installLayoutToggle(); ensureLayoutBar(); ensureSelection(); ensureVaultButton(); ensureVault(); renderVault();

  window.SETKA_SAFE_WORKBENCH = Object.freeze({version:VERSION,editing:()=>state.editing,enter:()=>setEditing(true),done:()=>setEditing(false),openVault:()=>toggleVault(true),closeVault:()=>toggleVault(false),selected:()=>state.selectedRef,flowerRole:'ELEMENT_VAULT_ONLY',layoutActivationMutatesDom:false,mutationObserver:false,pollingLoop:false,canonMutation:false,runtimeMutation:false});
})();