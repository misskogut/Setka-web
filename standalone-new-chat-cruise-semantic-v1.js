(() => {
  'use strict';

  const CRUISES_KEY = 'setka_nc_public_cruises_v1';
  const PLAYED_KEY = 'setka_nc_played_semantic_v1';
  const status = document.getElementById('ncRecordingStatus');
  let capture = null;
  let recordingWasOn = false;
  let playbackLock = false;

  const read = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback; }
    catch (_) { return fallback; }
  };
  const write = (k, value) => localStorage.setItem(k, JSON.stringify(value));
  const clone = value => JSON.parse(JSON.stringify(value));

  function isRecordingOn() {
    return !!status?.classList.contains('on');
  }

  function beginCapture() {
    if (capture) return;
    capture = { started: performance.now(), frames: [], lastFrameAt: -Infinity };
    const state = window.SetkaApp?.getState?.();
    if (state?.config) pushFrame('start', state);
  }

  function pushFrame(type, state) {
    if (!capture || playbackLock || !state?.config) return;
    const t = Math.round(performance.now() - capture.started);
    if (type === 'gesture-move' && t - capture.lastFrameAt < 70) return;
    capture.lastFrameAt = t;
    capture.frames.push({
      t,
      type,
      patternId: state.patternId,
      config: clone(state.config),
      sourceType: state.sourceType || 'working',
      sourceId: state.sourceId || state.patternId,
      communityId: state.communityId || null
    });
  }

  function finishCapture() {
    if (!capture) return;
    const finished = capture;
    capture = null;
    setTimeout(() => attachToNewestCruise(finished.frames), 80);
  }

  function attachToNewestCruise(frames) {
    if (!frames.length) return;
    const cruises = read(CRUISES_KEY, []);
    const target = cruises.slice().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))[0];
    if (!target) return;
    target.semanticTimeline = frames;
    target.timelineVersion = 2;
    target.timelineMode = 'config-snapshots';
    write(CRUISES_KEY, cruises);
    window.SETKA_NEW_CHAT_SOCIAL?.render?.();
  }

  ['gesture-start','gesture-move','gesture-end','pattern-open','color','view'].forEach(name => {
    window.addEventListener(`setka:${name}`, event => {
      if (!isRecordingOn() || playbackLock) return;
      if (!capture) beginCapture();
      pushFrame(name, event.detail?.state);
    });
  });

  if (status) {
    new MutationObserver(() => {
      const on = isRecordingOn();
      if (on && !recordingWasOn) beginCapture();
      if (!on && recordingWasOn) finishCapture();
      recordingWasOn = on;
    }).observe(status, { attributes:true, attributeFilter:['class'] });
  }

  async function playSemanticCruise(id) {
    const cruises = read(CRUISES_KEY, []);
    const cruise = cruises.find(x => x.id === id);
    if (!cruise?.semanticTimeline?.length || !window.SetkaApp?.openConfig) return false;

    playbackLock = true;
    document.getElementById('ncPanel')?.classList.remove('open');
    const played = read(PLAYED_KEY, []);
    const repeat = played.includes(id);
    if (!repeat) {
      played.push(id); write(PLAYED_KEY, played);
      cruise.uniqueUsers = Number(cruise.uniqueUsers || 0) + 1;
    } else {
      cruise.repeatUsers = Number(cruise.repeatUsers || 0) + 1;
    }
    cruise.plays = Number(cruise.plays || 0) + 1;

    const start = performance.now();
    const timers = [];
    for (const frame of cruise.semanticTimeline) {
      timers.push(setTimeout(() => {
        try {
          window.SetkaApp.openConfig(frame.config, {
            type: 'cruise',
            id: cruise.id,
            patternId: frame.patternId,
            communityId: frame.communityId || null
          });
        } catch (_) {}
      }, Math.max(0, Number(frame.t) || 0)));
    }

    const durationMs = Math.max(Number(cruise.duration || 0) * 1000, Number(cruise.semanticTimeline.at(-1)?.t || 0));
    setTimeout(() => {
      const watched = Math.max(0, (performance.now() - start) / 1000);
      cruise.totalTime = Number(cruise.totalTime || 0) + watched;
      cruise.durations = Array.isArray(cruise.durations) ? cruise.durations : [];
      cruise.durations.push(watched);
      write(CRUISES_KEY, cruises);
      playbackLock = false;
      document.getElementById('ncPanel')?.classList.add('open');
      window.SETKA_NEW_CHAT_SOCIAL?.render?.();
    }, durationMs + 300);
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-play-cruise]');
    if (!button) return;
    const cruise = read(CRUISES_KEY, []).find(x => x.id === button.dataset.playCruise);
    if (!cruise?.semanticTimeline?.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    playSemanticCruise(button.dataset.playCruise);
  }, true);

  window.SETKA_NEW_CHAT_CRUISE_SEMANTIC = { play: playSemanticCruise };
})();
