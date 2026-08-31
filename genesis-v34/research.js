(() => {
  "use strict";

  const API_URL = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-research-api";
  const API_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv";
  const DEVICE_KEY = "setka-research:device-id:v1";
  const ACCESS_KEY = "setka-research:access-code:v1";
  const APP_VERSION = "setka-web-research-v1";

  const app = document.getElementById("app");
  if (!app) return;

  app.style.visibility = "hidden";

  const style = document.createElement("style");
  style.textContent = `
    #setkaAccessGate{position:fixed;inset:0;z-index:99999;background:#000;color:#fff;display:grid;place-items:center;padding:28px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif}
    #setkaAccessGate.hidden{display:none}
    .setka-gate-box{width:min(100%,360px);text-align:center}
    .setka-gate-mark{width:56px;height:56px;border:1px solid rgba(255,255,255,.78);border-radius:50%;margin:0 auto 28px;display:grid;place-items:center;font-size:12px;letter-spacing:.12em}
    .setka-gate-title{font-size:17px;font-weight:500;letter-spacing:.04em;margin-bottom:8px}
    .setka-gate-copy{font-size:12px;line-height:1.5;color:rgba(255,255,255,.42);margin-bottom:24px}
    .setka-gate-input{width:100%;height:52px;border-radius:26px;border:1px solid rgba(255,255,255,.42);background:#050505;color:#fff;text-align:center;font-size:16px;letter-spacing:.12em;text-transform:uppercase;outline:none;padding:0 18px}
    .setka-gate-input:focus{border-color:#fff}
    .setka-gate-button{width:100%;height:50px;margin-top:12px;border-radius:25px;border:1px solid #fff;background:#fff;color:#000;font-size:14px;font-weight:600;cursor:pointer}
    .setka-gate-button:disabled{opacity:.45}
    .setka-gate-error{min-height:38px;padding-top:12px;font-size:12px;line-height:1.45;color:rgba(255,255,255,.62)}
    .setka-gate-status{font-size:13px;color:rgba(255,255,255,.55);letter-spacing:.04em}
  `;
  document.head.appendChild(style);

  const gate = document.createElement("div");
  gate.id = "setkaAccessGate";
  gate.innerHTML = `
    <div class="setka-gate-box">
      <div class="setka-gate-mark">SETKA</div>
      <div class="setka-gate-title">Закрытый прототип</div>
      <div class="setka-gate-copy">Введите персональный ID доступа. При первом входе он закрепится за этим браузером на этом устройстве.</div>
      <form id="setkaGateForm">
        <input id="setkaGateInput" class="setka-gate-input" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="STK-XXXX-XXXX" />
        <button id="setkaGateButton" class="setka-gate-button" type="submit">Войти</button>
      </form>
      <div id="setkaGateError" class="setka-gate-error"></div>
      <div id="setkaGateStatus" class="setka-gate-status"></div>
    </div>`;
  document.body.appendChild(gate);

  const form = document.getElementById("setkaGateForm");
  const input = document.getElementById("setkaGateInput");
  const button = document.getElementById("setkaGateButton");
  const errorBox = document.getElementById("setkaGateError");
  const statusBox = document.getElementById("setkaGateStatus");

  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  let ready = false;
  let participant = null;
  let sessionId = null;
  let sessionToken = null;
  let sessionStartPerf = 0;
  let eventQueue = [];
  let snapshotQueue = [];
  let flushing = false;
  let flushTimer = 0;
  let lastStateAt = -Infinity;
  let lastSnapshotAt = -Infinity;

  function headers() {
    return { "Content-Type": "application/json", "apikey": API_KEY };
  }

  async function api(body, keepalive = false) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      keepalive
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `http_${response.status}`);
      error.code = data.error || "request_failed";
      error.data = data;
      throw error;
    }
    return data;
  }

  function nowMs() {
    return ready ? Math.max(0, Math.round(performance.now() - sessionStartPerf)) : 0;
  }

  function scheduleFlush(delay = 1200) {
    clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => flush(false), delay);
  }

  async function flush(keepalive = false) {
    if (!ready || !sessionId || !sessionToken || flushing) return;
    if (!eventQueue.length && !snapshotQueue.length) return;
    flushing = true;
    const events = eventQueue.splice(0, 500);
    const snapshots = snapshotQueue.splice(0, 100);
    try {
      await api({ action: "batch", sessionId, sessionToken, events, snapshots }, keepalive);
    } catch (_) {
      eventQueue.unshift(...events);
      snapshotQueue.unshift(...snapshots);
    } finally {
      flushing = false;
      if (eventQueue.length || snapshotQueue.length) scheduleFlush(350);
    }
  }

  function record(type, payload = {}) {
    if (!ready) return;
    eventQueue.push({ tMs: nowMs(), type, payload });
    if (eventQueue.length >= 40) flush(false); else scheduleFlush();
  }

  function recordState(state, force = false) {
    if (!ready || !state) return;
    const tMs = nowMs();
    if (!force && tMs - lastStateAt < 90) return;
    lastStateAt = tMs;
    eventQueue.push({ tMs, type: "app_state", payload: state });
    if (force || tMs - lastSnapshotAt >= 10000) {
      snapshotQueue.push({ tMs, state });
      lastSnapshotAt = tMs;
    }
    if (eventQueue.length >= 40) flush(false); else scheduleFlush();
  }

  function expose() {
    window.SetkaResearch = {
      get ready() { return ready; },
      get participant() { return participant; },
      get sessionId() { return sessionId; },
      record,
      recordState,
      flush: () => flush(false),
      sessionTimeMs: nowMs
    };
  }
  expose();

  async function claim(code, automatic = false) {
    errorBox.textContent = "";
    statusBox.textContent = automatic ? "Проверяем доступ…" : "Подключаем сессию…";
    button.disabled = true;
    input.disabled = true;
    try {
      const data = await api({
        action: "claim",
        code,
        deviceId,
        appVersion: APP_VERSION,
        userAgent: navigator.userAgent,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 },
        meta: { language: navigator.language || "", platform: navigator.platform || "" }
      });
      localStorage.setItem(ACCESS_KEY, String(code).trim().toUpperCase());
      participant = data.participant;
      sessionId = data.sessionId;
      sessionToken = data.sessionToken;
      sessionStartPerf = performance.now();
      ready = true;
      lastStateAt = -Infinity;
      lastSnapshotAt = -Infinity;
      gate.classList.add("hidden");
      app.style.visibility = "visible";
      record("session_start", { participantId: participant?.id || null, appVersion: APP_VERSION });
      window.dispatchEvent(new CustomEvent("setka-research-ready", { detail: { participant, sessionId } }));
    } catch (error) {
      ready = false;
      if (automatic) localStorage.removeItem(ACCESS_KEY);
      form.style.display = "block";
      statusBox.textContent = "";
      if (error.code === "device_mismatch") {
        errorBox.textContent = "Этот ID уже закреплён за другим браузером или устройством. Для сброса нужен владелец теста.";
      } else if (error.code === "invalid_code") {
        errorBox.textContent = "ID не найден или доступ отключён.";
      } else {
        errorBox.textContent = "Не удалось подключиться. Попробуйте ещё раз.";
      }
    } finally {
      button.disabled = false;
      input.disabled = false;
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const code = input.value.trim().toUpperCase();
    if (!code) return;
    claim(code, false);
  });

  const storedCode = localStorage.getItem(ACCESS_KEY);
  if (storedCode) {
    form.style.display = "none";
    claim(storedCode, true);
  } else {
    statusBox.textContent = "";
    setTimeout(() => input.focus(), 80);
  }

  window.addEventListener("pagehide", () => {
    if (!ready) return;
    record("session_end", {});
    flush(true);
    api({ action: "end", sessionId, sessionToken }, true).catch(() => {});
  });

  document.addEventListener("visibilitychange", () => {
    if (!ready) return;
    record(document.hidden ? "app_hidden" : "app_visible", {});
    if (document.hidden) flush(true);
  });

  window.setInterval(() => {
    if (ready) flush(false);
  }, 5000);
})();