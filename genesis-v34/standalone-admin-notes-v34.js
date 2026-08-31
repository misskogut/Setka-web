(() => {
  "use strict";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-standalone-v34";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const ADMIN_STORAGE="setka-research:admin-key:v1";
  const INTENT={sleep:"Уснуть",relax:"Расслабиться",tension:"Снизить напряжение",focus:"Сконцентрироваться",energy:"Взбодриться",switch:"Переключиться",explore:"Просто исследую"};
  const DEFAULT={numTentacles:24,tentacleLength:100,baseRadius:10,movementSpeed:1,colorSpeed:1,circleSize:1,lineWeight:1,segmentStep:2,colorModeIndex:0};
  const FIELDS=["numTentacles","tentacleLength","baseRadius","movementSpeed","colorSpeed","circleSize","lineWeight","segmentStep","colorModeIndex"];
  const esc=v=>String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const fmtDate=v=>{if(!v)return"—";try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(v))}catch(_){return String(v)}};
  const fmtClock=ms=>{const s=Math.max(0,Math.round((Number(ms)||0)/1000));return`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`};
  const shortDevice=id=>String(id||"").slice(-6).toUpperCase()||"—";
  const finite=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
  const rad=d=>d*Math.PI/180,mod=(n,m)=>((n%m)+m)%m;

  const style=document.createElement("style");
  style.textContent=`
    .v34-note-card{display:grid;grid-template-columns:132px minmax(0,1fr);gap:15px;align-items:start}
    .v34-note-preview{width:132px;height:132px;display:block;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:#000}
    .v34-note-link{display:inline-flex;align-items:center;justify-content:center;min-height:38px;margin-top:11px;padding:0 14px;border:1px solid rgba(255,255,255,.3);border-radius:19px;color:#fff;text-decoration:none;font-size:11px;background:transparent}
    .v34-note-link:active{background:#fff;color:#000}.v34-note-config{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;color:rgba(255,255,255,.36);margin-top:8px;word-break:break-all}
    .v34-note-no-preview{width:132px;height:132px;border:1px dashed rgba(255,255,255,.14);border-radius:18px;display:grid;place-items:center;text-align:center;padding:12px;box-sizing:border-box;color:rgba(255,255,255,.3);font-size:9px}
    @media(max-width:620px){.v34-note-card{grid-template-columns:96px minmax(0,1fr);gap:12px}.v34-note-preview,.v34-note-no-preview{width:96px;height:96px;border-radius:15px}}
  `;
  document.head.appendChild(style);

  function normalize(c={}){return{
    numTentacles:Math.max(3,Math.min(72,Math.round(finite(c.numTentacles,DEFAULT.numTentacles)))),
    tentacleLength:Math.max(10,Math.min(800,finite(c.tentacleLength,DEFAULT.tentacleLength))),
    baseRadius:Math.max(0,Math.min(100,finite(c.baseRadius,DEFAULT.baseRadius))),
    movementSpeed:Math.max(.05,Math.min(10,finite(c.movementSpeed,DEFAULT.movementSpeed))),
    colorSpeed:Math.max(.05,Math.min(10,finite(c.colorSpeed,DEFAULT.colorSpeed))),
    circleSize:Math.max(.2,Math.min(20,finite(c.circleSize,DEFAULT.circleSize))),
    lineWeight:Math.max(.1,Math.min(10,finite(c.lineWeight,DEFAULT.lineWeight))),
    segmentStep:Math.max(1,Math.min(20,Math.round(finite(c.segmentStep,DEFAULT.segmentStep)))),
    colorModeIndex:Math.max(0,Math.min(8,Math.round(finite(c.colorModeIndex,DEFAULT.colorModeIndex))))
  }}
  function encode(c){const n=normalize(c);return FIELDS.map(k=>String(n[k])).join(",")}
  function configFor(n){return n?.config||n?.state?.config||null}
  function configLink(n){const c=configFor(n);if(!c)return null;const u=new URL("standalone-v34.html",location.href);u.searchParams.set("cfg",encode(c));if(Number.isFinite(Number(n.frame)))u.searchParams.set("frame",String(Number(n.frame)));u.searchParams.set("note",String(n.id||"note"));u.searchParams.set("src","admin-note");return u.href}

  function draw(canvas,config,frame=44){
    const c=normalize(config),x=canvas.getContext("2d"),w=canvas.width,h=canvas.height;x.fillStyle="#000";x.fillRect(0,0,w,h);x.save();x.translate(w/2,h/2);
    const extent=Math.max(40,c.tentacleLength*3+c.baseRadius+c.tentacleLength*c.circleSize/20),sc=Math.min(.95,(Math.min(w,h)/2-6)/extent);x.scale(sc,sc);const shift=frame*c.colorSpeed*.5;
    for(let i=0;i<360;i+=360/c.numTentacles){const x0=Math.sin(rad(i))*c.baseRadius,y0=Math.cos(rad(i))*c.baseRadius;for(let q=0;q<c.tentacleLength;q+=c.segmentStep){const a=Math.cos(rad(c.tentacleLength-q+frame*c.movementSpeed))*q,xx=Math.sin(rad(i-a))*(q*3),yy=Math.cos(rad(i-a))*(q*3),d=(c.tentacleLength-q)*c.circleSize/10;let col="#fff";if(c.colorModeIndex===1)col=`hsl(${mod(i+q*2+shift,360)} 100% 50%)`;if(c.colorModeIndex===2)col=`hsl(${mod(frame+q*2,360)} 100% 50%)`;if(c.colorModeIndex===3)col="hsl(200 100% 50%)";if(c.colorModeIndex===4)col="hsl(330 100% 50%)";if(c.colorModeIndex===5)col=`hsl(${mod(Math.atan2(yy,xx)*180/Math.PI+180+shift,360)} 100% 50%)`;if(c.colorModeIndex===6)col=`hsl(${mod(i+shift,360)} 100% 50%)`;if(c.colorModeIndex===7)col=`hsl(${mod(q*5+shift,360)} 100% 50%)`;if(c.colorModeIndex===8)col=`hsl(${mod(xx+yy+shift,360)} 100% 50%)`;x.strokeStyle=col;x.lineWidth=c.lineWeight;x.beginPath();x.arc(x0+xx,y0+yy,Math.max(.075,d/2),0,Math.PI*2);x.stroke()}}
    x.restore();
  }

  async function call(action,payload={}){let key="";try{key=localStorage.getItem(ADMIN_STORAGE)||""}catch(_){}if(!key)throw new Error("no_admin_key");const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,adminKey:key,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.detail||`request_${r.status}`);return d}
  async function collectNotes(){const o=await call("admin-overview"),devices=o.devices||[],rows=[];const details=await Promise.all(devices.map(d=>call("admin-device",{deviceId:d.device_id}).catch(()=>null)));for(const d of details.filter(Boolean)){const deviceId=d.device?.device_id||"",p=d.snapshot?.payload||{};for(const n of Array.isArray(p.notes)?p.notes:[])rows.push({...n,_deviceId:deviceId,_source:`Браузер ${shortDevice(deviceId)}`})}return rows.sort((a,b)=>Date.parse(b.observedAt||0)-Date.parse(a.observedAt||0))}

  let busy=false,lastRenderedSignature="";
  function signature(notes){return notes.map(n=>`${n._deviceId}:${n.id}:${n.observedAt}:${n.configHash||""}`).join("|")}
  async function render(force=false){
    const tab=document.getElementById("tab-notes"),button=document.querySelector('.tab[data-tab="notes"]'),dash=document.getElementById("dashboard");if(!tab||!button?.classList.contains("active")||dash?.classList.contains("hidden")||busy)return;
    busy=true;
    try{
      const notes=await collectNotes(),sig=signature(notes);if(!force&&sig===lastRenderedSignature&&tab.querySelector(".v34-note-card"))return;lastRenderedSignature=sig;
      if(!notes.length){tab.innerHTML='<div class="empty">Заметок пока нет.</div>';return}
      tab.innerHTML='<div class="section-title">Все заметки Юли · точные снимки паттернов</div><div id="v34ExactNotes" class="stack"></div>';
      const wrap=document.getElementById("v34ExactNotes");
      for(const n of notes){
        const config=configFor(n),link=configLink(n),card=document.createElement("div");card.className="card v34-note-card";
        const visual=document.createElement("div");if(config){const canvas=document.createElement("canvas");canvas.className="v34-note-preview";canvas.width=300;canvas.height=300;visual.appendChild(canvas);draw(canvas,config,Number.isFinite(Number(n.frame))?Number(n.frame):44);if(link){canvas.style.cursor="pointer";canvas.onclick=()=>window.open(link,"_blank","noopener")}}else{visual.innerHTML='<div class="v34-note-no-preview">Для этой старой заметки снимок конфигурации не сохранился</div>'}
        const info=document.createElement("div");info.innerHTML=`<div class="note-text">${esc(n.text)}</div><div class="meta"><span class="pill">${esc(n.phase||"standalone")}</span>${n.requestKey?`<span class="pill">${esc(INTENT[n.requestKey]||n.requestKey)}</span>`:""}${n.sessionElapsedMs!=null?`<span class="pill">${fmtClock(n.sessionElapsedMs)}</span>`:""}<span class="pill">${esc(n._source)}</span></div><div class="small muted" style="margin-top:9px">${fmtDate(n.observedAt)} · ${esc(n.patternId||"без паттерна")}</div>${n.configHash?`<div class="v34-note-config">${esc(n.configHash)}</div>`:""}${link?`<a class="v34-note-link" href="${esc(link)}" target="_blank" rel="noopener">Открыть этот паттерн ↗</a>`:""}`;
        card.append(visual,info);wrap.appendChild(card);
      }
    }catch(e){if(force)console.warn("SETKA v34 exact notes:",e)}finally{busy=false}
  }

  document.querySelector('.tab[data-tab="notes"]')?.addEventListener("click",()=>setTimeout(()=>render(true),140));
  document.getElementById("refreshBtn")?.addEventListener("click",()=>setTimeout(()=>render(true),900));
  const observer=new MutationObserver(()=>{const b=document.querySelector('.tab[data-tab="notes"]');if(b?.classList.contains("active"))setTimeout(()=>render(false),80)});observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["class"]});
  setInterval(()=>render(false),9000);
  setTimeout(()=>render(false),900);
})();