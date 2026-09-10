(() => {
  const STORAGE_KEY = 'setka.front.b26.workspace.v1';
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; } })();
  const runtime = { editing:false, drag:null, z:90 };

  document.documentElement.dataset.setkaFrontVersion = 'B2.6';
  document.title = 'SETKA · FRONT B2.6 · DATA B1';

  const style = document.createElement('style');
  style.textContent = `
    .setka-layout-free{right:auto!important;bottom:auto!important;transform:none!important;margin:0!important;transition:none!important;}
    .setka-layout-free.setka-layout-panel:not(.open){pointer-events:none!important;}
    .setka-layout-handle{display:none;position:absolute;z-index:99999;left:6px;top:6px;width:24px;height:20px;place-items:center;border:1px solid rgba(135,233,255,.48);border-radius:6px;background:rgba(5,7,8,.92);color:var(--cyan);font:11px/1 monospace;cursor:grab;user-select:none;touch-action:none;box-shadow:0 5px 20px rgba(0,0,0,.28)}
    .setka-layout-editing .setka-layout-handle{display:grid}
    .setka-layout-editing [data-setka-move-key]{outline:1px dashed rgba(135,233,255,.34);outline-offset:2px}
    .setka-layout-editing [data-setka-direct-drag='1']{cursor:grab!important;touch-action:none!important;user-select:none!important}
    .setka-layout-editing .graph-meta,.setka-layout-editing .source-bar,.setka-layout-editing .graph-stats{pointer-events:auto!important}
    body.setka-layout-dragging,body.setka-layout-dragging *{cursor:grabbing!important;user-select:none!important}
    #setka-layout-toolbar{position:fixed;z-index:100000;left:50%;top:calc(var(--safe-top) + 8px);transform:translateX(-50%);display:none;align-items:center;gap:6px;padding:6px;border:1px solid rgba(135,233,255,.52);border-radius:10px;background:rgba(5,7,8,.96);backdrop-filter:blur(16px);box-shadow:0 16px 50px rgba(0,0,0,.42)}
    #setka-layout-toolbar.open{display:flex}
    #setka-layout-toolbar span{padding:0 5px;color:var(--cyan);font-size:8px;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
    #setka-layout-toolbar button{border:1px solid var(--line);background:#0b0e10;color:var(--text);border-radius:7px;padding:7px 9px;font:8px/1 monospace;cursor:pointer}
    #setka-layout-toolbar button[data-layout-action='done']{border-color:rgba(157,255,190,.55);color:var(--green)}
    #setka-layout-toolbar button[data-layout-action='reset']{border-color:rgba(255,210,125,.48);color:var(--amber)}
    #layout-toggle.active{border-color:rgba(135,233,255,.65);color:var(--cyan);box-shadow:0 0 0 1px rgba(135,233,255,.12) inset}
    .setka-layout-floating-control{position:fixed!important;z-index:95!important;right:auto!important;bottom:auto!important;transform:none!important;margin:0!important;}
    @media(max-width:760px){#setka-layout-toolbar{top:auto;bottom:calc(var(--safe-bottom) + 8px);max-width:calc(100vw - 20px);overflow:auto}.setka-layout-handle{width:28px;height:24px}}
  `;
  document.head.appendChild(style);

  function keyFor(el, fallback='item') {
    if (el.id) return `id:${el.id}`;
    if (el.dataset.mode) return `mode:${el.dataset.mode}`;
    if (el.dataset.setkaMoveKey) return el.dataset.setkaMoveKey;
    return fallback;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {}
  }

  function clampRect(left, top, width, height) {
    const minVisible = 42;
    const maxLeft = Math.max(0, innerWidth - minVisible);
    const maxTop = Math.max(0, innerHeight - minVisible);
    return {
      left: Math.min(maxLeft, Math.max(-Math.max(0, width-minVisible), left)),
      top: Math.min(maxTop, Math.max(0, top))
    };
  }

  function applyFree(el, key, pos, {detach=false, panel=false}={}) {
    if (!el || !pos) return;
    if (detach && el.parentElement !== document.body) document.body.appendChild(el);
    el.dataset.setkaMoveKey = key;
    el.classList.add('setka-layout-free');
    if (detach) el.classList.add('setka-layout-floating-control');
    if (panel) el.classList.add('setka-layout-panel');
    const width = Number(pos.width) || el.getBoundingClientRect().width || 80;
    const height = Number(pos.height) || el.getBoundingClientRect().height || 32;
    const p = clampRect(Number(pos.left)||0, Number(pos.top)||0, width, height);
    Object.assign(el.style, {
      position:'fixed', left:`${p.left}px`, top:`${p.top}px`,
      width: pos.width ? `${width}px` : el.style.width,
      height: pos.height ? `${height}px` : el.style.height,
      zIndex:String(pos.z || 90)
    });
  }

  function addHandle(el, key, opts={}) {
    if (!el || el.querySelector(':scope > .setka-layout-handle')) return;
    el.dataset.setkaMoveKey = key;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const h = document.createElement('div');
    h.className = 'setka-layout-handle';
    h.dataset.layoutUi = '1';
    h.title = 'Переместить';
    h.textContent = '⋮⋮';
    h.addEventListener('pointerdown', e => startDrag(e, el, key, opts));
    el.appendChild(h);
  }

  function registerMajor(el, key, opts={}) {
    if (!el) return;
    el.dataset.setkaMoveKey = key;
    addHandle(el, key, opts);
    if (saved[key]?.free) applyFree(el, key, saved[key], opts);
  }

  function registerControl(el, key) {
    if (!el || el.dataset.setkaLayoutBound === '1') return;
    el.dataset.setkaLayoutBound = '1';
    el.dataset.setkaMoveKey = key;
    el.dataset.setkaDirectDrag = '1';
    if (saved[key]?.free) applyFree(el, key, saved[key], {detach:true});
    el.addEventListener('pointerdown', e => {
      if (!runtime.editing) return;
      if (el.dataset.layoutUi === '1') return;
      startDrag(e, el, key, {detach:true});
    });
  }

  function startDrag(e, el, key, opts={}) {
    if (!runtime.editing || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    runtime.z = Math.max(runtime.z + 1, 91);
    if (opts.detach && el.parentElement !== document.body) document.body.appendChild(el);
    el.classList.add('setka-layout-free');
    if (opts.detach) el.classList.add('setka-layout-floating-control');
    if (opts.panel) el.classList.add('setka-layout-panel');
    Object.assign(el.style, {
      position:'fixed', left:`${rect.left}px`, top:`${rect.top}px`,
      right:'auto', bottom:'auto', transform:'none', margin:'0',
      width:`${rect.width}px`, height:`${rect.height}px`, zIndex:String(runtime.z)
    });
    runtime.drag = {
      el, key, opts, startX:e.clientX, startY:e.clientY,
      left:rect.left, top:rect.top, width:rect.width, height:rect.height,
      pointerId:e.pointerId
    };
    document.body.classList.add('setka-layout-dragging');
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
  }

  function onMove(e) {
    const d = runtime.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    e.preventDefault();
    const p = clampRect(d.left + (e.clientX-d.startX), d.top + (e.clientY-d.startY), d.width, d.height);
    d.el.style.left = `${p.left}px`;
    d.el.style.top = `${p.top}px`;
  }

  function endDrag(e) {
    const d = runtime.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const r = d.el.getBoundingClientRect();
    saved[d.key] = { free:true, left:r.left, top:r.top, width:r.width, height:r.height, z:Number(d.el.style.zIndex)||runtime.z };
    saveState();
    runtime.drag = null;
    document.body.classList.remove('setka-layout-dragging');
  }

  window.addEventListener('pointermove', onMove, {passive:false});
  window.addEventListener('pointerup', endDrag, {passive:false});
  window.addEventListener('pointercancel', endDrag, {passive:false});

  document.addEventListener('click', e => {
    if (!runtime.editing) return;
    if (e.target.closest('[data-layout-ui="1"],#setka-layout-toolbar,#layout-toggle')) return;
    const movable = e.target.closest('[data-setka-direct-drag="1"]');
    if (movable) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  function ensureToolbar() {
    let t = qs('#setka-layout-toolbar');
    if (t) return t;
    t = document.createElement('div');
    t.id = 'setka-layout-toolbar';
    t.dataset.layoutUi = '1';
    t.innerHTML = '<span>РАСКЛАДКА · ТАЩИ ЭЛЕМЕНТЫ</span><button type="button" data-layout-ui="1" data-layout-action="done">ГОТОВО</button><button type="button" data-layout-ui="1" data-layout-action="reset">СБРОСИТЬ</button>';
    document.body.appendChild(t);
    t.querySelector('[data-layout-action="done"]').addEventListener('click', () => setEditing(false));
    t.querySelector('[data-layout-action="reset"]').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });
    return t;
  }

  function ensureToggle() {
    let btn = qs('#layout-toggle');
    if (btn) return btn;
    const host = qs('.top-actions') || document.body;
    btn = document.createElement('button');
    btn.id = 'layout-toggle';
    btn.className = 'action';
    btn.type = 'button';
    btn.dataset.layoutUi = '1';
    btn.title = 'Свободная раскладка рабочего стола';
    btn.innerHTML = '✣ <span>Раскладка</span>';
    host.appendChild(btn);
    btn.addEventListener('click', () => setEditing(!runtime.editing));
    return btn;
  }

  function setEditing(on) {
    runtime.editing = Boolean(on);
    document.documentElement.classList.toggle('setka-layout-editing', runtime.editing);
    ensureToolbar().classList.toggle('open', runtime.editing);
    const b = ensureToggle();
    b.classList.toggle('active', runtime.editing);
    b.setAttribute('aria-pressed', runtime.editing ? 'true' : 'false');
  }

  function registerAll() {
    registerMajor(qs('.topbar'), 'major:topbar');
    registerMajor(qs('.mode-strip'), 'major:mode-strip');
    registerMajor(qs('.graph-meta'), 'major:graph-meta');
    registerMajor(qs('.graph-stats'), 'major:graph-stats');
    registerMajor(qs('.source-bar'), 'major:source-bar');
    registerMajor(qs('.graph-controls'), 'major:graph-controls');
    registerMajor(qs('#computer-panel'), 'major:computer-panel', {panel:true});
    registerMajor(qs('#feed-panel'), 'major:feed-panel', {panel:true});
    registerMajor(qs('#entity-card'), 'major:entity-card', {panel:true});
    const contextChip = qs('#b25-context-chip');
    if (contextChip) registerMajor(contextChip, 'major:event-context-chip');

    qsa('.top-actions > .chip, .top-actions > .action').forEach(el => {
      if (el.id === 'layout-toggle') return;
      registerControl(el, `control:${keyFor(el)}`);
    });
    qsa('.mode-strip > .mode-button').forEach(el => registerControl(el, `control:${keyFor(el)}`));
    qsa('.graph-controls > .action').forEach(el => registerControl(el, `control:${keyFor(el)}`));
    qsa('.graph-stats > .metric').forEach((el, i) => registerControl(el, `metric:${el.querySelector('[id]')?.id || i}`));
  }

  ensureToggle();
  ensureToolbar();
  registerAll();

  const observer = new MutationObserver(() => registerAll());
  observer.observe(document.body, {childList:true, subtree:true});

  window.addEventListener('resize', () => {
    qsa('[data-setka-move-key].setka-layout-free').forEach(el => {
      const r = el.getBoundingClientRect();
      const p = clampRect(r.left, r.top, r.width, r.height);
      el.style.left = `${p.left}px`;
      el.style.top = `${p.top}px`;
      const key = el.dataset.setkaMoveKey;
      if (saved[key]) { saved[key].left=p.left; saved[key].top=p.top; saveState(); }
    });
  });

  window.SETKA_WORKSPACE_LAYOUT = Object.freeze({
    version:'B2.6',
    dataBaseline:'B1',
    editing:()=>runtime.editing,
    enter:()=>setEditing(true),
    done:()=>setEditing(false),
    reset:()=>{ localStorage.removeItem(STORAGE_KEY); location.reload(); },
    persistedLocally:true,
    canonMutation:false,
    runtimeMutation:false
  });
})();