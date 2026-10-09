(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  const esc=C.esc;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const style=document.createElement("style");
  style.textContent=`
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

  function activeStates(){return (C.getData().symptoms||[]).filter(x=>x.active!==false)}
  function latestFor(s){
    const a=(C.getData().checkins||[]).filter(x=>x.symptomId===s.id).sort((x,y)=>Date.parse(x.observedAt)-Date.parse(y.observedAt));
    return a.at(-1)||null;
  }
  function options(parent,list){
    let value=null;const w=document.createElement("div");w.className="st-options";
    for(const [v,t] of list){const b=document.createElement("button");b.className="st-opt";b.textContent=t;b.onclick=()=>{value=v;[...w.children].forEach(x=>x.classList.remove("sel"));b.classList.add("sel")};w.appendChild(b)}
    parent.appendChild(w);return()=>value;
  }
  function faces(parent){
    let value=null;const w=document.createElement("div");w.className="st-faces";
    for(const [v,t] of C.FACES){const b=document.createElement("button");b.className="st-face";b.textContent=t;b.onclick=()=>{value=v;[...w.children].forEach(x=>x.classList.remove("sel"));b.classList.add("sel")};w.appendChild(b)}
    parent.appendChild(w);return()=>value;
  }
  function label(parent,text){const d=document.createElement("div");d.className="st-label";d.textContent=text;parent.appendChild(d)}

  function stateSelector(parent,s,onChange){
    const last=latestFor(s),initial=last?Number(last.intensity):Number(s.lastIntensity||0);
    let selected=false;
    const card=document.createElement("div");card.className="st34-session-state";
    const top=document.createElement("div");top.className="st34-session-state-top";
    const name=document.createElement("div");name.className="st34-session-state-name";name.innerHTML=`${esc(s.name)}<span class="st34-session-state-last">${last?`Последняя отметка ${esc(C.dt(last.observedAt))} · ${initial}/10`:"Пока без отметок"}</span>`;top.appendChild(name);
    const yn=document.createElement("div");yn.className="st34-session-yn";
    const no=document.createElement("button");no.type="button";no.textContent="Нет";no.className="active";
    const yes=document.createElement("button");yes.type="button";yes.textContent="Да";
    yn.append(no,yes);top.appendChild(yn);card.appendChild(top);
    const range=document.createElement("div");range.className="st34-session-state-range";
    const value=document.createElement("div");value.className="st34-session-state-value";value.innerHTML=`<span>Интенсивность сейчас</span><strong>${initial}/10</strong>`;range.appendChild(value);
    const slider=document.createElement("input");slider.type="range";slider.min=0;slider.max=10;slider.step=1;slider.value=initial;slider.oninput=()=>value.querySelector("strong").textContent=`${slider.value}/10`;range.appendChild(slider);card.appendChild(range);parent.appendChild(card);
    function set(v){selected=!!v;card.classList.toggle("selected",selected);yes.classList.toggle("active",selected);no.classList.toggle("active",!selected);onChange?.()}
    no.onclick=()=>set(false);yes.onclick=()=>set(true);
    return{symptom:s,isSelected:()=>selected,getValue:()=>Number(slider.value)};
  }

  function sessionPreSurvey(pendingConfig=null){
    const active=C.getActiveSession();
    if(active&&["measured","after_feedback"].includes(active.phase)){
      C.hideLayer();if(pendingConfig)Setka.openConfig?.(clone(pendingConfig.config),pendingConfig.source);return;
    }

    const b=C.screen("Начать сессию","Выбери цель, текущее состояние и только те состояния, которые хочешь сравнить до и после этой сессии.","ПЕРЕД СЕССИЕЙ",C.showToday);
    label(b,"Что тебе нужно сейчас?");const getIntent=options(b,C.INTENTS);
    label(b,"Как ты себя чувствуешь сейчас?");const getFace=faces(b);
    label(b,"Длительность");const getDuration=options(b,C.DURATIONS);

    const states=activeStates(),selectors=[];
    if(states.length){
      label(b,"Что отслеживать в этой сессии?");
      const help=document.createElement("div");help.className="st34-session-state-help";help.textContent="Нажми «Да» только у того, что актуально сейчас. Не выбранные состояния не попадут в сравнение этой сессии.";b.appendChild(help);
      const count=document.createElement("div");count.className="st34-session-selection-count";b.appendChild(count);
      const updateCount=()=>{const n=selectors.filter(x=>x.isSelected()).length;count.textContent=n?`Выбрано: ${n}`:"Можно начать и без выбранных состояний"};
      for(const s of states)selectors.push(stateSelector(b,s,updateCount));
      updateCount();
    }else{
      const empty=document.createElement("div");empty.className="st-muted";empty.style.marginTop="18px";empty.textContent="У тебя пока нет сохранённых состояний. Сессию можно начать без них, а добавить состояния позже во вкладке «Состояния».";b.appendChild(empty);
    }

    const go=document.createElement("button");go.className="st-primary";go.textContent="Начать";
    go.onclick=()=>{
      const requestKey=getIntent(),preState=getFace(),plannedSeconds=getDuration();
      if(!requestKey||!preState||!plannedSeconds)return;
      const selected=selectors.filter(x=>x.isSelected());
      const symptomGetters=selected.map(x=>[x.symptom,x.getValue]);
      C.startSession({requestKey,preState,plannedSeconds,symptomGetters,pendingConfig});
      const s=C.getActiveSession(),row=s?C.getData().sessions.find(x=>x.id===s.id):null;
      if(s){
        s.trackedSymptomIds=selected.map(x=>x.symptom.id);
        s.trackedSymptomNames=selected.map(x=>x.symptom.name);
      }
      if(row){row.trackedSymptomIds=[...(s?.trackedSymptomIds||[])];row.trackedSymptomNames=[...(s?.trackedSymptomNames||[])];C.save()}
      C.recordEvent?.("session_states_selected",{symptoms:selected.map(x=>({id:x.symptom.id,name:x.symptom.name,intensity:x.getValue()})),count:selected.length},true);
    };
    b.appendChild(go);
  }

  C.preSurvey=sessionPreSurvey;
  window.__SETKA_SESSION_STATES_V34__=true;
})();