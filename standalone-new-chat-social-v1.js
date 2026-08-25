(() => {
  'use strict';

  const K = {
    nickname: 'setka_nc_nickname_v1',
    notes: 'setka_nc_public_notes_v1',
    cruises: 'setka_nc_public_cruises_v1',
    saved: 'setka_nc_saved_v1',
    events: 'setka_nc_events_v1'
  };
  const participantPublicId = (() => {
    const k='setka_nc_public_profile_id_v1';
    let v=localStorage.getItem(k); if(!v){v='pub_'+crypto.randomUUID();localStorage.setItem(k,v);} return v;
  })();
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const now=()=>Date.now();
  const fmt=s=>{s=Math.max(0,Number(s)||0);if(s<60)return `${Math.round(s)}с`;const m=Math.floor(s/60),r=Math.round(s%60);return r?`${m}м ${r}с`:`${m}м`;};
  const nickname=()=>localStorage.getItem(K.nickname)||'anonymous';
  const saveEvent=(type,payload={})=>{const arr=read(K.events,[]);arr.push({id:crypto.randomUUID(),type,at:new Date().toISOString(),publicProfileId:participantPublicId,...payload});write(K.events,arr.slice(-3000));};

  const els={
    panel:document.getElementById('ncPanel'),open:document.getElementById('ncCommunityButton'),close:document.getElementById('ncClose'),confirm:document.getElementById('ncConfirm'),yes:document.getElementById('ncConfirmYes'),no:document.getElementById('ncConfirmNo'),confirmText:document.getElementById('ncConfirmText'),status:document.getElementById('ncRecordingStatus')
  };
  let pendingConfirm=null;
  let recording=null;
  let playback=null;

  function currentPatternName(){
    return document.getElementById('modeLabel')?.textContent?.trim() || document.querySelector('.pattern-card.active .pattern-title')?.textContent?.trim() || 'Pattern';
  }

  function openPanel(){els.panel?.classList.add('open');renderAll();}
  function closePanel(){els.panel?.classList.remove('open');}
  els.open?.addEventListener('click',openPanel); els.close?.addEventListener('click',closePanel);
  document.querySelectorAll('[data-nc-view]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-nc-view]').forEach(x=>x.classList.toggle('active',x===btn));
    ['notes','cruise','saved','profile'].forEach(v=>document.getElementById('ncView'+v[0].toUpperCase()+v.slice(1))?.classList.toggle('nc-hidden',v!==btn.dataset.ncView));
    renderAll();
  }));

  function confirmPublish(text,fn){pendingConfirm=fn;if(els.confirmText)els.confirmText.textContent=text;els.confirm?.classList.add('open');}
  els.no?.addEventListener('click',()=>{pendingConfirm=null;els.confirm?.classList.remove('open');});
  els.yes?.addEventListener('click',()=>{const fn=pendingConfirm;pendingConfirm=null;els.confirm?.classList.remove('open');fn?.();});

  function renderNotes(){
    const box=document.getElementById('ncViewNotes');if(!box)return;
    const notes=read(K.notes,[]).filter(n=>n.isPublic).sort((a,b)=>b.createdAt-a.createdAt);
    box.innerHTML=`<div class="nc-card"><strong>Новая заметка</strong><div class="nc-meta">Можно оставить приватной или вручную опубликовать в сообщество.</div><textarea id="ncNoteDraft" class="nc-textarea" placeholder="Что вы заметили, почувствовали или поняли?"></textarea><div class="nc-actions"><button id="ncSavePrivateNote" class="nc-btn">Сохранить себе</button><button id="ncPublishNote" class="nc-btn primary">Опубликовать</button></div></div>`+
      (notes.length?notes.map(noteCard).join(''):`<div class="nc-card"><div class="nc-meta">Публичных заметок пока нет.</div></div>`);
    document.getElementById('ncSavePrivateNote')?.addEventListener('click',()=>saveNote(false));
    document.getElementById('ncPublishNote')?.addEventListener('click',()=>{
      const text=document.getElementById('ncNoteDraft')?.value?.trim();if(!text)return;
      confirmPublish('После публикации заметка будет видна всему сообществу под вашим ником. Внутренний ID участника не показывается.',()=>saveNote(true,text));
    });
    box.querySelectorAll('[data-save-note]').forEach(b=>b.addEventListener('click',()=>toggleSave('note',b.dataset.saveNote)));
    box.querySelectorAll('[data-comment-note]').forEach(b=>b.addEventListener('click',()=>addComment('note',b.dataset.commentNote)));
  }

  function noteCard(n){
    const saved=isSaved('note',n.id);
    return `<article class="nc-card"><strong>@${esc(n.nickname||'anonymous')}</strong><div class="nc-note-text">${esc(n.text)}</div><div class="nc-meta">♥ ${Number(n.saves||0)} · комментариев ${(n.comments||[]).length}</div><div class="nc-actions"><button class="nc-btn" data-save-note="${n.id}">${saved?'♥ Сохранено':'♡ Сохранить'}</button><button class="nc-btn" data-comment-note="${n.id}">Комментарий</button></div>${(n.comments||[]).map(c=>`<div class="nc-comment"><b>@${esc(c.nickname||'anonymous')}</b> ${esc(c.text)}</div>`).join('')}</article>`;
  }

  function saveNote(isPublic,textOverride){
    const input=document.getElementById('ncNoteDraft');const text=(textOverride??input?.value??'').trim();if(!text)return;
    const notes=read(K.notes,[]);const note={id:crypto.randomUUID(),publicProfileId:participantPublicId,nickname:nickname(),text,isPublic,createdAt:now(),saves:0,uniqueUsers:0,totalTime:0,sessions:0,repeatUsers:0,comments:[]};notes.push(note);write(K.notes,notes);saveEvent(isPublic?'publish_note':'save_private_note',{noteId:note.id});if(input)input.value='';renderAll();
  }

  function isSaved(kind,id){return read(K.saved,[]).some(x=>x.kind===kind&&x.id===id);}
  function toggleSave(kind,id){
    let saved=read(K.saved,[]);const idx=saved.findIndex(x=>x.kind===kind&&x.id===id);const key=kind==='note'?K.notes:K.cruises;const items=read(key,[]);const obj=items.find(x=>x.id===id);if(!obj)return;
    if(idx>=0){saved.splice(idx,1);obj.saves=Math.max(0,Number(obj.saves||0)-1);}else{saved.push({kind,id,savedAt:now()});obj.saves=Number(obj.saves||0)+1;saveEvent(kind==='note'?'save_note':'save_cruise',{objectId:id});}
    write(K.saved,saved);write(key,items);renderAll();
  }

  function addComment(kind,id){
    const text=prompt('Комментарий');if(!text?.trim())return;const key=kind==='note'?K.notes:K.cruises;const items=read(key,[]);const obj=items.find(x=>x.id===id);if(!obj)return;obj.comments=obj.comments||[];obj.comments.push({id:crypto.randomUUID(),publicProfileId:participantPublicId,nickname:nickname(),text:text.trim(),createdAt:now()});write(key,items);saveEvent(kind==='note'?'comment_note':'comment_cruise',{objectId:id});renderAll();
  }

  function renderProfile(){
    const box=document.getElementById('ncViewProfile');if(!box)return;box.innerHTML=`<div class="nc-card"><strong>Публичный ник</strong><div class="nc-meta">Внутренний participant ID никогда не показывается сообществу. Ник можно менять.</div><div class="nc-row" style="margin-top:10px"><input id="ncNickInput" class="nc-input" value="${esc(nickname()==='anonymous'?'':nickname())}" placeholder="например, NeonFox"><button id="ncNickSave" class="nc-btn primary">Сохранить</button></div></div>`;document.getElementById('ncNickSave')?.addEventListener('click',()=>{const v=document.getElementById('ncNickInput')?.value?.trim();localStorage.setItem(K.nickname,v||'anonymous');renderAll();});
  }

  function renderSaved(){
    const box=document.getElementById('ncViewSaved');if(!box)return;const saved=read(K.saved,[]);const notes=read(K.notes,[]);const cruises=read(K.cruises,[]);const rows=saved.map(s=>s.kind==='note'?notes.find(x=>x.id===s.id):cruises.find(x=>x.id===s.id)).filter(Boolean);box.innerHTML=rows.length?rows.map(r=>`<div class="nc-card"><strong>${r.text?esc(r.text.slice(0,70)):esc(r.title||'Cruise')}</strong><div class="nc-meta">♥ сохранено у вас</div></div>`).join(''):`<div class="nc-card"><div class="nc-meta">Здесь будут заметки и Cruise, которые вы сохранили сердцем.</div></div>`;
  }

  function renderCruises(){
    const box=document.getElementById('ncViewCruise');if(!box)return;const cruises=read(K.cruises,[]).filter(c=>c.isPublic).sort((a,b)=>b.createdAt-a.createdAt);box.innerHTML=`<div class="nc-card"><strong>Записать Cruise</strong><div class="nc-meta">Система запишет ваши действия с паттернами как временную последовательность. Это не видео: при воспроизведении паттерны рендерятся заново.</div><div class="nc-actions"><button id="ncStartCruise" class="nc-btn primary">● Начать запись</button><button id="ncStopCruise" class="nc-btn" ${recording?'':'disabled'}>■ Завершить</button></div></div>`+(cruises.length?cruises.map(cruiseCard).join(''):`<div class="nc-card"><div class="nc-meta">Публичных Cruise пока нет.</div></div>`);document.getElementById('ncStartCruise')?.addEventListener('click',startRecording);document.getElementById('ncStopCruise')?.addEventListener('click',stopRecording);box.querySelectorAll('[data-play-cruise]').forEach(b=>b.addEventListener('click',()=>playCruise(b.dataset.playCruise)));box.querySelectorAll('[data-save-cruise]').forEach(b=>b.addEventListener('click',()=>toggleSave('cruise',b.dataset.saveCruise)));box.querySelectorAll('[data-comment-cruise]').forEach(b=>b.addEventListener('click',()=>addComment('cruise',b.dataset.commentCruise)));
  }

  function cruiseCard(c){const saved=isSaved('cruise',c.id);return `<article class="nc-card"><strong>${esc(c.title||'Cruise')}</strong><div class="nc-meta">@${esc(c.nickname||'anonymous')} · ${fmt(c.duration||0)} · ♥ ${Number(c.saves||0)} · ${Number(c.plays||0)} запусков · ${fmt(c.totalTime||0)} общего просмотра</div><div class="nc-cruise-bar"><div class="nc-cruise-progress"></div></div><div class="nc-actions"><button class="nc-btn primary" data-play-cruise="${c.id}">▶ Смотреть</button><button class="nc-btn" data-save-cruise="${c.id}">${saved?'♥ Сохранено':'♡ Сохранить'}</button><button class="nc-btn" data-comment-cruise="${c.id}">Комментарий</button></div>${(c.comments||[]).map(x=>`<div class="nc-comment"><b>@${esc(x.nickname||'anonymous')}</b> ${esc(x.text)}</div>`).join('')}</article>`;}

  function startRecording(){
    if(recording)return;closePanel();recording={id:crypto.randomUUID(),started:performance.now(),startedAt:now(),events:[],patternStart:currentPatternName()};els.status?.classList.add('on');saveEvent('cruise_record_start',{cruiseId:recording.id});
  }

  function record(type,data={}){if(!recording||playback)return;recording.events.push({t:Math.round(performance.now()-recording.started),type,...data});}

  function stopRecording(){
    if(!recording)return;const rec=recording;recording=null;els.status?.classList.remove('on');const duration=(performance.now()-rec.started)/1000;if(duration<1)return;const title=prompt('Название Cruise',`${rec.patternStart} · ${fmt(duration)}`)||`${rec.patternStart} Cruise`;const item={id:rec.id,publicProfileId:participantPublicId,nickname:nickname(),title,duration,createdAt:now(),timeline:rec.events,isPublic:false,saves:0,comments:[],plays:0,totalTime:0,uniqueUsers:0,repeatUsers:0,durations:[]};const cruises=read(K.cruises,[]);cruises.push(item);write(K.cruises,cruises);saveEvent('cruise_record_stop',{cruiseId:item.id,duration});openPanel();confirmPublish('Сделать этот Cruise публичным? Его сможет смотреть и сохранять сообщество. Личность автора не раскрывается — только ник.',()=>{const arr=read(K.cruises,[]);const c=arr.find(x=>x.id===item.id);if(c){c.isPublic=true;c.nickname=nickname();write(K.cruises,arr);saveEvent('publish_cruise',{cruiseId:c.id});renderAll();}});renderAll();
  }

  const canvas=()=>document.getElementById('patternCanvas');
  function pointData(e){const el=canvas();if(!el)return{};const r=el.getBoundingClientRect();return {x:(e.clientX-r.left)/Math.max(1,r.width),y:(e.clientY-r.top)/Math.max(1,r.height),pointerId:e.pointerId||1,pointerType:e.pointerType||'touch',buttons:e.buttons||0};}
  ['pointerdown','pointermove','pointerup','pointercancel'].forEach(type=>document.addEventListener(type,e=>{if(e.target===canvas())record(type,pointData(e));},{capture:true,passive:true}));
  ['favoriteButton','libraryButton','prevButton','nextButton','colorButton'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>record('control',{id}),true));

  async function playCruise(id){
    if(playback||recording)return;const arr=read(K.cruises,[]);const c=arr.find(x=>x.id===id);if(!c)return;closePanel();playback={id,started:performance.now(),timeouts:[]};const wasPlayed=read('setka_nc_played_v1',[]);const repeated=wasPlayed.includes(id);if(!repeated){wasPlayed.push(id);write('setka_nc_played_v1',wasPlayed);c.uniqueUsers=Number(c.uniqueUsers||0)+1;}else c.repeatUsers=Number(c.repeatUsers||0)+1;c.plays=Number(c.plays||0)+1;saveEvent(repeated?'replay_cruise':'play_cruise',{cruiseId:id});
    const begin=performance.now();
    for(const ev of c.timeline||[]){const to=setTimeout(()=>dispatchRecorded(ev),Math.max(0,ev.t||0));playback.timeouts.push(to);}
    const done=setTimeout(()=>{const watched=(performance.now()-begin)/1000;c.totalTime=Number(c.totalTime||0)+watched;c.durations=Array.isArray(c.durations)?c.durations:[];c.durations.push(watched);write(K.cruises,arr);playback=null;openPanel();renderAll();},Math.max(300,(c.duration||0)*1000+350));playback.timeouts.push(done);
  }

  function dispatchRecorded(ev){
    if(!playback)return;if(ev.type==='control'){document.getElementById(ev.id)?.click();return;}const el=canvas();if(!el)return;const r=el.getBoundingClientRect();const clientX=r.left+(Number(ev.x)||0)*r.width,clientY=r.top+(Number(ev.y)||0)*r.height;try{el.dispatchEvent(new PointerEvent(ev.type,{bubbles:true,cancelable:true,clientX,clientY,pointerId:ev.pointerId||1,pointerType:ev.pointerType||'touch',buttons:ev.buttons||0,isPrimary:true}));}catch(_){}
  }

  function renderAll(){renderNotes();renderCruises();renderSaved();renderProfile();}
  renderAll();
  window.addEventListener('storage',renderAll);
  window.SETKA_NEW_CHAT_SOCIAL={open:openPanel,startCruise:startRecording,stopCruise:stopRecording,playCruise,render:renderAll};
})();
