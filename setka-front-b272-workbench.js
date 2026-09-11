(() => {
  const STORAGE_KEY = 'setka.front.b272.visual.v1';
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
  const state = {
    selectedRef:null,
    drag:null,
    z:160,
    candidates:[],
    lastIntent:'',
    vaultOpen:false
  };

  const readStore = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  };
  const store = readStore();
  store.positions ||= {};

  const saveStore = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
  };

  document.documentElement.dataset.setkaFrontPatch = 'B2.7.2-VISUAL-WORKBENCH';
  document.documentElement.dataset.setkaFrontVersion = 'B2.7.2';
  document.title = 'SETKA · FRONT B2.7.2 · DATA B1';

  const style = document.createElement('style');
  style.textContent = `
    #setka-projection-toolbar-extension{display:none!important}
    #setka-b271-grower{display:none!important}
    #setka-projection-anchor{
      width:34px!important;height:34px!important;border-radius:10px!important;
      z-index:100010!important
    }
    #setka-projection-anchor[data-hidden-count]:not([data-hidden-count="0"])::after{
      content:attr(data-hidden-count);
      position:absolute;right:-5px;top:-5px;min-width:15px;height:15px;padding:0 3px;
      display:grid;place-items:center;border:1px solid rgba(157,255,190,.7);
      border-radius:999px;background:#07100a;color:var(--green);font:7px/1 monospace
    }
    #setka-b272-vault{
      position:fixed;z-index:100009;right:10px;top:calc(var(--safe-top) + 50px);
      width:min(390px,calc(100vw - 20px));max-height:min(650px,calc(100vh - 92px));
      display:none;overflow:hidden;border:1px solid rgba(135,233,255,.42);border-radius:13px;
      background:rgba(5,7,8,.98);backdrop-filter:blur(18px);box-shadow:0 24px 80px rgba(0,0,0,.56)
    }
    #setka-b272-vault.open{display:block}
    #setka-b272-vault .vault-head{
      display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;
      border-bottom:1px solid var(--line)
    }
    #setka-b272-vault .vault-head strong{font-size:8px;letter-spacing:.12em;color:var(--cyan);text-transform:uppercase}
    #setka-b272-vault button{
      border:1px solid var(--line);border-radius:7px;background:#0b0e10;color:var(--text);
      padding:7px 8px;font:8px/1 monospace;cursor:pointer
    }
    #setka-b272-vault .vault-scroll{max-height:590px;overflow:auto;padding:9px}
    #setka-b272-vault .section{margin:0 0 14px}
    #setka-b272-vault .section:last-child{margin-bottom:0}
    #setka-b272-vault .section-title{margin:0 0 7px;color:var(--muted);font-size:7px;letter-spacing:.12em;text-transform:uppercase}
    #setka-b272-vault .empty{
      padding:10px;border:1px dashed rgba(39,48,54,.8);border-radius:8px;
      color:var(--muted);font:8px/1.5 monospace
    }
    #setka-b272-vault .vault-row{
      display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;
      padding:8px 0;border-bottom:1px solid rgba(39,48,54,.55)
    }
    #setka-b272-vault .vault-row:last-child{border-bottom:0}
    #setka-b272-vault .vault-row b{
      display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;font-weight:500
    }
    #setka-b272-vault .vault-row small{
      display:block;margin-top:3px;color:var(--muted);font-size:6.5px;line-height:1.35;overflow-wrap:anywhere
    }
    #setka-b272-vault .restore{border-color:rgba(157,255,190,.35);color:var(--green)}
    #setka-b272-vault .add{border-color:rgba(135,233,255,.4);color:var(--cyan)}
    #setka-b272-vault .query{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}
    #setka-b272-vault input{
      min-width:0;border:1px solid var(--line);border-radius:8px;background:#080b0d;color:var(--text);
      padding:9px 10px;font:10px/1.3 system-ui,sans-serif;outline:none
    }
    #setka-b272-vault input:focus{border-color:rgba(135,233,255,.55)}
    #setka-b272-vault .status{margin-top:7px;color:var(--muted);font:7px/1.45 monospace}
    #setka-b272-vault .truth{
      margin-top:8px;padding:8px;border:1px solid rgba(157,255,190,.22);border-radius:8px;
      color:#a8c8b3;font:7px/1.45 monospace
    }

    #setka-b272-selection{
      position:fixed;z-index:100011;display:none;align-items:center;gap:4px;padding:4px;
      border:1px solid rgba(135,233,255,.5);border-radius:8px;background:rgba(5,7,8,.97);
      box-shadow:0 10px 32px rgba(0,0,0,.4);backdrop-filter:blur(12px)
    }
    #setka-b272-selection.open{display:flex}
    #setka-b272-selection span{
      max-width:150px;padding:0 5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      color:var(--cyan);font:7px/1 monospace
    }
    #setka-b272-selection button{
      border:1px solid var(--line);border-radius:6px;background:#0b0e10;color:var(--text);
      padding:6px 7px;font:7px/1 monospace;cursor:pointer
    }
    #setka-b272-selection [data-act="remove"]{border-color:rgba(255,141,141,.4);color:var(--red)}
    [data-setka-projection-ref].setka-b272-selected{
      outline:1px solid rgba(135,233,255,.95)!important;outline-offset:3px!important;
      box-shadow:0 0 0 1px rgba(135,233,255,.16),0 0 26px rgba(135,233,255,.13)!important
    }
    .setka-b272-free{
      position:fixed!important;right:auto!important;bottom:auto!important;transform:none!important;
      margin:0!important;transition:none!important;pointer-events:auto!important
    }
    .setka-layout-editing [data-setka-projection-ref]{cursor:grab!important;touch-action:none!important}
    body.setka-b272-dragging,body.setka-b272-dragging *{cursor:grabbing!important;user-select:none!important}

    @media(max-width:760px){
      #setka-b272-vault{top:10px;right:10px;max-height:calc(100vh - 20px)}
      #setka-b272-vault .vault-scroll{max-height:calc(100vh - 68px)}
    }
  `;
  document.head.appendChild(style);

  function projectionApi(){ return window.SETKA_FRONT_PROJECTIONS || null; }
  function editing(){ return Boolean(window.SETKA_WORKSPACE_LAYOUT?.editing?.()); }

  function allProjectionElements(){
    return qsa('[data-setka-projection-ref]').filter(el =>
      !el.closest('#setka-b272-vault,#setka-b272-selection,#setka-layout-toolbar')
    );
  }

  function lookup(ref){
    return allProjectionElements().find(el => el.dataset.setkaProjectionRef === ref) || null;
  }

  function projectionRecord(ref){
    return projectionApi()?.list?.().find(x => x.projectionRef === ref) || null;
  }

  function visibleLabel(ref){
    const row = projectionRecord(ref);
    return row?.label || ref || 'Элемент';
  }

  function ensureSelectionMenu(){
    let menu = qs('#setka-b272-selection');
    if(menu) return menu;
    menu = document.createElement('div');
    menu.id = 'setka-b272-selection';
    menu.dataset.layoutUi = '1';
    menu.innerHTML = '<span></span><button type="button" data-act="rename">ИМЯ</button><button type="button" data-act="remove">УБРАТЬ</button>';
    document.body.appendChild(menu);
    menu.querySelector('[data-act="rename"]').addEventListener('click', () => {
      const ref = state.selectedRef;
      if(!ref) return;
      const old = visibleLabel(ref);
      const next = window.prompt('Новое имя элемента', old);
      if(next !== null && String(next).trim()) projectionApi()?.rename?.(ref, String(next).trim());
      positionSelectionMenu();
      renderVault();
    });
    menu.querySelector('[data-act="remove"]').addEventListener('click', () => {
      const ref = state.selectedRef;
      if(!ref) return;
      projectionApi()?.remove?.(ref);
      select(null);
      renderVault();
    });
    return menu;
  }

  function select(ref){
    state.selectedRef = ref || null;
    qsa('.setka-b272-selected').forEach(el => el.classList.remove('setka-b272-selected'));
    const el = lookup(state.selectedRef);
    const menu = ensureSelectionMenu();
    if(!el || !editing()){
      menu.classList.remove('open');
      return;
    }
    el.classList.add('setka-b272-selected');
    menu.querySelector('span').textContent = visibleLabel(state.selectedRef);
    menu.classList.add('open');
    positionSelectionMenu();
  }

  function positionSelectionMenu(){
    const menu = ensureSelectionMenu();
    const el = lookup(state.selectedRef);
    if(!el || !editing()){ menu.classList.remove('open'); return; }
    const r = el.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    let left = clamp(r.left, 8, Math.max(8, innerWidth - mr.width - 8));
    let top = r.top - mr.height - 7;
    if(top < 8) top = Math.min(innerHeight - mr.height - 8, r.bottom + 7);
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  }

  function persistPosition(ref, el){
    const r = el.getBoundingClientRect();
    store.positions[ref] = {
      left:r.left, top:r.top, width:r.width, height:r.height,
      z:Number(el.style.zIndex) || state.z
    };
    saveStore();
  }

  function applyStoredPosition(el){
    const ref = el?.dataset?.setkaProjectionRef;
    const pos = ref && store.positions[ref];
    if(!el || !pos) return false;
    const width = Math.max(36, Number(pos.width) || el.getBoundingClientRect().width || 80);
    const height = Math.max(24, Number(pos.height) || el.getBoundingClientRect().height || 32);
    const left = clamp(Number(pos.left)||8, 8, Math.max(8, innerWidth - Math.min(width,innerWidth-16) - 8));
    const top = clamp(Number(pos.top)||8, 8, Math.max(8, innerHeight - Math.min(height,innerHeight-16) - 8));
    if(el.parentElement !== document.body) document.body.appendChild(el);
    el.classList.add('setka-b272-free');
    Object.assign(el.style,{
      left:`${left}px`,top:`${top}px`,
      width:`${Math.min(width,Math.max(36,innerWidth-16))}px`,
      height:`${Math.min(height,Math.max(24,innerHeight-16))}px`,
      zIndex:String(Number(pos.z)||150)
    });
    return true;
  }

  function restoreStoredPositions(){
    allProjectionElements().forEach(applyStoredPosition);
  }

  function startDrag(event, el){
    const ref = el?.dataset?.setkaProjectionRef;
    if(!ref || !editing() || event.button > 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    select(ref);
    const r = el.getBoundingClientRect();
    state.z = Math.max(state.z+1, Number(el.style.zIndex)||0, 161);
    if(el.parentElement !== document.body) document.body.appendChild(el);
    el.classList.add('setka-b272-free');
    Object.assign(el.style,{
      left:`${r.left}px`,top:`${r.top}px`,
      width:`${r.width}px`,height:`${r.height}px`,zIndex:String(state.z)
    });
    state.drag = {
      ref,el,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,
      left:r.left,top:r.top,width:r.width,height:r.height,moved:false
    };
    document.body.classList.add('setka-b272-dragging');
    try { el.setPointerCapture?.(event.pointerId); } catch {}
  }

  function moveDrag(event){
    const d = state.drag;
    if(!d || d.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX-d.startX, dy = event.clientY-d.startY;
    if(Math.hypot(dx,dy) > 2) d.moved = true;
    const left = clamp(d.left+dx,8,Math.max(8,innerWidth-d.width-8));
    const top = clamp(d.top+dy,8,Math.max(8,innerHeight-d.height-8));
    d.el.style.left = `${left}px`;
    d.el.style.top = `${top}px`;
    positionSelectionMenu();
  }

  function endDrag(event){
    const d = state.drag;
    if(!d || d.pointerId !== event.pointerId) return;
    persistPosition(d.ref,d.el);
    state.drag = null;
    document.body.classList.remove('setka-b272-dragging');
    positionSelectionMenu();
  }

  function deepestProjection(target){
    return target?.closest?.('[data-setka-projection-ref]') || null;
  }

  document.addEventListener('pointerdown', event => {
    if(!editing()) return;
    if(event.target.closest?.('#setka-b272-vault,#setka-b272-selection,#setka-layout-toolbar,#setka-projection-anchor')) return;
    const el = deepestProjection(event.target);
    if(!el) { select(null); return; }
    startDrag(event,el);
  }, true);
  window.addEventListener('pointermove',moveDrag,{passive:false});
  window.addEventListener('pointerup',endDrag,{passive:false});
  window.addEventListener('pointercancel',endDrag,{passive:false});

  function hiddenItems(){
    return (projectionApi()?.list?.() || []).filter(x => x.hidden);
  }

  function proven(spec){
    const b = spec?.binding || {}, e = spec?.evidence || {};
    return spec?.systemGenerated === true
      && e?.exists === true
      && typeof b.sourceTable === 'string' && b.sourceTable.startsWith('foundation.')
      && typeof b.sourceRef === 'string' && b.sourceRef.length > 0
      && typeof b.bindingKind === 'string' && b.bindingKind.length > 0;
  }

  function ensureVault(){
    let box = qs('#setka-b272-vault');
    if(box) return box;
    box = document.createElement('section');
    box.id = 'setka-b272-vault';
    box.dataset.layoutUi = '1';
    box.innerHTML = `
      <div class="vault-head"><strong>ЭЛЕМЕНТЫ ВЕРСТАКА</strong><button type="button" data-close>ЗАКРЫТЬ</button></div>
      <div class="vault-scroll">
        <section class="section">
          <h3 class="section-title">УБРАННЫЕ С ЭКРАНА</h3>
          <div data-hidden-list></div>
        </section>
        <section class="section">
          <h3 class="section-title">МОЖНО ДОБАВИТЬ ИЗ СИСТЕМЫ</h3>
          <div class="query"><input type="text" autocomplete="off" spellcheck="false" placeholder="Что нужно сейчас?"><button type="button" data-search>НАЙТИ</button></div>
          <div class="status" data-status>Элементы появятся здесь только после подтверждения backend.</div>
          <div data-candidate-list></div>
          <div class="truth">TRUTH GATE · кандидат хранится здесь, а не на рабочем столе. На фронт он попадает только после «ДОБАВИТЬ» и только с доказанным sourceRef.</div>
        </section>
      </div>`;
    document.body.appendChild(box);
    box.querySelector('[data-close]').addEventListener('click',()=>toggleVault(false));
    box.querySelector('[data-search]').addEventListener('click',()=>searchCandidates());
    box.querySelector('input').addEventListener('keydown',e=>{ if(e.key==='Enter') searchCandidates(); });
    return box;
  }

  function renderHidden(){
    const host = ensureVault().querySelector('[data-hidden-list]');
    const items = hiddenItems();
    const anchor = ensureAnchor();
    anchor.dataset.hiddenCount = String(items.length);
    if(!items.length){
      host.innerHTML = '<div class="empty">Убранных элементов нет.</div>';
      return;
    }
    host.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'vault-row';
      row.innerHTML = '<div><b></b><small></small></div><button type="button" class="restore">ВЕРНУТЬ</button>';
      row.querySelector('b').textContent = item.label || item.projectionRef;
      row.querySelector('small').textContent = item.binding?.sourceRef || item.projectionRef;
      row.querySelector('button').addEventListener('click',()=>{
        projectionApi()?.restore?.(item.projectionRef);
        renderVault();
        requestAnimationFrame(restoreStoredPositions);
      });
      host.appendChild(row);
    });
  }

  function renderCandidates(){
    const host = ensureVault().querySelector('[data-candidate-list]');
    if(!state.candidates.length){
      host.innerHTML = '';
      return;
    }
    host.innerHTML = '';
    state.candidates.forEach(spec => {
      const row = document.createElement('div');
      row.className = 'vault-row';
      row.innerHTML = '<div><b></b><small></small></div><button type="button" class="add">ДОБАВИТЬ</button>';
      row.querySelector('b').textContent = spec.label || spec.projectionRef;
      row.querySelector('small').textContent = `${spec.binding?.bindingKind || 'SYSTEM'} · ${spec.binding?.sourceRef || '—'}`;
      row.querySelector('button').addEventListener('click',()=>{
        const api = projectionApi();
        if(!api || !proven(spec)) return;
        const pinned = {...spec,persistence:'pinned'};
        api.upsert(pinned);
        api.pin?.(pinned.projectionRef,true);
        state.candidates = state.candidates.filter(x => x.projectionRef !== spec.projectionRef);
        renderVault();
        requestAnimationFrame(()=>{
          restoreStoredPositions();
          const el = lookup(pinned.projectionRef);
          if(el) select(pinned.projectionRef);
        });
      });
      host.appendChild(row);
    });
  }

  async function fetchCandidates(intent, context={}){
    const box = ensureVault();
    const status = box.querySelector('[data-status]');
    status.textContent = 'SETKA проверяет реальные функции / сущности / связи…';
    const q = new URLSearchParams({
      intent:String(intent||''),
      mode:qs('.mode-button.active')?.dataset?.mode || 'INTEGRATION',
      limit:'10'
    });
    if(context.entityType) q.set('entity_type',context.entityType);
    if(context.entityRef) q.set('entity_ref',context.entityRef);
    const r = await fetch(`/api/b27/project?${q.toString()}`,{cache:'no-store'});
    const d = await r.json().catch(()=>({ok:false,state:`HTTP_${r.status}`}));
    if(!r.ok || d?.ok===false) throw new Error(d?.state || `HTTP_${r.status}`);
    state.candidates = (Array.isArray(d.projections)?d.projections:[]).filter(proven);
    status.textContent = state.candidates.length
      ? `${state.candidates.length} доказанных кандидатов · на экран ещё ничего не добавлено`
      : `Нет доказанных кандидатов · ${d.state || 'NO_MATCH'}`;
    renderCandidates();
    return d;
  }

  function selectedContext(){
    const ref = state.selectedRef;
    const rec = ref ? projectionRecord(ref) : null;
    const b = rec?.binding || {};
    if(b.entityRef) return {entityType:b.entityType || null,entityRef:b.entityRef};
    return {};
  }

  async function searchCandidates(){
    const box = ensureVault();
    const input = box.querySelector('input');
    const intent = String(input.value || '').trim();
    if(!intent){
      box.querySelector('[data-status]').textContent = 'Напиши, что сейчас нужно из системы.';
      return;
    }
    state.lastIntent = intent;
    try { await fetchCandidates(intent,selectedContext()); }
    catch(e){
      console.error(e);
      box.querySelector('[data-status]').textContent = `ОШИБКА · ${e.message}`;
    }
  }

  function renderVault(){
    renderHidden();
    renderCandidates();
  }

  function toggleVault(force){
    const box = ensureVault();
    state.vaultOpen = typeof force==='boolean' ? force : !state.vaultOpen;
    box.classList.toggle('open',state.vaultOpen);
    ensureAnchor().classList.toggle('active',state.vaultOpen);
    if(state.vaultOpen){
      renderVault();
      setTimeout(()=>box.querySelector('input')?.focus(),0);
      const ctx = selectedContext();
      if(ctx.entityRef && !state.candidates.length && !state.lastIntent){
        box.querySelector('input').value = 'связи';
        fetchCandidates('связи',ctx).catch(()=>{});
      }
    }
  }

  function ensureAnchor(){
    let old = qs('#setka-projection-anchor');
    if(!old){
      old = document.createElement('button');
      old.id = 'setka-projection-anchor';
      old.type = 'button';
      old.textContent = '✣';
      old.dataset.layoutUi = '1';
      document.body.appendChild(old);
    }
    if(old.dataset.b272Bound === '1') return old;

    const btn = old.cloneNode(true);
    btn.dataset.b272Bound = '1';
    btn.title = 'Элементы верстака: убрать, вернуть или добавить из системы';
    old.replaceWith(btn);
    btn.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      toggleVault();
    });
    return btn;
  }

  function syncEditing(){
    if(!editing()) select(null);
    else if(state.selectedRef) select(state.selectedRef);
  }

  const observer = new MutationObserver(()=>{
    ensureAnchor();
    restoreStoredPositions();
    if(state.vaultOpen) renderHidden();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  window.addEventListener('resize',()=>{
    restoreStoredPositions();
    positionSelectionMenu();
  });

  setInterval(syncEditing,300);

  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    ensureSelectionMenu();
    ensureVault();
    ensureAnchor();
    restoreStoredPositions();
    renderVault();
  }));

  window.SETKA_VISUAL_WORKBENCH = Object.freeze({
    version:'B2.7.2',
    select,
    selected:()=>state.selectedRef,
    openVault:()=>toggleVault(true),
    closeVault:()=>toggleVault(false),
    search:fetchCandidates,
    restorePositions:restoreStoredPositions,
    rule:'LAYOUT_IS_LOCAL_PRESENTATION; SYSTEM_BINDING_IS_INDEPENDENT',
    flowerRole:'ELEMENT_VAULT_ONLY',
    directLayoutSelection:true,
    directLayoutDrag:true,
    localRenameAndHide:true,
    candidateStagingBeforeAdd:true,
    canonMutation:false,
    runtimeMutation:false
  });
})();