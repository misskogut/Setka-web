(() => {
  "use strict";

  const ACCESS_KEY = "setka-research:access-code:v1";
  const app = document.getElementById("app");
  const clock = window.SetkaTrialClockV24;
  if (!app || !clock) return;

  let researchPromise = null;
  let badge = null;
  let gate = null;
  let permanentGate = false;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function loadResearch() {
    if (document.getElementById("setkaResearchLayer")) return Promise.resolve();
    if (researchPromise) return researchPromise;
    researchPromise = loadScript("research-v5.js?v=25-full-shell").catch(error => {
      researchPromise = null;
      throw error;
    });
    return researchPromise;
  }

  function formatRemaining(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function ensureStyle() {
    if (document.getElementById("setkaTrialV25Style")) return;
    const style = document.createElement("style");
    style.id = "setkaTrialV25Style";
    style.textContent = `
      #setkaGuestTrial{position:fixed;z-index:9000;left:14px;top:calc(env(safe-area-inset-top,0px) + 16px);height:36px;border:1px solid rgba(255,255,255,.26);border-radius:18px;background:rgba(0,0,0,.52);color:#fff;padding:0 8px 0 12px;display:flex;align-items:center;gap:6px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;font-size:9px;letter-spacing:.08em;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
      #setkaGuestTrial .guest-time{font-variant-numeric:tabular-nums;color:rgba(255,255,255,.72)}
      #setkaGuestTrial .guest-id{border:0;background:transparent;color:#fff;font:inherit;letter-spacing:.08em;height:28px;padding:0 5px;cursor:pointer;font-weight:700}
      #guestMenuButton{display:none!important}
      #setkaIdGateV25{position:fixed;inset:0;z-index:250000;background:#000;color:#fff;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif}
      .idv25-box{width:min(100%,390px);text-align:center}.idv25-mark{width:58px;height:58px;border:1px solid rgba(255,255,255,.62);border-radius:50%;display:grid;place-items:center;margin:0 auto 22px;font-size:9px;letter-spacing:.13em}.idv25-kicker{font-size:9px;letter-spacing:.14em;color:rgba(255,255,255,.34);margin-bottom:11px}.idv25-title{font-size:22px;font-weight:650}.idv25-copy{font-size:12px;line-height:1.5;color:rgba(255,255,255,.45);max-width:340px;margin:9px auto 18px}.idv25-input{width:100%;height:52px;border:1px solid rgba(255,255,255,.34);border-radius:26px;background:#060606;color:#fff;text-align:center;outline:none;font-size:15px;text-transform:uppercase;padding:0 16px}.idv25-primary{width:100%;height:50px;border:1px solid #fff;border-radius:25px;background:#fff;color:#000;font-size:14px;font-weight:650;margin-top:10px}.idv25-secondary{width:100%;height:44px;border:0;background:transparent;color:rgba(255,255,255,.45);font-size:12px;margin-top:6px}.idv25-error{min-height:34px;padding-top:10px;font-size:11px;line-height:1.4;color:rgba(255,255,255,.64)}
      @media(max-width:360px){#setkaGuestTrial{left:9px;top:calc(env(safe-area-inset-top,0px) + 10px);padding-left:9px;gap:4px}#setkaGuestTrial .guest-id{padding:0 3px}}
    `;
    document.head.appendChild(style);
  }

  function removeBadge() {
    badge?.remove();
    badge = null;
  }

  function hideUnderlyingResearchGate() {
    const layer = document.getElementById("setkaResearchLayer");
    if (layer) layer.classList.add("hidden");
    app.style.visibility = "visible";
  }

  function closeGate() {
    if (permanentGate) return;
    gate?.remove();
    gate = null;
    hideUnderlyingResearchGate();
    createBadge();
    try { window.SetkaGuestShellV25?.sync?.(); } catch (_) {}
  }

  async function waitForResearchInput(timeoutMs = 4500) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const layer = document.getElementById("setkaResearchLayer");
      const input = layer?.querySelector(".research-input");
      const button = layer?.querySelector(".research-primary");
      if (input && button) return { input, button };
      await new Promise(r => setTimeout(r, 60));
    }
    return null;
  }

  async function submitId(code) {
    const error = gate?.querySelector(".idv25-error");
    const submit = gate?.querySelector(".idv25-primary");
    if (!code) return;
    if (error) error.textContent = "";
    if (submit) { submit.disabled = true; submit.textContent = "Проверяем ID…"; }

    try {
      await loadResearch();
      const controls = await waitForResearchInput();
      if (!controls) throw new Error("gate_not_ready");
      const layer = document.getElementById("setkaResearchLayer");
      layer?.classList.remove("hidden");
      controls.input.value = code;
      controls.input.dispatchEvent(new Event("input", { bubbles: true }));
      controls.button.click();

      const started = Date.now();
      while (Date.now() - started < 15000) {
        const researchError = document.getElementById("researchError")?.textContent?.trim() || "";
        if (researchError) {
          if (error) error.textContent = researchError;
          hideUnderlyingResearchGate();
          if (submit) { submit.disabled = false; submit.textContent = "Войти"; }
          return;
        }
        const title = document.querySelector("#setkaResearchLayer .research-title")?.textContent?.trim() || "";
        if (localStorage.getItem(ACCESS_KEY) && title && title !== "Продолжить исследование" && title !== "Подключаем SETKA") {
          if (error) error.textContent = "ID принят.";
          try { window.SetkaGuestSyncV12?.flush?.(true); } catch (_) {}
          try { window.SetkaGuestTrial?.prepareForAuth?.(); } catch (_) {}
          await new Promise(r => setTimeout(r, 120));
          gate?.remove(); gate = null;
          document.getElementById("setkaV25StaticGate")?.remove();
          app.style.visibility = "visible";
          return;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      throw new Error("claim_timeout");
    } catch (_) {
      hideUnderlyingResearchGate();
      if (error) error.textContent = "Не удалось проверить ID. Попробуй ещё раз.";
      if (submit) { submit.disabled = false; submit.textContent = "Войти"; }
    }
  }

  function openIdGate(permanent = false) {
    ensureStyle();
    document.getElementById("setkaV25StaticGate")?.remove();
    permanentGate = !!permanent;
    removeBadge();
    gate?.remove();
    gate = document.createElement("div");
    gate.id = "setkaIdGateV25";
    gate.innerHTML = `<div class="idv25-box"><div class="idv25-mark">SETKA</div><div class="idv25-kicker">${permanent ? "ПРОБНЫЙ ЧАС ЗАВЕРШЁН" : "ПЕРСОНАЛЬНЫЙ ДОСТУП"}</div><div class="idv25-title">Продолжить исследование</div><div class="idv25-copy">${permanent ? "60 минут активного использования закончились. Для дальнейшего доступа нужен персональный ID." : "Можно перейти из пробного режима в постоянный профиль раньше окончания часа."}</div><input class="idv25-input" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="STK-XXXX-XXXX"><button class="idv25-primary" type="button">Войти</button>${permanent ? "" : '<button class="idv25-secondary" type="button">Вернуться к пробе</button>'}<div class="idv25-error"></div></div>`;
    document.body.appendChild(gate);
    app.style.visibility = "visible";
    const input = gate.querySelector(".idv25-input");
    gate.querySelector(".idv25-primary").onclick = () => submitId(input.value.trim().toUpperCase());
    input.addEventListener("keydown", e => { if (e.key === "Enter") submitId(input.value.trim().toUpperCase()); });
    gate.querySelector(".idv25-secondary")?.addEventListener("click", closeGate);
    setTimeout(() => input.focus(), 120);
    try { window.SetkaJourney?.track?.("guest_id_gate", { permanent }); } catch (_) {}
  }

  function createBadge() {
    if (localStorage.getItem(ACCESS_KEY) || clock.getState().expired || badge) return;
    ensureStyle();
    badge = document.createElement("div");
    badge.id = "setkaGuestTrial";
    badge.setAttribute("aria-label", "Пробный доступ SETKA");
    badge.innerHTML = `<span>ПРОБА</span><span class="guest-time"></span><span>·</span><button class="guest-id" type="button">ID</button>`;
    badge.querySelector(".guest-id").addEventListener("click", () => openIdGate(false));
    document.body.appendChild(badge);
    updateBadge(clock.getState());
  }

  function updateBadge(s) {
    const t = badge?.querySelector(".guest-time");
    if (t) t.textContent = formatRemaining(s.remainingMs);
  }

  function expireTrial() {
    removeBadge();
    try { window.SetkaGuestSyncV12?.flush?.(true); } catch (_) {}
    try { window.SetkaGuestTrial?.prepareForAuth?.(); } catch (_) {}
    openIdGate(true);
  }

  async function startRegistered() {
    removeBadge();
    gate?.remove(); gate = null;
    document.getElementById("setkaV25StaticGate")?.remove();
    app.style.visibility = "visible";
    try { await loadResearch(); }
    catch (_) { app.style.visibility = "visible"; }
  }

  clock.subscribe(s => {
    updateBadge(s);
    if (!localStorage.getItem(ACCESS_KEY) && s.expired && !gate) expireTrial();
  });

  app.style.visibility = "visible";
  const s = clock.getState();
  if (localStorage.getItem(ACCESS_KEY)) startRegistered();
  else if (s.expired) expireTrial();
  else {
    window.SetkaApp?.renderLibrary?.();
    createBadge();
    try { window.SetkaGuestShellV25?.sync?.(); } catch (_) {}
  }

  window.SetkaGuestBoot = { loadResearch, openIdGate, submitId };
})();