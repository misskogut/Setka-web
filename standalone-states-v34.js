(() => {
  "use strict";
  const C=window.SetkaStandaloneV34;
  if(!C)return;

  const PRESETS=["Внутреннее напряжение","Усталость","Трудно заснуть","Головная боль","Туман в голове","Усталость глаз","Раздражительность"];
  const esc=C.esc,dt=C.dt;
  let currentRange=30;
  let expandedStateId=null;

  const style=document.createElement("style");
  style.textContent=`
    .st34-state-card{border:1px solid rgba(255,255,255,.15);border-radius:24px;background:#080808;padding:17px;margin:12px 0;overflow:hidden}
    .st34-state-head{display:flex;align-items:flex-start;gap:12px}.st34-state-name{font-size:18px;font-weight:650;line-height:1.2}.st34-state-last{font-size:10px;color:rgba(255,255,255,.4);margin-top:5px}.st34-state-now{margin-left:auto;font-size:25px;font-weight:650;white-space:nowrap}
    .st34-state-actions{display:grid;grid-template-columns:1.45fr 1fr;gap:8px;margin-top:14px}.st34-state-actions button{height:43px;border-radius:22px;font-size:12px}.st34-mark-btn{border:0;background:#fff;color:#000;font-weight:650}.st34-details-btn{border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff}
    .st34-mark-editor{display:none;margin-top:13px;padding:13px 2px 2px;border-top:1px solid rgba(255,255,255,.09)}.st34-mark-editor.open{display:block}.st34-mark-value{font-size:24px;font-weight:650;text-align:center;margin-bottom:8px}.st34-mark-editor input{width:100%}.st34-mark-save{width:100%;height:42px;border:0;border-radius:21px;background:#fff;color:#000;font-weight:650;font-size:13px;margin-top:9px}
    .st34-state-details{display:none;margin-top:13px;padding-top:13px;border-top:1px solid rgba(255,255,255,.09)}.st34-state-details.open{display:block}
    .st34-states-periods{display:flex;gap:7px;margin:0 0 12px}.st34-states-periods button{height:34px;padding:0 13px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:#050505;color:rgba(255,255,255,.58);font-size:10px}.st34-states-periods button.active{background:#fff;color:#000;border-color:#fff}
    .st34-state-summary{padding:13px 14px;border:1px solid rgba(255,255,255,.09);border-radius:17px;background:#050505}.st34-state-summary strong{display:block;font-size:13px}.st34-state-summary span{display:block;margin-top:5px;font-size:11px;line-height:1.45;color:rgba(255,255,255,.48)}
    .st34-state-graph{display:block;width:100%;height:135px;margin-top:12px;border:1px solid rgba(255,255,255,.09);border-radius:17px;background:#040404}
    .st34-setka-observation{margin-top:12px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:18px}.st34-setka-observation .eyebrow{font-size:9px;letter-spacing:.11em;color:rgba(255,255,255,.35)}.st34-setka-observation strong{display:block;font-size:14px;margin-top:6px}.st34-setka-observation p{margin:5px 0 0;font-size:11px;line-height:1.45;color:rgba(255,255,255,.5)}
    .st34-add-wrap{margin-top:22px;padding-top:17px;border-top:1px solid rgba(255,255,255,.08)}.st34-add-hint{font-size:10px;color:rgba(255,255,255,.34);margin:0 2px 9px}
    .st34-add-state{width:100%;height:50px;border:1px solid rgba(255,255,255,.22);border-radius:25px;background:#080808;color:#fff;font-size:14px}
    .st34-state-picker{display:none;border:1px solid rgba(255,255,255,.13);border-radius:22px;padding:14px;margin:10px 0 4px;background:#070707}.st34-state-picker.open{display:block}
    .st34-state-preset-row{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.st34-state-preset{min-height:36px;padding:0 12px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:#050505;color:#fff;font-size:11px}
    .st34-state-custom{display:flex;gap:8px}.st34-state-custom input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.2);border-radius:17px;background:#050505;color:#fff;padding:0 13px;height:44px;font-size:13px;outline:none}.st34-state-custom button{width:92px;border:1px solid rgba(255,255,255,.22);border-radius:17px;background:#0a0a0a;color:#fff;font-size:12px}
    .st34-state-empty{padding:28px 14px;text-align:center;border:1px solid rgba(255,255,255,.1);border-radius:22px;color:rgba(255,255,255,.42);font-size:12px;line-height:1.5}
    .st34-states-sync{font-size:11px;line-height:1.5;color:rgba(255,255,255,.55);padding:9px 2px 13px;display:flex;align-items:center;gap:12px;justify-content:space-between}
    .st34-states-sync button{flex:0 0 auto;border:1px solid rgba(255,255,255,.22);color:#fff;background:#090909;padding:9px 12px;border-radius:18px;font-size:11px;min-height:38px}
    .st34-states-sync button:disabled{opacity:.5}
  `;
  document.head.appendChild(style);

  function data(){return C.getData()}
  function cutoff(range){return range?Date.now()-range*86400000:0}
  function activeStates(){return (data().symptoms||[]).filter(x=>x.active!==false)}
  function pointsFor(s,range){const min=cutoff(range);return (data().checkins||[]).filter(x=>x.symptomId===s.id&&Date.parse(x.observedAt)>=min).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt))}
  function avg(a){return a.length?a.reduce((p,q)=>p+q,0)/a.length:null}
  function latestFor(s){return (data().checkins||[]).filter(x=>x.symptomId===s.id).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)).at(-1)||null}

  // This screen is local-first: never imply a cloud backup before its API
  // confirms a private archive write. A missing remote archive is not a zero.
  function storedLocally(id){
    try{
      const d=JSON.parse(localStorage.getItem("setka-standalone:v34")||"null");
      return !!d?.symptoms?.some(s=>s.id===id);
    }catch(_){return false}
  }
  function requestStateSync(){
    window.dispatchEvent(new Event("setka:v34-sync-request"));
  }
  function cloudStatusText(){
    const a=window.__SETKA_TESTER_CABINET_V40__?.state?.();
    if(!a?.authenticated)return "Отметки хранятся в этом браузере. Для сохранения в аккаунте требуется вход.";
    const status=window.__SETKA_PRIVATE_CORPUS_V40__?.status?.();
    if(status?.ok&&status.statesVerified&&!status.statesPending&&status.updatedAt){
      const at=new Date(status.updatedAt),date=Number.isFinite(at.getTime())?at.toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
      return "Состояния и отметки сохранены в аккаунте · "+date;
    }
    if(!activeStates().length)return "Выбранных состояний пока нет. Добавь состояние ниже.";
    if(status?.ok===false)return "Облачное сохранение не подтверждено. Изменения остаются в этом браузере.";
    return "Изменения сохранены в этом браузере. Ожидаем подтверждение аккаунта…";
  }

  function renderCloudStatus(parent){
    const wrap=document.createElement("div");
    wrap.className="st34-states-sync";
    const caption=document.createElement("span");caption.className="st34-states-sync-label";
    caption.textContent=cloudStatusText();wrap.appendChild(caption);
    const a=window.__SETKA_TESTER_CABINET_V40__?.state?.();
    if(a?.authenticated){
      const btn=document.createElement("button");btn.type="button";btn.textContent="Проверить сохранение";
      btn.onclick=async()=>{
        btn.disabled=true;caption.textContent="Проверяем сохранение в аккаунте…";
        try{
          const ok=await window.__SETKA_PRIVATE_CORPUS_V40__?.sync?.();
          const cloud=window.__SETKA_PRIVATE_CORPUS_V40__?.status?.();
          const local=data();
          if(ok&&cloud?.ok&&cloud.statesVerified&&!cloud.statesPending)
            caption.textContent="Состояния и отметки сохранены в аккаунте SETKA.";
          else caption.textContent="Не удалось подтвердить сохранение. Данные пока остаются в этом браузере.";
        }catch(_){caption.textContent="Нет подтверждения облачного сохранения. Локальные данные не удалены."}
        finally{btn.disabled=false}
      };
      wrap.appendChild(btn);
    }
    parent.appendChild(wrap);
  }


  function addState(name){
    name=String(name||"").trim();if(!name)return false;
    if(activeStates().some(x=>x.name.toLowerCase()===name.toLowerCase()))return false;
    data().symptoms.push({id:C.id("sym"),name,active:true,lastIntensity:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    C.save();
    if(!storedLocally(data().symptoms.at(-1).id))alert("Состояние пока не удалось сохранить на устройстве. Не закрывай приложение.");
    C.recordEvent?.("symptom_added",{symptomId:data().symptoms.at(-1).id,name},false);
    requestStateSync();
    return true;
  }

  function trendObservation(pts){
    if(pts.length<3)return{title:"Пока мало отметок",body:"Добавь ещё несколько значений — тогда появится понятный тренд за выбранный период."};
    const vals=pts.map(x=>Number(x.intensity)).filter(Number.isFinite);if(vals.length<3)return{title:"Пока мало отметок",body:"Нужно ещё немного данных, чтобы сравнить изменение."};
    const cut=Math.max(1,Math.floor(vals.length/3)),first=avg(vals.slice(0,cut)),last=avg(vals.slice(-cut)),diff=last-first;
    if(diff<=-1.25)return{title:"Интенсивность заметно снизилась",body:`В начале периода она была примерно ${first.toFixed(1)}/10, в последних отметках — ${last.toFixed(1)}/10.`};
    if(diff>=1.25)return{title:"Интенсивность заметно выросла",body:`В начале периода она была примерно ${first.toFixed(1)}/10, в последних отметках — ${last.toFixed(1)}/10.`};
    return{title:"Без заметного устойчивого изменения",body:"Последние отметки держатся примерно на том же уровне, что и в начале периода."};
  }

  function sessionPairs(s,range){
    const min=cutoff(range),pts=(data().checkins||[]).filter(x=>x.symptomId===s.id&&Date.parse(x.observedAt)>=min),out=[];
    for(const sess of (data().sessions||[]).filter(x=>x.completed)){
      const pre=pts.find(x=>x.sessionId===sess.id&&x.phase==="pre"),post=pts.find(x=>x.sessionId===sess.id&&x.phase==="post");
      if(pre&&post)out.push({session:sess,pre:Number(pre.intensity),post:Number(post.intensity),delta:Number(post.intensity)-Number(pre.intensity)});
    }
    return out;
  }

  function setkaObservation(s,range){
    const pairs=sessionPairs(s,range);
    if(!pairs.length)return{title:"Пока нет сравнения до и после",body:"Если отметить это состояние перед сессией и после неё, здесь появятся наблюдения."};
    if(pairs.length===1){const p=pairs[0];return{title:`В этой сессии: ${p.pre}/10 → ${p.post}/10`,body:p.delta<0?"После сессии интенсивность была ниже.":p.delta>0?"После сессии интенсивность была выше.":"До и после сессии значение не изменилось."};}
    const lower=pairs.filter(x=>x.delta<0).length,higher=pairs.filter(x=>x.delta>0).length,mean=avg(pairs.map(x=>x.delta));
    let title=`В ${lower} из ${pairs.length} сессий значение было ниже после SETKA`;
    if(lower===0&&higher>0)title=`В ${higher} из ${pairs.length} сессий значение было выше после SETKA`;
    if(lower===0&&higher===0)title=`Во всех ${pairs.length} сессиях значение не менялось`;
    const direction=mean<-.2?`Среднее изменение: ${mean.toFixed(1)} пункта.`:mean>.2?`Среднее изменение: +${mean.toFixed(1)} пункта.`:"В среднем значение почти не менялось.";
    return{title,body:`${direction} Это наблюдение по твоим отметкам, а не вывод о причине изменения.`};
  }

  function drawGraph(points){
    const c=document.createElement("canvas");c.className="st34-state-graph";c.width=680;c.height=190;
    const x=c.getContext("2d"),w=c.width,h=c.height,p=20;x.fillStyle="#040404";x.fillRect(0,0,w,h);
    x.strokeStyle="rgba(255,255,255,.07)";x.lineWidth=1;for(let i=0;i<5;i++){const y=p+i*(h-p*2)/4;x.beginPath();x.moveTo(p,y);x.lineTo(w-p,y);x.stroke()}
    if(!points.length)return c;
    const t0=Date.parse(points[0].observedAt),t1=Date.parse(points.at(-1).observedAt),span=Math.max(1,t1-t0);
    const coords=points.map(q=>({q,x:points.length===1?w/2:p+(Date.parse(q.observedAt)-t0)/span*(w-p*2),y:p+(10-Number(q.intensity))/10*(h-p*2)}));
    if(coords.length>1){x.strokeStyle="#fff";x.lineWidth=2.5;x.beginPath();coords.forEach((o,i)=>i?x.lineTo(o.x,o.y):x.moveTo(o.x,o.y));x.stroke()}
    coords.forEach(o=>{x.beginPath();x.arc(o.x,o.y,5,0,Math.PI*2);x.fillStyle=o.q.phase==="pre"?"#fff":o.q.phase==="post"?"#777":"#050505";x.fill();x.strokeStyle="#fff";x.lineWidth=1.8;x.stroke()});return c;
  }

  function periods(parent,s){
    const row=document.createElement("div");row.className="st34-states-periods";
    [[7,"7 дней"],[30,"30 дней"],[0,"Всё"]].forEach(([v,t])=>{const b=document.createElement("button");b.textContent=t;b.classList.toggle("active",v===currentRange);b.onclick=()=>{currentRange=v;expandedStateId=s.id;showStates(v,s.id)};row.appendChild(b)});parent.appendChild(row);
  }

  function markEditor(card,s,latest,range){
    const editor=document.createElement("div");editor.className="st34-mark-editor";
    const value=document.createElement("div");value.className="st34-mark-value";value.textContent=`${latest}/10`;editor.appendChild(value);
    const slider=document.createElement("input");slider.type="range";slider.min=0;slider.max=10;slider.step=1;slider.value=latest;slider.oninput=()=>value.textContent=`${slider.value}/10`;editor.appendChild(slider);
    const save=document.createElement("button");save.className="st34-mark-save";save.textContent="Сохранить отметку";save.onclick=()=>{const v=Number(slider.value),now=new Date().toISOString();s.lastIntensity=v;s.updatedAt=now;data().checkins.push({id:C.id("check"),symptomId:s.id,sessionId:null,phase:"standalone",intensity:v,observedAt:now,localOffsetMinutes:C.localOffset()});C.save();C.recordEvent?.("symptom_checkin",{symptomId:s.id,intensity:v},false);requestStateSync();showStates(range)};editor.appendChild(save);card.appendChild(editor);return editor;
  }

  function renderStateCard(parent,s,range){
    const pts=pointsFor(s,range),latestPoint=latestFor(s),latest=latestPoint?Number(latestPoint.intensity):Number(s.lastIntensity||0),trend=trendObservation(pts),setka=setkaObservation(s,range);
    const card=document.createElement("section");card.className="st34-state-card";
    const head=document.createElement("div");head.className="st34-state-head";head.innerHTML=`<div><div class="st34-state-name">${esc(s.name)}</div><div class="st34-state-last">${latestPoint?`Последняя отметка: ${esc(dt(latestPoint.observedAt))}`:"Пока нет отметок"}</div></div><div class="st34-state-now">${latest}/10</div>`;card.appendChild(head);

    const actions=document.createElement("div");actions.className="st34-state-actions";actions.innerHTML='<button class="st34-mark-btn">+ Отметить сейчас</button><button class="st34-details-btn">Подробнее</button>';card.appendChild(actions);
    const editor=markEditor(card,s,latest,range);

    const details=document.createElement("div");details.className="st34-state-details";if(expandedStateId===s.id)details.classList.add("open");
    periods(details,s);
    const summary=document.createElement("div");summary.className="st34-state-summary";summary.innerHTML=`<strong>${esc(trend.title)}</strong><span>${esc(trend.body)}</span>`;details.appendChild(summary);
    if(pts.length)details.appendChild(drawGraph(pts));
    const obs=document.createElement("div");obs.className="st34-setka-observation";obs.innerHTML=`<div class="eyebrow">SETKA И ЭТО СОСТОЯНИЕ</div><strong>${esc(setka.title)}</strong><p>${esc(setka.body)}</p>`;details.appendChild(obs);card.appendChild(details);

    const markBtn=actions.querySelector(".st34-mark-btn"),detailsBtn=actions.querySelector(".st34-details-btn");
    markBtn.onclick=()=>{const open=editor.classList.toggle("open");markBtn.textContent=open?"Свернуть":"+ Отметить сейчас"};
    detailsBtn.textContent=details.classList.contains("open")?"Скрыть":"Подробнее";
    detailsBtn.onclick=()=>{const open=details.classList.toggle("open");expandedStateId=open?s.id:null;detailsBtn.textContent=open?"Скрыть":"Подробнее"};
    parent.appendChild(card);
  }

  function showPicker(parent,range){
    const wrap=document.createElement("div");wrap.className="st34-add-wrap";parent.appendChild(wrap);
    const hint=document.createElement("div");hint.className="st34-add-hint";hint.textContent="Можно добавить ещё состояние или создать своё";wrap.appendChild(hint);
    const toggle=document.createElement("button");toggle.className="st34-add-state";toggle.textContent="+ Добавить состояние";wrap.appendChild(toggle);
    const picker=document.createElement("div");picker.className="st34-state-picker";wrap.appendChild(picker);
    const row=document.createElement("div");row.className="st34-state-preset-row";picker.appendChild(row);
    const missing=PRESETS.filter(name=>!activeStates().some(s=>s.name===name));
    for(const name of missing){const b=document.createElement("button");b.className="st34-state-preset";b.textContent=name;b.onclick=()=>{addState(name);showStates(range)};row.appendChild(b)}
    const custom=document.createElement("div");custom.className="st34-state-custom";custom.innerHTML='<input placeholder="Своё состояние"><button>Добавить</button>';picker.appendChild(custom);custom.querySelector("button").onclick=()=>{const value=custom.querySelector("input").value;if(addState(value))showStates(range)};
    if(!missing.length)row.style.display="none";
    toggle.onclick=()=>{picker.classList.toggle("open");toggle.textContent=picker.classList.contains("open")?"Свернуть":"+ Добавить состояние"};
  }

  function showStates(range=currentRange,keepExpanded=expandedStateId){
    currentRange=range;expandedStateId=keepExpanded;C.setNav("symptoms");
    const b=C.screen("Состояния","Быстро отмечай выбранные состояния. История и наблюдения спрятаны внутри «Подробнее».","МОИ СОСТОЯНИЯ",C.showPatterns);
    const states=activeStates();
    if(!states.length){const e=document.createElement("div");e.className="st34-state-empty";e.textContent="Добавь состояние, которое хочется наблюдать. После нескольких отметок SETKA начнёт показывать понятные изменения и связи с сессиями.";b.appendChild(e)}
    else states.forEach(s=>renderStateCard(b,s,range));
    renderCloudStatus(b);
    showPicker(b,range);
  }

  C.showSymptoms=showStates;C.showStates=showStates;

  const navButton=document.querySelector('#st34Nav button[data-p="symptoms"]');
  if(navButton){const icon=navButton.querySelector("span")?.outerHTML||"<span>◇</span>";navButton.innerHTML=`${icon}Состояния`}

  document.addEventListener("click",e=>{
    const b=e.target?.closest?.('#st34Nav button[data-p="symptoms"]');if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();showStates(currentRange);
  },true);


  // Archive restoration is asynchronous. If this screen was already open,
  // repaint it with restored states rather than leaving the initial empty UI.
  for(const event of ["setka:v40-private-corpus-restored","setka:states-restored"])window.addEventListener(event,()=>{
    const layer=document.getElementById("st34Layer");
    if(layer&&!layer.classList.contains("hidden")&&layer.querySelector(".st-title")?.textContent?.trim()==="Состояния")
      showStates(currentRange);
  });
  window.addEventListener("setka:v40-private-corpus",()=>{
    const label=document.querySelector("#st34Layer .st34-states-sync-label");
    if(label)label.textContent=cloudStatusText();
  });

  window.__SETKA_STATES_UI_V34__=true;
})();