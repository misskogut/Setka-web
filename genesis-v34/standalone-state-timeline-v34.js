(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  const esc=C.esc;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const intentLabel=k=>C.INTENTS.find(x=>x[0]===k)?.[1]||"Сессия";
  const patternIdOf=u=>u?.patternId||u?.config?.patternId||"tentacle-orbit";
  const patternTitle=pid=>Setka.getPatternTitle?.(pid)||(pid==="dandelion"?"Одуванчик":"Tentacle Orbit");

  const style=document.createElement("style");
  style.textContent=`
    .st34-timegraph-wrap{margin-top:12px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:#040404;padding:10px 9px 8px;overflow:hidden}
    .st34-timegraph{display:block;width:100%;height:170px;background:#040404}
    .st34-timegraph-note{font-size:9px;line-height:1.45;color:rgba(255,255,255,.34);padding:6px 3px 1px}
    .st34-state-sessions{margin-top:13px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:19px;background:#060606}
    .st34-state-sessions-head{margin-bottom:10px}.st34-state-sessions-head b{display:block;font-size:14px}.st34-state-sessions-head span{display:block;margin-top:5px;font-size:9px;line-height:1.45;color:rgba(255,255,255,.38)}
    .st34-state-session{border-top:1px solid rgba(255,255,255,.08);padding:12px 0}.st34-state-session:first-of-type{border-top:0;padding-top:2px}
    .st34-state-session-top{display:flex;gap:10px;align-items:flex-start}.st34-state-session-main{flex:1;min-width:0}.st34-state-session-title{font-size:12px;font-weight:650}.st34-state-session-meta{font-size:9px;line-height:1.45;color:rgba(255,255,255,.4);margin-top:4px}.st34-state-session-time{font-size:18px;font-weight:650;white-space:nowrap}
    .st34-state-result{font-size:10px;margin-top:7px;color:rgba(255,255,255,.7)}
    .st34-state-combos{display:grid;gap:7px;margin-top:10px}.st34-state-combo{display:grid;grid-template-columns:48px minmax(0,1fr);gap:9px;align-items:center}.st34-state-combo canvas{width:48px;height:48px;border-radius:12px;background:#000;border:1px solid rgba(255,255,255,.09)}.st34-state-combo b{display:block;font-size:10px}.st34-state-combo span{display:block;font-size:9px;color:rgba(255,255,255,.38);margin-top:3px}
    .st34-state-open-session{margin-top:10px;height:35px;padding:0 13px;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:transparent;color:rgba(255,255,255,.68);font-size:10px}
    .st34-state-more-sessions{width:100%;height:38px;border:1px solid rgba(255,255,255,.15);border-radius:19px;background:transparent;color:rgba(255,255,255,.62);font-size:10px;margin-top:7px}
    .st34-state-no-sessions{font-size:10px;line-height:1.5;color:rgba(255,255,255,.38)}
  `;
  document.head.appendChild(style);

  function data(){return C.getData()}
  function rangeFrom(details){const t=details?.querySelector(".st34-states-periods button.active")?.textContent?.trim();return t==="7 дней"?7:t==="30 дней"?30:0}
  function cutoff(range){return range?Date.now()-range*86400000:0}
  function pointsFor(state,range){const min=cutoff(range);return (data().checkins||[]).filter(x=>x.symptomId===state.id&&Date.parse(x.observedAt)>=min).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt))}
  function fmtDuration(ms){ms=Math.max(0,Number(ms)||0);if(ms<1000)return`${Math.max(.1,ms/1000).toFixed(1).replace(".0","")} сек`;return C.fmt(ms)}
  function dateLabel(ts,span){const d=new Date(ts);if(span>150*86400000)return`${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getFullYear()).slice(-2)}`;return`${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`}

  function drawTimeline(state,range){
    const pts=pointsFor(state,range),wrap=document.createElement("div");wrap.className="st34-timegraph-wrap";
    const c=document.createElement("canvas");c.className="st34-timegraph";c.width=720;c.height=220;wrap.appendChild(c);
    const note=document.createElement("div");note.className="st34-timegraph-note";note.textContent="Точки стоят на реальных датах. Пунктир между далёкими отметками означает, что между ними не было данных.";wrap.appendChild(note);
    const x=c.getContext("2d"),w=c.width,h=c.height,L=48,R=14,T=16,B=34;
    x.fillStyle="#040404";x.fillRect(0,0,w,h);x.font="18px -apple-system,BlinkMacSystemFont,sans-serif";x.textBaseline="middle";
    [10,5,0].forEach(v=>{const y=T+(10-v)/10*(h-T-B);x.strokeStyle="rgba(255,255,255,.07)";x.lineWidth=1;x.beginPath();x.moveTo(L,y);x.lineTo(w-R,y);x.stroke();x.fillStyle="rgba(255,255,255,.3)";x.fillText(String(v),8,y)});
    const now=Date.now();let start,end;
    if(range){start=now-range*86400000;end=now}else if(pts.length){start=Date.parse(pts[0].observedAt);end=Math.max(now,Date.parse(pts.at(-1).observedAt));if(end-start<86400000){start-=43200000;end+=43200000}}else{start=now-7*86400000;end=now}
    const span=Math.max(1,end-start),plotW=w-L-R,plotH=h-T-B;
    for(let i=0;i<4;i++){const ts=start+span*i/3,xx=L+plotW*i/3;x.strokeStyle="rgba(255,255,255,.045)";x.beginPath();x.moveTo(xx,T);x.lineTo(xx,h-B);x.stroke();x.fillStyle="rgba(255,255,255,.31)";x.textAlign=i===0?"left":i===3?"right":"center";x.textBaseline="alphabetic";x.fillText(dateLabel(ts,span),xx,h-8)}
    if(!pts.length){x.fillStyle="rgba(255,255,255,.28)";x.textAlign="center";x.textBaseline="middle";x.font="20px -apple-system,BlinkMacSystemFont,sans-serif";x.fillText("Пока нет отметок за этот период",L+plotW/2,T+plotH/2);return wrap}
    const coords=pts.map(q=>({q,t:Date.parse(q.observedAt),x:L+Math.max(0,Math.min(1,(Date.parse(q.observedAt)-start)/span))*plotW,y:T+(10-Math.max(0,Math.min(10,Number(q.intensity))))/10*plotH}));
    const gapLimit=range===7?1.6*86400000:range===30?4*86400000:Math.max(5*86400000,span*.12);
    for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i],gap=b.t-a.t;x.save();x.strokeStyle=gap>gapLimit?"rgba(255,255,255,.28)":"rgba(255,255,255,.78)";x.lineWidth=2.4;if(gap>gapLimit)x.setLineDash([6,8]);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();x.restore()}
    coords.forEach(o=>{x.beginPath();x.arc(o.x,o.y,5.2,0,Math.PI*2);x.fillStyle=o.q.phase==="pre"?"#fff":o.q.phase==="post"?"#888":"#050505";x.fill();x.strokeStyle="#fff";x.lineWidth=1.8;x.stroke()});
    return wrap;
  }

  function measuredSegments(session){return (session?.usage||[]).filter(u=>u?.config&&Number(u.durationMs)>0&&(u.phase==="measured"||!u.phase)).map((u,index)=>({index,patternId:patternIdOf(u),config:clone(u.config),durationMs:Number(u.durationMs)||0,previewFrame:Number(u.previewFrame)||44,configKey:u.configKey||Setka.configKey?.(u.config,patternIdOf(u))||null})).sort((a,b)=>b.durationMs-a.durationMs)}
  function sessionPatternTime(session){const segs=measuredSegments(session),sum=segs.reduce((a,x)=>a+x.durationMs,0);return{segs,total:sum||Math.max(0,Number(session.measuredActiveMs)||0)}}
  function stateSessions(state,range){
    const min=cutoff(range),checks=(data().checkins||[]),out=[];
    for(const session of (data().sessions||[])){
      if(!session?.startedAt||Date.parse(session.startedAt)<min||session.sessionType==="exploration"||session.isExploration)continue;
      const pre=checks.find(x=>x.sessionId===session.id&&x.symptomId===state.id&&x.phase==="pre");if(!pre)continue;
      const post=checks.find(x=>x.sessionId===session.id&&x.symptomId===state.id&&x.phase==="post");const p=sessionPatternTime(session);
      out.push({session,pre:Number(pre.intensity),post:post?Number(post.intensity):null,patternTimeMs:p.total,segments:p.segs,resultAvailable:!!post});
    }
    return out.sort((a,b)=>b.patternTimeMs-a.patternTimeMs||Date.parse(b.session.startedAt)-Date.parse(a.session.startedAt));
  }
  C.getStateSessionAssociations=(symptomId,range=0)=>{const s=(data().symptoms||[]).find(x=>x.id===symptomId);if(!s)return[];return stateSessions(s,range).map(r=>({sessionId:r.session.id,requestKey:r.session.requestKey,startedAt:r.session.startedAt,preIntensity:r.pre,postIntensity:r.post,resultAvailable:r.resultAvailable,patternTimeMs:r.patternTimeMs,topStableSegments:r.segments.slice(0,5).map(x=>({patternId:x.patternId,configKey:x.configKey,durationMs:x.durationMs,attentionWeight:r.patternTimeMs?x.durationMs/r.patternTimeMs:0}))}))};

  function renderCombo(parent,seg,total){const row=document.createElement("div");row.className="st34-state-combo";const canvas=document.createElement("canvas");canvas.width=120;canvas.height=120;row.appendChild(canvas);const text=document.createElement("div"),share=total?Math.round(seg.durationMs/total*100):0;text.innerHTML=`<b>${esc(patternTitle(seg.patternId))}</b><span>${esc(fmtDuration(seg.durationMs))} · ${share}% времени в паттернах</span>`;row.appendChild(text);parent.appendChild(row);requestAnimationFrame(()=>{try{Setka.renderPreview?.(canvas,seg.config,seg.previewFrame,seg.patternId)}catch(_){}})}
  function renderSessionRow(parent,r){
    const d=document.createElement("div");d.className="st34-state-session";const top=document.createElement("div");top.className="st34-state-session-top";
    const main=document.createElement("div");main.className="st34-state-session-main";main.innerHTML=`<div class="st34-state-session-title">${esc(intentLabel(r.session.requestKey))}</div><div class="st34-state-session-meta">${esc(C.dt(r.session.startedAt))}</div>`;top.appendChild(main);const time=document.createElement("div");time.className="st34-state-session-time";time.textContent=fmtDuration(r.patternTimeMs);top.appendChild(time);d.appendChild(top);
    const result=document.createElement("div");result.className="st34-state-result";result.textContent=r.resultAvailable?`Состояние: ${r.pre}/10 → ${r.post}/10`:`Состояние перед сессией: ${r.pre}/10 · после не отмечено`;d.appendChild(result);
    if(r.segments.length){const combos=document.createElement("div");combos.className="st34-state-combos";r.segments.slice(0,2).forEach(seg=>renderCombo(combos,seg,r.patternTimeMs));d.appendChild(combos)}
    const open=document.createElement("button");open.type="button";open.className="st34-state-open-session";open.textContent="Открыть сессию";open.onclick=()=>C.showSessionDetail?.(r.session.id);d.appendChild(open);parent.appendChild(d)
  }
  function sessionsBlock(state,range){
    const rows=stateSessions(state,range),box=document.createElement("div");box.className="st34-state-sessions";const head=document.createElement("div");head.className="st34-state-sessions-head";head.innerHTML='<b>Самые продолжительные сессии с этим состоянием</b><span>Сортировка по времени в паттернах. Даже если отметки после нет, длительность и устойчивые комбинации всё равно сохраняются как данные внимания.</span>';box.appendChild(head);
    if(!rows.length){const e=document.createElement("div");e.className="st34-state-no-sessions";e.textContent="Пока нет сессий, где это состояние было отмечено перед запуском.";box.appendChild(e);return box}
    const first=3;rows.slice(0,first).forEach(r=>renderSessionRow(box,r));if(rows.length>first){const more=document.createElement("button");more.type="button";more.className="st34-state-more-sessions";more.textContent=`Показать ещё ${rows.length-first}`;more.onclick=()=>{rows.slice(first).forEach(r=>box.insertBefore((()=>{const temp=document.createElement("div");renderSessionRow(temp,r);return temp.firstElementChild})(),more));more.remove()};box.appendChild(more)}return box
  }

  function enhance(){
    const layer=document.getElementById("st34Layer"),title=layer?.querySelector?.(".st-title")?.textContent?.trim();if(title!=="Состояния")return;
    for(const card of layer.querySelectorAll(".st34-state-card")){
      const name=card.querySelector(".st34-state-name")?.textContent?.trim(),state=(data().symptoms||[]).find(s=>s.active!==false&&s.name===name),details=card.querySelector(".st34-state-details");if(!state||!details)continue;
      const range=rangeFrom(details),key=`${range}:${pointsFor(state,range).length}:${stateSessions(state,range).length}`;if(details.dataset.timeAssocKey===key)continue;details.dataset.timeAssocKey=key;
      details.querySelector(".st34-timegraph-wrap")?.remove();details.querySelector(".st34-state-sessions")?.remove();details.querySelector(".st34-state-graph")?.remove();
      const summary=details.querySelector(".st34-state-summary"),obs=details.querySelector(".st34-setka-observation"),graph=drawTimeline(state,range);if(summary)summary.insertAdjacentElement("afterend",graph);else details.prepend(graph);
      const sessions=sessionsBlock(state,range);if(obs)obs.insertAdjacentElement("beforebegin",sessions);else details.appendChild(sessions);
    }
  }
  const layer=document.getElementById("st34Layer");if(layer)new MutationObserver(()=>setTimeout(enhance,0)).observe(layer,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("click",e=>{if(e.target?.closest?.(".st34-details-btn,.st34-states-periods button"))setTimeout(enhance,0)},true);
  setTimeout(enhance,150);
  window.__SETKA_STATE_TIMELINE_V34__=true;
})();