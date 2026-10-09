(() => {
  "use strict";
  const C=window.SetkaStandaloneV34,Setka=window.SetkaApp,library=document.getElementById("libraryScreen");
  if(!C||!Setka||!library)return;

  const DANDELION="dandelion";
  const style=document.createElement("style");
  style.textContent=`#st34MpChoice{position:fixed;inset:0;z-index:215000;background:rgba(0,0,0,.84);display:grid;place-items:center;padding:24px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#fff}.st34mp-choice{width:min(100%,390px);border:1px solid rgba(255,255,255,.25);border-radius:26px;background:#050505;padding:24px 20px 18px;text-align:center}.st34mp-choice h2{font-size:20px;margin:0 0 8px}.st34mp-choice p{font-size:12px;line-height:1.5;color:rgba(255,255,255,.46);margin:0 0 17px}#st34MpInfo{position:fixed;inset:0;z-index:240000;background:rgba(0,0,0,.8);display:grid;align-items:end;padding:18px 14px calc(env(safe-area-inset-bottom,0px) + 14px);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#fff}.st34mp-sheet{width:min(100%,460px);margin:0 auto;border:1px solid rgba(255,255,255,.24);border-radius:26px;background:#050505;padding:18px}.st34mp-head{display:flex;align-items:center;gap:13px}.st34mp-preview{width:90px;height:90px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:#000}.st34mp-close{margin-left:auto;width:34px;height:34px;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:transparent;color:#fff;font-size:20px}.st34mp-copy{font-size:12px;line-height:1.5;color:rgba(255,255,255,.5);margin-top:16px}`;
  document.head.appendChild(style);

  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  let starts=new Map();

  function resolve(tile){
    const kind=tile?.dataset?.kind||"base",itemId=tile?.dataset?.itemId||"",pid=tile?.dataset?.patternId||null;
    if(kind==="base"){
      const patternId=pid||itemId;
      return{kind,itemId:patternId,patternId,config:Setka.getPatternDefaults?.(patternId),communityId:null};
    }
    if(kind==="favorite"){
      const f=Setka.getFavorites?.().find(x=>String(x.id)===String(itemId));
      if(!f)return null;
      return{kind,itemId:f.id,patternId:f.baseId||f.config?.patternId||pid,config:clone(f.config),communityId:f.communityId||null};
    }
    if(kind==="community"){
      const it=(C.publicCommunity||[]).find(x=>String(x.id)===String(itemId));
      if(!it)return null;
      const patternId=it.patternId||it.pattern_id||it.baseId||it.config?.patternId||pid||"tentacle-orbit";
      return{kind,itemId:String(itemId),patternId,config:clone(it.config),communityId:String(itemId)};
    }
    return null;
  }
  function isDandelion(tile){const t=resolve(tile);return t?.patternId===DANDELION}
  function directOpen(t){if(!t?.config)return;Setka.openConfig?.(clone(t.config),{type:t.kind,id:t.itemId,patternId:t.patternId,communityId:t.communityId||null})}

  function showChoice(t){
    document.getElementById("st34MpChoice")?.remove();
    const o=document.createElement("div");o.id="st34MpChoice";
    o.innerHTML='<div class="st34mp-choice"><h2>Запустить новую сессию?</h2><p>Для измеряемой сессии сначала зафиксируем запрос, состояние и время. Или можно просто открыть «Одуванчик» без опроса.</p><button class="st-primary">Запустить сессию</button><button class="st-secondary">Просто посмотреть</button><button class="st-secondary st34mp-cancel" style="border:0;color:rgba(255,255,255,.4)">Отмена</button></div>';
    document.body.appendChild(o);
    o.querySelector(".st-primary").onclick=()=>{o.remove();C.preSurvey({config:clone(t.config),source:{type:t.kind,id:t.itemId,patternId:t.patternId,communityId:t.communityId||null}})};
    o.querySelectorAll(".st-secondary")[0].onclick=()=>{o.remove();C.recordEvent?.("session_choice",{choice:"browse",patternId:t.patternId},false);directOpen(t)};
    o.querySelector(".st34mp-cancel").onclick=()=>o.remove();
  }

  library.addEventListener("pointerdown",e=>{const tile=e.target.closest?.(".pattern-tile");if(tile&&isDandelion(tile)&&!e.target.closest?.(".st34-info"))starts.set(e.pointerId,{x:e.clientX,y:e.clientY,at:Date.now()})},true);
  library.addEventListener("pointerup",e=>{
    const tile=e.target.closest?.(".pattern-tile");if(!tile||!isDandelion(tile)||e.target.closest?.(".st34-info"))return;
    const p=starts.get(e.pointerId);starts.delete(e.pointerId);if(p&&(Date.now()-p.at>560||Math.hypot(e.clientX-p.x,e.clientY-p.y)>20))return;
    const t=resolve(tile);if(!t)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const s=C.getActiveSession?.();if(s&&["measured","after_feedback"].includes(s.phase))directOpen(t);else showChoice(t);
  },true);

  // Legacy Dandelion-only statistics sheet was a placeholder. The shared
  // standalone-advanced-v34 handler now owns information for ALL patterns.
  function showInfo(tile){ return null; }

  // Do not intercept the information button: one statistics owner for every pattern.

  // Note previews are rendered by the exact-ID snapshot module; matching by text
  // and repainting every 1.2 seconds caused cross-note visual corruption.

  window.__SETKA_MULTIPATTERN_BRIDGE_V34__=true;
})();