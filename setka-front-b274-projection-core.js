(() => {
  const VERSION = 'B2.7.4';
  const STORAGE_KEY = 'setka.front.b27.projections.v1';
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const readJSON = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; } };
  const workspace = readJSON();
  workspace.items ||= {};
  workspace.generated ||= {};
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); } catch {} };

  document.documentElement.dataset.setkaProjectionCore = VERSION;

  function projectionState(ref){ workspace.items[ref] ||= {}; return workspace.items[ref]; }

  function stableRef(el, index=0){
    if(!el) return null;
    if(el.dataset.setkaProjectionRef) return el.dataset.setkaProjectionRef;
    if(el.id) return `builtin:id:${el.id}`;
    if(el.classList.contains('metric')){
      const metricId = el.querySelector('[id]')?.id;
      if(metricId) return `builtin:metric:${metricId}`;
    }
    if(el.dataset.mode) return `builtin:mode:${el.dataset.mode}`;
    const action = el.dataset.action || el.getAttribute('name') || '';
    if(action) return `builtin:action:${action}`;
    const text = String(el.textContent || '').trim().replace(/\s+/g,' ').slice(0,80);
    const parent = el.parentElement?.id || el.parentElement?.classList?.[0] || 'root';
    return `builtin:${parent}:${el.tagName.toLowerCase()}:${text || index}`;
  }

  function labelTarget(el){
    if(!el) return null;
    if(el.classList.contains('metric')) return el.querySelector('span');
    if(el.matches('.panel,.entity-card')) return el.querySelector('.panel-head strong');
    if(el.classList.contains('graph-meta')) return el.querySelector('h1');
    if(el.matches('button.mode-button,button.action,button.chip')){
      const spans = el.querySelectorAll(':scope > span');
      return spans.length === 1 ? spans[0] : el;
    }
    return null;
  }

  function currentLabel(el, ref){
    const saved = workspace.items?.[ref]?.label;
    if(saved) return saved;
    const raw = labelTarget(el)?.textContent?.trim();
    return raw || String(el?.textContent || '').trim() || ref;
  }

  function applyPresentation(el, ref){
    const state = workspace.items?.[ref] || {};
    if(state.label){ const target = labelTarget(el); if(target) target.textContent = state.label; }
    el.classList.toggle('setka-projection-user-hidden', Boolean(state.hidden));
  }

  function adopt(el, index=0, options={}){
    if(!el) return null;
    if(el.closest?.('#setka-b274-vault,#setka-b274-selection,#setka-b274-layoutbar')) return null;
    const ref = options.ref || stableRef(el,index);
    if(!ref) return null;
    el.dataset.setkaProjectionRef = ref;
    el.dataset.setkaProjectionRenameable = options.renameable === false ? '0' : (el.dataset.setkaProjectionRenameable || '1');
    if(options.generated) el.dataset.setkaProjectionGenerated = '1';
    applyPresentation(el,ref);
    return ref;
  }

  function refreshBuiltins(){
    const groups = [
      ['.topbar',{renameable:false}], ['.mode-strip',{renameable:false}], ['.graph-meta',{}],
      ['.graph-stats',{renameable:false}], ['.source-bar',{renameable:false}], ['.graph-controls',{renameable:false}],
      ['#computer-panel',{}], ['#feed-panel',{}], ['#entity-card',{}], ['#b25-context-chip',{renameable:false}]
    ];
    groups.forEach(([selector,opts]) => qsa(selector).forEach((el,i)=>adopt(el,i,opts)));
    qsa('.top-actions > .chip, .top-actions > .action').forEach((el,i)=>{
      if(!['layout-toggle','setka-b274-vault-toggle'].includes(el.id)) adopt(el,i,{renameable:el.matches('button.action')});
    });
    qsa('.mode-strip > .mode-button').forEach((el,i)=>adopt(el,i));
    qsa('.graph-controls > .action').forEach((el,i)=>adopt(el,i));
    qsa('.graph-stats > .metric, body > .metric').forEach((el,i)=>adopt(el,i));
    return qsa('[data-setka-projection-ref]').length;
  }

  function lookup(ref){ return qsa('[data-setka-projection-ref]').find(el=>el.dataset.setkaProjectionRef===ref) || null; }

  function rename(ref,label){
    const el=lookup(ref); if(!el || el.dataset.setkaProjectionRenameable==='0') return false;
    const next=String(label||'').trim(); if(!next) return false;
    projectionState(ref).label=next; applyPresentation(el,ref);
    if(workspace.generated?.[ref]) workspace.generated[ref].label=next;
    save(); return true;
  }

  function remove(ref){
    const el=lookup(ref); if(!el) return false;
    projectionState(ref).hidden=true; applyPresentation(el,ref); save(); return true;
  }

  function restore(ref){
    projectionState(ref).hidden=false; const el=lookup(ref); if(el) applyPresentation(el,ref); save(); return Boolean(el);
  }

  function renderGenerated(spec){
    const kind=String(spec.kind||'button').toLowerCase(); let el;
    if(kind==='card'){
      el=document.createElement('div'); el.className='setka-generated-projection setka-generated-card';
      el.innerHTML='<strong></strong><div class="setka-generated-content"></div>';
      el.querySelector('strong').textContent=spec.label||'Карточка';
      el.querySelector('.setka-generated-content').textContent=spec.content||'';
    }else if(kind==='metric'){
      el=document.createElement('div'); el.className='metric setka-generated-projection'; el.innerHTML='<b></b><span></span>';
      el.querySelector('b').textContent=spec.value ?? '—'; el.querySelector('span').textContent=spec.label||'Датчик';
    }else{
      el=document.createElement('button'); el.type='button'; el.className=`${kind==='tab'?'mode-button':'action'} setka-generated-projection`;
      el.textContent=spec.label||(kind==='tab'?'Вкладка':'Действие');
    }
    return el;
  }

  function upsert(spec={}){
    const ref=String(spec.projectionRef||spec.ref||'').trim(); if(!ref) throw new Error('projectionRef is required');
    let el=lookup(ref);
    if(!el){
      el=renderGenerated(spec); document.body.appendChild(el);
      adopt(el,0,{ref,generated:true,renameable:spec.renameable!==false});
      if(el.matches('button')) el.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('setka:projection:invoke',{detail:{projectionRef:ref,kind:spec.kind||'button',binding:spec.binding||null,context:spec.context||null}})));
    }
    workspace.generated[ref]={
      projectionRef:ref,kind:spec.kind||'button',label:spec.label||currentLabel(el,ref),content:spec.content||'',value:spec.value??null,
      binding:spec.binding||workspace.generated?.[ref]?.binding||null,context:spec.context||workspace.generated?.[ref]?.context||null,
      persistence:spec.persistence||workspace.generated?.[ref]?.persistence||'ephemeral'
    };
    if(spec.label){ projectionState(ref).label=spec.label; applyPresentation(el,ref); }
    if(spec.kind==='metric' && spec.value!==undefined) el.querySelector('b').textContent=spec.value;
    if(spec.kind==='card' && spec.content!==undefined) el.querySelector('.setka-generated-content').textContent=spec.content;
    save(); return {projectionRef:ref,element:el};
  }

  function pin(ref,pinned=true){ const spec=workspace.generated?.[ref]; if(!spec) return false; spec.persistence=pinned?'pinned':'ephemeral'; save(); return true; }

  function list(){
    refreshBuiltins();
    return qsa('[data-setka-projection-ref]').map(el=>{
      const ref=el.dataset.setkaProjectionRef;
      return {projectionRef:ref,label:currentLabel(el,ref),hidden:Boolean(workspace.items?.[ref]?.hidden),generated:el.dataset.setkaProjectionGenerated==='1',binding:workspace.generated?.[ref]?.binding||null,context:workspace.generated?.[ref]?.context||null};
    });
  }

  function rehydrateGenerated(){
    Object.values(workspace.generated||{}).forEach(spec=>{ if(spec?.projectionRef && ['local','pinned'].includes(spec.persistence)) upsert(spec); });
  }

  const style=document.createElement('style');
  style.textContent='.setka-projection-user-hidden{display:none!important}.setka-generated-projection{position:fixed;z-index:96}.setka-generated-card{width:min(320px,calc(100vw - 30px));min-height:90px;padding:12px;border:1px solid var(--line);border-radius:11px;background:rgba(8,10,12,.92);box-shadow:0 18px 70px rgba(0,0,0,.38);backdrop-filter:blur(16px);font-size:9px;line-height:1.5}.setka-generated-card strong{display:block;margin-bottom:7px;font-size:9px}';
  document.head.appendChild(style);

  refreshBuiltins(); rehydrateGenerated(); refreshBuiltins();

  document.addEventListener('setka:projection:upsert',e=>{ if(e.detail) upsert(e.detail); });
  document.addEventListener('setka:projection:remove',e=>{ const ref=e.detail?.projectionRef||e.detail?.ref; if(ref) remove(ref); });
  document.addEventListener('setka:projection:rename',e=>{ const ref=e.detail?.projectionRef||e.detail?.ref; if(ref&&e.detail?.label) rename(ref,e.detail.label); });

  window.SETKA_FRONT_PROJECTIONS=Object.freeze({
    version:VERSION,dataBaseline:'B1',principle:'projection_state_and_layout_are_separate',refreshBuiltins,upsert,remove,rename,restore,pin,list,
    dynamicKinds:['button','tab','card','metric'],localUserState:true,layoutWriter:false,mutationObserver:false,pollingLoop:false,canonMutation:false,runtimeMutation:false
  });
})();