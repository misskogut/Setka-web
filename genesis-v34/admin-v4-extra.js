(() => {
  "use strict";
  const API="https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-v5";
  const API_KEY="sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const KEY="setka-research:admin-key:v1";
  const INTENT={sleep:"Уснуть",relax:"Расслабиться",tension:"Снизить напряжение",focus:"Сконцентрироваться",energy:"Взбодриться",switch:"Переключиться",explore:"Просто исследую"};
  const style=document.createElement("style");style.textContent=`
  .v4-note-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.v4-note{background:#0d0d0d;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:14px;min-width:0}.v4-note-text{font-size:14px;line-height:1.45;margin:9px 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}.v4-note-meta{font-size:10px;color:rgba(255,255,255,.45);line-height:1.5}.v4-preview{width:100%;height:190px;display:block;margin-top:12px;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:#000;overflow:hidden}.v4-preview-empty{margin-top:12px;border:1px solid rgba(255,255,255,.08);border-radius:15px;min-height:96px;display:grid;place-items:center;font-size:10px;color:rgba(255,255,255,.34);background:#050505}.v4-preview-caption{font-size:9px;color:rgba(255,255,255,.28);margin-top:7px;text-align:center;letter-spacing:.04em}.v4-timing-kpis{grid-template-columns:repeat(6,minmax(0,1fr));margin-bottom:14px}.v4-good{color:#fff}.v4-timing-row{cursor:pointer}.v4-timing-row:hover{background:rgba(255,255,255,.025)}@media(max-width:950px){.v4-note-grid{grid-template-columns:repeat(2,1fr)}.v4-timing-kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:620px){.v4-note-grid{grid-template-columns:1fr}.v4-timing-kpis{grid-template-columns:repeat(2,1fr)}.v4-preview{height:220px}}`;
  document.head.appendChild(style);
  const $=id=>document.getElementById(id);
  let notes=[],timings=[];
  function esc(v){return String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
  function fmtMs(ms){ms=Math.max(0,Number(ms)||0);const s=Math.round(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);if(h)return `${h}ч ${m%60}м`;if(m)return `${m}м ${s%60}с`;return `${s}с`}
  function fmtDate(v){if(!v)return"—";try{return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}catch(_){return"—"}}
  function kpi(v,l){return `<div class="card kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`}
  async function api(action,p={}){const adminKey=localStorage.getItem(KEY)||"";const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,adminKey,...p})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"request_failed");return d}

  function rad(d){return d*Math.PI/180}
  function mod(n,m){return((n%m)+m)%m}
  function patternColor(mode,i,q,x,y,shift,frame){
    switch(Number(mode)||0){
      case 0:return"#fff";
      case 1:return`hsl(${mod(i+q*2+shift,360)} 100% 50%)`;
      case 2:return`hsl(${mod(frame+q*2,360)} 100% 50%)`;
      case 3:return"hsl(200 100% 50%)";
      case 4:return"hsl(330 100% 50%)";
      case 5:return`hsl(${mod(Math.atan2(y,x)*180/Math.PI+180+shift,360)} 100% 50%)`;
      case 6:return`hsl(${mod(i+shift,360)} 100% 50%)`;
      case 7:return`hsl(${mod(q*5+shift,360)} 100% 50%)`;
      case 8:return`hsl(${mod(x+y+shift,360)} 100% 50%)`;
      default:return"#fff";
    }
  }
  function drawNotePreview(canvas,rawConfig,rawFrame){
    const c=canvas.getContext("2d");if(!c)return;
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
    c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle="#000";c.fillRect(0,0,w,h);
    const cfg={
      numTentacles:Math.max(3,Math.min(72,Math.round(Number(rawConfig?.numTentacles)||24))),
      tentacleLength:Math.max(10,Math.min(800,Number(rawConfig?.tentacleLength)||100)),
      baseRadius:Math.max(0,Math.min(100,Number(rawConfig?.baseRadius)||10)),
      movementSpeed:Math.max(.05,Math.min(10,Number(rawConfig?.movementSpeed)||1)),
      colorSpeed:Math.max(.05,Math.min(10,Number(rawConfig?.colorSpeed)||1)),
      circleSize:Math.max(.2,Math.min(20,Number(rawConfig?.circleSize)||1)),
      lineWeight:Math.max(.1,Math.min(10,Number(rawConfig?.lineWeight)||1)),
      segmentStep:Math.max(1,Math.min(20,Math.round(Number(rawConfig?.segmentStep)||2))),
      colorModeIndex:Math.max(0,Math.min(8,Math.round(Number(rawConfig?.colorModeIndex)||0)))
    };
    const frame=Number.isFinite(Number(rawFrame))?Number(rawFrame):44;
    const naturalExtent=Math.max(70,cfg.tentacleLength*3.05+cfg.baseRadius+18);
    const fit=Math.min(w,h)/(naturalExtent*2);
    c.save();c.translate(w/2,h/2);c.scale(fit,fit);
    const shift=frame*cfg.colorSpeed*.5;
    for(let i=0;i<360;i+=360/cfg.numTentacles){
      const x0=Math.sin(rad(i))*cfg.baseRadius,y0=Math.cos(rad(i))*cfg.baseRadius;
      for(let q=0;q<cfg.tentacleLength;q+=cfg.segmentStep){
        const a=Math.cos(rad(cfg.tentacleLength-q+frame*cfg.movementSpeed))*q;
        const x=Math.sin(rad(i-a))*q*3,y=Math.cos(rad(i-a))*q*3,d=(cfg.tentacleLength-q)*cfg.circleSize/10;
        c.strokeStyle=patternColor(cfg.colorModeIndex,i,q,x,y,shift,frame);
        c.lineWidth=Math.max(.18,cfg.lineWeight/fit);
        c.beginPath();c.arc(x0+x,y0+y,Math.max(.075,d/2),0,Math.PI*2);c.stroke();
      }
    }
    c.restore();
  }

  async function loadNotes(){const el=$("tab-notes");if(!el)return;el.innerHTML='<div class="card empty">Загружаем заметки…</div>';try{notes=(await api("admin-notes")).items||[];renderNotes()}catch(_){el.innerHTML='<div class="card empty">Не удалось загрузить заметки.</div>'}}
  function renderNotes(){
    const el=$("tab-notes"),measured=notes.filter(n=>n.phase==="measured").length,after=notes.filter(n=>n.phase==="after_feedback").length,people=new Set(notes.map(n=>n.participant_id)).size;
    el.innerHTML=`<div class="grid kpis">${kpi(notes.length,"заметок")}${kpi(people,"участников")}${kpi(measured,"до оценки")}${kpi(after,"после оценки")}</div><div class="card"><div class="section-title">Заметки как слой памяти</div><div class="small muted">Текст, точное время, запрос, фаза сессии и визуальный snapshot паттерна в момент нажатия +. Заметка не считается ♥ и не публикуется в сообщество автоматически.</div></div><div id="v4NoteGrid" class="v4-note-grid" style="margin-top:12px"></div>`;
    const g=$("v4NoteGrid");if(!notes.length){g.innerHTML='<div class="card empty" style="grid-column:1/-1">Пока нет заметок.</div>';return}
    notes.forEach((n,index)=>{
      const p=n.participants||{},cfg=n.config||{},hasPreview=Object.keys(cfg).length>0;
      const c=document.createElement("div");c.className="v4-note";
      c.innerHTML=`<div class="rowtop"><b>${esc(p.access_code||String(n.participant_id).slice(0,8))}</b><span class="small muted">${fmtDate(n.observed_at)}</span></div><div class="v4-note-text">${esc(n.note_text)}</div><div class="v4-note-meta">${esc(INTENT[n.request_key]||n.request_key||"без запроса")} · ${fmtMs(n.session_elapsed_ms||0)} от старта · ${n.phase==="after_feedback"?"после оценки":n.phase==="standalone"?"свободный просмотр":"измеряемая часть"}<br>${esc(n.pattern_id||"без паттерна")} · ${esc(n.source_type||"")}${n.community_config_id?` · community ${esc(String(n.community_config_id).slice(0,8))}`:""}</div>${hasPreview?`<canvas class="v4-preview" data-note-preview="${index}" aria-label="Статичное превью паттерна в момент заметки"></canvas><div class="v4-preview-caption">ПАТТЕРН В МОМЕНТ ЗАМЕТКИ</div>`:'<div class="v4-preview-empty">Нет сохранённого визуального snapshot</div>'}`;
      g.appendChild(c);
      if(hasPreview){requestAnimationFrame(()=>{const canvas=c.querySelector("canvas[data-note-preview]");if(canvas)drawNotePreview(canvas,cfg,n.preview_frame)})}
    })
  }
  async function loadTiming(){const el=$("tab-timing");if(!el)return;el.innerHTML='<div class="card empty">Загружаем таймеры…</div>';try{timings=(await api("admin-session-timing")).items||[];renderTiming()}catch(_){el.innerHTML='<div class="card empty">Не удалось загрузить таймеры.</div>'}}
  function avg(list,fn){return list.length?list.reduce((a,x)=>a+(Number(fn(x))||0),0)/list.length:0}
  function renderTiming(){const el=$("tab-timing");const planned=timings.filter(x=>x.planned_duration_seconds),feedback=timings.filter(x=>x.feedback_submitted_at),continued=timings.filter(x=>x.continued_after_feedback),timerEnded=timings.filter(x=>x.completion_reason==="timer");const rate=feedback.length?Math.round(continued.length/feedback.length*100):0,avgPlanned=avg(planned,x=>x.planned_duration_seconds*1000),avgActive=avg(feedback,x=>x.measured_active_ms),avgDelay=avg(feedback,x=>x.feedback_delay_ms),avgAfter=avg(continued,x=>x.after_feedback_active_ms);el.innerHTML=`<div class="grid v4-timing-kpis">${kpi(timings.length,"сессий")}${kpi(fmtMs(avgPlanned),"средний план")}${kpi(fmtMs(avgActive),"активно до оценки")}${kpi(fmtMs(avgDelay),"задержка ответа")}${kpi(`${rate}%`,"продолжили")}${kpi(fmtMs(avgAfter),"среднее +время")}</div><div class="card"><div class="section-title">План vs реальное использование</div><div class="small muted">Основной эффект считается только до первой оценки. Всё после неё хранится отдельно как добровольное продолжение, поэтому оно не загрязняет причинную часть аналитики.</div></div><div class="card" style="margin-top:12px"><div class="table-wrap"><table class="table"><thead><tr><th>Участник</th><th>Старт</th><th>Запрос</th><th>План</th><th>Активно до</th><th>Финиш</th><th>Delay</th><th>Продолжил</th><th>+ активно</th><th>Всего активно</th></tr></thead><tbody>${timings.map(s=>{const p=s.participants||{},total=(Number(s.measured_active_ms)||0)+(Number(s.after_feedback_active_ms)||0);return `<tr class="v4-timing-row"><td>${esc(p.access_code||String(s.participant_id).slice(0,8))}</td><td>${fmtDate(s.timer_started_at||s.started_at)}</td><td>${esc(INTENT[s.request_key]||s.request_key||"—")}</td><td>${s.planned_duration_seconds?Math.round(s.planned_duration_seconds/60)+"м":"—"}</td><td>${fmtMs(s.measured_active_ms)}</td><td>${s.completion_reason==="timer"?"таймер":s.completion_reason==="early"?"раньше":"—"}</td><td>${s.feedback_delay_ms!=null?fmtMs(s.feedback_delay_ms):"—"}</td><td>${s.continued_after_feedback?"да":"—"}</td><td>${s.continued_after_feedback?fmtMs(s.after_feedback_active_ms):"—"}</td><td>${fmtMs(total)}</td></tr>`}).join("")}</tbody></table></div></div>`}
  document.querySelectorAll('.tab[data-tab="notes"]').forEach(b=>b.addEventListener("click",loadNotes));
  document.querySelectorAll('.tab[data-tab="timing"]').forEach(b=>b.addEventListener("click",loadTiming));
  const dash=$("dashboard");if(dash){new MutationObserver(()=>{if(!dash.classList.contains("hidden")){loadNotes();loadTiming()}}).observe(dash,{attributes:true,attributeFilter:["class"]});if(!dash.classList.contains("hidden")){loadNotes();loadTiming()}}
})();