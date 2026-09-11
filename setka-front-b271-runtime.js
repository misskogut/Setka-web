(() => {
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const runtime = { busy:false, last:null, rejected:0 };

  document.documentElement.dataset.setkaFrontRuntimeProjection = 'B2.7.1';
  document.documentElement.dataset.setkaFrontVersion = 'B2.7.1';
  document.title = 'SETKA · FRONT B2.7.1 · DATA B1';

  const style = document.createElement('style');
  style.textContent = `
    #setka-b271-grower{position:fixed;z-index:100004;right:10px;top:calc(var(--safe-top) + 54px);width:min(430px,calc(100vw - 20px));display:none;border:1px solid rgba(157,255,190,.42);border-radius:12px;background:rgba(5,7,8,.98);backdrop-filter:blur(18px);box-shadow:0 20px 70px rgba(0,0,0,.52);overflow:hidden}
    #setka-b271-grower.open{display:block}
    #setka-b271-grower .head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;border-bottom:1px solid var(--line)}
    #setka-b271-grower .head strong{font-size:8px;letter-spacing:.12em;color:var(--green);text-transform:uppercase}
    #setka-b271-grower .head button,#setka-b271-grower .body button{border:1px solid var(--line);border-radius:7px;background:#0b0e10;color:var(--text);padding:7px 9px;font:8px/1 monospace;cursor:pointer}
    #setka-b271-grower .body{padding:10px}
    #setka-b271-grower .query{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}
    #setka-b271-grower input{min-width:0;border:1px solid var(--line);border-radius:8px;background:#080b0d;color:var(--text);padding:9px 10px;font:10px/1.3 system-ui,sans-serif;outline:none}
    #setka-b271-grower input:focus{border-color:rgba(157,255,190,.6)}
    #setka-b271-grower [data-grow]{border-color:rgba(157,255,190,.5);color:var(--green)}
    #setka-b271-grower .status{margin-top:8px;color:var(--muted);font:7px/1.5 monospace;white-space:pre-wrap;overflow-wrap:anywhere}
    #setka-b271-grower .truth{margin-top:8px;padding:8px;border:1px solid rgba(135,233,255,.25);border-radius:8px;color:#a9c7c8;font:7px/1.5 monospace}
    #setka-b271-grower .examples{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
    #setka-b271-grower .examples button{padding:6px 7px;color:var(--cyan)}
    #setka-projection-toolbar-extension [data-projection-action='grow']{border-color:rgba(157,255,190,.45)!important;color:var(--green)!important}
    .setka-generated-card[data-setka-runtime-proven='1']::after{content:'SYSTEM BOUND';display:block;margin-top:8px;color:var(--green);font:6px/1 monospace;letter-spacing:.12em}
    @media(max-width:760px){#setka-b271-grower{top:10px;right:10px;max-height:calc(100vh - 20px);overflow:auto}}
  `;
  document.head.appendChild(style);

  function mode() {
    return qs('.mode-button.active')?.dataset?.mode || 'INTEGRATION';
  }

  async function api(path) {
    const r = await fetch(path, {cache:'no-store'});
    const d = await r.json().catch(() => ({ok:false,state:`HTTP_${r.status}`}));
    if (!r.ok || d?.ok === false) throw Object.assign(new Error(d?.state || `HTTP_${r.status}`), {data:d});
    return d;
  }

  function projectionApi() {
    return window.SETKA_FRONT_PROJECTIONS || null;
  }

  function proven(spec) {
    const b = spec?.binding || {};
    const e = spec?.evidence || {};
    return spec?.systemGenerated === true
      && e?.exists === true
      && typeof b.sourceTable === 'string' && b.sourceTable.startsWith('foundation.')
      && typeof b.sourceRef === 'string' && b.sourceRef.length > 0
      && typeof b.bindingKind === 'string' && b.bindingKind.length > 0;
  }

  function markProven(ref) {
    const el = qsa('[data-setka-projection-ref]').find(x => x.dataset.setkaProjectionRef === ref);
    if (el) {
      el.dataset.setkaRuntimeProven = '1';
      el.dataset.setkaRuntimeVersion = 'B2.7.1';
    }
  }

  function cascade(spec, i) {
    if (spec.placement) return spec;
    const col = i % 3;
    const row = Math.floor(i / 3);
    return {
      ...spec,
      placement:{left:18 + col * 168, top:145 + row * 58, z:97 + i}
    };
  }

  function upsertProven(spec, index=0) {
    const api = projectionApi();
    if (!api) throw new Error('PROJECTION_WORKSPACE_NOT_READY');
    if (!proven(spec)) {
      runtime.rejected += 1;
      console.warn('SETKA B2.7.1 rejected unproven system projection', spec);
      return null;
    }
    const prepared = cascade(spec, index);
    const result = api.upsert(prepared);
    markProven(prepared.projectionRef);
    return result;
  }

  function ensureGrower() {
    let box = qs('#setka-b271-grower');
    if (box) return box;
    box = document.createElement('section');
    box.id = 'setka-b271-grower';
    box.dataset.layoutUi = '1';
    box.innerHTML = `
      <div class="head"><strong>ВЫРАСТИТЬ ЭЛЕМЕНТ ИЗ СИСТЕМЫ</strong><button type="button" data-close>ЗАКРЫТЬ</button></div>
      <div class="body">
        <div class="query"><input type="text" autocomplete="off" spellcheck="false" placeholder="Например: связи Вектор / системный отчёт / 3D-граф"><button type="button" data-grow>СОЗДАТЬ</button></div>
        <div class="examples"><button type="button" data-example="системный отчёт">СИСТЕМНЫЙ ОТЧЁТ</button><button type="button" data-example="3D граф">3D ГРАФ</button><button type="button" data-example="карточка сущности">СУЩНОСТЬ</button></div>
        <div class="status">Готово к запросу.</div>
        <div class="truth">FRONT TRUTH GATE · системный элемент появляется только если backend вернул существующий sourceRef. Положение, имя и скрытие не меняют binding.</div>
      </div>`;
    document.body.appendChild(box);
    box.querySelector('[data-close]').addEventListener('click', () => toggleGrower(false));
    box.querySelector('[data-grow]').addEventListener('click', () => requestFromInput());
    box.querySelector('input').addEventListener('keydown', e => { if (e.key === 'Enter') requestFromInput(); });
    box.querySelectorAll('[data-example]').forEach(btn => btn.addEventListener('click', () => {
      box.querySelector('input').value = btn.dataset.example;
      requestFromInput();
    }));
    return box;
  }

  function status(text, bad=false) {
    const el = ensureGrower().querySelector('.status');
    el.textContent = text;
    el.style.color = bad ? 'var(--red)' : 'var(--muted)';
  }

  function toggleGrower(force) {
    const box = ensureGrower();
    const on = typeof force === 'boolean' ? force : !box.classList.contains('open');
    box.classList.toggle('open', on);
    if (on) setTimeout(() => box.querySelector('input')?.focus(), 0);
  }

  function ensureToolbarButton() {
    const ext = qs('#setka-projection-toolbar-extension');
    if (!ext) return null;
    let btn = qs('[data-projection-action="grow"]', ext);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.layoutUi = '1';
    btn.dataset.projectionAction = 'grow';
    btn.textContent = 'ВЫРАСТИТЬ';
    ext.appendChild(btn);
    btn.addEventListener('click', () => toggleGrower());
    return btn;
  }

  async function requestProjections({intent='', entityType=null, entityRef=null, limit=8}={}) {
    if (runtime.busy) return null;
    runtime.busy = true;
    status('SETKA ищет только реальные функции / сущности / связи…');
    try {
      const q = new URLSearchParams({intent:String(intent || ''),mode:mode(),limit:String(limit)});
      if (entityType) q.set('entity_type', entityType);
      if (entityRef) q.set('entity_ref', entityRef);
      const data = await api(`/api/b27/project?${q.toString()}`);
      runtime.last = data;
      const projections = Array.isArray(data.projections) ? data.projections : [];
      let accepted = 0;
      projections.forEach((spec, i) => { if (upsertProven(spec, i)) accepted += 1; });
      if (accepted) {
        status(`${accepted} реальных элементов создано · декоративных 0 · ${data.state}`);
        toggleGrower(false);
      } else {
        status(`Ничего не создано · ${data.state}. Для этого запроса доказанный backend-объект не найден.`, false);
      }
      document.dispatchEvent(new CustomEvent('setka:runtime-projections:ready', {detail:{...data,accepted,rejected:projections.length-accepted}}));
      return data;
    } catch (e) {
      console.error(e);
      status(`ОШИБКА · ${e.data?.state || e.message}`, true);
      return null;
    } finally {
      runtime.busy = false;
    }
  }

  async function requestFromInput() {
    const input = ensureGrower().querySelector('input');
    const intent = String(input?.value || '').trim();
    if (!intent) {
      status('Напиши, что нужно получить из системы.', true);
      return;
    }
    await requestProjections({intent});
  }

  async function inspectBinding(detail) {
    const b = detail?.binding || {};
    if (!b.bindingKind || !b.sourceRef) return;
    const q = new URLSearchParams({kind:b.bindingKind,ref:b.sourceRef});
    if (b.entityType) q.set('entity_type', b.entityType);
    if (b.entityRef) q.set('entity_ref', b.entityRef);
    try {
      const data = await api(`/api/b27/binding?${q.toString()}`);
      if (data.projection) {
        const spec = {...data.projection, placement:{left:Math.max(18, innerWidth - 360),top:125,z:120}};
        upsertProven(spec, 0);
      }
      document.dispatchEvent(new CustomEvent('setka:runtime-binding:ready', {detail:data}));
    } catch (e) {
      console.error(e);
      toggleGrower(true);
      status(`BINDING ERROR · ${e.data?.state || e.message}`, true);
    }
  }

  document.addEventListener('setka:projection:invoke', (event) => {
    const detail = event.detail || {};
    if (!detail.binding) return;
    inspectBinding(detail);
  });

  document.addEventListener('setka:context:request', (event) => {
    const d = event.detail || {};
    requestProjections({
      intent:d.intent || '',
      entityType:d.entityType || d.entity_type || null,
      entityRef:d.entityRef || d.entity_ref || null,
      limit:d.limit || 8
    });
  });

  document.addEventListener('setka:projection:request', (event) => {
    const d = event.detail || {};
    requestProjections({intent:d.intent || '', entityType:d.entityType || null, entityRef:d.entityRef || null, limit:d.limit || 8});
  });

  const observer = new MutationObserver(() => ensureToolbarButton());
  observer.observe(document.body, {childList:true,subtree:true});

  requestAnimationFrame(() => requestAnimationFrame(() => {
    ensureGrower();
    ensureToolbarButton();
  }));

  window.SETKA_RUNTIME_PROJECTIONS = Object.freeze({
    version:'B2.7.1',
    request:requestProjections,
    inspectBinding,
    openGrower:()=>toggleGrower(true),
    closeGrower:()=>toggleGrower(false),
    state:()=>({busy:runtime.busy,last:runtime.last,rejected:runtime.rejected}),
    truthGate:'PROVEN_BACKEND_SOURCE_REF_REQUIRED',
    sources:[
      'foundation.capability_command_catalog',
      'foundation.capability_recipe_registry_v1',
      'foundation.entity_card_registry_v1',
      'foundation.entity_relation_registry_v2'
    ],
    commandExecution:false,
    canonMutation:false,
    runtimeMutation:false
  });
})();
