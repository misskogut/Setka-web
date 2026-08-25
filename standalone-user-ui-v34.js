(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;

  // Participant-facing UI only. Research telemetry keeps recording in the background,
  // but raw events, phases, config hashes, replay internals and developer labels never
  // appear here.
  const original={
    showToday:C.showToday,
    showMe:C.showMe,
    showNotes:C.showNotes,
    showSessions:C.showSessions,
    showPhysio:C.showPhysio,
    showSessionDetail:C.showSessionDetail
  };
  const esc=C.esc,dt=C.dt,fmt=C.fmt;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const intentLabel=k=>C.INTENTS.find(x=>x[0]===k)?.[1]||"Сессия";
  const face=v=>C.FACES.find(x=>x[0]===Number(v))?.[1]||"—";

  const style=document.createElement("style");
  style.textContent=`
    .st34-user-insight{border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:17px;margin:10px 0;background:#090909}
    .st34-user-insight h3{font-size:15px;margin:0 0 8px}.st34-user-insight p{font-size:12px;line-height:1.5;color:rgba(255,255,255,.58);margin:0}
    .st34-user-pattern{display:flex;align-items:center;gap:12px}.st34-user-preview{width:72px;height:72px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:#000;flex:none}
    .st34-user-metric{font-size:11px;color:rgba(255,255,255,.52);line-height:1.5;margin-top:6px}
  `;
  document.head.appendChild(style);

  function action(c,title,sub,fn){
    const b=document.createElement("button");b.className="st-action";
    b.innerHTML=`<b>${esc(title)}</b><span>${esc(sub||"")}</span>`;
    b.onclick=fn;c.appendChild(b);return b;
  }
  function simpleCard(c,title,body){
    const d=document.createElement("div");d.className="st34-user-insight";
    d.innerHTML=`<h3>${esc(title)}</h3><p>${esc(body)}</p>`;c.appendChild(d);return d;
  }
  function sessionDuration(s){
    const measured=Number(s.measuredActiveMs)||0,after=Number(s.afterFeedbackActiveMs)||0;
    if(measured+after>0)return measured+after;
    const start=Date.parse(s.startedAt||0),end=Date.parse(s.endedAt||s.startedAt||0);
    return Number.isFinite(start)&&Number.isFinite(end)?Math.max(0,end-start):0;
  }
  function daypart(date){
    const h=new Date(date).getHours();
    if(h<6)return"ночью";if(h<12)return"утром";if(h<18)return"днём";return"вечером";
  }
  function usableSessions(){return C.getData().sessions.filter(s=>s.startedAt)}
  function current(){return C.getActiveSession()}

  function showToday(){
    C.setNav("today");
    const d=C.getData(),s=current();
    const b=C.screen("Сегодня","Что хочется изменить или исследовать сейчас?","SETKA",C.showPatterns);

    if(s){
      if(s.phase==="feedback"){
        action(b,"Продолжить оценку","Остался последний короткий шаг",()=>original.showToday());
      }else if(s.phase==="done_feedback"){
        action(b,"Посмотреть результат сессии","Состояние до и после уже сохранено",()=>C.showFeedbackResult());
      }else if(["measured","after_feedback"].includes(s.phase)){
        action(b,"Вернуться в текущую сессию",`${intentLabel(s.requestKey)} · ${fmt(sessionDuration(s))}`,()=>C.hideLayer());
      }
    }

    action(b,"Начать сессию","Выбрать запрос, состояние и время",()=>C.preSurvey());
    action(b,"Отметить состояние","Быстро записать, как ты себя чувствуешь сейчас",()=>C.showSymptoms());

    const sessions=usableSessions();
    if(sessions.length>=2)action(b,"Мои наблюдения","Что SETKA уже заметила в твоём использовании",showInsights);

    const recent=sessions.slice(-3).reverse();
    if(recent.length){
      const label=document.createElement("div");label.className="st-label";label.textContent="Недавние сессии";b.appendChild(label);
      for(const x of recent){
        const title=intentLabel(x.requestKey),mood=(x.preState||x.postState)?`${face(x.preState)} → ${face(x.postState)}`:"";
        action(b,title,[dt(x.startedAt),mood,fmt(sessionDuration(x))].filter(Boolean).join(" · "),()=>showSessionDetail(x.id));
      }
    }
  }

  function showNotes(){
    C.setNav("me");const d=C.getData();
    const b=C.screen("Заметки","То, что ты захотела сохранить во время исследования паттернов.","МОЯ ПАМЯТЬ",showMe);
    if(!d.notes.length){b.innerHTML='<div class="st-empty">Пока заметок нет.</div>';return}
    for(const n of d.notes.slice().reverse()){
      const row=document.createElement("div");row.className="st-note";
      const context=n.requestKey?` · ${intentLabel(n.requestKey)}`:"";
      row.innerHTML=`<div>${esc(n.text)}</div><div class="st-note-time">${dt(n.observedAt)}${esc(context)}</div>`;
      if(n.config){
        const open=document.createElement("button");open.className="st-secondary";open.style.height="38px";
        open.textContent="Открыть сохранённый момент ↗";
        open.onclick=()=>{C.hideLayer();Setka.openConfig?.(clone(n.config),{type:"memory",id:n.id,communityId:n.communityId||null})};
        row.appendChild(open);
      }
      b.appendChild(row);
    }
  }

  function showSessions(){
    C.setNav("me");const sessions=usableSessions().slice().reverse();
    const b=C.screen("История сессий","Твоя история использования SETKA — без технических данных.","МОЯ ИСТОРИЯ",showMe);
    if(!sessions.length){b.innerHTML='<div class="st-empty">Сессий пока нет.</div>';return}
    for(const s of sessions){
      const mood=(s.preState||s.postState)?`${face(s.preState)} → ${face(s.postState)}`:"без оценки";
      action(b,intentLabel(s.requestKey),`${dt(s.startedAt)} · ${mood} · ${fmt(sessionDuration(s))}`,()=>showSessionDetail(s.id));
    }
  }

  function sessionUsage(s){
    const map=new Map();
    for(const u of s.usage||[]){
      if(!u?.config)continue;
      const key=u.configKey||Setka.configKey?.(u.config)||JSON.stringify(u.config);
      let r=map.get(key);if(!r){r={key,config:clone(u.config),ms:0,saved:false};map.set(key,r)}
      r.ms+=Number(u.durationMs)||0;r.saved=r.saved||!!u.saved;
    }
    return [...map.values()].sort((a,b)=>b.ms-a.ms);
  }

  function pulseForSession(sid){
    const a=(C.getData().physio?.samples||[]).filter(x=>x.sessionId===sid&&x.metric==="heart_rate"&&Number.isFinite(Number(x.value)));
    if(!a.length)return null;const vals=a.map(x=>Number(x.value));
    return{avg:Math.round(vals.reduce((p,q)=>p+q,0)/vals.length),min:Math.min(...vals),max:Math.max(...vals)};
  }

  function showSessionDetail(sid){
    C.setNav("me");const d=C.getData(),s=d.sessions.find(x=>x.id===sid);if(!s)return showSessions();
    const b=C.screen(intentLabel(s.requestKey),dt(s.startedAt),"СЕССИЯ",showSessions);
    const mood=document.createElement("div");mood.className="st-card";
    mood.innerHTML=`<div class="st-row"><div class="st-grow"><b>Состояние</b><div class="st-muted">До → после</div></div><div class="st-stat">${face(s.preState)} → ${face(s.postState)}</div></div><div class="st-user-metric">Время в SETKA: ${fmt(sessionDuration(s))}</div>`;
    b.appendChild(mood);

    const usage=sessionUsage(s);
    if(usage.length){
      const l=document.createElement("div");l.className="st-label";l.textContent="Паттерны этой сессии";b.appendChild(l);
      usage.slice(0,5).forEach((u,i)=>action(b,i===0?"Самый используемый вариант":"Ещё один вариант",`${fmt(u.ms)}${u.saved?" · сохранён ♥":""}`,()=>{C.hideLayer();Setka.openConfig?.(clone(u.config),{type:"history",id:`${sid}-${i}`})}));
    }

    const notes=d.notes.filter(n=>n.sessionId===sid);
    if(notes.length){
      const l=document.createElement("div");l.className="st-label";l.textContent="Заметки";b.appendChild(l);
      for(const n of notes){const c=document.createElement("div");c.className="st-card";c.textContent=n.text;b.appendChild(c)}
    }

    const p=pulseForSession(sid);
    if(p)simpleCard(b,"Пульс во время сессии",`В среднем ${p.avg} уд/мин, диапазон ${p.min}–${p.max}. Это просто наблюдение за этой сессией, без вывода о причине изменений.`);
  }

  function observationData(){
    const sessions=usableSessions(),req=new Map(),pre=new Map(),parts=new Map(),usage=new Map();
    let improved=0,comparable=0;
    for(const s of sessions){
      if(s.requestKey)req.set(s.requestKey,(req.get(s.requestKey)||0)+1);
      if(s.preState)pre.set(Number(s.preState),(pre.get(Number(s.preState))||0)+1);
      parts.set(daypart(s.startedAt),(parts.get(daypart(s.startedAt))||0)+1);
      if(Number.isFinite(Number(s.preState))&&Number.isFinite(Number(s.postState))){comparable++;if(Number(s.postState)>Number(s.preState))improved++}
      for(const u of s.usage||[]){
        if(!u?.config)continue;const key=u.configKey||Setka.configKey?.(u.config)||JSON.stringify(u.config);
        let r=usage.get(key);if(!r){r={key,config:clone(u.config),ms:0,sessions:new Set(),requests:new Map(),saved:false};usage.set(key,r)}
        r.ms+=Number(u.durationMs)||0;r.sessions.add(s.id);r.saved=r.saved||!!u.saved;
        if(s.requestKey)r.requests.set(s.requestKey,(r.requests.get(s.requestKey)||0)+1);
      }
    }
    const top=m=>[...m.entries()].sort((a,b)=>b[1]-a[1])[0]||null;
    const patterns=[...usage.values()].sort((a,b)=>b.ms-a.ms);
    return{sessions,topReq:top(req),topPre:top(pre),topPart:top(parts),patterns,improved,comparable};
  }

  function showInsights(){
    C.setNav("me");const x=observationData();
    const b=C.screen("Мои наблюдения","SETKA собирает твою историю в понятные закономерности. Здесь нет скрытых технических показателей — только то, что может быть полезно тебе.","ДЛЯ МЕНЯ",showMe);
    if(x.sessions.length<2){simpleCard(b,"Пока рано делать выводы","После нескольких сессий здесь появятся твои повторяющиеся запросы, состояния и любимые варианты паттернов.");return}

    if(x.topReq)simpleCard(b,"Чаще всего ты приходишь с запросом",`${intentLabel(x.topReq[0])}. Это встречалось в ${x.topReq[1]} из ${x.sessions.length} сессий.`);
    if(x.topPre)simpleCard(b,"Чаще всего в начале",`Ты отмечала состояние ${face(x.topPre[0])}. Со временем можно будет сравнить, какие паттерны ты выбираешь именно в таком состоянии.`);
    if(x.topPart)simpleCard(b,"Твой привычный момент",`Чаще всего SETKA открывается ${x.topPart[0]}.`);
    if(x.comparable>=2)simpleCard(b,"Что происходило после сессий",`В ${x.improved} из ${x.comparable} сессий итоговая самооценка была выше начальной. Это наблюдение по твоим отметкам, а не доказательство причины.`);

    if(x.patterns.length){
      const l=document.createElement("div");l.className="st-label";l.textContent="Твои наиболее используемые варианты";b.appendChild(l);
      x.patterns.slice(0,3).forEach((p,i)=>{
        const req=[...p.requests.entries()].sort((a,b)=>b[1]-a[1])[0];
        const sub=[fmt(p.ms),`${p.sessions.size} сесс.`,req?`чаще при «${intentLabel(req[0])}»`:"",p.saved?"сохранён ♥":""].filter(Boolean).join(" · ");
        action(b,i===0?"Чаще всего":"Следующий по времени",sub,()=>{C.hideLayer();Setka.openConfig?.(clone(p.config),{type:"personal",id:p.key})});
      });
    }
  }

  function showPulse(){
    C.setNav("me");
    // Capture the original sensor action callbacks, then immediately replace its
    // developer-oriented screen with a participant-friendly one.
    let connect=null,stop=null;
    if(typeof original.showPhysio==="function"){
      original.showPhysio();
      for(const btn of document.querySelectorAll("#stBody .st-action")){
        const t=btn.textContent||"";
        if(t.includes("Bluetooth-пульсометр"))connect=btn.onclick;
        if(t.includes("Остановить датчик"))stop=btn.onclick;
      }
    }
    const d=C.getData(),samples=(d.physio?.samples||[]).filter(x=>x.metric==="heart_rate"&&Number.isFinite(Number(x.value))),vals=samples.map(x=>Number(x.value));
    const b=C.screen("Пульс","Если подключить совместимый пульсометр, SETKA сможет сопоставлять изменения пульса с твоими сессиями.","МОИ ДАННЫЕ",showMe);
    if(vals.length){
      const latest=vals.at(-1),avg=Math.round(vals.reduce((p,q)=>p+q,0)/vals.length);
      simpleCard(b,"Последние наблюдения",`Сейчас в истории последнее значение — ${latest} уд/мин. Среднее по сохранённым измерениям — ${avg} уд/мин.`);
    }else simpleCard(b,"Пока нет показаний","Можно пользоваться SETKA и без датчика. Пульс — дополнительный слой наблюдений.");
    if(connect)action(b,"Подключить пульсометр","Найти совместимый Bluetooth-датчик",connect);
    if(stop)action(b,"Отключить пульсометр","Остановить получение показаний",stop);
  }

  function resetLocal(){
    if(!confirm("Удалить твою локальную историю SETKA на этом устройстве?"))return;
    // Reuse the original reset through the existing storage contract rather than
    // exposing storage keys or research internals to the participant.
    try{localStorage.removeItem("setka-standalone:v34");localStorage.removeItem("setka-standalone:active:v34")}catch(_){}
    location.reload();
  }

  function showMe(){
    C.setNav("me");const d=C.getData(),sessions=usableSessions();
    const b=C.screen("Я","Твоя история, сохранённые мысли и персональные наблюдения SETKA.","МОЯ SETKA",C.showPatterns);
    if(sessions.length>=2)action(b,"Мои наблюдения","Какие запросы, состояния и паттерны повторяются",showInsights);
    else action(b,"Мои наблюдения","Появятся после нескольких сессий",showInsights);
    action(b,"История сессий",`${sessions.length} ${sessions.length===1?"сессия":"сессий"}`,showSessions);
    action(b,"Заметки",`${d.notes.length} сохранено`,showNotes);
    action(b,"Пульс","Дополнительные наблюдения с совместимого датчика",showPulse);
    action(b,"Очистить мою историю","Удалить данные этой копии с устройства",resetLocal);
  }

  C.showToday=showToday;
  C.showMe=showMe;
  C.showNotes=showNotes;
  C.showSessions=showSessions;
  C.showSessionDetail=showSessionDetail;
  C.showPhysio=showPulse;
  C.showUserInsights=showInsights;

  // Core v34 registered its bottom-nav listener before this module. Intercept only
  // Today / Me in capture phase so those tabs always use the participant-facing views.
  document.addEventListener("click",e=>{
    const btn=e.target?.closest?.("#st34Nav button[data-p]");if(!btn)return;
    if(btn.dataset.p!=="today"&&btn.dataset.p!=="me")return;
    e.preventDefault();e.stopImmediatePropagation();
    if(btn.dataset.p==="today")showToday();else showMe();
  },true);

  window.__SETKA_PARTICIPANT_UI_V34__=true;
})();