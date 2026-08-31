(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const esc=C.esc;
  const EXPLORE_KEY="explore";
  const ONE_YEAR_SECONDS=365*24*60*60;
  const originalStart=C.startSession.bind(C);
  const originalFinish=C.finishSession.bind(C);

  const style=document.createElement("style");
  style.textContent=`
    .st34-pre-regular.hidden{display:none!important}
    .st34-explore-note{display:none;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:#080808;padding:15px;margin:15px 0;color:rgba(255,255,255,.58);font-size:11px;line-height:1.5}
    .st34-explore-note.show{display:block}
    .st34-session-state-help{font-size:11px;line-height:1.45;color:rgba(255,255,255,.43);margin:-2px 0 10px}
    .st34-session-state{border:1px solid rgba(255,255,255,.14);border-radius:19px;background:#080808;padding:13px 13px 12px;margin:9px 0;transition:border-color .16s,background .16s}
    .st34-session-state.selected{border-color:rgba(255,255,255,.5);background:#0d0d0d}
    .st34-session-state-top{display:flex;align-items:center;gap:12px}
    .st34-session-state-name{font-size:15px;font-weight:650;line-height:1.2;flex:1;min-width:0}
    .st34-session-state-last{display:block;font-size:9px;font-weight:400;color:rgba(255,255,255,.34);margin-top:4px}
    .st34-session-yn{display:grid;grid-template-columns:44px 44px;border:1px solid rgba(255,255,255,.18);border-radius:17px;padding:2px;gap:2px;flex:none}
    .st34-session-yn button{height:29px;border:0;border-radius:14px;background:transparent;color:rgba(255,255,255,.42);font-size:10px}
    .st34-session-yn button.active{background:#fff;color:#000}
    .st34-session-state-range{display:none;margin-top:13px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08)}
    .st34-session-state.selected .st34-session-state-range{display:block}
    .st34-session-state-value{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.46);margin-bottom:7px}
    .st34-session-state-value strong{font-size:20px;color:#fff}
    .st34-session-state-range input{width:100%}
    .st34-session-selection-count{font-size:10px;color:rgba(255,255,255,.42);margin:8px 0 2px;text-align:center}
  `;
  document.head.appendChild(style);

  function label(parent,text){const d=document.createElement("div");d.className="st-label";d.textContent=text;parent.appendChild(d)}
  function options(parent,list,onChange){
    let value=null;const w=document.createElement("div");w.className="st-options";
    for(const [v,t] of list){const b=document.createElement("button");b.className="st-opt";b.type="button";b.textContent=t;b.onclick=()=>{value=v;[...w.children].forEach(x=>x.classList.remove("sel"));b.classList.add("sel");onChange?.(v)};w.appendChild(b)}
    parent.appendChild(w);return()=>value;
  }
  function faces(parent){
    let value=null;const w=document.createElement("div");w.className="st-faces";
    for(const [v,t] of C.FACES){const b=document.createElement("button");b.className="st-face";b.type="button";b.textContent=t;b.onclick=()=>{value=v;[...w.children].forEach(x=>x.classList.remove("sel"));b.classList.add("sel")};w.appendChild(b)}
    parent.appendChild(w);return()=>value;
  }
  function activeStates(){return (C.getData().symptoms||[]).filter(x=>x.active!==false)}
  function latestFor(s){return (C.getData().checkins||[]).filter(x=>x.symptomId===s.id).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)).at(-1)||null}
  function stateSelector(parent,s,onChange){
    const last=latestFor(s),initial=last?Number(last.intensity):Number(s.lastIntensity||0);let selected=false;
    const card=document.createElement("div");card.className="st34-session-state";
    const top=document.createElement("div");top.className="st34-session-state-top";
    const name=document.createElement("div");name.className="st34-session-state-name";name.innerHTML=`${esc(s.name)}<span class="st34-session-state-last">${last?`Последняя отметка ${esc(C.dt(last.observedAt))} · ${initial}/10`:"Пока без отметок"}</span>`;top.appendChild(name);
    const yn=document.createElement("div");yn.className="st34-session-yn";const no=document.createElement("button"),yes=document.createElement("button");no.type=yes.type="button";no.textContent="Нет";yes.textContent="Да";no.className="active";yn.append(no,yes);top.appendChild(yn);card.appendChild(top);
    const range=document.createElement("div");range.className="st34-session-state-range";const value=document.createElement("div");value.className="st34-session-state-value";value.innerHTML=`<span>Интенсивность сейчас</span><strong>${initial}/10</strong>`;range.appendChild(value);const slider=document.createElement("input");slider.type="range";slider.min=0;slider.max=10;slider.step=1;slider.value=initial;slider.oninput=()=>value.querySelector("strong").textContent=`${slider.value}/10`;range.appendChild(slider);card.appendChild(range);parent.appendChild(card);
    function set(v){selected=!!v;card.classList.toggle("selected",selected);yes.classList.toggle("active",selected);no.classList.toggle("active",!selected);onChange?.()}
    no.onclick=()=>set(false);yes.onclick=()=>set(true);
    return{symptom:s,isSelected:()=>selected,getValue:()=>Number(slider.value)};
  }

  function markExplorationSession(pendingConfig=null){
    // Reuse the mature session lifecycle only as a container. Immediately convert it
    // into a non-outcome exploration session before any pattern is opened.
    originalStart({requestKey:EXPLORE_KEY,preState:null,plannedSeconds:ONE_YEAR_SECONDS,symptomGetters:[],pendingConfig:null});
    const s=C.getActiveSession(),d=C.getData();if(!s)return;
    const row=d.sessions.find(x=>x.id===s.id);
    Object.assign(s,{
      sessionType:"exploration",isExploration:true,phase:"after_feedback",
      preState:null,postState:null,helped:null,plannedSeconds:null,deadlineAt:null,
      feedbackPromptedAt:null,feedbackSubmittedAt:null,feedbackDelayMs:null,
      measuredActiveMs:0,afterFeedbackActiveMs:0,continuedAfterFeedback:false,
      continuationStartedAt:s.startedAt,continuationEndedAt:null,completionReason:null,completed:false
    });
    if(row)Object.assign(row,clone(s));
    const startEvent=[...(d.events||[])].reverse().find(e=>e.sessionId===s.id&&e.type==="session_start");
    if(startEvent)startEvent.payload={requestKey:EXPLORE_KEY,sessionType:"exploration",state:C.stateSnapshot?.()||null};
    C.save();
    C.recordEvent?.("exploration_start",{sessionType:"exploration",state:C.stateSnapshot?.()},true);
    C.updateGameControls?.();
    if(pendingConfig)Setka.openConfig?.(clone(pendingConfig.config),pendingConfig.source||{});
  }

  function finishExploration(origin="manual"){
    const s=C.getActiveSession();if(!s?.isExploration)return originalFinish();
    s.completed=true;s.explorationActiveMs=Number(s.afterFeedbackActiveMs)||0;s.completionReason=origin;s.continuationEndedAt=new Date().toISOString();
    const row=C.getData().sessions.find(x=>x.id===s.id);if(row)Object.assign(row,clone(s));C.save();
    C.recordEvent?.("exploration_complete",{durationMs:s.explorationActiveMs,origin,state:C.stateSnapshot?.()},true);
    return originalFinish();
  }
  C.finishSession=finishExploration;

  function preSurvey(pendingConfig=null){
    const active=C.getActiveSession();
    if(active&&["measured","after_feedback"].includes(active.phase)){C.hideLayer();if(pendingConfig)Setka.openConfig?.(clone(pendingConfig.config),pendingConfig.source);return}
    const b=C.screen("Начать сессию","Выбери, что хочется сделать сейчас.","ПЕРЕД СЕССИЕЙ",C.showToday);
    label(b,"Что тебе нужно сейчас?");
    const regular=document.createElement("div");regular.className="st34-pre-regular";
    const exploreNote=document.createElement("div");exploreNote.className="st34-explore-note";exploreNote.textContent="Свободное исследование сохранится в истории: время, устойчивые комбинации и заметки. Оценки «до → после» и симптомы здесь не собираются.";
    let requestKey=null;
    const getIntent=options(b,C.INTENTS,v=>{requestKey=v;const explore=v===EXPLORE_KEY;regular.classList.toggle("hidden",explore);exploreNote.classList.toggle("show",explore);go.textContent=explore?"Начать исследование":"Начать"});
    b.appendChild(exploreNote);

    label(regular,"Как ты себя чувствуешь сейчас?");const getFace=faces(regular);
    label(regular,"Длительность");const getDuration=options(regular,C.DURATIONS);
    const states=activeStates(),selectors=[];
    if(states.length){
      label(regular,"Что отслеживать в этой сессии?");const help=document.createElement("div");help.className="st34-session-state-help";help.textContent="Нажми «Да» только у того, что актуально сейчас. Не выбранные состояния не попадут в сравнение этой сессии.";regular.appendChild(help);
      const count=document.createElement("div");count.className="st34-session-selection-count";regular.appendChild(count);const updateCount=()=>{const n=selectors.filter(x=>x.isSelected()).length;count.textContent=n?`Выбрано: ${n}`:"Можно начать и без выбранных состояний"};for(const s of states)selectors.push(stateSelector(regular,s,updateCount));updateCount();
    }
    b.appendChild(regular);
    const go=document.createElement("button");go.className="st-primary";go.type="button";go.textContent="Начать";
    go.onclick=()=>{
      const key=getIntent()||requestKey;if(!key)return;
      if(key===EXPLORE_KEY){markExplorationSession(pendingConfig);return}
      const preState=getFace(),plannedSeconds=getDuration();if(!preState||!plannedSeconds)return;
      const selected=selectors.filter(x=>x.isSelected()),symptomGetters=selected.map(x=>[x.symptom,x.getValue]);
      originalStart({requestKey:key,preState,plannedSeconds,symptomGetters,pendingConfig});
      const s=C.getActiveSession(),row=s?C.getData().sessions.find(x=>x.id===s.id):null;
      if(s){s.sessionType="outcome";s.isExploration=false;s.trackedSymptomIds=selected.map(x=>x.symptom.id);s.trackedSymptomNames=selected.map(x=>x.symptom.name)}
      if(row){row.sessionType="outcome";row.isExploration=false;row.trackedSymptomIds=[...(s?.trackedSymptomIds||[])];row.trackedSymptomNames=[...(s?.trackedSymptomNames||[])];C.save()}
      C.recordEvent?.("session_states_selected",{symptoms:selected.map(x=>({id:x.symptom.id,name:x.symptom.name,intensity:x.getValue()})),count:selected.length},true);
    };
    b.appendChild(go);
  }
  C.preSurvey=preSurvey;

  // Exploration notes remain attached to the exploration session, but are not tagged as
  // a post-feedback outcome phase just because the core lifecycle container is reused.
  window.addEventListener("setka:standalone-event",e=>{
    if(e.detail?.type!=="note_create")return;const s=C.getActiveSession();if(!s?.isExploration)return;
    const n=C.getData().notes.find(x=>x.id===e.detail?.payload?.noteId);if(n){n.phase="exploration";n.sessionType="exploration";C.save()}
  });

  // The core timer is used as an elapsed exploration clock, not a deadline.
  function refreshExploreUI(){
    const s=C.getActiveSession(),timer=document.getElementById("st34Timer");if(!s?.isExploration)return;
    if(timer){const elapsed=Math.max(0,Date.now()-Date.parse(s.startedAt));timer.textContent=`ИССЛЕДОВАНИЕ · +${C.fmt(elapsed)}`}
    const finish=document.querySelector(".st34-finish-today span");if(finish)finish.textContent="Закончить свободное исследование";
  }
  setInterval(refreshExploreUI,240);

  document.addEventListener("click",e=>{
    const s=C.getActiveSession();if(!s?.isExploration)return;
    const target=e.target?.closest?.("#st34EndSession,#st34Timer,.st34-finish-today");if(!target)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();finishExploration(target.id||"today");
  },true);

  // Participant session screens: exploration has no ordinary outcome card.
  const nativeScreen=C.screen.bind(C);
  C.screen=function(title,copy="",kicker="SETKA",back){
    const body=nativeScreen(title,copy,kicker,back);
    setTimeout(()=>{
      if(kicker==="СЕССИЯ"){
        const session=(C.getData().sessions||[]).filter(s=>C.dt(s.startedAt)===copy).sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt))[0];
        if(session?.isExploration||session?.sessionType==="exploration"){
          const card=body.querySelector(":scope > .st-card");
          if(card)card.innerHTML=`<div class="st-row"><div class="st-grow"><b>Свободное исследование</b><div class="st-muted">Без оценки до → после</div></div></div><div class="st-user-metric">Время в SETKA: ${C.fmt((Number(session.measuredActiveMs)||0)+(Number(session.afterFeedbackActiveMs)||0))}</div>`;
        }
      }
      if(title==="История сессий"){
        for(const a of body.querySelectorAll(":scope > .st-action"))if((a.querySelector("b")?.textContent||"").trim()==="Просто исследую"){
          const span=a.querySelector("span");if(span)span.textContent=span.textContent.replace("без оценки","свободное исследование");
        }
      }
    },0);
    return body;
  };

  window.__SETKA_EXPLORE_V34__=true;
})();