(() => {
  "use strict";
  const style=document.createElement("style");
  style.textContent=`.st40-privacy-banner{border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:12px 14px;background:#0a0a0a;margin:0 0 12px}.st40-privacy-banner b{font-size:12px}.st40-privacy-banner p{font-size:10px;line-height:1.5;color:rgba(255,255,255,.48);margin:5px 0 0}`;
  document.head.appendChild(style);

  const privateViews=new Set(["participants","symptoms","notes"]);
  const legacyViews=new Set(["journey","timing","insights"]);

  function install(){
    for(const page of document.querySelectorAll(".tab-page")){
      const key=page.id.replace("tab-","");
      if(page.dataset.privacyV40==="2")continue;
      let html="";
      if(key==="overview"){
        html='<b>V40 · PRIVATE PERSONAL CORPUS</b><p>Персональная история тестировщика хранится в закрытом контуре SETKA и доступна только авторизованному кабинету и исследовательской админке. Публичное Сообщество — отдельная проекция: прямые идентификаторы и приватная история туда не передаются.</p>';
      }else if(privateViews.has(key)){
        html='<b>ПРИВАТНЫЙ ИССЛЕДОВАТЕЛЬСКИЙ КОНТУР</b><p>Эти данные используются SETKA для персональной динамики и исследования конкретного тестировщика. Они не являются публичными и не входят в карточки Сообщества как персональная история.</p>';
      }else if(legacyViews.has(key)){
        html='<b>LEGACY / REPLAY VIEW</b><p>Эта вкладка пока использует исторический replay-контур. Актуальный приватный корпус хранится отдельно и уже используется карточкой участника, заметками и состояниями.</p>';
      }else continue;
      const box=document.createElement("div");box.className="st40-privacy-banner";box.innerHTML=html;page.prepend(box);page.dataset.privacyV40="2";
    }
  }
  const root=document.getElementById("dashboard")||document.body;
  new MutationObserver(()=>install()).observe(root,{childList:true,subtree:true});
  install();
})();