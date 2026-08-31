(() => {
  "use strict";

  const SANDBOX_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const ALIAS_API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34-alias";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const TARGETS=["setka-research-api","setka-research-extensions","setka-research-v5","setka-journey","setka-guest-v11","setka-sensors-v13"];
  const previousFetch=window.fetch.bind(window);
  const arr=v=>Array.isArray(v)?v:[];
  const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*"}});
  const pid=deviceId=>`pv34p::${deviceId}`;
  const deviceFromPid=id=>String(id||"").startsWith("pv34p::")?String(id).slice(7):null;
  const FREE_PREFIX="pv34free::";
  const GAP_MS=20*60*1000;
  const AUTO_ONLY=new Set(["visibility","ui_visibility","favorites_repaired"]);
  let cache=null,cacheAt=0,loading=null;

  async function post(url,body){
    const r=await previousFetch(url,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(d.error||"request_failed");e.status=r.status;throw e}
    return d;
  }
  async function raw(adminKey,force=false){
    if(!force&&cache&&Date.now()-cacheAt<2500)return cache;
    if(loading)return loading;
    loading=(async()=>{
      const [overview,aliasData]=await Promise.all([
        post(SANDBOX_API,{action:"admin-overview",adminKey}),
        post(ALIAS_API,{action:"admin-list-aliases",adminKey}).catch(()=>({items:[]}))
      ]);
      const devices=arr(overview.devices).slice().sort((a,b)=>Date.parse(a.first_seen_at||0)-Date.parse(b.first_seen_at||0)||String(a.device_id).localeCompare(String(b.device_id)));
      const details=await Promise.all(devices.map(d=>post(SANDBOX_API,{action:"admin-device",adminKey,deviceId:d.device_id}).catch(()=>null)));
      const byDevice=new Map(details.filter(Boolean).map(x=>[x.device.device_id,x]));
      const aliases=new Map(arr(aliasData.items).map(x=>[x.device_id,String(x.label||"").trim()]));
      cache={devices,byDevice,aliases};cacheAt=Date.now();loading=null;return cache;
    })();
    try{return await loading}catch(e){loading=null;throw e}
  }
  function payload(r,deviceId){return r.byDevice.get(deviceId)?.snapshot?.payload||{}}
  function meaningfulOrphans(p){return arr(p.events).filter(e=>!e?.sessionId&&!AUTO_ONLY.has(String(e?.type||""))&&e?.wallAt).sort((a,b)=>Date.parse(a.wallAt)-Date.parse(b.wallAt))}
  function hasActivity(p){return arr(p.sessions).length||arr(p.notes).length||arr(p.checkins).length||arr(p.physio?.samples).length||meaningfulOrphans(p).length}
  function activeDevices(r){return r.devices.filter(d=>hasActivity(payload(r,d.device_id)))}
  function ordinal(r,deviceId){const list=activeDevices(r);const i=Math.max(0,list.findIndex(d=>d.device_id===deviceId));return`Участник ${i+1}`}
  function refFor(r,deviceId){const alias=String(r.aliases.get(deviceId)||"").trim(),ord=ordinal(r,deviceId);return{id:pid(deviceId),access_code:alias||ord,label:alias?ord:"Без имени"}}
  function groupVisits(events){
    const out=[];let cur=[];
    for(const e of events){const t=Date.parse(e.wallAt);if(cur.length&&t-Date.parse(cur.at(-1).wallAt)>GAP_MS){out.push(cur);cur=[]}cur.push(e)}
    if(cur.length)out.push(cur);
    return out;
  }
  function statsForEvents(events){
    const types=k=>events.filter(e=>k.includes(String(e.type||""))).length;
    const screens=new Set(events.filter(e=>e.type==="screen").map(e=>`${e.payload?.title||""}|${e.payload?.view||""}`));
    return{
      events:events.length,
      patternOpens:types(["pattern_open"]),
      gestures:types(["gesture_start"]),
      favorites:types(["favorite_save","favorite_remove"]),
      notes:types(["note_create"]),
      movements:types(["screen_pointer_down","screen_pointer_move","screen_pointer_up","screen_scroll","gesture_start","gesture_end"]),
      screens:screens.size
    };
  }
  function freeVisits(r,deviceId){
    const p=payload(r,deviceId),groups=groupVisits(meaningfulOrphans(p));
    return groups.map((events,index)=>{
      const start=Date.parse(events[0].wallAt),end=Date.parse(events.at(-1).wallAt),st=statsForEvents(events);
      return{id:`${FREE_PREFIX}${deviceId}::${start}`,deviceId,index,events,startedAt:new Date(start).toISOString(),endedAt:new Date(end).toISOString(),durationMs:Math.max(0,end-start),...st};
    });
  }
  function allDays(p){
    const days=new Set();
    const add=v=>{if(v)days.add(String(v).slice(0,10))};
    arr(p.sessions).forEach(x=>add(x.startedAt));arr(p.notes).forEach(x=>add(x.observedAt));arr(p.checkins).forEach(x=>add(x.observedAt));meaningfulOrphans(p).forEach(x=>add(x.wallAt));return days;
  }
  function screenKey(e){
    const p=e.payload||{},s=`${p.title||""} ${p.kicker||""} ${p.view||""}`.toLowerCase();
    if(p.view==="game"||s.includes("game"))return"gameplay";
    if(p.view==="library"||s.includes("библиот"))return"library";
    if(s.includes("состоя"))return"symptoms";
    if(s.includes("замет"))return"notes";
    if(s.includes("сегодня"))return"today";
    if(s.includes("профил")||s.includes(" я "))return"me";
    return"research";
  }
  function mapEvent(e,start){
    const p=e.payload||{},t=Math.max(0,Date.parse(e.wallAt)-start),base={id:e.id,event_type:e.type,t_ms:t,payload:p,created_at:e.wallAt};
    if(e.type==="screen")return{...base,event_type:"journey_screen",payload:{screen:screenKey(e),title:p.title||"",page:p.page||""}};
    if(e.type==="view")return{...base,event_type:"journey_screen",payload:{screen:p.view==="game"?"gameplay":p.view==="library"?"library":p.view||"research"}};
    if(e.type==="library_page")return{...base,event_type:"journey_screen",payload:{screen:"library",page:p.page||"all"}};
    if(e.type==="pattern_open")return{...base,event_type:"journey_pattern_open"};
    if(e.type==="session_choice")return{...base,event_type:"journey_session_choice"};
    if(e.type==="gesture_start")return{...base,event_type:"journey_gesture_start"};
    if(e.type==="pattern_state")return{...base,event_type:"journey_pattern_state"};
    if(e.type==="color")return{...base,event_type:"journey_color"};
    if(e.type==="favorite_save")return{...base,event_type:"journey_favorite_save"};
    if(e.type==="favorite_remove")return{...base,event_type:"journey_favorite_remove"};
    if(e.type==="note_create")return{...base,event_type:"journey_note_create"};
    if(e.type==="exit")return{...base,event_type:"journey_exit"};
    if(e.type==="ui_tap")return{...base,event_type:"journey_ui_action",payload:{...p,action:"тап"}};
    const action={screen_pointer_down:"касание экрана",screen_pointer_move:"движение по экрану",screen_pointer_up:"отпускание",screen_pointer_cancel:"отмена касания",screen_scroll:"скролл",nav:"навигация",game_back:"назад",game_return:"возврат"}[e.type];
    if(action)return{...base,event_type:"journey_ui_action",payload:{...p,action}};
    return base;
  }
  function syntheticSession(r,v){
    const ref=refFor(r,v.deviceId),mapped=v.events.map(e=>mapEvent(e,Date.parse(v.startedAt))).sort((a,b)=>a.t_ms-b.t_ms),screens=mapped.filter(e=>e.event_type==="journey_screen");
    return{
      id:v.id,participant_id:ref.id,device_hash:v.deviceId,started_at:v.startedAt,local_started_at:v.startedAt,ended_at:v.endedAt,last_seen_at:v.endedAt,app_version:"standalone-v34",request_key:"explore",pre_state:null,post_state:null,helped:null,active_ms:v.durationMs,completed:false,research_started:false,measured_active_ms:0,after_feedback_active_ms:0,participants:ref,
      journeyEventCount:mapped.length,journeyDurationMs:v.durationMs,patternOpens:v.patternOpens,sessionChoices:mapped.filter(e=>e.event_type==="journey_session_choice").map(e=>e.payload?.choice).filter(Boolean),screenCount:new Set(screens.map(e=>`${e.payload?.screen}:${e.payload?.page||""}`)).size,free_visit:true,_mapped:mapped
    };
  }
  function parseFreeId(id){const s=String(id||"");if(!s.startsWith(FREE_PREFIX))return null;const rest=s.slice(FREE_PREFIX.length),cut=rest.lastIndexOf("::");if(cut<0)return null;return{deviceId:rest.slice(0,cut),start:Number(rest.slice(cut+2))}}
  function fmtMs(ms){ms=Math.max(0,n(ms));const sec=Math.round(ms/1000),m=Math.floor(sec/60);return m?`${m}м ${sec%60}с`:`${sec}с`}
  function fmtDate(v){try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}catch(_){return"—"}}

  window.fetch=async function(input,init={}){
    const url=typeof input==="string"?input:(input?.url||"");
    if(!TARGETS.some(x=>url.includes(`/functions/v1/${x}`)))return previousFetch(input,init);
    let body={};try{body=typeof init.body==="string"?JSON.parse(init.body):{}}catch(_){body={}}
    const action=body.action||"",adminKey=body.adminKey||"";

    if(action==="admin-journey"&&parseFreeId(body.sessionId)){
      try{
        const r=await raw(adminKey),q=parseFreeId(body.sessionId),v=freeVisits(r,q.deviceId).find(x=>Date.parse(x.startedAt)===q.start);if(!v)return response({error:"not_found"},404);
        const s=syntheticSession(r,v),events=s._mapped;delete s._mapped;return response({session:s,events});
      }catch(e){return response({error:e.message||"load_failed"},e.status||500)}
    }

    const base=await previousFetch(input,init);let json=null;try{json=await base.clone().json()}catch(_){return base}
    if(!base.ok)return base;
    try{
      const r=await raw(adminKey);
      if(action==="admin-participants-v4"){
        const byId=new Map(arr(json.participants).map(p=>[p.id,p])),out=[];
        for(const d of activeDevices(r)){
          const id=pid(d.device_id),p=payload(r,d.device_id),vis=freeVisits(r,d.device_id),ref=refFor(r,d.device_id),old=byId.get(id)||{};
          out.push({...old,id,access_code:ref.access_code,label:ref.label,active:d.active!==false,bound:true,device_hash:d.device_id,bound_at:d.first_seen_at,created_at:d.first_seen_at,last_seen_at:d.last_seen_at,sessionCount:arr(p.sessions).length,activeDays:allDays(p).size,symptomCount:arr(p.symptoms).filter(x=>x.active!==false).length,inviteCount:arr(p.invites).length,profile:old.profile||null,freeVisitCount:vis.length,activityEventCount:vis.reduce((a,x)=>a+x.events,0),movementCount:vis.reduce((a,x)=>a+x.movements,0),patternOpenCount:vis.reduce((a,x)=>a+x.patternOpens,0)});
        }
        json.participants=out;
      }else if(action==="admin-overview-v4"){
        const list=activeDevices(r);json.overview={...(json.overview||{}),participants:list.length,returners:list.filter(d=>allDays(payload(r,d.device_id)).size>1).length};
      }else if(action==="admin-journey-sessions"){
        const extra=[];for(const d of activeDevices(r))for(const v of freeVisits(r,d.device_id)){const s=syntheticSession(r,v);delete s._mapped;extra.push(s)}
        json.items=[...arr(json.items),...extra].sort((a,b)=>Date.parse(b.started_at||0)-Date.parse(a.started_at||0));
      }
    }catch(_){return base}
    return response(json,base.status);
  };

  async function enhanceParticipants(){
    const grid=document.getElementById("participantGrid");if(!grid)return;
    const adminKey=localStorage.getItem("setka-research:admin-key:v1")||"";if(!adminKey)return;
    let r;try{r=await raw(adminKey)}catch(_){return}
    const devices=activeDevices(r),cards=[...grid.querySelectorAll(".participant")];
    cards.forEach((card,i)=>{
      if(card.dataset.activityV34==="1")return;const d=devices[i];if(!d)return;const vis=freeVisits(r,d.device_id),st=vis.reduce((a,v)=>({events:a.events+v.events,movements:a.movements+v.movements,patterns:a.patterns+v.patternOpens}),{events:0,movements:0,patterns:0});
      const meta=card.querySelector(".meta");if(meta){const add=(txt)=>{const s=document.createElement("span");s.className="pill";s.textContent=txt;meta.appendChild(s)};if(vis.length)add(`${vis.length} визит.`);if(st.events)add(`${st.events} действ.`);if(st.patterns)add(`${st.patterns} паттерн.`)}card.dataset.activityV34="1";
    });
  }
  async function enhanceDetail(){
    const detail=document.getElementById("detail"),current=window.SetkaAdminParticipantsV34?.currentParticipantId;if(!detail||detail.classList.contains("hidden")||!current||detail.querySelector(".v34-free-activity"))return;
    const deviceId=deviceFromPid(current);if(!deviceId)return;const adminKey=localStorage.getItem("setka-research:admin-key:v1")||"";let r;try{r=await raw(adminKey)}catch(_){return}
    const vis=freeVisits(r,deviceId);if(!vis.length)return;
    const total=vis.reduce((a,v)=>({events:a.events+v.events,movements:a.movements+v.movements,patterns:a.patterns+v.patternOpens,gestures:a.gestures+v.gestures,favorites:a.favorites+v.favorites,notes:a.notes+v.notes}),{events:0,movements:0,patterns:0,gestures:0,favorites:0,notes:0});
    const box=document.createElement("div");box.className="card v34-free-activity";box.style.marginTop="12px";
    box.innerHTML=`<div class="section-title">Активность вне сессий</div><div class="small muted">Свободные визиты этого браузера. Это уже записанная активность, даже если человек не запускал измеряемую сессию.</div><div class="meta" style="margin-top:10px"><span class="pill">${vis.length} визит.</span><span class="pill">${total.events} действий</span><span class="pill">${total.movements} движений</span><span class="pill">${total.patterns} открытий паттерна</span><span class="pill">${total.gestures} жестов</span>${total.favorites?`<span class="pill">♥ ${total.favorites}</span>`:""}${total.notes?`<span class="pill">${total.notes} замет.</span>`:""}</div><div class="list" style="margin-top:10px">${vis.slice().reverse().slice(0,8).map((v,i)=>`<div class="session-row"><div class="rowtop"><b>Свободный визит ${vis.length-i}</b><span class="small muted">${fmtDate(v.startedAt)}</span></div><div class="meta"><span class="pill">${fmtMs(v.durationMs)}</span><span class="pill">${v.events} действ.</span><span class="pill">${v.movements} движ.</span><span class="pill">${v.patternOpens} паттерн.</span><span class="pill">${v.screens} экран.</span></div></div>`).join("")}</div>`;
    const left=detail.querySelector(".split > div:first-child"),top=left?.querySelector(":scope > .card");if(top)top.insertAdjacentElement("afterend",box);else detail.prepend(box);
  }
  const obs=new MutationObserver(()=>{setTimeout(enhanceParticipants,0);setTimeout(enhanceDetail,0)});obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("click",e=>{if(e.target?.closest?.('[data-tab="participants"],#refreshBtn,.participant')){setTimeout(enhanceParticipants,120);setTimeout(enhanceDetail,220)}},true);
  setTimeout(enhanceParticipants,500);
  window.SetkaAdminActivityV34={refresh:()=>{cache=null;cacheAt=0},freeVisits};
})();
