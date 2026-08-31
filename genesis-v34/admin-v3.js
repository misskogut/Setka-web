(() => {
  "use strict";

  const MAIN_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const EXT_API = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-extensions";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_STORAGE = "setka-research:admin-key:v1";
  const INTENT = { sleep:"Уснуть", relax:"Расслабиться", tension:"Снизить напряжение", focus:"Сконцентрироваться", energy:"Взбодриться", switch:"Переключиться", explore:"Просто исследую", none:"Без запроса" };

  const $ = id => document.getElementById(id);
  const login = $("login"), dashboard = $("dashboard"), keyInput = $("keyInput"), loginBtn = $("loginBtn"), loginError = $("loginError"), detail = $("detail");
  let adminKey = localStorage.getItem(ADMIN_STORAGE) || "";
  let overview = {}, participants = [], sessions = [], symptoms = [], invites = [], insights = [], community = [];
  let replay = null;

  function esc(v){return String(v ?? "").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));}
  function fmtMs(ms){ms=Math.max(0,Number(ms)||0);const s=Math.round(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);if(h)return `${h}ч ${m%60}м`;if(m)return `${m}м ${s%60}с`;return `${s}с`;}
  function fmtDate(v){if(!v)return"—";try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v));}catch(_){return String(v);}}
  function face(v){return ({1:"😣",2:"😕",3:"😐",4:"🙂",5:"😄"})[Number(v)] || "—";}
  function fmtClock(ms){const s=Math.max(0,Math.floor((Number(ms)||0)/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;}
  function kpi(v,l){return `<div class="card kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`;}

  async function call(url, action, payload={}){
    const r = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,adminKey,...payload})});
    const d = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error || "request_failed");
    return d;
  }
  const main = (action,payload={}) => call(MAIN_API,action,payload);
  const ext = (action,payload={}) => call(EXT_API,action,payload);

  async function loginNow(){
    loginBtn.disabled=true;loginError.textContent="";
    try{
      adminKey=keyInput.value.trim()||adminKey;
      await main("admin-check");
      localStorage.setItem(ADMIN_STORAGE,adminKey);
      login.classList.add("hidden");dashboard.classList.remove("hidden");
      await loadAll();
    }catch(_){loginError.textContent="Неверный ключ или нет соединения.";loginBtn.disabled=false;}
  }

  loginBtn.addEventListener("click",loginNow);
  keyInput.addEventListener("keydown",e=>{if(e.key==="Enter")loginNow();});
  $("logoutBtn").addEventListener("click",()=>{localStorage.removeItem(ADMIN_STORAGE);location.reload();});
  $("refreshBtn").addEventListener("click",loadAll);
  $("createCodeBtn").addEventListener("click",async()=>{
    const label=prompt("Метка участника (необязательно):","");if(label===null)return;
    try{const d=await main("admin-create-code",{label});await navigator.clipboard?.writeText?.(d.participant.access_code).catch(()=>{});alert(`Новый ID: ${d.participant.access_code}`);await loadAll();}
    catch(_){alert("Не удалось создать ID");}
  });

  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    document.querySelectorAll(".tab-page").forEach(x=>x.classList.add("hidden"));$(`tab-${b.dataset.tab}`).classList.remove("hidden");
    detail.classList.add("hidden");
  }));

  async function loadAll(){
    try{
      const [o,p,s,sy,iv,ins,com] = await Promise.all([
        ext("admin-overview-v4"), ext("admin-participants-v4"), ext("admin-sessions-v4"), ext("admin-symptoms"), ext("admin-invites"), main("admin-insights"), main("admin-community")
      ]);
      overview=o.overview||{};participants=p.participants||[];sessions=s.sessions||[];symptoms=sy.items||[];invites=iv.items||[];insights=ins.insights||[];community=com.items||[];
      renderOverview();renderParticipants();renderSymptoms();renderInvites();renderInsights();renderCommunity();
    }catch(e){console.error(e);}
  }

  function renderOverview(){
    const o=overview||{},retRate=o.participants?Math.round((o.returners||0)/o.participants*100):0,feedbackRate=o.sessions?Math.round((o.completed||0)/o.sessions*100):0,inviteRate=o.inviteTotal?Math.round((o.inviteActivated||0)/o.inviteTotal*100):0;
    const el=$("tab-overview");
    el.innerHTML=`<div class="grid kpis">${kpi(o.participants||0,"участников")}${kpi(o.sessions||0,"исслед. сессий")}${kpi(`${retRate}%`,"вернулись 2+ раза")}${kpi(`${feedbackRate}%`,"с финальной оценкой")}${kpi(o.symptomCheckins||0,"отметок симптомов")}${kpi(`${o.inviteActivated||0}/${o.inviteTotal||0}`,`актив. инвайтов · ${inviteRate}%`)}</div>
    <div class="grid kpis">${kpi(fmtMs(o.activeMs||0),"активное время")}${kpi(`${Number(o.avgDelta||0)>=0?"+":""}${Number(o.avgDelta||0).toFixed(2)}`,"среднее Δ состояния")}${kpi(o.symptomTrackers||0,"активных трекеров")}${kpi(o.returners||0,"повторных участников")}</div>
    <div class="card"><div class="section-title">Запросы сессий</div><div id="overviewIntents" class="grid intent-grid"></div></div>`;
    const wrap=$("overviewIntents"),entries=Object.entries(o.intents||{}).filter(([k])=>k!=="none");
    if(!entries.length){wrap.innerHTML='<div class="empty" style="grid-column:1/-1">Пока нет завершённых исследовательских сессий.</div>';return;}
    entries.forEach(([k,v])=>{const rate=v.completed?Math.round(v.improved/v.completed*100):0,d=v.completed?v.deltaSum/v.completed:0;wrap.insertAdjacentHTML("beforeend",`<div class="card intent-card"><div class="small muted">${esc(INTENT[k]||k)}</div><div class="rate">${rate}%</div><div class="small">положительный исход</div><div class="small muted" style="margin-top:5px">${v.sessions} сесс. · Δ ${d>=0?"+":""}${d.toFixed(2)}</div><div class="bar"><span style="width:${Math.max(0,Math.min(100,rate))}%"></span></div></div>`);});
  }

  function renderParticipants(){
    const el=$("tab-participants");el.innerHTML='<div class="section-title">Участники</div><div class="grid participants" id="participantGrid"></div>';
    const grid=$("participantGrid");if(!participants.length){grid.innerHTML='<div class="empty">Нет участников</div>';return;}
    participants.forEach(p=>{
      const pr=p.profile||{},card=document.createElement("div");card.className="card participant";
      card.innerHTML=`<div class="code">${esc(p.access_code)}</div><div class="small muted">${esc(p.label||"Без метки")}</div><div class="meta"><span class="pill ${p.bound?"good":"warn"}">${p.bound?"устройство закреплено":"не активирован"}</span><span class="pill">${p.sessionCount||0} сесс.</span><span class="pill">${p.activeDays||0} дней</span><span class="pill">${p.symptomCount||0} симптом.</span><span class="pill">↗ ${p.inviteCount||0}</span></div><div class="small muted" style="margin-top:9px">${pr.age_band?`Возраст ${esc(pr.age_band)} · `:""}${pr.practice_experience?esc(pr.practice_experience):"профиль не заполнен"}</div>`;
      card.addEventListener("click",()=>openParticipant(p));grid.appendChild(card);
    });
  }

  async function openParticipant(p){
    detail.classList.remove("hidden");detail.innerHTML='<div class="card empty">Загружаем участника…</div>';
    try{
      const symptomData=await ext("admin-participant-symptoms",{participantId:p.id});
      const own=sessions.filter(s=>s.participant_id===p.id),pr=p.profile||{},sym=symptomData.items||[];
      detail.innerHTML=`<div class="split"><div><div class="card"><div class="section-title">${esc(p.access_code)}</div><div class="small muted">${esc(p.label||"Без метки")}</div><div class="meta"><span class="pill">возраст ${esc(pr.age_band||"—")}</span><span class="pill">практики ${esc(pr.practice_experience||"—")}</span><span class="pill">чувствительность ${esc(pr.visual_sensitivity||"—")}</span><span class="pill">↗ ${p.inviteCount||0} инвайтов</span></div><div class="controls"><button id="resetDevice" class="btn">Сбросить устройство</button><button id="toggleParticipant" class="btn ${p.active?"danger":""}">${p.active?"Отключить ID":"Включить ID"}</button></div></div><div class="section-title" style="margin-top:16px">Сессии</div><div id="sessionList" class="list"></div></div><div><div id="participantSymptoms"></div><div id="sessionDetail" style="margin-top:14px"><div class="card empty">Выбери сессию слева</div></div></div></div>`;
      $("resetDevice").addEventListener("click",async()=>{if(!confirm("Сбросить привязку браузера?"))return;await main("admin-reset-device",{participantId:p.id});await loadAll();detail.classList.add("hidden");});
      $("toggleParticipant").addEventListener("click",async()=>{await main("admin-toggle-active",{participantId:p.id,active:!p.active});await loadAll();detail.classList.add("hidden");});
      const list=$("sessionList");own.forEach((s,idx)=>{const r=document.createElement("div");r.className="session-row";r.innerHTML=`<div class="rowtop"><b>Сессия ${own.length-idx}</b><span class="small muted">${fmtDate(s.local_started_at||s.started_at)}</span></div><div class="meta"><span class="pill">${esc(INTENT[s.request_key]||s.request_key||"без запроса")}</span><span class="pill">${face(s.pre_state)} → ${face(s.post_state)}</span><span class="pill">${fmtMs(s.active_ms||0)}</span>${s.completed?'<span class="pill good">оценена</span>':'<span class="pill warn">без финала</span>'}</div>`;r.addEventListener("click",()=>openSession(s,r));list.appendChild(r);});
      renderParticipantSymptoms($("participantSymptoms"),sym);
    }catch(_){detail.innerHTML='<div class="card empty">Не удалось загрузить участника.</div>';}
  }

  function renderParticipantSymptoms(el,list){
    if(!list.length){el.innerHTML='<div class="card"><div class="section-title">Симптомы</div><div class="muted small">Участник ничего не отслеживает.</div></div>';return;}
    el.innerHTML='<div class="card"><div class="section-title">Симптомы участника</div><div id="symptomMiniList" class="list"></div></div><div id="symptomChartBox" style="margin-top:12px"></div>';
    const wrap=$("symptomMiniList");list.forEach(s=>{const row=document.createElement("div");row.className="symptom-row";row.innerHTML=`<div class="rowtop"><b>${esc(s.name)}</b><span>${s.lastCheckin?`${s.lastCheckin.intensity}/10`:"—"}</span></div><div class="small muted">${s.checkinCount||0} отметок · средняя ${Number(s.summary?.avgIntensity||0).toFixed(1)} · после сессий ${dropLabel(s.summary?.avgSessionDrop||0)}</div>`;row.addEventListener("click",()=>drawParticipantSymptom(s));wrap.appendChild(row);});
    drawParticipantSymptom(list[0]);
  }

  function dropLabel(v){v=Number(v)||0;return `${v>=0?"↓":"↑"}${Math.abs(v).toFixed(1)}`;}
  function drawParticipantSymptom(s){document.querySelectorAll("#symptomMiniList .symptom-row").forEach(x=>x.classList.toggle("active",x.querySelector("b")?.textContent===s.name));const box=$("symptomChartBox");if(!box)return;const history=s.history||[],sum=s.summary||{};box.innerHTML=`<div class="card"><div class="section-title">${esc(s.name)} · интенсивность во времени</div><div class="small muted">Белая точка — обычная отметка, заполненная — перед сессией, серая — после.</div>${symptomSvg(history)}<div class="meta"><span class="pill">${sum.count||0} отметок</span><span class="pill">средняя ${Number(sum.avgIntensity||0).toFixed(1)}</span><span class="pill">пик ${sum.peak||0}</span><span class="pill">после SETKA ${dropLabel(sum.avgSessionDrop||0)}</span><span class="pill good">↓ ${sum.improvedSessions||0}</span><span class="pill warn">↑ ${sum.worsenedSessions||0}</span></div></div>`;}

  function symptomSvg(rows){
    if(!rows.length)return '<div class="empty">Пока нет точек интенсивности.</div>';
    const W=760,H=250,pad={l:34,r:16,t:16,b:28},times=rows.map(x=>Date.parse(x.observed_at)).filter(Number.isFinite),min=Math.min(...times),max=Math.max(...times),span=Math.max(1,max-min),x=t=>pad.l+(t-min)/span*(W-pad.l-pad.r),y=v=>pad.t+(10-(Number(v)||0))/10*(H-pad.t-pad.b);
    let grid="";for(let v=0;v<=10;v+=2){const yy=y(v);grid+=`<line class="chart-grid" x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"/><text class="chart-label" x="4" y="${yy+3}">${v}</text>`;}
    const pts=rows.map(r=>`${x(Date.parse(r.observed_at))},${y(r.intensity)}`).join(" ");
    const dots=rows.map(r=>`<circle class="chart-dot ${r.phase==='pre'?'pre':r.phase==='post'?'post':''}" cx="${x(Date.parse(r.observed_at))}" cy="${y(r.intensity)}" r="4"><title>${fmtDate(r.observed_at)} · ${r.intensity}/10 · ${r.phase}</title></circle>`).join("");
    const labels=[0,.25,.5,.75,1].map(f=>{const t=min+span*f;return `<text class="chart-label" x="${x(t)}" y="${H-7}" text-anchor="middle">${new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit'}).format(new Date(t))}</text>`;}).join("");
    return `<svg class="symptom-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}<polyline class="chart-line" points="${pts}"/>${dots}${labels}</svg>`;
  }

  async function openSession(s,row){
    document.querySelectorAll(".session-row").forEach(x=>x.classList.remove("active"));row?.classList.add("active");const box=$("sessionDetail");box.innerHTML='<div class="card empty">Загружаем replay…</div>';
    try{const[d,sy]=await Promise.all([main("admin-session",{sessionId:s.id}),ext("admin-session-symptoms",{sessionId:s.id})]);d.sessionSymptoms=sy.items||[];renderSession(box,d);}catch(_){box.innerHTML='<div class="card empty">Не удалось загрузить сессию.</div>';}
  }

  function renderSession(box,d){
    if(replay)replay.stop();const events=d.events||[],states=events.filter(e=>e.event_type==="app_state"),duration=Math.max(1000,...events.map(e=>Number(e.t_ms)||0),...((d.snapshots||[]).map(x=>Number(x.t_ms)||0))),useful=events.filter(e=>["pattern_open","favorite_save","favorite_remove","color_change","instructions_open","session_feedback","library_page"].includes(e.event_type));
    const sy=renderSessionSymptoms(d.sessionSymptoms||[]);
    box.innerHTML=`<div class="card"><div class="section-title">Replay · ${esc(INTENT[d.session.request_key]||d.session.request_key||"Без запроса")}</div><div class="small muted" style="margin-bottom:10px">${face(d.session.pre_state)} → ${face(d.session.post_state)} · эффект: ${d.session.helped===2?"Да":d.session.helped===1?"Немного":d.session.helped===0?"Нет":"—"} · ${fmtMs(d.session.active_ms||0)} активно</div>${sy}<div class="replay-wrap"><div><div class="phone"><canvas id="replayCanvas" width="540" height="960"></canvas><div id="replayLabel" class="replay-label"></div></div><div class="controls"><button id="playBtn" class="btn primary">▶</button><span id="timeLabel" class="time">0:00 / ${fmtClock(duration)}</span><select id="speedSelect" class="btn"><option value="0.5">×0.5</option><option value="1" selected>×1</option><option value="2">×2</option><option value="4">×4</option><option value="8">×8</option></select></div><input id="timeline" class="range" type="range" min="0" max="${duration}" step="10" value="0"><div id="markers" class="markers"></div></div><div><div class="section-title">События</div><div class="event-list">${useful.map(e=>`<div class="event"><b>${fmtClock(e.t_ms)}</b> · ${eventName(e)}</div>`).join("")||'<div class="muted small">Нет событий</div>'}</div>${renderUsage(d.usage||[])}</div></div></div>`;
    const markerWrap=$("markers");useful.forEach(e=>{const m=document.createElement("span");m.className="marker";m.style.left=`${Math.min(100,Math.max(0,e.t_ms/duration*100))}%`;m.title=eventName(e);markerWrap.appendChild(m);});
    replay=createReplay($("replayCanvas"),$("replayLabel"),$("timeline"),$("timeLabel"),$("playBtn"),$("speedSelect"),states,duration);replay.draw(0);
  }

  function renderSessionSymptoms(list){
    if(!list.length)return"";const groups={};list.forEach(x=>{const name=x.participant_symptoms?.name||"Симптом";(groups[name]||(groups[name]={}))[x.phase]=x.intensity;});
    return `<div class="meta" style="margin-bottom:12px">${Object.entries(groups).map(([name,v])=>`<span class="pill">${esc(name)}: ${v.pre??"—"} → ${v.post??"—"}/10 ${v.pre!=null&&v.post!=null?`(${Number(v.pre)-Number(v.post)>=0?"↓":"↑"}${Math.abs(Number(v.pre)-Number(v.post))})`:""}</span>`).join("")}</div>`;
  }
  function renderUsage(list){if(!list.length)return'<div class="section-title" style="margin-top:16px">Паттерны</div><div class="muted small">Нет агрегированной экспозиции.</div>';return `<div class="section-title" style="margin-top:16px">Паттерны в сессии</div><div class="table-wrap"><table class="table"><thead><tr><th>Источник</th><th>Время</th><th>♥</th></tr></thead><tbody>${list.map(u=>`<tr><td>${u.community_config_id?`community ${esc(String(u.community_config_id).slice(0,6))}`:esc(u.pattern_id)}</td><td>${fmtMs(u.duration_ms)}</td><td>${u.saved?"да":"—"}</td></tr>`).join("")}</tbody></table></div>`;}
  function eventName(e){const p=e.payload||{};return({pattern_open:`открыт паттерн ${p.sourceType||""}`,favorite_save:"♥ сохранено",favorite_remove:"♡ удалено",color_change:`цвет ${Number(p.from)+1} → ${Number(p.to)+1}`,instructions_open:"открыта инструкция",session_feedback:"оценка после сессии",library_page:`панель ${p.page||""}`})[e.event_type]||e.event_type;}

  function createReplay(canvas,label,range,timeLabel,playBtn,speedSelect,states,duration){
    const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;let t=0,playing=false,raf=0,last=0;
    function stateAt(ms){let best=null;for(const e of states){if(e.t_ms<=ms)best=e;else break;}return best?best.payload:null;}
    function draw(ms){t=Math.max(0,Math.min(duration,ms));range.value=String(t);timeLabel.textContent=`${fmtClock(t)} / ${fmtClock(duration)}`;const s=stateAt(t);ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);if(!s){label.textContent="Начало сессии";return;}if(s.view!=="game"){label.textContent=`Библиотека · ${s.libraryPage||"all"}`;drawLibrary(ctx,W,H,s.libraryPage);return;}label.textContent=s.communityId?`Паттерн · community ${String(s.communityId).slice(0,6)}`:"Паттерн";const base=states.filter(e=>e.t_ms<=t).pop();const frame=(Number(s.frame)||0)+(base?Math.max(0,t-base.t_ms)/16.6667:0);renderPattern(ctx,W,H,s.config||{},frame);}
    function tick(ts){if(!playing)return;if(!last)last=ts;draw(t+(ts-last)*(Number(speedSelect.value)||1));last=ts;if(t>=duration){playing=false;playBtn.textContent="▶";return;}raf=requestAnimationFrame(tick);}
    playBtn.addEventListener("click",()=>{playing=!playing;playBtn.textContent=playing?"❚❚":"▶";last=0;if(playing)raf=requestAnimationFrame(tick);else cancelAnimationFrame(raf);});range.addEventListener("input",()=>{draw(Number(range.value));last=0;});return{draw,stop(){playing=false;cancelAnimationFrame(raf);}};
  }

  function drawLibrary(ctx,w,h,page){ctx.fillStyle="#080808";for(let i=0;i<12;i++){const x=w*.14+(i%4)*w*.24,y=h*.23+Math.floor(i/4)*w*.24;ctx.strokeStyle=i===0?"rgba(255,255,255,.7)":"rgba(255,255,255,.12)";ctx.beginPath();ctx.arc(x,y,w*.06,0,Math.PI*2);ctx.stroke();}ctx.fillStyle="rgba(255,255,255,.5)";ctx.font="22px -apple-system";ctx.textAlign="center";ctx.fillText(page==="community"?"СООБЩЕСТВО":page==="favorites"?"СОХРАНЕННЫЕ":"ПАТТЕРНЫ",w/2,h*.12);}
  function rad(d){return d*Math.PI/180;}function mod(n,m){return((n%m)+m)%m;}
  function color(mode,i,q,x,y,shift,frame){switch(mode){case 0:return"#fff";case 1:return`hsl(${mod(i+q*2+shift,360)} 100% 50%)`;case 2:return`hsl(${mod(frame+q*2,360)} 100% 50%)`;case 3:return"hsl(200 100% 50%)";case 4:return"hsl(330 100% 50%)";case 5:return`hsl(${mod(Math.atan2(y,x)*180/Math.PI+180+shift,360)} 100% 50%)`;case 6:return`hsl(${mod(i+shift,360)} 100% 50%)`;case 7:return`hsl(${mod(q*5+shift,360)} 100% 50%)`;case 8:return`hsl(${mod(x+y+shift,360)} 100% 50%)`;default:return"#fff";}}
  function renderPattern(ctx,w,h,c,frame){const cfg={numTentacles:Number(c.numTentacles)||24,tentacleLength:Number(c.tentacleLength)||100,baseRadius:Number(c.baseRadius)||10,movementSpeed:Number(c.movementSpeed)||1,colorSpeed:Number(c.colorSpeed)||1,circleSize:Number(c.circleSize)||1,lineWeight:Number(c.lineWeight)||1,segmentStep:Number(c.segmentStep)||2,colorModeIndex:Number(c.colorModeIndex)||0};ctx.save();ctx.translate(w/2,h/2);const scale=w/390;ctx.scale(scale,scale);const shift=frame*cfg.colorSpeed*.5;for(let i=0;i<360;i+=360/cfg.numTentacles){const x0=Math.sin(rad(i))*cfg.baseRadius,y0=Math.cos(rad(i))*cfg.baseRadius;for(let q=0;q<cfg.tentacleLength;q+=cfg.segmentStep){const a=Math.cos(rad(cfg.tentacleLength-q+frame*cfg.movementSpeed))*q,x=Math.sin(rad(i-a))*q*3,y=Math.cos(rad(i-a))*q*3,d=(cfg.tentacleLength-q)*cfg.circleSize/10;ctx.strokeStyle=color(cfg.colorModeIndex,i,q,x,y,shift,frame);ctx.lineWidth=cfg.lineWeight;ctx.beginPath();ctx.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);ctx.stroke();}}ctx.restore();}

  function renderSymptoms(){
    const el=$("tab-symptoms");el.innerHTML='<div class="card"><div class="section-title">Симптомы по аудитории</div><div class="small muted">Интенсивность 0–10. «После SETKA» — средняя разница pre − post внутри сессий; это наблюдаемая связь, не причинное доказательство.</div></div><div id="symptomGrid" class="grid symptom-grid" style="margin-top:12px"></div>';
    const grid=$("symptomGrid");if(!symptoms.length){grid.innerHTML='<div class="card empty">Пока нет отслеживаемых симптомов.</div>';return;}
    symptoms.forEach(s=>{grid.insertAdjacentHTML("beforeend",`<div class="card symptom-card"><div class="small muted">${esc(s.name)}</div><div class="big">${Number(s.avgIntensity||0).toFixed(1)}<span class="small muted"> /10</span></div><div class="meta"><span class="pill">${s.trackers} чел.</span><span class="pill">${s.count} отметок</span><span class="pill">пик ${s.peak}</span><span class="pill">после SETKA ${dropLabel(s.avgSessionDrop||0)}</span></div><div class="small muted" style="margin-top:10px">Сессии: ↓ ${s.improvedSessions||0} · = ${s.unchangedSessions||0} · ↑ ${s.worsenedSessions||0}</div></div>`);});
  }

  function renderInvites(){
    const el=$("tab-invites");const roots=invites.filter(x=>!x.invitedBy);const byParent=new Map();invites.forEach(x=>{if(!x.invitedBy)return;const a=byParent.get(x.invitedBy)||[];a.push(x);byParent.set(x.invitedBy,a);});
    el.innerHTML='<div class="card"><div class="section-title">Инвайт-дерево</div><div class="small muted">Видно, кто создал ID, активировал ли друг доступ, сколько исследовательских сессий сделал и продолжил ли приглашать дальше.</div></div><div id="inviteTree" class="invite-tree" style="margin-top:12px"></div>';
    const wrap=$("inviteTree");if(!invites.length){wrap.innerHTML='<div class="card empty">Инвайтов пока нет.</div>';return;}
    function node(x,depth=0){const children=byParent.get(x.id)||[];const div=document.createElement("div");div.className=depth?"invite-indent":"";div.innerHTML=`<div class="invite-node"><div class="rowtop"><b>${esc(x.code)}</b><span class="pill ${x.activated?"good":"warn"}">${x.activated?"активирован":"не активирован"}</span></div><div class="meta"><span class="pill">${x.sessions||0} сесс.</span><span class="pill">↗ ${x.inviteCount||0}</span><span class="pill">${fmtDate(x.createdAt)}</span></div></div>`;children.forEach(c=>div.appendChild(node(c,depth+1)));return div;}
    roots.forEach(r=>wrap.appendChild(node(r,0)));
  }

  function renderInsights(){
    const el=$("tab-insights"),by={};for(const r of insights)(by[r.requestKey]||(by[r.requestKey]=[])).push(r);
    el.innerHTML='<div class="card"><div class="section-title">Запросы / эффект</div><div class="small muted">Какие паттерны и пользовательские конфигурации чаще присутствуют в сессиях с улучшением самооценки состояния.</div></div><div id="insightBlocks" style="margin-top:12px"></div>';
    const wrap=$("insightBlocks"),keys=Object.keys(by);if(!keys.length){wrap.innerHTML='<div class="card empty">Пока мало завершённых сессий.</div>';return;}
    keys.forEach(k=>{const rows=by[k].slice().sort((a,b)=>b.avgDelta-a.avgDelta||b.sessions-a.sessions).slice(0,12);wrap.insertAdjacentHTML("beforeend",`<div class="card" style="margin-bottom:12px"><div class="section-title">${esc(INTENT[k]||k)}</div><div class="table-wrap"><table class="table"><thead><tr><th>Паттерн / конфигурация</th><th>Сессии</th><th>Время</th><th>Среднее Δ</th><th>Сохранения</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.communityConfigId?`Community ${esc(String(r.communityConfigId).slice(0,8))}`:esc(r.patternId)}</td><td>${r.sessions}</td><td>${fmtMs(r.durationMs)}</td><td>${r.avgDelta>=0?"+":""}${Number(r.avgDelta).toFixed(2)}</td><td>${r.saves}</td></tr>`).join("")}</tbody></table></div></div>`);});
  }

  function renderCommunity(){
    const el=$("tab-community");el.innerHTML='<div class="card"><div class="section-title">Коллективная библиотека</div><div class="small muted">Одна карточка = уникальная конфигурация. ♥ — число уникальных участников, которые сохранили её.</div></div><div id="communityGrid" class="grid community-grid" style="margin-top:12px"></div>';
    const grid=$("communityGrid");if(!community.length){grid.innerHTML='<div class="card empty" style="grid-column:1/-1">Пока нет сохранённых конфигураций.</div>';return;}
    const best=new Map();for(const r of insights){if(!r.communityConfigId)continue;const p=best.get(r.communityConfigId);if(!p||r.avgDelta>p.avgDelta)best.set(r.communityConfigId,r);}
    community.forEach(c=>{const wrap=document.createElement("div");wrap.className="community-item";const cv=document.createElement("canvas");cv.width=220;cv.height=220;wrap.appendChild(cv);const badge=document.createElement("span");badge.className="community-badge";badge.textContent=`♥ ${c.saveCount||0}`;wrap.appendChild(badge);const b=best.get(c.id);if(b){const note=document.createElement("span");note.className="community-note";note.textContent=`${INTENT[b.requestKey]||b.requestKey}: Δ ${b.avgDelta>=0?"+":""}${Number(b.avgDelta).toFixed(1)} · ${b.sessions} сесс.`;wrap.appendChild(note);}grid.appendChild(wrap);drawThumb(cv,c.config,c.preview_frame);});
  }

  function drawThumb(canvas,c,frame){const ctx=canvas.getContext("2d");ctx.fillStyle="#000";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(canvas.width/2,canvas.height/2);const extent=Math.max(40,(Number(c.tentacleLength)||100)*3+(Number(c.baseRadius)||10)),sc=(canvas.width/2-6)/extent;ctx.scale(sc,sc);renderPatternOrigin(ctx,c,Number(frame)||44);ctx.restore();}
  function renderPatternOrigin(ctx,c,frame){const n=Number(c.numTentacles)||24,len=Number(c.tentacleLength)||100,base=Number(c.baseRadius)||10,mov=Number(c.movementSpeed)||1,cs=Number(c.colorSpeed)||1,size=Number(c.circleSize)||1,lw=Number(c.lineWeight)||1,step=Number(c.segmentStep)||2,mode=Number(c.colorModeIndex)||0,shift=frame*cs*.5;for(let i=0;i<360;i+=360/n){const x0=Math.sin(rad(i))*base,y0=Math.cos(rad(i))*base;for(let q=0;q<len;q+=step){const a=Math.cos(rad(len-q+frame*mov))*q,x=Math.sin(rad(i-a))*q*3,y=Math.cos(rad(i-a))*q*3,d=(len-q)*size/10;ctx.strokeStyle=color(mode,i,q,x,y,shift,frame);ctx.lineWidth=lw;ctx.beginPath();ctx.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);ctx.stroke();}}}

  if(adminKey){keyInput.value=adminKey;loginNow();}
})();
