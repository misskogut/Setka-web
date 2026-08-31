(() => {
  "use strict";

  const ACCESS_KEY = "setka-research:access-code:v1";
  const app = document.getElementById("app");
  const gameScreen = document.getElementById("gameScreen");
  const libraryScreen = document.getElementById("libraryScreen");
  const gameUI = gameScreen?.querySelector(".game-ui");
  const bottomControls = gameScreen?.querySelector(".bottom-controls");
  const libraryButton = document.getElementById("libraryButton");
  const instructionsButton = document.getElementById("instructionsButton");
  if (!app || !gameScreen || !libraryScreen || !gameUI || !bottomControls || !libraryButton) return;

  const style = document.createElement("style");
  style.textContent = `
    #gameScreen .game-ui > *,
    #gameScreen .bottom-controls > *,
    #gameScreen .session-top-pill,
    #gameScreen #sessionNoteButton{transition:opacity .2s ease,transform .2s ease}

    #visibilityButton{width:46px;height:46px;border-color:rgba(255,255,255,.46);opacity:.78;flex:0 0 auto}
    #visibilityButton svg{width:24px;height:24px;display:block}
    #visibilityButton:active{transform:scale(.92)}
    #gameScreen.controls-hidden #favoriteButton,
    #gameScreen.controls-hidden #libraryButton,
    #gameScreen.controls-hidden #prevButton,
    #gameScreen.controls-hidden #nextButton,
    #gameScreen.controls-hidden #colorButton,
    #gameScreen.controls-hidden #instructionsButton,
    #gameScreen.controls-hidden #sessionNoteButton,
    #gameScreen.controls-hidden .session-top-pill,
    #gameScreen.controls-hidden #modeLabel,
    #gameScreen.controls-hidden #toast{opacity:0!important;pointer-events:none!important}
    #gameScreen.controls-hidden #visibilityButton{opacity:.12!important;pointer-events:auto!important}
    #gameScreen.controls-hidden .bottom-controls{pointer-events:none}
    #gameScreen.controls-hidden .bottom-controls #visibilityButton{pointer-events:auto}

    #sessionNoteButton{position:absolute!important;z-index:125!important;left:25px!important;right:auto!important;top:calc(env(safe-area-inset-top,0px) + 30px)!important;width:44px!important;height:44px!important;border:1px solid rgba(255,255,255,.58)!important;border-radius:50%!important;background:rgba(0,0,0,.42)!important;color:#fff!important;font-size:24px!important;line-height:1!important;place-items:center!important;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
    #sessionNoteButton.show{display:grid!important}
    #finishSessionButton{display:none!important}
    #gameScreen .session-top-pill{position:absolute!important;z-index:124!important;left:50%!important;top:calc(env(safe-area-inset-top,0px) + 99px)!important;transform:translateX(-50%)!important;min-width:0!important;height:27px!important;padding:0 10px!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:14px!important;background:rgba(0,0,0,.34)!important;color:rgba(255,255,255,.58)!important;font-size:9px!important;letter-spacing:.055em!important;white-space:nowrap!important;cursor:pointer!important;pointer-events:auto!important;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
    #gameScreen .session-top-pill.show{display:flex!important}
    #gameScreen #toast{top:calc(env(safe-area-inset-top,0px) + 138px)}
    #gameScreen .bottom-controls{gap:18px}

    #researchMenuButton{position:absolute;z-index:45;right:21px;top:calc(env(safe-area-inset-top,0px) + 48px);width:40px;height:40px;border:1px solid rgba(255,255,255,.24);border-radius:50%;background:transparent;color:rgba(255,255,255,.64);display:none;place-items:center;font-size:18px;line-height:1;cursor:pointer}
    #researchMenuButton.show{display:grid}
    #researchMenuButton:active{transform:scale(.94)}
  `;
  document.head.appendChild(style);

  const eye = document.createElement("button");
  eye.id = "visibilityButton";
  eye.className = "round-control";
  eye.type = "button";
  eye.setAttribute("aria-label", "Скрыть панель управления");
  eye.innerHTML = `<svg viewBox="0 0 36 24" aria-hidden="true"><path d="M2 12c4.3-6 9.6-9 16-9s11.7 3 16 9c-4.3 6-9.6 9-16 9S6.3 18 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  bottomControls.insertBefore(eye, instructionsButton || null);

  let hidden = false;
  function setControlsHidden(value) {
    hidden = Boolean(value);
    gameScreen.classList.toggle("controls-hidden", hidden);
    eye.setAttribute("aria-label", hidden ? "Показать панель управления" : "Скрыть панель управления");
    if (hidden && document.getElementById("instructionsModal")?.classList.contains("open")) {
      document.getElementById("closeInstructionsButton")?.click();
    }
  }
  eye.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    setControlsHidden(!hidden);
  });

  // The general research/personal area is reachable from the original library,
  // but it never sits on top of the interactive gameplay.
  const menuButton = document.createElement("button");
  menuButton.id = "researchMenuButton";
  menuButton.type = "button";
  menuButton.textContent = "○";
  menuButton.setAttribute("aria-label", "Открыть мой раздел");
  libraryScreen.appendChild(menuButton);

  function researchLayer() { return document.getElementById("setkaResearchLayer"); }
  function portalNav() { return document.querySelector(".portal-nav"); }
  function activeResearchTimer() { return Boolean(gameScreen.querySelector(".session-top-pill.show")); }
  function isAuthenticated() { return Boolean(localStorage.getItem(ACCESS_KEY)); }

  function showOriginalLibrary() {
    const layer = researchLayer();
    portalNav()?.classList.add("hidden");
    layer?.classList.add("hidden");
    app.style.visibility = "visible";
    if (!libraryScreen.classList.contains("active")) libraryButton.click();
    window.SetkaApp?.setLibraryPage?.("all");
    menuButton.classList.toggle("show", isAuthenticated());
  }

  menuButton.addEventListener("click", () => {
    const nav = portalNav();
    const me = nav?.querySelector('button[data-page="me"]');
    if (!me) return;
    me.click();
  });

  // In the research overlay, "Patterns" means return to the original swipe library,
  // not open a second duplicate menu of patterns.
  document.addEventListener("click", e => {
    const b = e.target.closest?.('.portal-nav button[data-page="patterns"]');
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showOriginalLibrary();
  }, true);

  let pendingTile = null;
  let startingFromTile = false;

  function beginSessionForTile(tile) {
    if (startingFromTile) return;
    startingFromTile = true;
    pendingTile = { kind: tile.dataset.kind || "base", id: tile.dataset.itemId || "" };

    const nav = portalNav();
    const today = nav?.querySelector('button[data-page="today"]');
    if (!today) { startingFromTile = false; return; }
    today.click();

    requestAnimationFrame(() => {
      const candidates = [...document.querySelectorAll("#setkaResearchLayer .hub-action")];
      const start = candidates.find(x => x.querySelector(".hub-title")?.textContent?.trim() === "Начать сессию");
      if (start) start.click();
      else startingFromTile = false;
    });
  }

  // Library remains freely visible. A live pattern still starts through the short
  // measurement protocol. We intercept the first tap only while no session is active.
  libraryScreen.addEventListener("pointerup", e => {
    const tile = e.target.closest?.(".pattern-tile");
    if (!tile || !isAuthenticated() || activeResearchTimer() || !researchLayer()?.classList.contains("hidden")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    beginSessionForTile(tile);
  }, true);

  function openPendingTileIfReady() {
    if (!pendingTile || !activeResearchTimer() || !libraryScreen.classList.contains("active")) return;
    const selector = `.pattern-tile[data-kind="${CSS.escape(pendingTile.kind)}"][data-item-id="${CSS.escape(pendingTile.id)}"]`;
    const tile = libraryScreen.querySelector(selector);
    const target = pendingTile;
    pendingTile = null;
    startingFromTile = false;
    if (!tile) return;
    setTimeout(() => {
      try {
        tile.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId: 999, clientX: 0, clientY: 0 }));
      } catch (_) {
        // Safari fallback: use SetkaApp public API for base pattern.
        if (target.kind === "base") window.SetkaApp?.openConfig?.(window.SetkaApp.DEFAULT_CONFIG, { type: "base", id: target.id, communityId: null });
      }
    }, 70);
  }

  function integrateResearchControls() {
    const note = document.getElementById("sessionNoteButton");
    const pill = document.querySelector(".session-top-pill");
    const finish = document.getElementById("finishSessionButton");
    if (note && note.parentElement !== gameUI) gameUI.appendChild(note);
    if (pill && pill.parentElement !== gameUI) {
      gameUI.appendChild(pill);
      pill.title = "Нажми, чтобы завершить раньше";
      pill.addEventListener("click", () => finish?.click());
    }
    menuButton.classList.toggle("show", isAuthenticated() && libraryScreen.classList.contains("active") && researchLayer()?.classList.contains("hidden"));
  }

  let autoHomeDone = false;
  const observer = new MutationObserver(() => {
    integrateResearchControls();
    openPendingTileIfReady();

    const layer = researchLayer();
    const title = layer?.querySelector(".research-title")?.textContent?.trim();
    if (!autoHomeDone && isAuthenticated() && title === "Сегодня" && !activeResearchTimer()) {
      autoHomeDone = true;
      showOriginalLibrary();
    }

    if (!gameScreen.classList.contains("active")) setControlsHidden(false);
    if (gameScreen.classList.contains("active")) portalNav()?.classList.add("hidden");
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"] });

  window.addEventListener("setka:view", e => {
    const view = e.detail?.view;
    if (view === "library") {
      setControlsHidden(false);
      menuButton.classList.toggle("show", isAuthenticated() && researchLayer()?.classList.contains("hidden"));
    } else if (view === "game") {
      menuButton.classList.remove("show");
      portalNav()?.classList.add("hidden");
    }
  });

  integrateResearchControls();
  menuButton.classList.toggle("show", isAuthenticated());
})();