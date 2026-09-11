(() => {
  const LEGACY_STORAGE_KEY = 'setka.front.b26.workspace.v1';
  const PROJECTION_STORAGE_KEY = 'setka.front.b27.projections.v1';
  const SENSOR_IDS = ['nodes-count', 'edges-count', 'event-tip', 'graph-bound'];
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const readJSON = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; }
    catch { return {}; }
  };
  const writeJSON = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch {}
  };

  const legacy = readJSON(LEGACY_STORAGE_KEY);
  const workspace = readJSON(PROJECTION_STORAGE_KEY);
  workspace.items ||= {};
  workspace.generated ||= {};

  const runtime = {
    selectedRef: null,
    libraryOpen: false,
    adopting: false,
    drag: null
  };

  document.documentElement.dataset.setkaFrontPatch = 'B2.7-PROJECTION-WORKSPACE';
  document.documentElement.dataset.setkaFrontVersion = 'B2.7';
  document.title = 'SETKA · FRONT B2.7 · DATA B1';

  const style = document.createElement('style');
  style.textContent = `
    .setka-projection-user-hidden{display:none!important;}
    #graph-stats.setka-projection-source-empty{display:none!important;}

    .metric[data-setka-projection-ref]{
      min-width:82px!important;
      width:max-content!important;
      max-width:156px!important;
      height:auto!important;
      padding:6px 8px!important;
      pointer-events:auto!important;
    }
    .metric[data-setka-projection-ref] b{font-size:11px!important;line-height:1.1!important;}
    .metric[data-setka-projection-ref] span{margin-top:2px!important;font-size:6px!important;line-height:1.25!important;}

    .setka-layout-editing [data-setka-projection-ref]{
      outline:1px dashed rgba(135,233,255,.34);
      outline-offset:2px;
    }
    [data-setka-projection-ref].setka-projection-selected{
      outline:1px solid rgba(135,233,255,.88)!important;
      outline-offset:3px!important;
      box-shadow:0 0 0 1px rgba(135,233,255,.15),0 0 24px rgba(135,233,255,.12)!important;
    }

    #setka-projection-anchor{
      position:fixed;
      z-index:100002;
      right:10px;
      top:calc(var(--safe-top) + 8px);
      width:31px;
      height:31px;
      display:grid;
      place-items:center;
      border:1px solid rgba(135,233,255,.42);
      border-radius:9px;
      background:rgba(5,7,8,.88);
      color:var(--cyan);
      font:13px/1 monospace;
      cursor:pointer;
      backdrop-filter:blur(14px);
      box-shadow:0 8px 30px rgba(0,0,0,.28);
    }
    #setka-projection-anchor.active{
      border-color:rgba(157,255,190,.72);
      color:var(--green);
    }

    #setka-projection-toolbar-extension{
      display:flex;
      align-items:center;
      gap:5px;
      padding-left:4px;
      border-left:1px solid var(--line);
    }
    #setka-projection-toolbar-extension .setka-selection-name{
      max-width:150px;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      color:var(--cyan);
      font-size:7px;
      letter-spacing:.06em;
      text-transform:none;
    }
    #setka-projection-toolbar-extension button:disabled{
      opacity:.35;
      cursor:default;
    }

    #setka-projection-library{
      position:fixed;
      z-index:100003;
      top:calc(var(--safe-top) + 54px);
      right:10px;
      width:min(360px,calc(100vw - 20px));
      max-height:min(560px,calc(100vh - 100px));
      display:none;
      overflow:hidden;
      border:1px solid rgba(135,233,255,.42);
      border-radius:12px;
      background:rgba(5,7,8,.97);
      backdrop-filter:blur(18px);
      box-shadow:0 20px 70px rgba(0,0,0,.5);
    }
    #setka-projection-library.open{display:block;}
    #setka-projection-library .head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      padding:10px 11px;
      border-bottom:1px solid var(--line);
    }
    #setka-projection-library .head strong{
      font-size:8px;
      letter-spacing:.12em;
      color:var(--cyan);
      text-transform:uppercase;
    }
    #setka-projection-library .head button{
      border:1px solid var(--line);
      border-radius:7px;
      background:#0b0e10;
      color:var(--text);
      padding:6px 8px;
      font:8px/1 monospace;
      cursor:pointer;
    }
    #setka-projection-library .list{
      max-height:480px;
      overflow:auto;
      padding:8px;
    }
    #setka-projection-library .row{
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      align-items:center;
      gap:8px;
      padding:8px;
      border-bottom:1px solid rgba(39,48,54,.55);
    }
    #setka-projection-library .row:last-child{border-bottom:0;}
    #setka-projection-library .row .meta{min-width:0;}
    #setka-projection-library .row b{
      display:block;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-size:8px;
      font-weight:500;
    }
    #setka-projection-library .row small{
      display:block;
      margin-top:3px;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      color:var(--muted);
      font-size:7px;
    }
    #setka-projection-library .row button{
      border:1px solid rgba(157,255,190,.35);
      border-radius:7px;
      background:#0b0e10;
      color:var(--green);
      padding:7px 8px;
      font:7px/1 monospace;
      cursor:pointer;
    }
    #setka-projection-library .empty{
      padding:18px 10px;
      color:var(--muted);
      text-align:center;
      font-size:8px;
      line-height:1.5;
    }

    .setka-generated-projection{
      position:fixed;
      z-index:96;
      left:20px;
      top:140px;
    }
    .setka-generated-card{
      width:min(320px,calc(100vw - 30px));
      min-height:90px;
      padding:12px;
      border:1px solid var(--line);
      border-radius:11px;
      background:rgba(8,10,12,.92);
      box-shadow:0 18px 70px rgba(0,0,0,.38);
      backdrop-filter:blur(16px);
      font-size:9px;
      line-height:1.5;
    }
    .setka-generated-card strong{
      display:block;
      margin-bottom:7px;
      font-size:9px;
      letter-spacing:.08em;
      text-transform:uppercase;
    }

    @media(max-width:760px){
      #setka-projection-anchor{top:auto;bottom:calc(var(--safe-bottom) + 8px);}
      #setka-projection-library{top:10px;right:10px;max-height:calc(100vh - 20px);}
      #setka-projection-toolbar-extension .setka-selection-name{display:none;}
    }
  `;
  document.head.appendChild(style);

  function saveWorkspace() {
    writeJSON(PROJECTION_STORAGE_KEY, workspace);
  }

  function saveLegacy() {
    writeJSON(LEGACY_STORAGE_KEY, legacy);
  }

  function projectionState(ref) {
    workspace.items[ref] ||= {};
    return workspace.items[ref];
  }

  function stableRef(el, index=0) {
    if (!el) return null;
    if (el.dataset.setkaProjectionRef) return el.dataset.setkaProjectionRef;
    if (el.id) return `builtin:id:${el.id}`;
    const metricId = el.classList.contains('metric') ? el.querySelector('[id]')?.id : null;
    if (metricId) return `builtin:metric:${metricId}`;
    if (el.dataset.mode) return `builtin:mode:${el.dataset.mode}`;
    const moveKey = el.dataset.setkaMoveKey;
    if (moveKey) return `builtin:move:${moveKey}`;
    const parent = el.parentElement?.className?.toString?.().split(/\s+/).filter(Boolean)[0] || 'root';
    const kind = el.className?.toString?.().split(/\s+/).filter(Boolean)[0] || el.tagName.toLowerCase();
    return `builtin:${parent}:${kind}:${index}`;
  }

  function labelTarget(el) {
    if (!el) return null;
    if (el.classList.contains('metric')) return el.querySelector('span');
    if (el.matches('.panel,.entity-card')) return el.querySelector('.panel-head strong');
    if (el.classList.contains('graph-meta')) return el.querySelector('h1');
    if (el.matches('button.mode-button,button.action')) {
      const spans = el.querySelectorAll(':scope > span');
      return spans.length === 1 ? spans[0] : el;
    }
    return null;
  }

  function currentLabel(el, ref) {
    const saved = workspace.items?.[ref]?.label;
    if (saved) return saved;
    const target = labelTarget(el);
    const raw = target?.textContent?.trim();
    return raw || ref;
  }

  function applyLabel(el, ref) {
    const label = workspace.items?.[ref]?.label;
    if (!label) return;
    const target = labelTarget(el);
    if (target && target.textContent !== label) target.textContent = label;
  }

  function applyHidden(el, ref) {
    const hidden = Boolean(workspace.items?.[ref]?.hidden);
    el.classList.toggle('setka-projection-user-hidden', hidden);
  }

  function adopt(el, index=0, options={}) {
    if (!el || el.id === 'layout-toggle' || el.id === 'setka-projection-anchor') return null;
    if (el.closest?.('#setka-layout-toolbar,#setka-projection-library')) return null;
    const ref = options.ref || stableRef(el, index);
    if (!ref) return null;
    el.dataset.setkaProjectionRef = ref;
    if (options.generated) {
      el.dataset.setkaProjectionGenerated = '1';
      el.dataset.setkaDirectDrag = '1';
    }
    if (options.renameable === false) el.dataset.setkaProjectionRenameable = '0';
    else if (!el.dataset.setkaProjectionRenameable) el.dataset.setkaProjectionRenameable = '1';
    applyLabel(el, ref);
    applyHidden(el, ref);
    return ref;
  }

  function detachSensorsIndependently() {
    const stats = qs('#graph-stats');
    if (!stats) return { ok:false, state:'GRAPH_STATS_MISSING', restored:0 };

    const groupRect = stats.getBoundingClientRect();
    const oldGroup = legacy['major:graph-stats'];
    const startLeft = Number.isFinite(Number(oldGroup?.left)) ? Number(oldGroup.left) : (groupRect.left || 16);
    const startTop = Number.isFinite(Number(oldGroup?.top)) ? Number(oldGroup.top) : (groupRect.top || Math.max(70, innerHeight - 120));

    const metrics = SENSOR_IDS.map((id) => {
      const valueNode = document.getElementById(id);
      const metric = valueNode?.closest('.metric');
      return metric ? {id, metric, rect:metric.getBoundingClientRect()} : null;
    }).filter(Boolean);

    metrics.forEach(({id, metric, rect}, i) => {
      const legacyKey = `metric:${id}`;
      const previous = legacy[legacyKey];
      const width = clamp(rect.width || 96, 82, 156);
      const height = clamp(rect.height || 34, 28, 64);
      const fallbackLeft = startLeft + (i % 4) * 112;
      const fallbackTop = startTop + Math.floor(i / 4) * 48;
      const left = clamp(Number(previous?.left ?? rect.left ?? fallbackLeft), 8, Math.max(8, innerWidth - width - 8));
      const top = clamp(Number(previous?.top ?? rect.top ?? fallbackTop), 8, Math.max(8, innerHeight - height - 8));

      if (metric.parentElement !== document.body) document.body.appendChild(metric);
      metric.classList.add('setka-layout-free','setka-layout-floating-control');
      metric.classList.remove('setka-critical-sensor');
      metric.dataset.setkaMoveKey = legacyKey;
      metric.dataset.setkaLayoutBound = '1';
      metric.dataset.setkaDirectDrag = '1';
      Object.assign(metric.style, {
        position:'fixed',
        left:`${left}px`,
        top:`${top}px`,
        right:'auto',
        bottom:'auto',
        transform:'none',
        margin:'0',
        zIndex:String(Math.max(96, Number(previous?.z) || 96)),
        display:'block',
        visibility:'visible',
        opacity:'1',
        pointerEvents:'auto'
      });

      legacy[legacyKey] = {
        free:true,
        left,
        top,
        width,
        height,
        z:Math.max(96, Number(previous?.z) || 96)
      };
      adopt(metric, i, {ref:`builtin:metric:${id}`});
    });

    delete legacy['major:graph-stats'];
    saveLegacy();

    stats.classList.remove('setka-sensors-restored');
    stats.classList.add('setka-projection-source-empty');
    ['position','left','top','right','bottom','transform','width','height','z-index','display','visibility','opacity']
      .forEach((name) => stats.style.removeProperty(name));

    return {
      ok: metrics.length === SENSOR_IDS.length,
      state: metrics.length === SENSOR_IDS.length ? 'GRAPH_SENSORS_INDEPENDENT' : 'GRAPH_SENSORS_PARTIAL',
      restored:metrics.length,
      expected:SENSOR_IDS.length
    };
  }

  function adoptBuiltins() {
    if (runtime.adopting) return;
    runtime.adopting = true;
    try {
      const groups = [
        ['.topbar', {renameable:false}],
        ['.mode-strip', {renameable:false}],
        ['.graph-meta', {}],
        ['.source-bar', {renameable:false}],
        ['.graph-controls', {renameable:false}],
        ['#computer-panel', {}],
        ['#feed-panel', {}],
        ['#entity-card', {}],
        ['#b25-context-chip', {renameable:false}]
      ];
      groups.forEach(([selector, options]) => {
        qsa(selector).forEach((el, i) => adopt(el, i, options));
      });

      qsa('.top-actions > .chip, .top-actions > .action').forEach((el, i) => {
        if (el.id !== 'layout-toggle') adopt(el, i, {renameable:el.matches('button.action')});
      });
      qsa('.mode-strip > .mode-button').forEach((el, i) => adopt(el, i));
      qsa('.graph-controls > .action').forEach((el, i) => adopt(el, i));
      qsa('.metric').forEach((el, i) => adopt(el, i));
    } finally {
      runtime.adopting = false;
    }
  }

  function lookup(ref) {
    if (!ref) return null;
    return qsa('[data-setka-projection-ref]').find((el) => el.dataset.setkaProjectionRef === ref) || null;
  }

  function select(ref) {
    runtime.selectedRef = ref || null;
    qsa('.setka-projection-selected').forEach((el) => el.classList.remove('setka-projection-selected'));
    const el = lookup(runtime.selectedRef);
    if (el) el.classList.add('setka-projection-selected');
    updateToolbarSelection();
  }

  function rename(ref, label) {
    const el = lookup(ref);
    if (!el || el.dataset.setkaProjectionRenameable === '0') return false;
    const next = String(label ?? '').trim();
    if (!next) return false;
    projectionState(ref).label = next;
    applyLabel(el, ref);
    saveWorkspace();
    if (workspace.generated?.[ref]) {
      workspace.generated[ref].label = next;
      saveWorkspace();
    }
    updateToolbarSelection();
    renderLibrary();
    return true;
  }

  function removeFromWorkspace(ref) {
    const el = lookup(ref);
    if (!el) return false;
    projectionState(ref).hidden = true;
    el.classList.add('setka-projection-user-hidden');
    saveWorkspace();
    if (runtime.selectedRef === ref) select(null);
    renderLibrary();
    return true;
  }

  function restore(ref) {
    const state = projectionState(ref);
    state.hidden = false;
    saveWorkspace();
    const el = lookup(ref);
    if (el) el.classList.remove('setka-projection-user-hidden');
    renderLibrary();
    return Boolean(el);
  }

  function hiddenRefs() {
    return Object.entries(workspace.items)
      .filter(([, state]) => state?.hidden)
      .map(([ref]) => ref);
  }

  function ensureAnchor() {
    let btn = qs('#setka-projection-anchor');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'setka-projection-anchor';
    btn.type = 'button';
    btn.dataset.layoutUi = '1';
    btn.title = 'Верстак: перемещение, имя, удаление и восстановление элементов';
    btn.textContent = '✣';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => {
      const api = window.SETKA_WORKSPACE_LAYOUT;
      if (!api) return;
      if (api.editing?.()) api.done?.();
      else api.enter?.();
      requestAnimationFrame(syncAnchor);
    });
    return btn;
  }

  function syncAnchor() {
    const btn = ensureAnchor();
    const editing = Boolean(window.SETKA_WORKSPACE_LAYOUT?.editing?.());
    btn.classList.toggle('active', editing);
  }

  function ensureLibrary() {
    let lib = qs('#setka-projection-library');
    if (lib) return lib;
    lib = document.createElement('div');
    lib.id = 'setka-projection-library';
    lib.dataset.layoutUi = '1';
    lib.innerHTML = `
      <div class="head">
        <strong>ЭЛЕМЕНТЫ ВЕРСТАКА</strong>
        <button type="button" data-close>ЗАКРЫТЬ</button>
      </div>
      <div class="list"></div>
    `;
    document.body.appendChild(lib);
    lib.querySelector('[data-close]').addEventListener('click', () => toggleLibrary(false));
    return lib;
  }

  function renderLibrary() {
    const lib = ensureLibrary();
    const list = lib.querySelector('.list');
    const refs = hiddenRefs();
    if (!refs.length) {
      list.innerHTML = '<div class="empty">Скрытых элементов нет.<br>Удаление с верстака не удаляет функцию из системы.</div>';
      return;
    }
    list.innerHTML = '';
    refs.forEach((ref) => {
      const el = lookup(ref);
      const state = workspace.items[ref] || {};
      const row = document.createElement('div');
      row.className = 'row';
      const label = state.label || currentLabel(el, ref);
      row.innerHTML = `
        <div class="meta"><b></b><small></small></div>
        <button type="button">ВЕРНУТЬ</button>
      `;
      row.querySelector('b').textContent = label;
      row.querySelector('small').textContent = ref;
      row.querySelector('button').addEventListener('click', () => restore(ref));
      list.appendChild(row);
    });
  }

  function toggleLibrary(force) {
    const lib = ensureLibrary();
    runtime.libraryOpen = typeof force === 'boolean' ? force : !runtime.libraryOpen;
    lib.classList.toggle('open', runtime.libraryOpen);
    if (runtime.libraryOpen) renderLibrary();
  }

  function ensureToolbarExtension() {
    const toolbar = qs('#setka-layout-toolbar');
    if (!toolbar) return null;
    let ext = qs('#setka-projection-toolbar-extension', toolbar);
    if (ext) return ext;
    ext = document.createElement('div');
    ext.id = 'setka-projection-toolbar-extension';
    ext.dataset.layoutUi = '1';
    ext.innerHTML = `
      <span class="setka-selection-name">НИЧЕГО НЕ ВЫБРАНО</span>
      <button type="button" data-layout-ui="1" data-projection-action="rename" disabled>ИМЯ</button>
      <button type="button" data-layout-ui="1" data-projection-action="remove" disabled>УДАЛИТЬ</button>
      <button type="button" data-layout-ui="1" data-projection-action="library">ЭЛЕМЕНТЫ</button>
    `;
    toolbar.appendChild(ext);

    ext.querySelector('[data-projection-action="rename"]').addEventListener('click', () => {
      const ref = runtime.selectedRef;
      const el = lookup(ref);
      if (!el || el.dataset.setkaProjectionRenameable === '0') return;
      const old = currentLabel(el, ref);
      const next = window.prompt('Новое имя элемента', old);
      if (next !== null) rename(ref, next);
    });
    ext.querySelector('[data-projection-action="remove"]').addEventListener('click', () => {
      if (runtime.selectedRef) removeFromWorkspace(runtime.selectedRef);
    });
    ext.querySelector('[data-projection-action="library"]').addEventListener('click', () => toggleLibrary());

    return ext;
  }

  function updateToolbarSelection() {
    const ext = ensureToolbarExtension();
    if (!ext) return;
    const name = ext.querySelector('.setka-selection-name');
    const renameButton = ext.querySelector('[data-projection-action="rename"]');
    const removeButton = ext.querySelector('[data-projection-action="remove"]');
    const el = lookup(runtime.selectedRef);
    if (!el) {
      name.textContent = 'НИЧЕГО НЕ ВЫБРАНО';
      renameButton.disabled = true;
      removeButton.disabled = true;
      return;
    }
    name.textContent = currentLabel(el, runtime.selectedRef);
    renameButton.disabled = el.dataset.setkaProjectionRenameable === '0';
    removeButton.disabled = false;
  }

  function placeGenerated(el, spec) {
    const p = spec.placement || {};
    const rect = el.getBoundingClientRect();
    const width = Math.max(50, rect.width || 110);
    const height = Math.max(28, rect.height || 38);
    const left = clamp(Number(p.left ?? 20), 8, Math.max(8, innerWidth - width - 8));
    const top = clamp(Number(p.top ?? 140), 8, Math.max(8, innerHeight - height - 8));
    Object.assign(el.style, {
      position:'fixed',
      left:`${left}px`,
      top:`${top}px`,
      right:'auto',
      bottom:'auto',
      transform:'none',
      zIndex:String(Number(p.z) || 96)
    });
  }

  function renderGenerated(spec) {
    const kind = String(spec.kind || 'button').toLowerCase();
    let el;
    if (kind === 'card') {
      el = document.createElement('div');
      el.className = 'setka-generated-projection setka-generated-card';
      el.innerHTML = '<strong></strong><div class="setka-generated-content"></div>';
      el.querySelector('strong').textContent = spec.label || 'Карточка';
      el.querySelector('.setka-generated-content').textContent = spec.content || '';
    } else if (kind === 'metric') {
      el = document.createElement('div');
      el.className = 'metric setka-generated-projection';
      el.innerHTML = '<b></b><span></span>';
      el.querySelector('b').textContent = spec.value ?? '—';
      el.querySelector('span').textContent = spec.label || 'Датчик';
    } else {
      el = document.createElement('button');
      el.type = 'button';
      el.className = `${kind === 'tab' ? 'mode-button' : 'action'} setka-generated-projection`;
      el.textContent = spec.label || (kind === 'tab' ? 'Вкладка' : 'Действие');
    }
    return el;
  }

  function upsert(spec={}) {
    const ref = String(spec.projectionRef || spec.ref || '').trim();
    if (!ref) throw new Error('projectionRef is required');

    let el = lookup(ref);
    if (!el) {
      el = renderGenerated(spec);
      el.dataset.setkaProjectionRef = ref;
      el.dataset.setkaProjectionGenerated = '1';
      el.dataset.setkaProjectionRenameable = spec.renameable === false ? '0' : '1';
      document.body.appendChild(el);
      placeGenerated(el, spec);

      if (el.matches('button')) {
        el.addEventListener('click', () => {
          document.dispatchEvent(new CustomEvent('setka:projection:invoke', {
            detail: {
              projectionRef:ref,
              kind:spec.kind || 'button',
              binding:spec.binding || null,
              context:spec.context || null
            }
          }));
        });
      }
    }

    workspace.generated[ref] = {
      projectionRef:ref,
      kind:spec.kind || 'button',
      label:spec.label || currentLabel(el, ref),
      content:spec.content || '',
      value:spec.value ?? null,
      binding:spec.binding || null,
      context:spec.context || null,
      placement:spec.placement || workspace.generated?.[ref]?.placement || null,
      persistence:spec.persistence || workspace.generated?.[ref]?.persistence || 'ephemeral'
    };

    if (spec.label) {
      projectionState(ref).label = spec.label;
      applyLabel(el, ref);
      if (el.classList.contains('setka-generated-card')) el.querySelector('strong').textContent = spec.label;
    }
    if (spec.kind === 'metric' && spec.value !== undefined) el.querySelector('b').textContent = spec.value;
    if (spec.kind === 'card' && spec.content !== undefined) el.querySelector('.setka-generated-content').textContent = spec.content;

    adopt(el, 0, {ref, generated:true, renameable:spec.renameable !== false});
    saveWorkspace();
    return {projectionRef:ref, element:el};
  }

  function dismissGenerated(ref) {
    const el = lookup(ref);
    if (el?.dataset.setkaProjectionGenerated === '1') el.remove();
    delete workspace.generated[ref];
    delete workspace.items[ref];
    saveWorkspace();
    if (runtime.selectedRef === ref) select(null);
    renderLibrary();
  }

  function pin(ref, pinned=true) {
    const spec = workspace.generated?.[ref];
    if (!spec) return false;
    spec.persistence = pinned ? 'pinned' : 'ephemeral';
    saveWorkspace();
    return true;
  }

  function list() {
    return qsa('[data-setka-projection-ref]').map((el) => {
      const ref = el.dataset.setkaProjectionRef;
      return {
        projectionRef:ref,
        label:currentLabel(el, ref),
        hidden:Boolean(workspace.items?.[ref]?.hidden),
        generated:el.dataset.setkaProjectionGenerated === '1',
        binding:workspace.generated?.[ref]?.binding || null,
        context:workspace.generated?.[ref]?.context || null
      };
    });
  }

  function startGeneratedDrag(event, el) {
    if (!window.SETKA_WORKSPACE_LAYOUT?.editing?.()) return;
    if (event.button > 0) return;
    if (event.target.closest?.('#setka-layout-toolbar,#setka-projection-library,#setka-projection-anchor')) return;
    const ref = el.dataset.setkaProjectionRef;
    if (!ref) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = el.getBoundingClientRect();
    runtime.drag = {
      ref,
      el,
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      left:rect.left,
      top:rect.top,
      width:rect.width,
      height:rect.height
    };
    document.body.classList.add('setka-layout-dragging');
    try { el.setPointerCapture?.(event.pointerId); } catch {}
  }

  function moveGeneratedDrag(event) {
    const d = runtime.drag;
    if (!d || d.pointerId !== event.pointerId) return;
    event.preventDefault();
    const left = clamp(d.left + (event.clientX - d.startX), 8, Math.max(8, innerWidth - d.width - 8));
    const top = clamp(d.top + (event.clientY - d.startY), 8, Math.max(8, innerHeight - d.height - 8));
    d.el.style.left = `${left}px`;
    d.el.style.top = `${top}px`;
  }

  function endGeneratedDrag(event) {
    const d = runtime.drag;
    if (!d || d.pointerId !== event.pointerId) return;
    const rect = d.el.getBoundingClientRect();
    const generated = workspace.generated?.[d.ref];
    if (generated) {
      generated.placement = {
        left:rect.left,
        top:rect.top,
        z:Number(d.el.style.zIndex) || 96
      };
      saveWorkspace();
    }
    runtime.drag = null;
    document.body.classList.remove('setka-layout-dragging');
  }

  document.addEventListener('pointerdown', (event) => {
    const generated = event.target.closest?.('[data-setka-projection-generated="1"]');
    if (generated) startGeneratedDrag(event, generated);
  }, true);
  window.addEventListener('pointermove', moveGeneratedDrag, {passive:false});
  window.addEventListener('pointerup', endGeneratedDrag, {passive:false});
  window.addEventListener('pointercancel', endGeneratedDrag, {passive:false});

  document.addEventListener('pointerdown', (event) => {
    const editing = Boolean(window.SETKA_WORKSPACE_LAYOUT?.editing?.());
    if (!editing) return;
    if (event.target.closest?.('#setka-layout-toolbar,#setka-projection-library,#setka-projection-anchor')) return;
    const el = event.target.closest?.('[data-setka-projection-ref]');
    if (el) select(el.dataset.setkaProjectionRef);
  }, true);

  document.addEventListener('setka:projection:upsert', (event) => {
    if (event.detail) upsert(event.detail);
  });
  document.addEventListener('setka:projection:remove', (event) => {
    const ref = event.detail?.projectionRef || event.detail?.ref;
    if (ref) removeFromWorkspace(ref);
  });
  document.addEventListener('setka:projection:rename', (event) => {
    const ref = event.detail?.projectionRef || event.detail?.ref;
    if (ref && event.detail?.label) rename(ref, event.detail.label);
  });

  function rehydrateGenerated() {
    Object.values(workspace.generated || {}).forEach((spec) => {
      if (!spec?.projectionRef) return;
      if (!['local','pinned'].includes(spec.persistence)) return;
      upsert(spec);
    });
  }

  const observer = new MutationObserver(() => {
    if (runtime.adopting) return;
    adoptBuiltins();
    if (runtime.selectedRef) updateToolbarSelection();
  });
  observer.observe(document.body, {childList:true, subtree:true});

  requestAnimationFrame(() => requestAnimationFrame(() => {
    detachSensorsIndependently();
    rehydrateGenerated();
    adoptBuiltins();
    ensureAnchor();
    ensureLibrary();
    ensureToolbarExtension();
    syncAnchor();
    renderLibrary();
  }));

  window.addEventListener('resize', () => requestAnimationFrame(() => {
    SENSOR_IDS.forEach((id) => {
      const metric = document.getElementById(id)?.closest('.metric');
      if (!metric) return;
      const rect = metric.getBoundingClientRect();
      const left = clamp(rect.left, 8, Math.max(8, innerWidth - rect.width - 8));
      const top = clamp(rect.top, 8, Math.max(8, innerHeight - rect.height - 8));
      metric.style.left = `${left}px`;
      metric.style.top = `${top}px`;
      const key = `metric:${id}`;
      if (legacy[key]) {
        legacy[key].left = left;
        legacy[key].top = top;
      }
    });
    saveLegacy();
  }));

  setInterval(syncAnchor, 350);

  window.SETKA_SENSOR_RECOVERY = Object.freeze({
    version:'B2.7',
    recover:detachSensorsIndependently,
    sensors:[...SENSOR_IDS],
    independent:true,
    compact:true,
    canonMutation:false,
    runtimeMutation:false
  });

  window.SETKA_FRONT_PROJECTIONS = Object.freeze({
    version:'B2.7',
    dataBaseline:'B1',
    principle:'presentation_position_is_not_system_binding',
    upsert,
    remove:removeFromWorkspace,
    dismissGenerated,
    rename,
    restore,
    pin,
    list,
    openLibrary:()=>toggleLibrary(true),
    closeLibrary:()=>toggleLibrary(false),
    eventContract:{
      upsert:'setka:projection:upsert',
      invoke:'setka:projection:invoke',
      remove:'setka:projection:remove',
      rename:'setka:projection:rename'
    },
    dynamicKinds:['button','tab','card','metric'],
    localUserState:true,
    canonMutation:false,
    runtimeMutation:false
  });
})();