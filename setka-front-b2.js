(() => {
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "—").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const pretty = (v) => typeof v === "string" ? v : JSON.stringify(v, null, 2);
  const currentMode = () => qs('.mode-button.active')?.dataset?.mode || 'INTEGRATION';

  const style = document.createElement('style');
  style.textContent = `
    .b2-local-badge{padding:7px 9px;border:1px solid rgba(135,233,255,.5);border-radius:9px;color:var(--cyan);font-size:8px;letter-spacing:.09em;white-space:nowrap}
    #computer-panel{padding-bottom:182px}
    #computer-panel>.panel-scroll{height:calc(100% - 55px);padding-bottom:190px}
    .b2-command-dock{position:absolute;z-index:4;left:0;right:0;bottom:0;padding:10px 12px;background:rgba(5,7,8,.98);border-top:1px solid var(--line)}
    .b2-quick{display:flex;gap:5px;overflow-x:auto;margin-bottom:8px;scrollbar-width:none}.b2-quick::-webkit-scrollbar{display:none}
    .b2-quick button,.b2-tabs button,.b2-load{border:1px solid var(--line);background:#0b0e10;color:var(--text);border-radius:7px;padding:7px 8px;font:inherit;font-size:8px;white-space:nowrap;cursor:pointer}
    .b2-tabs button.active{border-color:var(--green);color:var(--green)}
    .b2-command-row{display:grid;grid-template-columns:1fr auto;gap:6px}
    .b2-command-row input,.b2-search{width:100%;border:1px solid var(--line);background:#07090a;color:var(--text);border-radius:7px;padding:9px;font:inherit;font-size:9px;outline:none}
    .b2-command-row button{border:1px solid rgba(157,255,190,.55);background:#0d1711;color:var(--green);border-radius:7px;padding:0 11px;font:inherit;font-size:9px;cursor:pointer}
    .b2-command-state{margin-top:7px;color:var(--muted);font-size:8px;line-height:1.4;max-height:48px;overflow:auto;white-space:pre-wrap}
    .b2-tabs{display:flex;gap:5px;padding:8px 10px;border-bottom:1px solid var(--line);background:rgba(5,7,8,.96);overflow-x:auto;scrollbar-width:none}.b2-tabs::-webkit-scrollbar{display:none}
    .b2-full{display:none;height:calc(100% - 96px);overflow:auto;padding:9px 10px 18px}.b2-full.open{display:block}
    .b2-transcript-head{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;margin-bottom:8px;position:sticky;top:0;background:rgba(12,15,17,.98);padding:3px 0 8px;z-index:2}
    .b2-count{font-size:8px;color:var(--muted);white-space:nowrap}
    .b2-row{border:1px solid var(--line);border-radius:8px;padding:9px;margin-bottom:6px;background:rgba(8,10,12,.76)}
    .b2-row-top{display:flex;justify-content:space-between;gap:8px;font-size:8px}.b2-kind{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.b2-no{color:var(--green);white-space:nowrap}
    .b2-summary{margin-top:6px;color:#bbc5c3;font:11px/1.4 system-ui,sans-serif}.b2-foot{display:flex;justify-content:space-between;gap:8px;margin-top:7px;color:var(--muted);font-size:7px}
    .b2-load{display:block;margin:10px auto 0}.b2-truth{padding:8px;border:1px solid rgba(255,210,125,.3);border-radius:7px;color:var(--amber);font-size:8px;line-height:1.4;margin:8px 0}
    @media(max-width:700px){#computer-panel{bottom:8px;top:90px}.b2-local-badge{display:none}}
  `;
  document.head.appendChild(style);

  function addLocalBadge(){
    const actions = qs('.top-actions');
    if(actions && !qs('.b2-local-badge',actions)){
      const b=document.createElement('span'); b.className='b2-local-badge'; b.textContent='B2 · LOCAL COMMAND';
      actions.insertBefore(b, actions.firstChild);
    }
  }

  async function api(path, options={}){
    const res = await fetch(path, {cache:'no-store', ...options});
    const data = await res.json();
    if(!res.ok || data?.ok===false) throw Object.assign(new Error(data?.state || `HTTP_${res.status}`), {data});
    return data;
  }

  function installCommandDock(){
    const panel=qs('#computer-panel');
    if(!panel || qs('.b2-command-dock',panel)) return;
    const dock=document.createElement('div'); dock.className='b2-command-dock';
    dock.innerHTML=`
      <div class="b2-quick">
        ${['STATUS','SNAPSHOT','GRAPH','EVENTS','REPORT'].map(c=>`<button type="button" data-b2-command="${c}">${c}</button>`).join('')}
      </div>
      <div class="b2-command-row"><input id="b2-command-input" placeholder="Поручение SETKA…" autocomplete="off"><button id="b2-command-send" type="button">SEND</button></div>
      <div class="b2-command-state" id="b2-command-state">LOCAL PRESIDENT INGRESS · non-CANON bounded commands</div>`;
    panel.appendChild(dock);

    const input=qs('#b2-command-input',dock), state=qs('#b2-command-state',dock), send=qs('#b2-command-send',dock);
    const run=async(command)=>{
      command=String(command||'').trim(); if(!command) return;
      state.textContent=`SENDING · ${command}`; send.disabled=true;
      try{
        const result=await api('/api/b2/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,mode:currentMode()})});
        const inner=result.result||result;
        state.textContent=`${result.state || 'DONE'} · ${result.commandRef || ''}\n${pretty(inner).slice(0,1500)}`;
        if(result.state==='RUNTIME_ACTIVATION_NOT_BOUND' || inner?.state==='RUNTIME_ACTIVATION_NOT_BOUND') state.textContent=`RUNTIME ACTIVATION NOT BOUND · view ≠ execution\n${pretty(inner)}`;
      }catch(e){ state.textContent=`STOP · ${e.data?.state || e.message}\n${pretty(e.data||'')}`; }
      finally{send.disabled=false;}
    };
    qsa('[data-b2-command]',dock).forEach(b=>b.addEventListener('click',()=>run(b.dataset.b2Command)));
    send.addEventListener('click',()=>run(input.value));
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){run(input.value);input.select();}});
  }

  let transcriptMode='LIVE';
  let before=null;
  let loaded=[];
  let total=0;

  function installTranscript(){
    const panel=qs('#feed-panel'); if(!panel || qs('.b2-tabs',panel)) return;
    const original=qs('.panel-scroll',panel); if(!original) return;
    const title=qs('.panel-head strong',panel); if(title) title.textContent='Стенограмма';
    const tabs=document.createElement('div'); tabs.className='b2-tabs';
    tabs.innerHTML=`<button class="active" data-b2-stream="LIVE">LIVE / B1</button><button data-b2-stream="SYSTEM">ВСЯ СИСТЕМА</button><button data-b2-stream="BRANCH">ВЕТКА</button>`;
    const full=document.createElement('div'); full.className='b2-full'; full.innerHTML=`<div class="b2-transcript-head"><input class="b2-search" placeholder="Фильтр загруженных записей"><span class="b2-count">—</span></div><div class="b2-truth"></div><div class="b2-rows"></div><button class="b2-load" type="button">ЗАГРУЗИТЬ ЕЩЁ НАЗАД</button>`;
    panel.insertBefore(tabs,original); panel.appendChild(full);

    const render=()=>{
      const filter=qs('.b2-search',full).value.trim().toLowerCase();
      const rows=filter?loaded.filter(r=>JSON.stringify(r).toLowerCase().includes(filter)):loaded;
      qs('.b2-count',full).textContent=`${loaded.length.toLocaleString('ru-RU')} / ${total.toLocaleString('ru-RU')}`;
      qs('.b2-rows',full).innerHTML=rows.map(r=>`<article class="b2-row"><div class="b2-row-top"><span class="b2-kind">${esc(r.eventKind)}</span><span class="b2-no">#${esc(r.eventNo)}</span></div><div class="b2-summary">${esc(r.summary||r.eventKind)}</div><div class="b2-foot"><span>${esc(r.entityRef||r.stream)}</span><span>${esc(r.occurredAt?new Date(r.occurredAt).toLocaleString('ru-RU'):'—')}</span></div></article>`).join('') || '<div class="empty">Нет записей.</div>';
    };
    const load=async(reset=false)=>{
      if(reset){before=null;loaded=[];}
      const params=new URLSearchParams({stream:transcriptMode,mode:currentMode(),limit:'100'}); if(before) params.set('before',String(before));
      qs('.b2-load',full).disabled=true;
      try{
        const d=await api(`/api/b2/transcript?${params}`); total=Number(d.total||0); before=d.nextBeforeNo??null; loaded.push(...(d.rows||[]));
        qs('.b2-truth',full).textContent=d.truthBoundary || 'SANITIZED TRANSCRIPT'; render();
        qs('.b2-load',full).style.display=before && loaded.length<total?'block':'none';
      }catch(e){qs('.b2-rows',full).innerHTML=`<div class="empty">STOP · ${esc(e.data?.state||e.message)}</div>`;}
      finally{qs('.b2-load',full).disabled=false;}
    };
    const select=async(mode)=>{
      transcriptMode=mode;
      qsa('[data-b2-stream]',tabs).forEach(b=>b.classList.toggle('active',b.dataset.b2Stream===mode));
      if(mode==='LIVE'){full.classList.remove('open');original.style.display='block';}
      else{original.style.display='none';full.classList.add('open');await load(true);}
    };
    qsa('[data-b2-stream]',tabs).forEach(b=>b.addEventListener('click',()=>select(b.dataset.b2Stream)));
    qs('.b2-load',full).addEventListener('click',()=>load(false));
    qs('.b2-search',full).addEventListener('input',render);
    qsa('.mode-button').forEach(b=>b.addEventListener('click',()=>{if(transcriptMode==='BRANCH') setTimeout(()=>load(true),80);}));
  }

  async function health(){
    try{
      const h=await api('/api/b2/health');
      console.info('SETKA B2',h);
    }catch(e){console.warn('SETKA B2 bridge unavailable',e);}
  }

  function boot(){ addLocalBadge(); installCommandDock(); installTranscript(); health(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
