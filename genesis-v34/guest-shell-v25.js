(() => {
  "use strict";

  const ACCESS_KEY = "setka-research:access-code:v1";
  const app = document.getElementById("app");
  const library = document.getElementById("libraryScreen");
  const game = document.getElementById("gameScreen");
  const clock = window.SetkaTrialClockV24;
  if (!app || !library || !game || !clock) return;

  const style = document.createElement("style");
  style.id = "guestShellV25Style";
  style.textContent = `
    #guestPortalNav{position:fixed;z-index:100115;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);transform:translateX(-50%);width:min(calc(100% - 22px),430px);height:58px;border:1px solid rgba(255,255,255,.17);border-radius:29px;background:rgba(5,5,5,.94);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:grid;grid-template-columns:repeat(4,1fr);padding:4px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif}
    #guestPortalNav.hidden{display:none!important}
    #guestPortalNav button{border:0;background:transparent;color:rgba(255,255,255,.38);border-radius:24px;font-size:9px;letter-spacing:.03em;cursor:pointer}
    #guestPortalNav button span{display:block;font-size:17px;line-height:20px}
    #guestPortalNav button.active{background:#fff;color:#000}
    #guestLayer{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 88px)!important}
    #libraryScreen{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 88px)!important}
    #guestMenuButton{display:none!important}
  `;
  document.head.appendChild(style);

  const nav = document.createElement("div");
  nav.id = "guestPortalNav";
  nav.innerHTML = `
    <button type="button" data-page="today"><span>◉</span>Сегодня</button>
    <button type="button" data-page="patterns" class="active"><span>⌁</span>Паттерны</button>
    <button type="button" data-page="symptoms"><span>◇</span>Симптомы</button>
    <button type="button" data-page="me"><span>○</span>Я</button>`;
  document.body.appendChild(nav);

  function guestAvailable() {
    const s = clock.getState();
    return !localStorage.getItem(ACCESS_KEY) && !s.expired;
  }

  function setActive(page) {
    nav.querySelectorAll("button[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  }

  function showLibrary() {
    document.getElementById("guestLayer")?.classList.add("hidden");
    app.style.visibility = "visible";
    if (game.classList.contains("active")) document.getElementById("libraryButton")?.click();
    try { window.SetkaApp?.setLibraryPage?.("all"); } catch (_) {}
    setActive("patterns");
  }

  function openGuestHome() {
    if (!guestAvailable()) return;
    document.getElementById("guestMenuButton")?.click();
  }

  function clickGuestAction(title) {
    if (!guestAvailable()) return;
    openGuestHome();
    let tries = 0;
    const find = () => {
      tries += 1;
      const buttons = [...document.querySelectorAll("#guestLayer .g-action")];
      const target = buttons.find(b => b.querySelector("b")?.textContent?.trim() === title);
      if (target) target.click();
      else if (tries < 8) requestAnimationFrame(find);
    };
    requestAnimationFrame(find);
  }

  nav.addEventListener("click", e => {
    const b = e.target.closest("button[data-page]");
    if (!b || !guestAvailable()) return;
    const page = b.dataset.page;
    if (page === "patterns") showLibrary();
    if (page === "today") { setActive("today"); openGuestHome(); }
    if (page === "symptoms") { setActive("symptoms"); clickGuestAction("Симптомы"); }
    if (page === "me") { setActive("me"); openGuestHome(); }
    try { window.SetkaJourney?.track?.("guest_nav", { page }); } catch (_) {}
  });

  function sync() {
    const available = guestAvailable();
    const inGame = game.classList.contains("active");
    nav.classList.toggle("hidden", !available || inGame);
    if (!available) return;

    const guestLayer = document.getElementById("guestLayer");
    const title = guestLayer && !guestLayer.classList.contains("hidden") ? guestLayer.querySelector(".g-title")?.textContent?.trim() || "" : "";
    if (!title && library.classList.contains("active")) setActive("patterns");
    else if (title === "Симптомы") setActive("symptoms");
    else if (["Заметки","Моя проба","Инвайты","Твой пробный час"].includes(title)) setActive("me");
    else if (["Начать сессию","Время сессии прошло","Сессия остановлена","Измерение сохранено"].includes(title)) setActive("today");
  }

  new MutationObserver(sync).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("setka:view", sync);
  window.addEventListener("setka:trial-clock", sync);
  setInterval(sync, 1200);
  sync();

  window.SetkaGuestShellV25 = { showLibrary, openGuestHome, sync };
})();