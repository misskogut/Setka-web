(() => {
  "use strict";

  // Restores the very first SETKA admin replay UX (24 Aug 2026): a live phone,
  // real-time scrubber, individual speed buttons, event rail and continuous animation.
  // The final admin UI stays intact; this module only replaces its session replay widget.
  const DEFAULT_CONFIG={numTentacles:24,tentacleLength:100,baseRadius:10,movementSpeed:1,colorSpeed:1,circleSize:1,lineWeight:1,segmentStep:2,colorModeIndex:0};
  const priorFetch=window.fetch.bind(window);
  let latest=null,mountTimer=0,player=null;

  function requestAction(args){
    try{
      const opt=args[1]||{},raw=opt.body;
      if(typeof raw!=="string")return null;
      return JSON.parse(raw)?.action||null;
    }catch(_){return null}
  }
  window.fetch=async function(...args){
    const action=requestAction(args),res=await priorFetch(...args);
    if(action==="admin-session"){
      res.clone().json().then(d=>{latest=d;scheduleMount()}).catch(()=>{});
    }
    return res;
  };

  const style=document.createElement("style");
  style.textContent=`
  .f34-replay{margin-top:4px}.f34-wrap{display:grid;grid-template-columns:minmax(280px,430px) 1fr;gap:20px;align-items:start}.f34-phone-wrap{display:flex;justify-content:center}.f34-phone{position:relative;width:min(100%,390px);aspect-ratio:390/844;background:#000;border:1px solid rgba(255,255,255,.18);border-radius:30px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.4)}.f34-phone canvas{position:absolute;inset:0;width:100%;height:100%;background:#000}.f34-library{position:absolute;inset:0;background:#000;padding:52px 22px 30px}.f34-pager{text-align:center;font-size:22px;letter-spacing:18px;height:50px}.f34-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px 12px;padding-top:36px}.f34-thumb{aspect-ratio:1;border-radius:50%;display:grid;place-items:center;overflow:hidden}.f34-thumb canvas{position:static;width:100%;height:100%}.f34-fav-dot{width:70%;height:70%;border:1px solid rgba(255,255,255,.35);border-radius:50%;display:grid;place-items:center;font-size:18px}.f34-ui{position:absolute;inset:0;pointer-events:none}.f34-heart{position:absolute;top:28px;left:50%;transform:translateX(-50%);width:50px;height:50px;border:1px solid rgba(255,255,255,.6);border-radius:50%;display:grid;place-items:center;font-size:26px}.f34-grid-button{position:absolute;top:28px;right:20px;width:50px;height:50px;border:1px solid rgba(255,255,255,.6);border-radius:50%;display:grid;place-items:center;font-size:18px}.f34-bottom{position:absolute;bottom:28px;left:0;right:0;text-align:center;color:rgba(255,255,255,.55);font-size:11px;letter-spacing:.08em}.f34-cursor{position:absolute;width:26px;height:26px;border:1px solid #fff;border-radius:50%;transform:translate(-50%,-50%);opacity:.86;display:none;z-index:8;box-shadow:0 0 12px rgba(255,255,255,.18)}.f34-cursor.two:after{content:"";position:absolute;width:26px;height:26px;border:1px solid #fff;border-radius:50%;left:13px;top:8px}.f34-screen{position:absolute;inset:0;background:#000;padding:58px 24px 90px;display:none;z-index:3}.f34-screen-mark{width:50px;height:50px;border:1px solid rgba(255,255,255,.45);border-radius:50%;display:grid;place-items:center;margin:12px auto 30px;font-size:9px;letter-spacing:.12em}.f34-screen-title{text-align:center;font-size:22px;font-weight:650}.f34-screen-sub{text-align:center;font-size:10px;color:rgba(255,255,255,.38);margin-top:8px}.f34-screen-card{height:66px;border:1px solid rgba(255,255,255,.13);border-radius:18px;margin-top:14px;background:#080808}.f34-screen-nav{position:absolute;left:16px;right:16px;bottom:18px;height:58px;border:1px solid rgba(255,255,255,.16);border-radius:30px;display:grid;grid-template-columns:repeat(4,1fr);place-items:center;color:rgba(255,255,255,.55);font-size:10px}.f34-info{min-width:0}.f34-title{font-size:16px;margin:0 0 6px}.f34-muted{color:rgba(255,255,255,.48);font-size:12px}.f34-timeline-box{margin-top:20px;padding:16px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:#080808}.f34-time-row{display:flex;align-items:center;justify-content:space-between;font-variant-numeric:tabular-nums;font-size:12px;color:rgba(255,255,255,.72)}.f34-timeline{width:100%;margin:14px 0 9px;accent-color:#fff}.f34-controls{display:flex;gap:8px;flex-wrap:wrap}.f34-btn{height:38px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:transparent;color:#fff;padding:0 12px;font:inherit}.f34-speed.active{background:#fff;color:#000}.f34-event-rail{height:24px;position:relative;border-top:1px solid rgba(255,255,255,.14);margin-top:12px}.f34-event-mark{position:absolute;top:-3px;width:2px;height:8px;background:rgba(255,255,255,.5)}.f34-stats{margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.f34-stat{border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:11px}.f34-stat b{display:block;font-size:16px}.f34-stat span{font-size:10px;color:rgba(255,255,255,.48)}.f34-original-extra{margin-top:16px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}.f34-original-extra>.section-title{margin-top:0}@media(max-width:900px){.f34-wrap{grid-template-columns:1fr}.f34-phone{width:min(100%,360px)}}`;
  document.head.appendChild(style);

  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  function fmtTimeline(ms){ms=Math.max(0,n(ms));const total=ms/1000,m=Math.floor(total/60),s=Math.floor(total%60),d=Math.floor((total-Math.floor(total))*10);return`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${d}`}
  function fmtDuration(ms){ms=Math.max(0,n(ms));const s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);if(h)return`${h}ч ${m%60}м`;return`${m}м ${s%60}с`}
  function fmtDate(v){try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}catch(_){return"—"}}

  function scheduleMount(){clearTimeout(mountTimer);mountTimer=setTimeout(mount,0)}
  new MutationObserver(scheduleMount).observe(document.documentElement,{childList:true,subtree:true});

  function mount(){
    const old=document.querySelector("#sessionDetail .replay-wrap");
    if(!old||!latest?.session)return;
    const sid=String(latest.session.id||"");
    if(old.parentElement?.querySelector(`.f34-replay[data-session-id="${CSS.escape(sid)}"]`))return;
    player?.stop?.();
    const extra=old.children?.[1]?.cloneNode(true)||null;
    const root=document.createElement("div");root.className="f34-replay";root.dataset.sessionId=sid;
    root.innerHTML=`<div class="f34-wrap"><div class="f34-phone-wrap"><div class="f34-phone"><canvas class="f34-canvas" width="390" height="844"></canvas><div class="f34-library" style="display:none"><div class="f34-pager">● ♡</div><div class="f34-grid"></div></div><div class="f34-screen"><div class="f34-screen-mark">SETKA</div><div class="f34-screen-title"></div><div class="f34-screen-sub"></div><div class="f34-screen-card"></div><div class="f34-screen-card"></div><div class="f34-screen-nav"><span>Сегодня</span><span>Паттерны</span><span>Симптомы</span><span>Я</span></div></div><div class="f34-ui"><div class="f34-heart">♡</div><div class="f34-grid-button">▦</div><div class="f34-cursor"></div><div class="f34-bottom"></div></div></div></div><div class="f34-info"><h3 class="f34-title"></h3><div class="f34-muted f34-subtitle"></div><div class="f34-timeline-box"><div class="f34-time-row"><span class="f34-current">00:00.0</span><span class="f34-total">00:00.0</span></div><input class="f34-timeline" type="range" min="0" max="1000" value="0" step="1"><div class="f34-controls"><button class="f34-btn f34-play">▶︎</button><button class="f34-btn f34-speed" data-speed="0.5">×0.5</button><button class="f34-btn f34-speed active" data-speed="1">×1</button><button class="f34-btn f34-speed" data-speed="2">×2</button><button class="f34-btn f34-speed" data-speed="4">×4</button><button class="f34-btn f34-speed" data-speed="8">×8</button></div><div class="f34-event-rail"></div></div><div class="f34-stats"><div class="f34-stat"><b class="f34-events">0</b><span>событий</span></div><div class="f34-stat"><b class="f34-gestures">0</b><span>жестов</span></div><div class="f34-stat"><b class="f34-states">0</b><span>состояний</span></div></div></div></div>`;
    if(extra){extra.classList.add("f34-original-extra");root.appendChild(extra)}
    old.replaceWith(root);
    player=createPlayer(root,latest);
  }

  function createPlayer(root,data){
    const canvas=root.querySelector(".f34-canvas"),ctx=canvas.getContext("2d"),phone=root.querySelector(".f34-phone"),library=root.querySelector(".f34-library"),pager=root.querySelector(".f34-pager"),grid=root.querySelector(".f34-grid"),ui=root.querySelector(".f34-ui"),heart=root.querySelector(".f34-heart"),cursor=root.querySelector(".f34-cursor"),bottom=root.querySelector(".f34-bottom"),screen=root.querySelector(".f34-screen"),screenTitle=root.querySelector(".f34-screen-title"),screenSub=root.querySelector(".f34-screen-sub"),timeline=root.querySelector(".f34-timeline"),current=root.querySelector(".f34-current"),total=root.querySelector(".f34-total"),play=root.querySelector(".f34-play"),rail=root.querySelector(".f34-event-rail");
    const events=(data.events||[]).slice().sort((a,b)=>n(a.t_ms)-n(b.t_ms));
    const states=events.filter(e=>e.event_type==="app_state"&&e.payload?.config).sort((a,b)=>n(a.t_ms)-n(b.t_ms));
    const snapshots=(data.snapshots||[]).slice().sort((a,b)=>n(a.t_ms)-n(b.t_ms));
    const pointers=events.filter(e=>["screen_pointer_down","screen_pointer_move","screen_pointer_up","screen_pointer_cancel"].includes(e.event_type));
    const meaningful=events.filter(e=>!['app_state','screen_pointer_move'].includes(e.event_type));
    const session=data.session||{},serverDuration=Math.max(0,Date.parse(session.ended_at||session.last_seen_at||session.started_at)-Date.parse(session.started_at)),duration=Math.max(1000,serverDuration,...events.map(e=>n(e.t_ms)),...snapshots.map(s=>n(s.t_ms)));
    let t=0,playing=false,speed=1,base=0,started=0,raf=0;
    timeline.max=String(Math.round(duration));total.textContent=fmtTimeline(duration);root.querySelector(".f34-title").textContent=`${data.participant?.access_code||session.participants?.access_code||"Сессия"} · ${fmtDate(session.started_at)}`;root.querySelector(".f34-subtitle").textContent=`${fmtDuration(duration)} · ${session.app_version||"standalone-v34"}`;root.querySelector(".f34-events").textContent=String(events.length);root.querySelector(".f34-gestures").textContent=String(events.filter(e=>e.event_type==="gesture_start").length);root.querySelector(".f34-states").textContent=String(states.length||snapshots.length);
    meaningful.forEach(e=>{const m=document.createElement("span");m.className="f34-event-mark";m.style.left=`${Math.min(100,Math.max(0,n(e.t_ms)/duration*100))}%`;m.title=e.event_type;rail.appendChild(m)});

    const viewport=guessViewport(pointers);canvas.width=viewport.w;canvas.height=viewport.h;phone.style.aspectRatio=`${viewport.w}/${viewport.h}`;

    function stateAt(ms){let best=null,bestT=-1;for(const e of states){const q=n(e.t_ms);if(q<=ms&&q>=bestT){best=e.payload;bestT=q}else if(q>ms)break}if(!best){for(const s of snapshots){const q=n(s.t_ms);if(q<=ms&&q>=bestT){best=s.app_state;bestT=q}else if(q>ms)break}}if(!best)best={view:"library",libraryPage:"all",patternId:"tentacle-orbit",sourceType:"base",config:{...DEFAULT_CONFIG},frame:0};return{state:best,tMs:Math.max(0,bestT)}}
    function pointerAt(ms){let active=null;for(const e of pointers){if(n(e.t_ms)>ms)break;if(e.event_type==="screen_pointer_down"||e.event_type==="screen_pointer_move")active=e;else if(e.event_type==="screen_pointer_up"||e.event_type==="screen_pointer_cancel")active=null}return active}
    function contextAt(ms,state){let page=state.libraryPage||null,title=null,kicker=null;for(const e of events){if(n(e.t_ms)>ms)break;const p=e.payload||{};if(e.event_type==="nav")page=p.page||page;if(e.event_type==="screen"||e.event_type==="session_screen"){title=p.title||title;kicker=p.kicker||kicker}if(e.event_type==="library_page"||e.event_type==="session_library_page")page=p.page||page}return{page,title,kicker}}

    function draw(ms){
      t=Math.max(0,Math.min(duration,ms));timeline.value=String(Math.round(t));current.textContent=fmtTimeline(t);const {state,tMs}=stateAt(t),ctxNow=contextAt(t,state),view=state.view||"library";
      const explicitAppPage=ctxNow.page&&["today","symptoms","me","notes","invites"].includes(String(ctxNow.page));
      const explicitOverlay=ctxNow.title&&!["Паттерны","Библиотека"].includes(String(ctxNow.title))&&view!=="game";
      if(view==="game"){
        library.style.display="none";screen.style.display="none";ui.style.display="block";canvas.style.display="block";const config={...DEFAULT_CONFIG,...(state.config||{})},frame=n(state.frame)+Math.max(0,t-tMs)/16.6667;renderPattern(ctx,canvas.width,canvas.height,config,frame,false);heart.textContent=state.sourceType==="favorite"?"♥":"♡";bottom.textContent=`ЦВЕТ ${n(config.colorModeIndex)+1} / 9`;
      }else if(explicitAppPage||explicitOverlay){
        canvas.style.display="none";library.style.display="none";ui.style.display="none";screen.style.display="block";const name=ctxNow.title||pageName(ctxNow.page);screenTitle.textContent=name;screenSub.textContent=ctxNow.kicker||"SETKA";
      }else{
        canvas.style.display="none";screen.style.display="none";ui.style.display="none";library.style.display="block";renderLibrary(grid,pager,state);
      }
      const p=pointerAt(t);if(p){cursor.style.display="block";cursor.style.left=`${Math.max(0,Math.min(100,n(p.payload?.x)/viewport.w*100))}%`;cursor.style.top=`${Math.max(0,Math.min(100,n(p.payload?.y)/viewport.h*100))}%`;cursor.classList.toggle("two",n(p.payload?.fingers,1)>=2)}else cursor.style.display="none";
    }

    function tick(ts){if(!playing)return;if(!started)started=ts;draw(base+(ts-started)*speed);if(t>=duration){playing=false;play.textContent="▶︎";return}raf=requestAnimationFrame(tick)}
    play.onclick=()=>{playing=!playing;play.textContent=playing?"Ⅱ":"▶︎";if(playing){if(t>=duration)t=0;base=t;started=0;raf=requestAnimationFrame(tick)}else cancelAnimationFrame(raf)};
    timeline.oninput=()=>{playing=false;play.textContent="▶︎";cancelAnimationFrame(raf);draw(n(timeline.value));};
    root.querySelectorAll(".f34-speed").forEach(b=>b.onclick=()=>{const was=playing;if(was){draw(t);base=t;started=performance.now()}speed=n(b.dataset.speed,1);root.querySelectorAll(".f34-speed").forEach(x=>x.classList.toggle("active",x===b));if(was){base=t;started=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick)}});
    draw(0);
    return{stop(){playing=false;cancelAnimationFrame(raf)}};
  }

  function guessViewport(pointers){let mx=390,my=844;for(const e of pointers){mx=Math.max(mx,n(e.payload?.x));my=Math.max(my,n(e.payload?.y))}const w=Math.max(280,Math.min(520,Math.ceil(mx/10)*10)),h=Math.max(500,Math.min(1000,Math.ceil(my/10)*10));return{w,h}}
  function pageName(p){return({today:"Сегодня",symptoms:"Симптомы",me:"Я",notes:"Заметки",invites:"Инвайты",patterns:"Паттерны"})[p]||"SETKA"}
  function renderLibrary(grid,pager,state){const fav=state.libraryPage==="favorites";pager.textContent=fav?"○ ♥":"● ♡";grid.innerHTML="";if(!fav){const cell=document.createElement("div");cell.className="f34-thumb";const c=document.createElement("canvas");c.width=180;c.height=180;cell.appendChild(c);grid.appendChild(cell);renderPattern(c.getContext("2d"),180,180,DEFAULT_CONFIG,44,true)}else{const count=Math.max(1,n(state.favoriteCount,1));for(let i=0;i<Math.min(20,count);i++){const d=document.createElement("div");d.className="f34-thumb";d.innerHTML='<div class="f34-fav-dot">♥</div>';grid.appendChild(d)}}}
  function rad(d){return d*Math.PI/180}function mod(x,m){return((x%m)+m)%m}
  function color(mode,i,q,x,y,shift,frame){switch(n(mode)){case 0:return"#fff";case 1:return`hsl(${mod(i+q*2+shift,360)} 100% 50%)`;case 2:return`hsl(${mod(frame+q*2,360)} 100% 50%)`;case 3:return"hsl(200 100% 50%)";case 4:return"hsl(330 100% 50%)";case 5:return`hsl(${mod(Math.atan2(y,x)*180/Math.PI+180+shift,360)} 100% 50%)`;case 6:return`hsl(${mod(i+shift,360)} 100% 50%)`;case 7:return`hsl(${mod(q*5+shift,360)} 100% 50%)`;case 8:return`hsl(${mod(x+y+shift,360)} 100% 50%)`;default:return"#fff"}}
  function renderPattern(ctx,w,h,raw,frame,thumb){const c={...DEFAULT_CONFIG,...raw};ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.translate(w/2,h/2);if(thumb){const extent=Math.max(40,n(c.tentacleLength)*3+n(c.baseRadius)+(n(c.tentacleLength)*n(c.circleSize)/20)),s=Math.min(.95,(Math.min(w,h)/2-5)/extent);ctx.scale(s,s)}else{const s=w/390;ctx.scale(s,s)}const shift=frame*n(c.colorSpeed,1)*.5;for(let i=0;i<360;i+=360/Math.max(3,n(c.numTentacles,24))){const x0=Math.sin(rad(i))*n(c.baseRadius,10),y0=Math.cos(rad(i))*n(c.baseRadius,10);for(let q=0;q<n(c.tentacleLength,100);q+=Math.max(1,n(c.segmentStep,2))){const a=Math.cos(rad(n(c.tentacleLength,100)-q+frame*n(c.movementSpeed,1)))*q,x=Math.sin(rad(i-a))*q*3,y=Math.cos(rad(i-a))*q*3,d=(n(c.tentacleLength,100)-q)*n(c.circleSize,1)/10;ctx.strokeStyle=color(c.colorModeIndex,i,q,x,y,shift,frame);ctx.lineWidth=n(c.lineWeight,1);ctx.beginPath();ctx.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);ctx.stroke()}}ctx.restore()}
})();