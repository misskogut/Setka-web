(() => {
  "use strict";

  const app = document.getElementById("app");
  const clock = window.SetkaTrialClockV27;
  const access = window.SetkaAccessStateV27;
  if (!app || !clock || !access) return;

  let badge = null;
  let gate = null;
  let researchPromise = null;
  let submitting = false;

  function ensureStyle() {
    if (document.getElementById("setkaAccessV27Style")) return;
    const s = document.createElement("style");
    s.id = "setkaAccessV27Style";
    s.textContent = `
      #setkaTrialBadgeV27{position:fixed;z-index:100130;left:14px;top:calc(env(safe-area-inset-top,0px) + 16px);height:36px;border:1px solid rgba(255,255,255,.24);border-radius:18px;background:rgba(0,0,0,.54);color:#fff;padding:0 10px;display:flex;align-items:center;gap:6px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;font-size:9px;letter-spacing:.08em;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
      #setkaTrialBadgeV27 .t27-time{font-variant-numeric:tabular-nums;color:rgba(255,255,255,.7)}#setkaTrialBadgeV27 button{border:0;background:transparent;color:#fff;font:inherit;font-weight:700;padding:0 3px;height:28px}
      #setkaIdGateV27{position:fixed;inset:0;z-index:300000;background:#000;color:#fff;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif}
      .v27-box{width:min(100%,390px);text-align:center}.v27-mark{width:58px;height:58px;border:1px solid rgba(255,255,255,.62);border-radius:50%;display:grid;place-items:center;margin:0 auto 22px;font-size:9px;letter-spacing:.13em}.v27-kicker{font-size:9px;letter-spacing:.14em;color:rgba(255,255,255,.34);margin-bottom:11px}.v27-title{font-size:22px;font-weight:650}.v27-copy{font-size:12px;line-height:1.5;color:rgba(255,255,255,.45);max-width:340px;margin:9px auto 18px}.v27-input{width:100%;height:52px;border:1px solid rgba(255,255,255,.34);border-radius:26px;background:#060606;color:#fff;text-align:center;outline:none;font-size:15px;text-transform:uppercase;padding:0 16px}.v27-primary{width:100%;height:50px;border:1px solid #fff;border-radius:25px;background:#fff;color:#000;font-size:14px;font-weight:650;margin-top:10px}.v27-secondary{width:100%;height:42px;border:0;background:transparent;color:rgba(255,255,255,.43);font-size:12px;margin-top:5px}.v27-error{min-height:34px;padding-top:10px;font-size:11px;line-height:1.4;color:rgba(255,255,255,.62)}
      @media(max-width:360px){#setkaTrialBadgeV27{left:9px;top:calc(env(safe-area-inset-top,0px) + 10px)}}`;
    document.head.appendChild(s);
  }

  function fmt(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
  }

  function keepAppVisible() {
    app.style.visibility = "visible";
    try { if (!window.SetkaApp?.getState?.()?.view || window.SetkaApp.getState().view !== "game") window.SetkaApp?.renderLibrary?.(); } catch (_) {}
  }

  function loadResearch() {
    if (document.getElementById("setkaResearchLayer")) return Promise.resolve();
    if (researchPromise) return researchPromise;
    researchPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `research-v5.js?v=27-${Date.now()}`;
      s.async = false;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    }).catch(err => { researchPromise = null; throw err; });
    return researchPromise;
  }

  function hideResearchGate() {
    const layer = document.getElementById("setkaResearchLayer");
    if (layer) { layer.classList.add("hidden"); layer.style.visibility = "hidden"; layer.style.pointerEvents = "none"; }
    document.querySelector(".portal-nav")?.classList.add("hidden");
    keepAppVisible();
  }

  function showResearchAfterClaim() {
    const layer = document.getElementById("setkaResearchLayer");
    if (layer) { layer.style.visibility = ""; layer.style.pointerEvents = ""; layer.classList.remove("hidden"); }
  }

  function removeBadge() { badge?.remove(); badge = null; }

  function createBadge() {
    if (badge || access.getAccess() || clock.getState().expired) return;
    ensureStyle();
    badge = document.createElement("div");
    badge.id = "setkaTrialBadgeV27";
    badge.innerHTML = `<span>ПРОБА</span><span class="t27-time"></span><span>·</span><button type="button">ID</button>`;
    badge.querySelector("button").onclick = () => openGate(false);
    document.body.appendChild(badge);
    updateBadge(clock.getState());
  }

  function updateBadge(s) {
    const el = badge?.querySelector(".t27-time");
    if (el) el.textContent = fmt(s.remainingMs);
  }

  function closeGate() {
    if (clock.getState().expired) return;
    gate?.remove(); gate = null;
    keepAppVisible();
    createBadge();
  }

  async function waitControls(timeout = 4500) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const input = document.querySelector("#setkaResearchLayer .research-input");
      const button = document.querySelector("#setkaResearchLayer .research-primary");
      if (input && button) return { input, button };
      await new Promise(r => setTimeout(r, 60));
    }
    return null;
  }

  async function submit(rawCode) {
    if (submitting) return;
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) return;
    submitting = true;
    const err = gate?.querySelector(".v27-error");
    const btn = gate?.querySelector(".v27-primary");
    if (err) err.textContent = "";
    if (btn) { btn.disabled = true; btn.textContent = "Проверяем ID…"; }
    access.clearVerified();
    keepAppVisible();

    try {
      await loadResearch();
      hideResearchGate();
      const controls = await waitControls();
      if (!controls) throw new Error("research_gate_missing");
      controls.input.value = code;
      controls.input.dispatchEvent(new Event("input", { bubbles: true }));
      controls.button.click();

      const started = Date.now();
      while (Date.now() - started < 15000) {
        const auth = window.SetkaJourneyAuth || window.SetkaJourney?.getAuth?.();
        if (auth?.sessionId && auth?.sessionToken) {
          access.markVerified(code);
          try { window.SetkaGuestSyncV12?.markConverted?.(); } catch (_) {}
          try { await window.SetkaGuestTrial?.importArchive?.(); } catch (_) {}
          try { window.SetkaGuestTrial?.prepareForAuth?.(); } catch (_) {}
          gate?.remove(); gate = null;
          removeBadge();
          showResearchAfterClaim();
          submitting = false;
          return;
        }
        const message = document.getElementById("researchError")?.textContent?.trim() || "";
        if (message) {
          hideResearchGate();
          if (err) err.textContent = message;
          if (btn) { btn.disabled = false; btn.textContent = "Войти"; }
          submitting = false;
          return;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      throw new Error("claim_timeout");
    } catch (_) {
      hideResearchGate();
      access.clearVerified();
      if (err) err.textContent = "Не удалось проверить ID. Попробуй ещё раз.";
      if (btn) { btn.disabled = false; btn.textContent = "Войти"; }
      submitting = false;
    }
  }

  function openGate(permanent = false) {
    ensureStyle();
    removeBadge();
    gate?.remove();
    gate = document.createElement("div");
    gate.id = "setkaIdGateV27";
    const prefill = access.getPrefill();
    gate.innerHTML = `<div class="v27-box"><div class="v27-mark">SETKA</div><div class="v27-kicker">${permanent ? "ПРОБНЫЙ ЧАС ЗАВЕРШЁН" : "ПЕРСОНАЛЬНЫЙ ДОСТУП"}</div><div class="v27-title">Продолжить исследование</div><div class="v27-copy">${permanent ? "60 минут активного использования закончились. Этот экран будет появляться при следующих открытиях, пока ID не подтверждён." : "Введи персональный ID. До этого всё приложение доступно в пробном режиме без стартовой анкеты."}</div><input class="v27-input" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="STK-XXXX-XXXX" value="${String(prefill || "").replace(/[&<>\"]/g,"")}"><button class="v27-primary" type="button">Войти</button>${permanent ? "" : '<button class="v27-secondary" type="button">Вернуться к приложению</button>'}<div class="v27-error"></div></div>`;
    document.body.appendChild(gate);
    keepAppVisible();
    const input = gate.querySelector(".v27-input");
    gate.querySelector(".v27-primary").onclick = () => submit(input.value);
    gate.querySelector(".v27-secondary")?.addEventListener("click", closeGate);
    input.addEventListener("keydown", e => { if (e.key === "Enter") submit(input.value); });
    setTimeout(() => input.focus(), 80);
  }

  async function startVerified() {
    removeBadge();
    keepAppVisible();
    try { await loadResearch(); }
    catch (_) { keepAppVisible(); }
  }

  ensureStyle();
  keepAppVisible();
  clock.subscribe(s => {
    updateBadge(s);
    if (!access.getAccess() && s.expired && !gate) openGate(true);
  });

  const state = clock.getState();
  if (access.getAccess() && access.getVerified() === access.getAccess()) startVerified();
  else if (state.expired) openGate(true);
  else createBadge();

  window.SetkaAccessGateV27 = { openGate, keepAppVisible };
})();