(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka||typeof C.screen!=="function")return;

  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const esc=C.esc;
  const intentLabel=k=>C.INTENTS.find(x=>x[0]===k)?.[1]||"Сессия";
  const patternIdOf=u=>u?.patternId||u?.config?.patternId||"tentacle-orbit";
  const patternTitle=pid=>Setka.getPatternTitle?.(pid)||(pid==="dandelion"?"Одуванчик":"Tentacle Orbit");
  const isExploration=s=>!!(s?.isExploration||s?.sessionType==="exploration"||s?.requestKey==="explore");

  const style=document.createElement("style");
  style.textContent=`
    .st34-session-patterns{margin:20px 0 8px}
    .st34-session-patterns-head{margin-bottom:10px}
    .st34-session-patterns-head b{display:block;font-size:15px;line-height:1.25}
    .st34-session-patterns-head span{display:block;margin-top:5px;font-size:10px;line-height:1.45;color:rgba(255,255,255,.42)}
    .st34-stable-card{width:100%;display:grid;grid-template-columns:104px minmax(0,1fr);gap:14px;align-items:center;border:1px solid rgba(255,255,255,.17);border-radius:23px;background:#080808;color:#fff;text-align:left;padding:12px;margin:10px 0;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .st34-stable-card:active{transform:scale(.993);background:#0d0d0d}
    .st34-stable-preview{display:block;width:104px;height:104px;border-radius:18px;background:#000;border:1px solid rgba(255,255,255,.09)}
    .st34-stable-rank{font-size:8px;letter-spacing:.13em;color:rgba(255,255,255,.35);text-transform:uppercase}
    .st34-stable-name{font-size:14px;font-weight:650;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .st34-stable-time{font-size:25px;font-weight:650;line-height:1;margin-top:11px;font-variant-numeric:tabular-nums}
    .st34-stable-meta{font-size:9px;line-height:1.45;color:rgba(255,255,255,.43);margin-top:6px}
    .st34-stable-bar{height:3px;border-radius:2px;background:rgba(255,255,255,.09);overflow:hidden;margin-top:10px}
    .st34-stable-bar i{display:block;height:100%;background:#fff;border-radius:2px;min-width:2px}
    .st34-stable-more{width:100%;height:42px;border:1px solid rgba(255,255,255,.18);border-radius:21px;background:transparent;color:rgba(255,255,255,.72);font-size:11px;margin:8px 0}
    .st34-session-method{font-size:9px;line-height:1.5;color:rgba(255,255,255,.32);padding:4px 3px 2px}
    .st34-session-after{margin-top:23px;padding-top:4px;border-top:1px solid rgba(255,255,255,.08)}
    @media(max-width:360px){.st34-stable-card{grid-template-columns:88px minmax(0,1fr)}.st34-stable-preview{width:88px;height:88px}}
  `;
  document.head.appendChild(style);

  function stableSegments(session,phase=null){
    return (session?.usage||[])
      .filter(u=>u?.config&&Number(u.durationMs)>0&&(!phase||u.phase===phase))
      .map((u,index)=>({
        index,
        patternId:patternIdOf(u),
        config:clone(u.config),
        configKey:u.configKey||Setka.configKey?.(u.config,patternIdOf(u))||null,
        durationMs:Math.max(0,Number(u.durationMs)||0),
        startedMs:Math.max(0,Number(u.startedMs)||0),
        endedMs:Math.max(0,Number(u.endedMs)||0),
        previewFrame:Number.isFinite(Number(u.previewFrame))?Number(u.previewFrame):44,
        saved:!!u.saved,
        phase:u.phase||"measured"
      }))
      .sort((a,b)=>b.durationMs-a.durationMs||a.startedMs-b.startedMs);
  }

  function weighted(arr,total){return arr.map((x,rank)=>({...x,rank:rank+1,participationWeight:total?x.durationMs/total:0}))}
  function sessionWeights(session){
    if(isExploration(session)){
      const exploration=stableSegments(session),total=exploration.reduce((a,x)=>a+x.durationMs,0);
      return{
        sessionId:session?.id||null,sessionType:"exploration",requestKey:"explore",
        result:null,explorationTotalMs:total,exploration:weighted(exploration,total),
        measuredTotalMs:0,afterFeedbackTotalMs:0,measured:[],afterFeedback:[]
      };
    }
    const measured=stableSegments(session,"measured"),after=stableSegments(session,"after_feedback");
    const measuredTotalMs=measured.reduce((a,x)=>a+x.durationMs,0),afterTotalMs=after.reduce((a,x)=>a+x.durationMs,0);
    return{
      sessionId:session?.id||null,sessionType:"outcome",requestKey:session?.requestKey||null,
      result:{preState:session?.preState??null,postState:session?.postState??null,helped:session?.helped??null,completed:!!session?.completed},
      measuredTotalMs,afterFeedbackTotalMs:afterTotalMs,
      measured:weighted(measured,measuredTotalMs),afterFeedback:weighted(after,afterTotalMs),
      explorationTotalMs:0,exploration:[]
    };
  }

  C.getSessionPatternWeights=sid=>{const s=C.getData().sessions.find(x=>x.id===sid);return s?sessionWeights(s):null};

  function durationLabel(ms){
    ms=Math.max(0,Number(ms)||0);if(ms<1000)return`${Math.max(.1,ms/1000).toFixed(1).replace(".0","")} сек`;return C.fmt(ms);
  }
  function renderPreview(canvas,segment){requestAnimationFrame(()=>{try{Setka.renderPreview?.(canvas,segment.config,segment.previewFrame,segment.patternId)}catch(_){}})}
  function openSegment(session,segment,rank){
    C.recordEvent?.("session_stable_config_open",{viewedSessionId:session.id,sessionType:isExploration(session)?"exploration":"outcome",patternId:segment.patternId,configKey:segment.configKey,durationMs:segment.durationMs,rank,phase:segment.phase},false);
    C.hideLayer();Setka.openConfig?.(clone(segment.config),{type:"history",id:`${session.id}-stable-${segment.phase}-${segment.index}`,sessionId:session.id,patternId:segment.patternId});
  }

  function makeCard(session,segment,rank,totalMs,scope){
    const share=totalMs?Math.max(0,Math.min(1,segment.durationMs/totalMs)):0,b=document.createElement("button");b.type="button";b.className="st34-stable-card";
    const canvas=document.createElement("canvas");canvas.className="st34-stable-preview";canvas.width=260;canvas.height=260;b.appendChild(canvas);
    const info=document.createElement("div");
    let rankText,relation;
    if(scope==="exploration"){
      rankText=rank===1?"Дольше всего без изменений":`${rank}-е по времени`;
      relation=`${Math.round(share*100)}% времени просмотра комбинаций`;
    }else if(scope==="measured"){
      rankText=rank===1?"Дольше всего без изменений":`${rank}-е по времени`;
      relation=`${Math.round(share*100)}% времени в паттернах до оценки`;
    }else{
      rankText=rank===1?"Дольше всего после оценки":`${rank}-е по времени`;
      relation=`${Math.round(share*100)}% времени после оценки`;
    }
    info.innerHTML=`<div class="st34-stable-rank">${esc(rankText)}</div><div class="st34-stable-name">${esc(patternTitle(segment.patternId))}</div><div class="st34-stable-time">${esc(durationLabel(segment.durationMs))}</div><div class="st34-stable-meta">${esc(relation)}${segment.saved?" · сохранён ♥":""}</div><div class="st34-stable-bar"><i style="width:${Math.round(share*100)}%"></i></div>`;
    b.appendChild(info);b.onclick=()=>openSegment(session,segment,rank);renderPreview(canvas,segment);return b;
  }

  function renderGroup(parent,session,segments,totalMs,scope){
    if(!segments.length)return;
    const wrap=document.createElement("div");wrap.className=`st34-session-patterns${scope==="after"?" st34-session-after":""}`;
    const head=document.createElement("div");head.className="st34-session-patterns-head";
    if(scope==="exploration")head.innerHTML='<b>Комбинации этого исследования</b><span>От самого долгого непрерывного просмотра без изменения параметров — к более короткому.</span>';
    else if(scope==="measured")head.innerHTML='<b>Конфигурации до оценки</b><span>От самого долгого непрерывного просмотра без изменения параметров — к более короткому.</span>';
    else head.innerHTML='<b>После итоговой оценки</b><span>Эти просмотры сохранены отдельно и не участвуют в связи с результатом «до → после».</span>';
    wrap.appendChild(head);
    const initial=6;segments.slice(0,initial).forEach((x,i)=>wrap.appendChild(makeCard(session,x,i+1,totalMs,scope)));
    if(segments.length>initial){const more=document.createElement("button");more.type="button";more.className="st34-stable-more";more.textContent=`Показать ещё ${segments.length-initial}`;more.onclick=()=>{segments.slice(initial).forEach((x,i)=>wrap.insertBefore(makeCard(session,x,i+initial+1,totalMs,scope),more));more.remove()};wrap.appendChild(more)}
    const method=document.createElement("div");method.className="st34-session-method";
    method.textContent=scope==="exploration"
      ?"Доля по времени показывает, какие комбинации сильнее удерживали внимание в свободном исследовании. Здесь нет результата «до → после», поэтому этот вес не трактуется как эффект."
      :scope==="measured"
        ?"Доля по времени — это вес участия конкретной конфигурации в этой сессии. Она помогает сравнивать выборы внутри одного запроса и результата, но сама по себе не доказывает эффект."
        :"Просмотры после итоговой оценки хранятся отдельно от измеряемого результата.";
    wrap.appendChild(method);parent.appendChild(wrap);
  }

  function findSession(title,copy){
    const all=C.getData().sessions||[],exact=all.filter(s=>C.dt(s.startedAt)===copy&&intentLabel(s.requestKey)===title);
    if(exact.length)return exact.sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt))[0];
    return all.filter(s=>C.dt(s.startedAt)===copy).sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt))[0]||null;
  }

  function insertionAnchor(body){
    const notes=[...body.querySelectorAll(":scope > .st34-note-card")];if(notes.length)return notes.at(-1);
    const notesLabel=[...body.querySelectorAll(":scope > .st-label")].find(x=>x.textContent.trim()==="Заметки");if(notesLabel)return notesLabel;
    return body.querySelector(":scope > .st-card")||null;
  }

  function enhanceSession(body,title,copy){
    if(!body?.isConnected||body.dataset.stablePatternsEnhanced==="1")return;
    const session=findSession(title,copy);if(!session)return;
    const oldLabel=[...body.querySelectorAll(":scope > .st-label")].find(x=>x.textContent.trim()==="Паттерны этой сессии");
    if(!oldLabel)return;
    body.dataset.stablePatternsEnhanced="1";
    let n=oldLabel.nextElementSibling;while(n&&n.classList.contains("st-action")){const next=n.nextElementSibling;n.remove();n=next}oldLabel.remove();

    const marker=document.createElement("div");marker.className="st-label";marker.textContent=isExploration(session)?"Комбинации":"Паттерны этой сессии";
    const holder=document.createElement("div");
    const anchor=insertionAnchor(body);
    if(anchor){anchor.insertAdjacentElement("afterend",marker);marker.insertAdjacentElement("afterend",holder)}else{body.append(marker,holder)}

    const weights=sessionWeights(session);
    if(weights.sessionType==="exploration")renderGroup(holder,session,weights.exploration,weights.explorationTotalMs,"exploration");
    else{
      renderGroup(holder,session,weights.measured,weights.measuredTotalMs,"measured");
      renderGroup(holder,session,weights.afterFeedback,weights.afterFeedbackTotalMs,"after");
    }
  }

  const nativeScreen=C.screen.bind(C);
  C.screen=function(title,copy="",kicker="SETKA",back){const body=nativeScreen(title,copy,kicker,back);if(kicker==="СЕССИЯ")setTimeout(()=>enhanceSession(body,title,copy),0);return body};
  window.__SETKA_SESSION_PATTERN_WEIGHTS_V34__=true;
})();