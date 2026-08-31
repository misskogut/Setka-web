(() => {
  "use strict";

  const API_URL="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_STORAGE="setka-research:admin-key:v1";
  const DEFAULT_CONFIG={numTentacles:24,tentacleLength:100,baseRadius:10,movementSpeed:1,colorSpeed:1,circleSize:1,lineWeight:1,segmentStep:2,colorModeIndex:0};
  const $=id=>document.getElementById(id);

  const login=$("adminLogin"),shell=$("adminShell"),loginForm=$("adminLoginForm"),adminKeyInput=$("adminKey"),adminError=$("adminError"),participantList=$("participantList"),sessionList=$("sessionList"),sessionsTitle=$("sessionsTitle"),newLabel=$("newLabel"),createCode=$("createCode"),issuedCode=$("issuedCode"),issuedCodeValue=$("issuedCodeValue"),copyIssued=$("copyIssued"),refreshButton=$("refreshButton");
  const replayEmpty=$("replayEmpty"),replayWrap=$("replayWrap"),replayPhone=$("replayPhone"),replayCanvas=$("replayCanvas"),rctx=replayCanvas.getContext("2d"),replayLibrary=$("replayLibrary"),replayPager=$("replayPager"),replayGrid=$("replayGrid"),replayUi=$("replayUi"),replayHeart=$("replayHeart"),gestureCursor=$("gestureCursor"),replayBottom=$("replayBottom"),replayTitle=$("replayTitle"),replaySubtitle=$("replaySubtitle"),timeline=$("timeline"),currentTime=$("currentTime"),totalTime=$("totalTime"),playButton=$("playButton"),eventRail=$("eventRail"),statEvents=$("statEvents"),statGestures=$("statGestures"),statStates=$("statStates");

  let adminKey=sessionStorage.getItem(ADMIN_STORAGE)||"";
  let participants=[];
  let selectedParticipantId=null;
  let selectedSessionId=null;
  let replayData=null;
  let replayStateEvents=[];
  let replaySnapshots=[];
  let durationMs=0;
  let replayMs=0;
  let playing=false;
  let speed=1;
  let playBaseMs=0;
  let playStartedPerf=0;
  let raf=0;

  async function api(action,payload={}){
    const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,adminKey,...payload})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const e=new Error(data.error||`http_${res.status}`);e.code=data.error;throw e}
    return data;
  }

  function fmtDuration(ms){ms=Math.max(0,Number(ms)||0);const s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);if(h)return`${h}ч ${m%60}м`;return`${m}м ${s%60}с`}
  function fmtTimeline(ms){ms=Math.max(0,Number(ms)||0);const total=ms/1000,m=Math.floor(total/60),s=Math.floor(total%60),d=Math.floor((total-Math.floor(total))*10);return`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${d}`}
  function fmtDate(v){if(!v)return"—";return new Date(v).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
  function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

  async function loginAdmin(key){adminError.textContent="";adminKey=key.trim();if(!adminKey)return;try{await api("admin-check");sessionStorage.setItem(ADMIN_STORAGE,adminKey);login.classList.add("hidden");shell.classList.remove("hidden");await loadParticipants()}catch(_){adminError.textContent="Ключ не подошёл.";adminKey="";sessionStorage.removeItem(ADMIN_STORAGE)}}

  loginForm.addEventListener("submit",e=>{e.preventDefault();loginAdmin(adminKeyInput.value)});
  if(adminKey){adminKeyInput.value=adminKey;loginAdmin(adminKey)}

  async function loadParticipants(){
    const data=await api("admin-list-participants");participants=data.participants||[];renderParticipants();if(selectedParticipantId){const still=participants.some(p=>p.id===selectedParticipantId);if(still)await loadSessions(selectedParticipantId);else{selectedParticipantId=null;sessionList.innerHTML='<div class="muted">Выберите тестера слева</div>'}}
  }

  function renderParticipants(){
    participantList.innerHTML="";
    if(!participants.length){participantList.innerHTML='<div class="muted">Пока нет ID.</div>';return}
    for(const p of participants){
      const card=document.createElement("div");card.className=`participant${p.id===selectedParticipantId?" active":""}`;
      card.innerHTML=`<div class="p-row"><div><div class="p-code">${esc(p.access_code)}</div><div class="p-label">${esc(p.label||"без пометки")}</div></div><span style="font-size:11px;color:${p.active?"#fff":"#777"}">${p.active?"активен":"выключен"}</span></div><div class="p-meta"><span>${p.bound?"● устройство закреплено":"○ ещё не входил"}</span><span>${p.sessionCount||0} сесс.</span><span>${fmtDuration(p.totalMs)}</span></div><div class="p-actions"><button class="mini copy">Копировать ID</button><button class="mini reset">Сбросить устройство</button><button class="mini toggle">${p.active?"Выключить":"Включить"}</button></div>`;
      card.addEventListener("click",()=>selectParticipant(p.id));
      card.querySelector(".copy").addEventListener("click",async e=>{e.stopPropagation();await navigator.clipboard?.writeText(p.access_code)});
      card.querySelector(".reset").addEventListener("click",async e=>{e.stopPropagation();if(!confirm(`Сбросить привязку устройства для ${p.access_code}?`))return;await api("admin-reset-device",{participantId:p.id});await loadParticipants()});
      card.querySelector(".toggle").addEventListener("click",async e=>{e.stopPropagation();await api("admin-toggle-active",{participantId:p.id,active:!p.active});await loadParticipants()});
      participantList.appendChild(card);
    }
  }

  async function selectParticipant(id){selectedParticipantId=id;renderParticipants();await loadSessions(id)}

  async function loadSessions(participantId){
    const p=participants.find(x=>x.id===participantId);sessionsTitle.textContent=`Сессии · ${p?.access_code||""}`;
    const data=await api("admin-list-sessions",{participantId});const sessions=data.sessions||[];sessionList.innerHTML="";
    if(!sessions.length){sessionList.innerHTML='<div class="muted">У этого ID пока нет сессий.</div>';return}
    for(const s of sessions){const end=s.ended_at||s.last_seen_at||s.started_at,d=Math.max(0,Date.parse(end)-Date.parse(s.started_at));const btn=document.createElement("button");btn.className=`session${s.id===selectedSessionId?" active":""}`;btn.innerHTML=`<strong>${fmtDate(s.started_at)}</strong><span>${fmtDuration(d)} · ${s.ended_at?"завершена":"последняя активность"}</span>`;btn.addEventListener("click",()=>openSession(s.id));sessionList.appendChild(btn)}
  }

  createCode.addEventListener("click",async()=>{createCode.disabled=true;try{const data=await api("admin-create-code",{label:newLabel.value.trim()});const code=data.participant.access_code;issuedCodeValue.textContent=code;issuedCode.classList.remove("hidden");newLabel.value="";await loadParticipants()}finally{createCode.disabled=false}});
  copyIssued.addEventListener("click",()=>navigator.clipboard?.writeText(issuedCodeValue.textContent||""));
  refreshButton.addEventListener("click",()=>loadParticipants());

  async function openSession(sessionId){
    selectedSessionId=sessionId;playing=false;playButton.textContent="▶︎";cancelAnimationFrame(raf);if(selectedParticipantId)await loadSessions(selectedParticipantId);
    const data=await api("admin-session",{sessionId});replayData=data;replayStateEvents=(data.events||[]).filter(e=>e.event_type==="app_state");replaySnapshots=data.snapshots||[];
    const session=data.session;const serverEnd=session.ended_at||session.last_seen_at||session.started_at;const serverDuration=Math.max(0,Date.parse(serverEnd)-Date.parse(session.started_at));const eventDuration=(data.events||[]).reduce((m,e)=>Math.max(m,Number(e.t_ms)||0),0);durationMs=Math.max(1000,serverDuration,eventDuration);replayMs=0;
    const vw=Math.max(280,Number(session.viewport?.width)||390),vh=Math.max(500,Number(session.viewport?.height)||844);replayCanvas.width=vw;replayCanvas.height=vh;replayPhone.style.aspectRatio=`${vw}/${vh}`;
    timeline.min="0";timeline.max=String(Math.round(durationMs));timeline.value="0";totalTime.textContent=fmtTimeline(durationMs);replayTitle.textContent=`${data.participant?.access_code||"Сессия"} · ${fmtDate(session.started_at)}`;replaySubtitle.textContent=`${fmtDuration(durationMs)} · ${session.app_version||"web"}`;
    statEvents.textContent=String((data.events||[]).length);statGestures.textContent=String((data.events||[]).filter(e=>e.event_type==="gesture_start").length);statStates.textContent=String(replayStateEvents.length);
    renderEventRail(data.events||[]);renderReplay(0);replayEmpty.classList.add("hidden");replayWrap.classList.remove("hidden");
  }

  function renderEventRail(events){eventRail.innerHTML="";for(const e of events){if(e.event_type==="app_state"||e.event_type==="session_start")continue;const mark=document.createElement("span");mark.className="event-mark";mark.style.left=`${Math.min(100,Math.max(0,(Number(e.t_ms)||0)/durationMs*100))}%`;mark.title=e.event_type;eventRail.appendChild(mark)}}

  function stateAt(ms){
    let best=null,bestT=-1;
    for(const e of replayStateEvents){const t=Number(e.t_ms)||0;if(t<=ms&&t>=bestT){best=e.payload;bestT=t}else if(t>ms)break}
    if(!best){for(const s of replaySnapshots){const t=Number(s.t_ms)||0;if(t<=ms&&t>=bestT){best=s.app_state;bestT=t}else if(t>ms)break}}
    if(!best)best={view:"library",libraryPage:"all",patternId:"tentacle-orbit",sourceType:"base",config:{...DEFAULT_CONFIG},frame:0,favoriteCount:0};
    return{state:best,tMs:bestT<0?0:bestT};
  }

  function renderReplay(ms){
    replayMs=Math.min(durationMs,Math.max(0,ms));timeline.value=String(Math.round(replayMs));currentTime.textContent=fmtTimeline(replayMs);
    const {state,tMs}=stateAt(replayMs);const view=state.view||"library";
    if(view==="game"){
      replayLibrary.classList.add("hidden");replayUi.classList.remove("hidden");replayCanvas.style.display="block";
      const config={...DEFAULT_CONFIG,...(state.config||{})};const frame=(Number(state.frame)||0)+Math.max(0,replayMs-tMs)/16.6667;renderPattern(rctx,replayCanvas.width,replayCanvas.height,config,frame,false);replayHeart.textContent=state.sourceType==="favorite"?"♥":"♡";replayBottom.textContent=`ЦВЕТ ${(Number(config.colorModeIndex)||0)+1} / 9`;
      if(state.gesture?.active){gestureCursor.style.display="block";gestureCursor.style.left=`${(Number(state.gesture.x)||0)*100}%`;gestureCursor.style.top=`${(Number(state.gesture.y)||0)*100}%`;gestureCursor.classList.toggle("two",Number(state.gesture.fingers)>=2)}else gestureCursor.style.display="none";
    }else{
      replayCanvas.style.display="none";replayUi.classList.add("hidden");replayLibrary.classList.remove("hidden");renderLibraryReplay(state)
    }
  }

  function renderLibraryReplay(state){
    const fav=state.libraryPage==="favorites";replayPager.textContent=fav?"○ ♥":"● ♡";replayGrid.innerHTML="";
    if(!fav){const cell=document.createElement("div");cell.className="replay-thumb";const c=document.createElement("canvas");c.width=180;c.height=180;cell.appendChild(c);replayGrid.appendChild(cell);renderPattern(c.getContext("2d"),180,180,DEFAULT_CONFIG,44,true)}
    else{const n=Math.max(0,Math.min(20,Number(state.favoriteCount)||0));for(let i=0;i<n;i++){const d=document.createElement("div");d.className="replay-thumb";d.innerHTML='<div class="replay-fav-dot">♥</div>';replayGrid.appendChild(d)}if(!n){const d=document.createElement("div");d.className="muted";d.style.gridColumn="1/-1";d.style.textAlign="center";d.style.marginTop="80px";d.textContent="Сохранённых конфигураций пока нет";replayGrid.appendChild(d)}}
  }

  function rad(d){return d*Math.PI/180}function mod(n,m){return((n%m)+m)%m}
  function color(mode,i,q,x,y,shift,frame){switch(Number(mode)||0){case 0:return"hsl(0 0% 100%)";case 1:return`hsl(${mod(i+q*2+shift,360)} 100% 50%)`;case 2:return`hsl(${mod(frame+q*2,360)} 100% 50%)`;case 3:return"hsl(200 100% 50%)";case 4:return"hsl(330 100% 50%)";case 5:return`hsl(${mod(Math.atan2(y,x)*180/Math.PI+180+shift,360)} 100% 50%)`;case 6:return`hsl(${mod(i+shift,360)} 100% 50%)`;case 7:return`hsl(${mod(q*5+shift,360)} 100% 50%)`;case 8:return`hsl(${mod(x+y+shift,360)} 100% 50%)`;default:return"#fff"}}
  function renderPattern(ctx,w,h,c,frame,thumb){ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.translate(w/2,h/2);if(thumb){const extent=Math.max(40,c.tentacleLength*3+c.baseRadius+(c.tentacleLength*c.circleSize/20));ctx.scale(Math.min(.95,(Math.min(w,h)/2-5)/extent),Math.min(.95,(Math.min(w,h)/2-5)/extent))}const shift=frame*c.colorSpeed*.5;for(let i=0;i<360;i+=360/c.numTentacles){const x0=Math.sin(rad(i))*c.baseRadius,y0=Math.cos(rad(i))*c.baseRadius;for(let q=0;q<c.tentacleLength;q+=c.segmentStep){const a=Math.cos(rad(c.tentacleLength-q+frame*c.movementSpeed))*q,x=Math.sin(rad(i-a))*(q*3),y=Math.cos(rad(i-a))*(q*3),d=(c.tentacleLength-q)*c.circleSize/10;ctx.strokeStyle=color(c.colorModeIndex,i,q,x,y,shift,frame);ctx.lineWidth=c.lineWeight;ctx.beginPath();ctx.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);ctx.stroke()}}ctx.restore()}

  timeline.addEventListener("input",()=>{playing=false;playButton.textContent="▶︎";renderReplay(Number(timeline.value)||0)});
  playButton.addEventListener("click",()=>{if(!replayData)return;playing=!playing;playButton.textContent=playing?"Ⅱ":"▶︎";if(playing){if(replayMs>=durationMs)replayMs=0;playBaseMs=replayMs;playStartedPerf=performance.now();tick()}});
  document.querySelectorAll(".speed").forEach(btn=>btn.addEventListener("click",()=>{speed=Number(btn.dataset.speed)||1;document.querySelectorAll(".speed").forEach(b=>b.classList.toggle("active",b===btn));if(playing){playBaseMs=replayMs;playStartedPerf=performance.now()}}));
  function tick(){cancelAnimationFrame(raf);if(!playing)return;const next=playBaseMs+(performance.now()-playStartedPerf)*speed;if(next>=durationMs){playing=false;playButton.textContent="▶︎";renderReplay(durationMs);return}renderReplay(next);raf=requestAnimationFrame(tick)}
})();