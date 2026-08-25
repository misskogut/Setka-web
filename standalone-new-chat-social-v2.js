(() => {
  'use strict';

  const COMMUNITY_API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-community-v36';
  const PATTERN_API='https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-public-pattern-stats-v36';
  const API_KEY='sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv';
  const DEVICE_KEY='setka-standalone:v34-yulia-device';
  const TOKEN_KEY='setka-new-chat:v36-profile-token';
  const PRIVATE_CRUISES_KEY='setka-new-chat:v36-private-cruises';
  const PUBLISHED_NOTES_KEY='setka-new-chat:v36-published-local-notes';

  const A=v=>Array.isArray(v)?v:[];
  const O=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  const N=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const clone=v=>JSON.parse(JSON.stringify(v));
  const fmtMs=ms=>{ms=Math.max(0,N(ms));const s=Math.round(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);if(h)return`${h} ч ${m%60} мин`;if(m)return`${m} мин ${s%60} с`;return`${s} с`};
  const pct=v=>`${Math.round(Math.max(0,N(v))*100)}%`;
  const uuid=()=>{try{return crypto.randomUUID()}catch(_){return`nc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}};
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};

  function deviceId(){
    try{
      let v=window.SetkaStandaloneV34?.sandbox?.deviceId||localStorage.getItem(DEVICE_KEY);
      if(!v){v=`nc-${uuid()}`;localStorage.setItem(DEVICE_KEY,v)}
      return v;
    }catch(_){return`nc-${uuid()}`}
  }
  function profileToken(){
    try{let v=localStorage.getItem(TOKEN_KEY);if(!v){v=`${uuid()}-${uuid()}`;localStorage.setItem(TOKEN_KEY,v)}return v}catch(_){return`${uuid()}-${uuid()}`}
  }

  async function api(action,p={}){
    const r=await fetch(COMMUNITY_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':API_KEY},body:JSON.stringify({action,deviceId:deviceId(),profileToken:profileToken(),...p})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'community_request_failed');return d;
  }
  async function patternApi(){
    const r=await fetch(PATTERN_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':API_KEY},body:'{}'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'pattern_stats_failed');return A(d.items);
  }

  let feed={me:{nickname:'anonymous'},notes:[],cruises:[]};
  let patternStats=[];
  let loading=false;
  let lastError='';
  let recording=null;
  let player=null;
  let confirmAction=null;

  const panel=document.getElementById('ncPanel');
  const openBtn=document.getElementById('ncCommunityButton');
  const closeBtn=document.getElementById('ncClose');
  const status=document.getElementById('ncRecordingStatus');
  const confirmBox=document.getElementById('ncConfirm');
  const confirmText=document.getElementById('ncConfirmText');
  const confirmYes=document.getElementById('ncConfirmYes');
  const confirmNo=document.getElementById('ncConfirmNo');

  function injectPatternsTab(){
    const tabs=panel?.querySelector('.nc-tabs');if(!tabs||tabs.querySelector('[data-nc-view="patterns"]'))return;
    const b=document.createElement('button');b.className='nc-tab';b.dataset.ncView='patterns';b.textContent='Паттерны';tabs.insertBefore(b,tabs.firstChild);
    const v=document.createElement('div');v.id='ncViewPatterns';v.className='nc-hidden';tabs.after(v);
  }
  injectPatternsTab();

  function showView(id,button=null){
    panel?.querySelectorAll('[data-nc-view]').forEach(b=>b.classList.toggle('active',b.dataset.ncView===id));
    ['patterns','notes','cruise','saved','profile'].forEach(v=>document.getElementById(`ncView${v[0].toUpperCase()+v.slice(1)}`)?.classList.toggle('nc-hidden',v!==id));
    renderAll();
  }
  panel?.querySelectorAll('[data-nc-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.ncView,b)));

  function ask(text,fn){confirmAction=fn;if(confirmText)confirmText.textContent=text;confirmBox?.classList.add('open')}
  confirmNo?.addEventListener('click',()=>{confirmAction=null;confirmBox?.classList.remove('open')});
  confirmYes?.addEventListener('click',async()=>{const fn=confirmAction;confirmAction=null;confirmBox?.classList.remove('open');try{await fn?.()}catch(e){lastError=String(e?.message||e);renderAll()}});

  async function refresh(){
    if(loading)return;loading=true;lastError='';
    try{
      await api('register');
      const [f,p]=await Promise.all([api('feed',{limit:120}),patternApi()]);
      feed={me:f.me||{nickname:'anonymous'},notes:A(f.notes),cruises:A(f.cruises)};
      patternStats=p;
    }catch(e){lastError=String(e?.message||e)}finally{loading=false;renderAll()}
  }

  function openPanel(){panel?.classList.add('open');refresh();renderAll()}
  function closePanel(){panel?.classList.remove('open')}
  openBtn?.addEventListener('click',openPanel);closeBtn?.addEventListener('click',closePanel);

  function localNotes(){return A(window.SetkaStandaloneV34?.getData?.()?.notes)}
  function noteText(n){return String(n?.text??n?.noteText??n?.note_text??n?.body??'').trim()}
  function noteObserved(n){return n?.observedAt||n?.createdAt||n?.wallAt||''}
  function publishedNoteMap(){return O(read(PUBLISHED_NOTES_KEY,{}))}

  async function publishLocalNote(n){
    const text=noteText(n);if(!text)return;
    const s=n?.state||{};
    const out=await api('publish-note',{text,sessionId:n?.sessionId||null,patternId:n?.patternId||s?.patternId||null,configKey:n?.configHash||s?.configKey||null,config:n?.config||s?.config||{}});
    const map=publishedNoteMap();map[String(n?.id||noteObserved(n)||text.slice(0,40))]=out.id;write(PUBLISHED_NOTES_KEY,map);await refresh();
  }

  async function toggleNoteSave(id){await api('toggle-note-save',{id});await refresh()}
  async function toggleCruiseSave(id){await api('toggle-cruise-save',{id});await refresh()}
  async function addComment(type,id){const body=prompt('Комментарий');if(!body?.trim())return;await api('comment',{targetType:type,id,body:body.trim()});await refresh()}
  async function setNickname(){const input=document.getElementById('ncNickInput');const nickname=input?.value?.trim()||'anonymous';await api('set-nickname',{nickname});await refresh()}

  function renderPatterns(){
    const box=document.getElementById('ncViewPatterns');if(!box)return;
    if(lastError&&!patternStats.length){box.innerHTML=`<div class="nc-card"><div class="nc-meta">Ошибка загрузки: ${esc(lastError)}</div></div>`;return}
    if(!patternStats.length){box.innerHTML=`<div class="nc-card"><strong>Паспорт паттерна</strong><div class="nc-meta">Пока мало данных для сравнительных характеристик.</div></div>`;return}
    box.innerHTML=`<div class="nc-card"><strong>Паспорт паттернов</strong><div class="nc-meta">Это не звёздочки. ♥ = реальные сохранённые конфигурации; время и возвращения считаются отдельно.</div></div>`+patternStats.map(p=>{
      const i=O(p.interpretation);
      return `<article class="nc-card"><strong>${esc(window.SetkaApp?.getPatternTitle?.(p.patternId)||p.patternId)}</strong>
      <div class="nc-meta">${esc(p.patternId)}</div>
      <div style="margin-top:10px">
        <div class="nc-meta">♥ Сохранений <b style="color:#fff">${N(p.saves)}</b></div>
        <div class="nc-meta">Общее время <b style="color:#fff">${fmtMs(p.totalMs)}</b></div>
        <div class="nc-meta">Средняя сессия <b style="color:#fff">${fmtMs(p.averageSessionMs)}</b></div>
        <div class="nc-meta">Медианная сессия <b style="color:#fff">${fmtMs(p.medianSessionMs)}</b></div>
        <div class="nc-meta">Возвращаются <b style="color:#fff">${pct(p.repeatRate)}</b></div>
        <div class="nc-meta">Save rate <b style="color:#fff">${pct(p.saveRate)}</b></div>
        <div class="nc-meta">Время на человека <b style="color:#fff">${fmtMs(p.timePerUserMs)}</b></div>
      </div>
      <div style="margin-top:12px;padding:11px 12px;border-left:2px solid #fff;background:#0a0a0c;border-radius:0 12px 12px 0;line-height:1.45;font-size:13px">${esc(i.primary||'Пока недостаточно устойчивого сигнала.')}${i.secondary?`<div class="nc-meta" style="margin-top:6px">${esc(i.secondary)}</div>`:''}</div>
      ${A(i.signals).length?`<div class="nc-meta" style="margin-top:8px">${A(i.signals).map(esc).join(' · ')}</div>`:''}</article>`
    }).join('')}

  function renderNotes(){
    const box=document.getElementById('ncViewNotes');if(!box)return;
    const map=publishedNoteMap(),mine=localNotes().slice().sort((a,b)=>Date.parse(noteObserved(b)||0)-Date.parse(noteObserved(a)||0));
    const mineHtml=mine.length?mine.slice(0,40).map(n=>{const k=String(n?.id||noteObserved(n)||noteText(n).slice(0,40)),pub=!!map[k];return `<div class="nc-card"><strong>Моя заметка</strong><div class="nc-note-text">${esc(noteText(n)||'—')}</div><div class="nc-meta">${esc(noteObserved(n)?new Date(noteObserved(n)).toLocaleString('ru-RU'):'')}</div><div class="nc-actions">${pub?'<button class="nc-btn" disabled>✓ Опубликовано</button>':`<button class="nc-btn primary" data-publish-local-note="${esc(k)}">Опубликовать</button>`}</div></div>`}).join(''):`<div class="nc-card"><strong>Мои заметки</strong><div class="nc-meta">Создай заметку через + во время работы с паттерном — здесь появится кнопка публикации.</div></div>`;
    const publicHtml=feed.notes.length?feed.notes.map(n=>`<article class="nc-card"><strong>@${esc(n.nickname||'anonymous')}</strong><div class="nc-note-text">${esc(n.text)}</div><div class="nc-meta">♥ ${N(n.saves)} · комментариев ${A(n.comments).length}${n.patternId?` · ${esc(window.SetkaApp?.getPatternTitle?.(n.patternId)||n.patternId)}`:''}</div><div class="nc-actions"><button class="nc-btn" data-save-note="${n.id}">${n.savedByMe?'♥ Сохранено':'♡ Сохранить'}</button><button class="nc-btn" data-comment-note="${n.id}">Комментарий</button></div>${A(n.comments).map(c=>`<div class="nc-comment"><b>@${esc(c.nickname||'anonymous')}</b> ${esc(c.body)}</div>`).join('')}</article>`).join(''):`<div class="nc-card"><div class="nc-meta">Публичных заметок пока нет.</div></div>`;
    box.innerHTML=`<div class="nc-card"><strong>Мои заметки → Сообщество</strong><div class="nc-meta">Публикация только вручную и только после подтверждения. Личность не раскрывается — наружу идёт лишь ник.</div></div>${mineHtml}<div style="font-weight:700;margin:20px 4px 9px">Публичные заметки</div>${publicHtml}`;
    box.querySelectorAll('[data-publish-local-note]').forEach(b=>b.addEventListener('click',()=>{const n=mine.find(x=>String(x?.id||noteObserved(x)||noteText(x).slice(0,40))===b.dataset.publishLocalNote);if(!n)return;ask('Опубликовать эту заметку всему сообществу под вашим ником? Внутренний ID участника не будет показан.',()=>publishLocalNote(n))}));
    box.querySelectorAll('[data-save-note]').forEach(b=>b.addEventListener('click',()=>toggleNoteSave(b.dataset.saveNote).catch(e=>{lastError=String(e?.message||e);renderAll()})));
    box.querySelectorAll('[data-comment-note]').forEach(b=>b.addEventListener('click',()=>addComment('note',b.dataset.commentNote).catch(e=>{lastError=String(e?.message||e);renderAll()})));
  }

  function privateCruises(){return A(read(PRIVATE_CRUISES_KEY,[]))}
  function savePrivateCruises(v){write(PRIVATE_CRUISES_KEY,v)}

  function renderCruise(){
    const box=document.getElementById('ncViewCruise');if(!box)return;
    const priv=privateCruises();
    const privateHtml=priv.length?priv.map(c=>`<div class="nc-card"><strong>${esc(c.title)}</strong><div class="nc-meta">Приватный · ${fmtMs(c.durationMs)} · ${A(c.timeline).length} кадров</div><div class="nc-actions"><button class="nc-btn" data-play-private="${c.id}">▶ Смотреть</button><button class="nc-btn primary" data-publish-private="${c.id}">Опубликовать</button></div></div>`).join(''):'';
    const publicHtml=feed.cruises.length?feed.cruises.map(c=>`<article class="nc-card"><strong>${esc(c.title)}</strong><div class="nc-meta">@${esc(c.nickname||'anonymous')} · ${fmtMs(c.durationMs)} · ♥ ${N(c.saves)}</div><div style="margin-top:9px"><div class="nc-meta">Общее время просмотра <b style="color:#fff">${fmtMs(c.totalWatchMs)}</b></div><div class="nc-meta">Средний просмотр <b style="color:#fff">${fmtMs(c.averageWatchMs)}</b></div><div class="nc-meta">Медианный просмотр <b style="color:#fff">${fmtMs(c.medianWatchMs)}</b></div><div class="nc-meta">Повторные просмотры <b style="color:#fff">${pct(c.repeatRate)}</b></div></div><div class="nc-actions"><button class="nc-btn primary" data-play-public="${c.id}">▶ Смотреть</button><button class="nc-btn" data-save-cruise="${c.id}">${c.savedByMe?'♥ Сохранено':'♡ Сохранить'}</button><button class="nc-btn" data-comment-cruise="${c.id}">Комментарий</button></div>${A(c.comments).map(x=>`<div class="nc-comment"><b>@${esc(x.nickname||'anonymous')}</b> ${esc(x.body)}</div>`).join('')}</article>`).join(''):`<div class="nc-card"><div class="nc-meta">Публичных Cruise пока нет.</div></div>`;
    box.innerHTML=`<div class="nc-card"><strong>Запись Cruise</strong><div class="nc-meta">Записывается не видео, а последовательность состояний паттерна. При просмотре она снова рендерится как живой визуальный клип.</div><div class="nc-actions"><button id="ncStartCruise" class="nc-btn primary" ${recording?'disabled':''}>● Начать запись</button><button id="ncStopCruise" class="nc-btn" ${recording?'':'disabled'}>■ Завершить</button></div></div>${privateHtml}${privateHtml?'<div style="font-weight:700;margin:20px 4px 9px">Сообщество</div>':''}${publicHtml}`;
    document.getElementById('ncStartCruise')?.addEventListener('click',startRecording);
    document.getElementById('ncStopCruise')?.addEventListener('click',stopRecording);
    box.querySelectorAll('[data-play-private]').forEach(b=>b.addEventListener('click',()=>{const c=privateCruises().find(x=>x.id===b.dataset.playPrivate);if(c)playTimeline(c,null)}));
    box.querySelectorAll('[data-publish-private]').forEach(b=>b.addEventListener('click',()=>{const c=privateCruises().find(x=>x.id===b.dataset.publishPrivate);if(c)ask('Сделать этот Cruise публичным? Его сможет смотреть, сохранять и комментировать сообщество.',()=>publishPrivateCruise(c))}));
    box.querySelectorAll('[data-play-public]').forEach(b=>b.addEventListener('click',()=>{const c=feed.cruises.find(x=>x.id===b.dataset.playPublic);if(c)playTimeline({id:c.id,title:c.title,durationMs:c.durationMs,timeline:c.timeline},c.id)}));
    box.querySelectorAll('[data-save-cruise]').forEach(b=>b.addEventListener('click',()=>toggleCruiseSave(b.dataset.saveCruise).catch(e=>{lastError=String(e?.message||e);renderAll()})));
    box.querySelectorAll('[data-comment-cruise]').forEach(b=>b.addEventListener('click',()=>addComment('cruise',b.dataset.commentCruise).catch(e=>{lastError=String(e?.message||e);renderAll()})));
  }

  function renderSaved(){
    const box=document.getElementById('ncViewSaved');if(!box)return;
    const notes=feed.notes.filter(x=>x.savedByMe),cruises=feed.cruises.filter(x=>x.savedByMe);
    box.innerHTML=`<div class="nc-card"><strong>Сохранённое</strong><div class="nc-meta">♥ здесь означает одно и то же для всего контента: «я хочу это оставить себе». Это же и есть публичный рейтинг.</div></div>`+(notes.length||cruises.length?[...notes.map(n=>`<div class="nc-card"><strong>Заметка · @${esc(n.nickname)}</strong><div class="nc-note-text">${esc(n.text)}</div></div>`),...cruises.map(c=>`<div class="nc-card"><strong>Cruise · ${esc(c.title)}</strong><div class="nc-meta">@${esc(c.nickname)} · ${fmtMs(c.durationMs)}</div></div>`)].join(''):`<div class="nc-card"><div class="nc-meta">Пока ничего не сохранено.</div></div>`);
  }

  function renderProfile(){
    const box=document.getElementById('ncViewProfile');if(!box)return;
    box.innerHTML=`<div class="nc-card"><strong>Публичный ник</strong><div class="nc-meta">Это единственное имя, которое видит сообщество. Внутренний participant/device ID сервер не отдаёт в публичную ленту.</div><div class="nc-row" style="margin-top:10px"><input id="ncNickInput" class="nc-input" maxlength="40" value="${esc(feed.me?.nickname==='anonymous'?'':feed.me?.nickname||'')}" placeholder="например, NeonFox"><button id="ncNickSave" class="nc-btn primary">Сохранить</button></div></div>${lastError?`<div class="nc-card"><div class="nc-meta">${esc(lastError)}</div></div>`:''}`;
    document.getElementById('ncNickSave')?.addEventListener('click',()=>setNickname().catch(e=>{lastError=String(e?.message||e);renderAll()}));
  }

  function renderAll(){renderPatterns();renderNotes();renderCruise();renderSaved();renderProfile()}

  function snapshot(type='frame'){
    if(!recording||player)return;const s=window.SetkaApp?.getState?.();if(!s?.config)return;const t=Math.round(performance.now()-recording.started);
    if(type==='gesture-move'&&t-recording.lastMove<75)return;if(type==='gesture-move')recording.lastMove=t;
    recording.timeline.push({t,type,patternId:s.patternId,config:clone(s.config),frame:N(s.frame),sourceType:s.sourceType||'working',sourceId:s.sourceId||s.patternId,communityId:s.communityId||null});
  }
  ['gesture-start','gesture-move','gesture-end','pattern-open','color','view'].forEach(name=>window.addEventListener(`setka:${name}`,()=>snapshot(name)));

  function startRecording(){
    if(recording)return;recording={id:uuid(),started:performance.now(),lastMove:-99999,timeline:[]};snapshot('start');status?.classList.add('on');closePanel();renderAll();
  }
  function stopRecording(){
    if(!recording)return;snapshot('end');const rec=recording;recording=null;status?.classList.remove('on');const durationMs=Math.round(performance.now()-rec.started);if(durationMs<800)return;const title=prompt('Название Cruise',`${window.SetkaApp?.getPatternTitle?.(rec.timeline[0]?.patternId)||'SETKA'} · ${fmtMs(durationMs)}`)||`SETKA Cruise · ${fmtMs(durationMs)}`;const c={id:rec.id,title,durationMs,timeline:rec.timeline,createdAt:Date.now()};const list=privateCruises();list.unshift(c);savePrivateCruises(list.slice(0,60));openPanel();showView('cruise');ask('Cruise сохранён приватно. Сделать его публичным для сообщества?',()=>publishPrivateCruise(c));renderAll();
  }
  status?.addEventListener('click',()=>{if(recording)stopRecording()});

  async function publishPrivateCruise(c){
    await api('publish-cruise',{title:c.title,durationMs:c.durationMs,timeline:c.timeline,timelineVersion:2,timelineMode:'config-snapshots'});
    savePrivateCruises(privateCruises().filter(x=>x.id!==c.id));await refresh();showView('cruise');
  }

  function ensurePlayer(){
    let root=document.getElementById('ncCruisePlayer');if(root)return root;
    root=document.createElement('div');root.id='ncCruisePlayer';root.style.cssText='position:fixed;z-index:5000;inset:0;background:#000;display:none;color:#fff';root.innerHTML='<canvas id="ncCruiseCanvas" style="position:absolute;inset:0;width:100%;height:100%;display:block"></canvas><div style="position:absolute;left:14px;right:14px;top:calc(env(safe-area-inset-top) + 12px);display:flex;align-items:center;gap:10px"><button id="ncCruiseClose" class="nc-btn" style="background:rgba(0,0,0,.55)">×</button><div style="flex:1"><div id="ncCruiseTitle" style="font-weight:700;font-size:13px"></div><div id="ncCruiseTime" class="nc-meta"></div></div></div><div style="position:absolute;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom) + 18px);height:4px;border-radius:4px;background:rgba(255,255,255,.18);overflow:hidden"><div id="ncCruiseProgress" style="height:100%;width:0;background:#fff"></div></div>';
    document.body.appendChild(root);document.getElementById('ncCruiseClose').addEventListener('click',()=>finishPlayer(false));return root;
  }

  function interpolateConfig(a,b,t){
    const out=clone(a||{});if(!a||!b)return out;
    for(const k of Object.keys(b)){
      const av=a[k],bv=b[k];
      if(typeof av==='number'&&typeof bv==='number'&&k!=='colorModeIndex'&&k!=='numTentacles'&&k!=='numShapes'&&k!=='segmentStep')out[k]=av+(bv-av)*t;
      else if(t>=.5)out[k]=clone(bv);
    }
    return out;
  }
  function frameAt(t,timeline){
    if(!timeline.length)return null;let hi=timeline.findIndex(x=>N(x.t)>=t);if(hi<0)return{a:timeline.at(-1),b:timeline.at(-1),mix:0};if(hi===0)return{a:timeline[0],b:timeline[0],mix:0};const a=timeline[hi-1],b=timeline[hi];if(a.patternId!==b.patternId)return t<N(b.t)?{a,b:a,mix:0}:{a:b,b,mix:0};const span=Math.max(1,N(b.t)-N(a.t));return{a,b,mix:Math.max(0,Math.min(1,(t-N(a.t))/span))};
  }

  function playTimeline(c,publicId){
    if(player||!A(c.timeline).length)return;closePanel();const root=ensurePlayer();root.style.display='block';const canvas=document.getElementById('ncCruiseCanvas');const title=document.getElementById('ncCruiseTitle');if(title)title.textContent=c.title||'Cruise';player={content:c,publicId,started:performance.now(),raf:0,finished:false};
    const resize=()=>{canvas.width=Math.max(1,Math.round(innerWidth));canvas.height=Math.max(1,Math.round(innerHeight))};resize();
    const tick=()=>{if(!player)return;const elapsed=performance.now()-player.started,duration=Math.max(1,N(c.durationMs));const pair=frameAt(elapsed,A(c.timeline));if(pair){const cfg=interpolateConfig(pair.a.config,pair.b.config,pair.mix);try{window.SetkaApp?.renderPreview?.(canvas,cfg,elapsed/16.6667,pair.a.patternId)}catch(_){}}
      const progress=document.getElementById('ncCruiseProgress');if(progress)progress.style.width=`${Math.min(100,elapsed/duration*100)}%`;const time=document.getElementById('ncCruiseTime');if(time)time.textContent=`${fmtMs(elapsed)} / ${fmtMs(duration)}`;
      if(elapsed>=duration){finishPlayer(true);return}player.raf=requestAnimationFrame(tick)};player.raf=requestAnimationFrame(tick);
  }

  function finishPlayer(completed){
    if(!player)return;const p=player;player=null;if(p.raf)cancelAnimationFrame(p.raf);document.getElementById('ncCruisePlayer').style.display='none';const watchedMs=Math.max(0,Math.round(performance.now()-p.started));if(p.publicId)api('play-complete',{id:p.publicId,watchedMs,completed}).then(refresh).catch(()=>{});openPanel();showView('cruise');
  }

  renderAll();refresh();
  window.addEventListener('storage',()=>renderAll());
  window.SETKA_NEW_CHAT_SOCIAL={refresh,open:openPanel,startCruise:startRecording,stopCruise:stopRecording,playTimeline};
})();
