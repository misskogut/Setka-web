(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp;
  if(!C||!Setka)return;
  const esc=C.esc,fmt=C.fmt;
  const style=document.createElement("style");style.textContent=`.st34-analysis{border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:17px;margin:10px 0;background:#090909}.st34-analysis h3{font-size:14px;margin:0 0 10px}.st34-analysis-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.st34-analysis-box{border:1px solid rgba(255,255,255,.1);border-radius:15px;padding:10px}.st34-analysis-box b{font-size:16px}.st34-analysis-box span{display:block;font-size:8px;color:rgba(255,255,255,.4);margin-top:4px}.st34-analysis-note{font-size:9px;line-height:1.45;color:rgba(255,255,255,.34);margin-top:11px}`;document.head.appendChild(style);

  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  function sessionPhysio(sid){const d=C.getData(),hr=(d.physio?.samples||[]).filter(x=>x.sessionId===sid&&x.metric==="heart_rate"&&Number.isFinite(Number(x.value))).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)),rr=(d.physio?.samples||[]).filter(x=>x.sessionId===sid&&x.metric==="rr_interval"&&Number.isFinite(Number(x.value))).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));return{hr,rr}}
  function rmssd(rr){if(rr.length<3)return null;const ds=[];for(let i=1;i<rr.length;i++){const d=Number(rr[i].value)-Number(rr[i-1].value);ds.push(d*d)}return Math.sqrt(ds.reduce((a,b)=>a+b,0)/ds.length)}
  function injectSessionAnalysis(sid){const body=document.getElementById("stBody");if(!body||body.querySelector(`[data-st34-analysis="${CSS.escape(String(sid))}"]`))return;const s=C.getData().sessions.find(x=>x.id===sid);if(!s)return;const {hr,rr}=sessionPhysio(sid);const card=document.createElement("div");card.className="st34-analysis";card.dataset.st34Analysis=String(sid);card.innerHTML='<h3>Физиология в сессии</h3>';if(!hr.length){card.innerHTML+='<div class="st-muted">В этой сессии нет live-данных пульса.</div>';body.appendChild(card);return}const start=Date.parse(s.startedAt),end=Date.parse(s.endedAt||hr.at(-1).observedAt),first=hr.filter(x=>Date.parse(x.observedAt)-start<=60000).map(x=>Number(x.value)),last=hr.filter(x=>end-Date.parse(x.observedAt)<=60000).map(x=>Number(x.value)),vals=hr.map(x=>Number(x.value)),firstAvg=avg(first),lastAvg=avg(last),delta=firstAvg!=null&&lastAvg!=null?lastAvg-firstAvg:null;let maxGap=0;for(let i=1;i<hr.length;i++)maxGap=Math.max(maxGap,Date.parse(hr[i].observedAt)-Date.parse(hr[i-1].observedAt));const r=rmssd(rr);const grid=document.createElement("div");grid.className="st34-analysis-grid";const box=(v,l)=>`<div class="st34-analysis-box"><b>${esc(v)}</b><span>${esc(l)}</span></div>`;grid.innerHTML=box(firstAvg==null?"—":firstAvg.toFixed(0),"HR ПЕРВАЯ МИН")+box(lastAvg==null?"—":lastAvg.toFixed(0),"HR ПОСЛЕДНЯЯ МИН")+box(delta==null?"—":`${delta>0?"+":""}${delta.toFixed(0)}`,"Δ BPM")+box(`${Math.min(...vals)}–${Math.max(...vals)}`,"MIN–MAX")+box(hr.length,"HR ТОЧЕК")+box(r==null?"—":r.toFixed(0),"RMSSD, MS");card.appendChild(grid);const note=document.createElement("div");note.className="st34-analysis-note";note.textContent=`Максимальный промежуток между HR-точками: ${fmt(maxGap)}. RMSSD считается только по реально доступным RR-интервалам. Эти показатели описывают динамику во время сессии и сами по себе не доказывают эффект паттерна.`;card.appendChild(note);body.appendChild(card)}

  const baseDetail=C.showSessionDetail;
  if(typeof baseDetail==="function")C.showSessionDetail=function(sid){baseDetail(sid);requestAnimationFrame(()=>injectSessionAnalysis(sid))};

  // The glow has one clear meaning for the participant: "worth trying now for the
  // goal of the active session". No active goal (or "Просто исследую") = no glow.
  // Main outcome evidence comes only from measured usage before feedback.
  function scoreConfigForGoal(configKey,goal){
    const d=C.getData();let score=0,evidence=0;
    for(const s of d.sessions){
      if(!s?.completed||s.requestKey!==goal)continue;
      const uses=(s.usage||[]).filter(u=>u.phase==="measured"&&u.configKey===configKey);
      if(!uses.length)continue;
      evidence++;
      const usedMs=uses.reduce((a,u)=>a+Number(u.durationMs||0),0);
      const durationWeight=Math.min(1,usedMs/180000);
      const delta=Number(s.postState)-Number(s.preState);
      score+=durationWeight*.45;
      if(Number.isFinite(delta))score+=Math.max(-2,Math.min(2,delta))*1.5;
      if(s.helped===2)score+=1.7;else if(s.helped===1)score+=.7;else if(s.helped===0)score-=.6;
      if(uses.some(u=>u.saved))score+=1.0;
    }
    return{score,evidence};
  }

  function recalcRecommendations(){
    const active=C.getActiveSession();
    const goal=active?.requestKey||null;
    if(!goal||goal==="explore"||!["measured","after_feedback","feedback","done_feedback"].includes(active?.phase||"")){
      Setka.setRecommendations?.({community:[],patterns:[]});
      return;
    }

    const candidates=[];
    const baseKey=Setka.configKey?.(Setka.DEFAULT_CONFIG);
    if(baseKey){const r=scoreConfigForGoal(baseKey,goal);if(r.evidence>0)candidates.push({kind:"base",id:"tentacle-orbit",...r})}
    for(const item of C.publicCommunity||[]){
      const key=Setka.configKey?.(item.config||Setka.DEFAULT_CONFIG);if(!key)continue;
      const r=scoreConfigForGoal(key,goal);if(r.evidence>0)candidates.push({kind:"community",id:String(item.id),...r});
    }

    if(!candidates.length){
      Setka.setRecommendations?.({community:[],patterns:[]});
      return;
    }

    candidates.sort((a,b)=>(b.score/Math.max(1,b.evidence))-(a.score/Math.max(1,a.evidence))||b.evidence-a.evidence);
    const relevantSessionCount=C.getData().sessions.filter(s=>s?.completed&&s.requestKey===goal).length;
    const limit=relevantSessionCount>=4?3:relevantSessionCount>=2?2:1;
    const chosen=candidates.filter(x=>x.score>0).slice(0,limit);
    Setka.setRecommendations?.({
      community:chosen.filter(x=>x.kind==="community").map(x=>x.id),
      patterns:chosen.some(x=>x.kind==="base")?["tentacle-orbit"]:[]
    });
  }

  window.addEventListener("setka:standalone-event",e=>{
    if(["session_start","feedback_submit","continuation_start","session_end"].includes(e.detail?.type))setTimeout(recalcRecommendations,0);
  });
  window.addEventListener("setka:favorite-saved",recalcRecommendations);
  window.addEventListener("setka:favorite-removed",recalcRecommendations);
  setTimeout(recalcRecommendations,900);
  setInterval(recalcRecommendations,5000);
})();