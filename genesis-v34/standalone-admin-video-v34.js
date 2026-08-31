(() => {
  "use strict";

  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_STORAGE="setka-research:admin-key:v1";
  const INTENT={sleep:"Уснуть",relax:"Расслабиться",tension:"Снизить напряжение",focus:"Сконцентрироваться",energy:"Взбодриться",switch:"Переключиться",explore:"Просто исследую"};
  const EVENT={pattern_open:"Паттерн",pattern_state:"Изменение",gesture_start:"Жест",gesture_end:"Жест завершён",color:"Цвет",favorite_save:"♥ сохранение",favorite_remove:"♡ удаление",note_create:"Заметка",session_start:"Старт",feedback_prompt:"Оценка",feedback_submit:"Feedback",continuation_start:"Продолжение",session_end:"Конец",screen:"Экран",session_screen:"Экран",session_view:"Переход",session_library_page:"Библиотека",symptom_checkin:"Симптом",ui_tap:"Тап",screen_pointer_down:"Касание",screen_pointer_move:"Движение",screen_pointer_up:"Отпускание"};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const fmtClock=ms=>{const s=Math.max(0,Math.floor((Number(ms)||0)/1000));return`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`};
  const short=id=>String(id||"").slice(-6).toUpperCase();
  const style=document.createElement("style");
  style.textContent=`
    .video-replay{margin-top:14px}.video-replay .phone{position:relative;overflow:hidden;background:#000}.video-replay canvas{width:100%;height:100%;display:block}.video-replay .video-time{position:absolute;left:12px;top:12px;padding:5px 8px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(0,0,0,.52);font:10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff}.video-replay .video-event{position:absolute;left:12px;right:12px;bottom:12px;padding:8px 10px;border:1px solid rgba(255,255,255,.15);border-radius:14px;background:rgba(0,0,0,.58);font-size:10px;color:rgba(255,255,255,.76);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
    .video-controls{display:grid;grid-template-columns:auto auto 1fr auto auto;gap:8px;align-items:center;margin-top:10px}.video-controls .btn{min-width:44px}.video-controls input{width:100%;min-width:0}.video-speed.active{background:#fff!important;color:#000!important}.video-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.video-meta span{font-size:9px;color:rgba(255,255,255,.44)}
    @media(max-width:600px){.video-controls{grid-template-columns:auto auto 1fr auto}.video-controls .video-next{display:none}}
  `;
  document.head.appendChild(style);

  let allSessions=[],allEvents=[],loaded=false,selected=null,loading=null;
  let playerStop=null;

  async function call(action,payload={}){
    let adminKey="";try{adminKey=localStorage.getItem(ADMIN_STORAGE)||""}catch(_){}
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,adminKey,...payload})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"request_failed");return d;
  }
  async function load(){
    if(loaded)return;if(loading)return loading;
    loading=(async()=>{const o=await call("admin-overview"),devices=o.devices||[],details=await Promise.all(devices.map(d=>call("admin-device",{deviceId:d.device_id}).catch(()=>null)));allSessions=[];allEvents=[];for(const d of details.filter(Boolean)){const deviceId=d.device.device_id,p=d.snapshot?.payload||{};for(const s of p.sessions||[])allSessions.push({...s,_deviceId:deviceId});for(const e of p.events||[])allEvents.push({...e,_deviceId:deviceId})}allSessions.sort((a,b)=>Date.parse(b.startedAt||0)-Date.parse(a.startedAt||0));allEvents.sort((a,b)=>Date.parse(a.wallAt||0)-Date.parse(b.wallAt||0));loaded=true;loading=null;tagSessionCards()})();
    return loading;
  }
  function sessionEvents(s){return allEvents.filter(e=>e._deviceId===s._deviceId&&e.sessionId===s.id).sort((a,b)=>(Number(a.tMs)||Date.parse(a.wallAt)||0)-(Number(b.tMs)||Date.parse(b.wallAt)||0))}
  function sessionDuration(s,ev){const fromTimes=ev.map(e=>Number(e.tMs)).filter(Number.isFinite),eventEnd=fromTimes.length?Math.max(...fromTimes):0,wall=Date.parse(s.endedAt||0)-Date.parse(s.startedAt||0),planned=Number(s.plannedSeconds||0)*1000;return Math.max(1000,eventEnd,Number.isFinite(wall)?wall:0,planned)}
  function tagSessionCards(){const cards=[...document.querySelectorAll(".session-click")];cards.forEach((card,i)=>{const s=allSessions[i];if(!s)return;card.dataset.videoSession=`${s._deviceId}:${s.id}`;if(!card.dataset.videoBound){card.dataset.videoBound="1";card.addEventListener("click",()=>{selected=s},{capture:true})}})}
  function inferSelected(){if(selected)return selected;const detail=$("detail");if(!detail)return null;const txt=detail.textContent||"";return allSessions.find(s=>txt.includes(short(s._deviceId))&&txt.includes(INTENT[s.requestKey]||s.requestKey||"Сессия"))||null}

  const FIELDS_CONT=["tentacleLength","baseRadius","movementSpeed","colorSpeed","circleSize","lineWeight"];
  const FIELDS_DISC=["numTentacles","segmentStep"];
  const DEFAULT={numTentacles:24,tentacleLength:100,baseRadius:10,movementSpeed:1,colorSpeed:1,circleSize:1,lineWeight:1,segmentStep:2,colorModeIndex:0};
  const mod=(n,m)=>((n%m)+m)%m;
  const rad=d=>d*Math.PI/180;
  function norm(c){return{...DEFAULT,...(c||{})}}
  function mixConfig(a,b,t){a=norm(a);b=norm(b||a);const c={...a};for(const k of FIELDS_CONT)c[k]=Number(a[k])+(Number(b[k])-Number(a[k]))*t;for(const k of FIELDS_DISC)c[k]=Math.round(Number(a[k])+(Number(b[k])-Number(a[k]))*t);c.colorModeIndex=t<.5?Number(a.colorModeIndex):Number(b.colorModeIndex);return c}
  function color(mode,i,q,x,y,shift,frame){switch(Number(mode)||0){case 0:return"#fff";case 1:return`hsl(${mod(i+q*2+shift,360)} 100% 50%)`;case 2:return`hsl(${mod(frame+q*2,360)} 100% 50%)`;case 3:return"hsl(200 100% 50%)";case 4:return"hsl(330 100% 50%)";case 5:return`hsl(${mod(Math.atan2(y,x)*180/Math.PI+180+shift,360)} 100% 50%)`;case 6:return`hsl(${mod(i+shift,360)} 100% 50%)`;case 7:return`hsl(${mod(q*5+shift,360)} 100% 50%)`;case 8:return`hsl(${mod(x+y+shift,360)} 100% 50%)`;default:return"#fff"}}
  function drawPattern(canvas,config,frame){const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,c=norm(config);ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w/2,h/2);const extent=Math.max(40,c.tentacleLength*3+c.baseRadius+c.tentacleLength*c.circleSize/20),sc=Math.min(.94,(Math.min(w,h)/2-24)/extent);ctx.scale(sc,sc);const shift=frame*c.colorSpeed*.5;for(let i=0;i<360;i+=360/c.numTentacles){const x0=Math.sin(rad(i))*c.baseRadius,y0=Math.cos(rad(i))*c.baseRadius;for(let q=0;q<c.tentacleLength;q+=Math.max(1,c.segmentStep)){const a=Math.cos(rad(c.tentacleLength-q+frame*c.movementSpeed))*q,x=Math.sin(rad(i-a))*q*3,y=Math.cos(rad(i-a))*q*3,d=(c.tentacleLength-q)*c.circleSize/10;ctx.strokeStyle=color(c.colorModeIndex,i,q,x,y,shift,frame);ctx.lineWidth=c.lineWeight;ctx.beginPath();ctx.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);ctx.stroke()}}ctx.restore()}
  function drawAppScreen(canvas,title,page){const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.strokeStyle="rgba(255,255,255,.15)";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect?.(42,72,w-84,h-160,38);ctx.stroke();ctx.fillStyle="rgba(255,255,255,.8)";ctx.textAlign="center";ctx.font="600 26px -apple-system,BlinkMacSystemFont,sans-serif";ctx.fillText(title||page||"SETKA",w/2,145);ctx.font="14px -apple-system,BlinkMacSystemFont,sans-serif";ctx.fillStyle="rgba(255,255,255,.34)";ctx.fillText(page?`раздел · ${page}`:"путь по приложению",w/2,178);for(let i=0;i<4;i++){ctx.strokeStyle="rgba(255,255,255,.1)";ctx.strokeRect(90,245+i*90,w-180,55)}ctx.strokeStyle="rgba(255,255,255,.2)";ctx.beginPath();ctx.moveTo(65,h-120);ctx.lineTo(w-65,h-120);ctx.stroke();for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(110+i*(w-220)/3,h-82,12,0,Math.PI*2);ctx.stroke()}}

  function stateTimeline(ev){return ev.filter(e=>e.payload?.state?.config).map(e=>({t:Number(e.tMs)||0,e,state:e.payload.state})).sort((a,b)=>a.t-b.t)}
  function currentState(states,t){if(!states.length)return null;let lo=0,hi=states.length-1,best=0;while(lo<=hi){const m=(lo+hi)>>1;if(states[m].t<=t){best=m;lo=m+1}else hi=m-1}return{prev:states[best],next:states[Math.min(states.length-1,best+1)]}}
  function currentScreen(ev,t){let title="",page="";for(const e of ev){const tm=Number(e.tMs)||0;if(tm>t)break;if(e.type==="screen"||e.type==="session_screen")title=e.payload?.title||title;if(e.type==="session_view")page=e.payload?.view||page;if(e.type==="session_library_page")page=e.payload?.page||page}return{title,page}}
  function pointerAt(ev,t){const pts=ev.filter(e=>["screen_pointer_down","screen_pointer_move","ui_tap"].includes(e.type)&&Number.isFinite(Number(e.payload?.nx))&&Number.isFinite(Number(e.payload?.ny))&&Number(e.tMs)<=t&&t-Number(e.tMs)<=900);return pts.slice(-20)}
  function drawPointer(canvas,pts){if(!pts.length)return;const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;ctx.save();ctx.strokeStyle="rgba(255,255,255,.3)";ctx.lineWidth=4;ctx.beginPath();pts.forEach((e,i)=>{const x=Number(e.payload.nx)*w,y=Number(e.payload.ny)*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();const e=pts.at(-1),x=Number(e.payload.nx)*w,y=Number(e.payload.ny)*h;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.restore()}
  function latestEvent(ev,t){let out=null;for(const e of ev){if((Number(e.tMs)||0)<=t)out=e;else break}return out}

  async function renderVideo(s,box){
    if(playerStop){playerStop();playerStop=null}
    if(!s){box.innerHTML='<div class="empty">Не удалось определить сессию.</div>';return}
    const ev=sessionEvents(s),states=stateTimeline(ev),duration=sessionDuration(s,ev);
    box.innerHTML=`<div class="video-replay"><div class="replay-wrap"><div class="phone"><canvas id="videoReplayCanvas" width="720" height="1280"></canvas><div id="videoReplayTime" class="video-time">0:00 / ${fmtClock(duration)}</div><div id="videoReplayEvent" class="video-event">Старт сессии</div></div><div><div class="video-controls"><button id="videoBack" class="btn">−5с</button><button id="videoPlay" class="btn primary">▶</button><input id="videoRange" class="range" type="range" min="0" max="${Math.round(duration)}" step="20" value="0"><button id="videoSpeed" class="btn video-speed">×1</button><button id="videoNext" class="btn video-next">+5с</button></div><div class="video-meta"><span>Плавное воспроизведение по реальному времени</span><span>·</span><span>×2 ускоряет всю сессию</span><span>·</span><span>события — только метки поверх видео</span></div></div></div></div>`;
    const canvas=$("videoReplayCanvas"),range=$("videoRange"),play=$("videoPlay"),speed=$("videoSpeed"),time=$("videoReplayTime"),eventLabel=$("videoReplayEvent");
    let t=0,rate=1,playing=false,raf=0,lastPerf=0;
    function render(){
      const pair=currentState(states,t),last=latestEvent(ev,t);let inGame=false;
      if(pair?.prev?.state){const st=pair.prev.state;inGame=st.view==="game"||last?.payload?.state?.view==="game";if(inGame){let c=st.config,frame=Number(st.frame)||44;if(pair.next&&pair.next.t>pair.prev.t&&pair.next.t-pair.prev.t<1200){const f=Math.max(0,Math.min(1,(t-pair.prev.t)/(pair.next.t-pair.prev.t)));c=mixConfig(st.config,pair.next.state.config,f);if(Number.isFinite(Number(pair.next.state.frame)))frame=Number(st.frame||44)+(Number(pair.next.state.frame)-Number(st.frame||44))*f;else frame+=(t-pair.prev.t)/16.6667}else frame+=(t-pair.prev.t)/16.6667;drawPattern(canvas,c,frame)}else{const scr=currentScreen(ev,t);drawAppScreen(canvas,scr.title,scr.page)}}else{const scr=currentScreen(ev,t);drawAppScreen(canvas,scr.title||"SETKA",scr.page)}
      drawPointer(canvas,pointerAt(ev,t));range.value=String(Math.round(t));time.textContent=`${fmtClock(t)} / ${fmtClock(duration)}`;eventLabel.textContent=last?`${EVENT[last.type]||last.type} · ${fmtClock(Number(last.tMs)||0)}`:"Старт сессии";
    }
    function frame(now){if(!playing)return;if(!lastPerf)lastPerf=now;const dt=Math.min(120,now-lastPerf);lastPerf=now;t=Math.min(duration,t+dt*rate);render();if(t>=duration){stop();return}raf=requestAnimationFrame(frame)}
    function start(){if(playing)return;playing=true;play.textContent="Ⅱ";lastPerf=0;raf=requestAnimationFrame(frame)}
    function stop(){playing=false;cancelAnimationFrame(raf);raf=0;play.textContent="▶";lastPerf=0}
    function seek(v){t=Math.max(0,Math.min(duration,Number(v)||0));render()}
    range.oninput=()=>{stop();seek(range.value)};play.onclick=()=>playing?stop():start();speed.onclick=()=>{rate=rate===1?2:1;speed.textContent=`×${rate}`;speed.classList.toggle("active",rate===2)};$("videoBack").onclick=()=>seek(t-5000);$("videoNext").onclick=()=>seek(t+5000);render();playerStop=stop;
  }

  function upgradeReplayButton(){const btn=$("replayBtn"),box=$("replayBox");if(!btn||!box||btn.dataset.videoUpgraded)return;btn.dataset.videoUpgraded="1";btn.textContent="▶ Плавный Replay всей сессии";btn.onclick=async()=>{try{await load();selected=inferSelected()||selected;renderVideo(selected,box)}catch(e){box.innerHTML=`<div class="empty">Replay не загрузился: ${esc(e.message)}</div>`}}}

  const mo=new MutationObserver(()=>{tagSessionCards();upgradeReplayButton()});mo.observe(document.documentElement,{subtree:true,childList:true});
  document.getElementById("refreshBtn")?.addEventListener("click",()=>{loaded=false;selected=null;setTimeout(()=>load().catch(()=>{}),350)});
  document.querySelector('[data-tab="sessions"]')?.addEventListener("click",()=>setTimeout(()=>{load().then(tagSessionCards).catch(()=>{})},50));
  if(localStorage.getItem(ADMIN_STORAGE))setTimeout(()=>load().catch(()=>{}),500);
})();