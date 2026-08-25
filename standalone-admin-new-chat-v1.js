(() => {
  'use strict';

  const STORE = {
    notes: 'setka_nc_public_notes_v1',
    cruises: 'setka_nc_public_cruises_v1',
    events: 'setka_nc_events_v1'
  };

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch (_) { return fallback; }
  };

  const percentile = (values, value) => {
    const clean = values.filter(Number.isFinite).sort((a,b)=>a-b);
    if (!clean.length) return 0;
    const below = clean.filter(v => v <= value).length;
    return Math.round((below / clean.length) * 100);
  };

  const formatDuration = seconds => {
    seconds = Math.max(0, Number(seconds) || 0);
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s ? `${m}m ${s}s` : `${m}m`;
  };

  const normalized = row => ({
    id: row.id || crypto.randomUUID(),
    kind: row.kind || 'pattern',
    title: row.title || 'Untitled',
    saves: Number(row.saves || row.uniqueSaves || 0),
    totalTime: Number(row.totalTime || row.totalWatchTime || 0),
    uniqueUsers: Number(row.uniqueUsers || row.uniqueViewers || 0),
    sessions: Number(row.sessions || row.plays || 0),
    repeatUsers: Number(row.repeatUsers || row.repeats || 0),
    durations: Array.isArray(row.durations) ? row.durations.map(Number).filter(Number.isFinite) : [],
    comments: Array.isArray(row.comments) ? row.comments : []
  });

  const stats = row => {
    const r = normalized(row);
    const durations = r.durations.length ? r.durations : (r.sessions ? [r.totalTime / r.sessions] : []);
    const sorted = [...durations].sort((a,b)=>a-b);
    const average = durations.length ? durations.reduce((a,b)=>a+b,0)/durations.length : 0;
    const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1] + sorted[sorted.length/2])/2) : 0;
    return {
      ...r,
      average,
      median,
      repeatRate: r.uniqueUsers ? r.repeatUsers / r.uniqueUsers : 0,
      saveRate: r.uniqueUsers ? r.saves / r.uniqueUsers : 0,
      timePerUser: r.uniqueUsers ? r.totalTime / r.uniqueUsers : 0
    };
  };

  function deriveSignals(items) {
    const rows = items.map(stats);
    const cols = {
      saves: rows.map(x=>x.saves),
      totalTime: rows.map(x=>x.totalTime),
      average: rows.map(x=>x.average),
      median: rows.map(x=>x.median),
      repeatRate: rows.map(x=>x.repeatRate),
      saveRate: rows.map(x=>x.saveRate),
      timePerUser: rows.map(x=>x.timePerUser)
    };

    return rows.map(r => {
      const p = Object.fromEntries(Object.entries(cols).map(([k, arr]) => [k, percentile(arr, r[k])]));
      const signals = [];
      if (p.saves >= 80) signals.push('HIGH_SAVE');
      if (p.saves <= 25 && rows.length >= 4) signals.push('LOW_SAVE');
      if (p.totalTime >= 80) signals.push('HIGH_TOTAL_TIME');
      if (p.average >= 80) signals.push('HIGH_DURATION');
      if (p.median >= 80) signals.push('HIGH_MEDIAN_DURATION');
      if (p.repeatRate >= 80) signals.push('HIGH_REPEAT');
      if (p.saveRate >= 80) signals.push('HIGH_SAVE_RATE');
      if (p.timePerUser >= 80) signals.push('HIGH_TIME_PER_USER');

      let primary = 'Пока недостаточно устойчивого сигнала, чтобы давать характеристику.';
      let secondary = '';
      if (signals.includes('LOW_SAVE') && signals.includes('HIGH_DURATION')) {
        primary = 'Этот объект редко сохраняют сразу, но те, кто остаётся, проводят с ним долгое время.';
      } else if (signals.includes('HIGH_SAVE_RATE') && !signals.includes('HIGH_DURATION')) {
        primary = 'Его часто сохраняют уже после короткого знакомства.';
      } else if (signals.includes('HIGH_REPEAT')) {
        primary = 'К нему особенно часто возвращаются повторно.';
      } else if (signals.includes('HIGH_TIME_PER_USER') && r.uniqueUsers < Math.max(3, Math.round(rows.reduce((a,b)=>a+b.uniqueUsers,0)/Math.max(1,rows.length)))) {
        primary = 'Аудитория пока небольшая, но использование очень глубокое.';
      } else if (signals.includes('HIGH_DURATION')) {
        primary = 'Здесь пользователи обычно остаются заметно дольше, чем в среднем по библиотеке.';
      } else if (signals.includes('HIGH_SAVE')) {
        primary = 'Один из самых часто сохраняемых объектов в библиотеке.';
      }
      if (signals.includes('HIGH_REPEAT') && primary.indexOf('возвращ') === -1) secondary = 'Пользователи также часто возвращаются к нему повторно.';
      return { ...r, percentiles:p, signals, primary, secondary };
    });
  }

  function allContent() {
    const notes = read(STORE.notes, []).filter(x=>x.isPublic).map(x=>({ ...x, kind:'note', title:x.text?.slice(0,52) || 'Заметка' }));
    const cruises = read(STORE.cruises, []).filter(x=>x.isPublic).map(x=>({ ...x, kind:'cruise', title:x.title || 'Cruise' }));
    const patternFacts = (window.SETKA_EVOLUTION_DATA?.patterns || window.SETKA_PATTERN_FACTS || []).map(x=>({ ...x, kind:'pattern' }));
    return [...patternFacts, ...notes, ...cruises].map(normalized);
  }

  function renderOverview(derived) {
    const notes = read(STORE.notes, []).filter(x=>x.isPublic);
    const cruises = read(STORE.cruises, []).filter(x=>x.isPublic);
    const noteSaves = notes.reduce((a,b)=>a+Number(b.saves||b.uniqueSaves||0),0);
    const comments = notes.reduce((a,b)=>a+(b.comments?.length||0),0) + cruises.reduce((a,b)=>a+(b.comments?.length||0),0);
    const cruiseTime = cruises.reduce((a,b)=>a+Number(b.totalTime||b.totalWatchTime||0),0);
    const replays = cruises.reduce((a,b)=>a+Number(b.repeats||b.repeatUsers||0),0);
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    set('ovNotes', notes.length); set('ovNoteSaves', noteSaves); set('ovComments', comments);
    set('ovCruises', cruises.length); set('ovCruiseTime', formatDuration(cruiseTime)); set('ovReplays', replays);
    const strongest = derived.slice().sort((a,b)=> (b.signals.length - a.signals.length) || (b.totalTime-a.totalTime))[0];
    set('overviewSemantic', strongest ? strongest.primary : 'Пока недостаточно данных. Система начнёт помечать паттерны после накопления устойчивых сигналов.');
  }

  function renderNotes() {
    const box = document.getElementById('notesList'); if (!box) return;
    const notes = read(STORE.notes, []).filter(x=>x.isPublic);
    box.innerHTML = notes.length ? notes.map(n=>`<div class="content-row"><strong>@${escapeHtml(n.nickname||'anonymous')}</strong><div>${escapeHtml(n.text||'')}</div><div class="meta">♥ ${Number(n.saves||0)} · комментариев ${n.comments?.length||0}</div></div>`).join('') : '<div class="nc-sub" style="padding-top:14px">Пока нет опубликованных заметок из прототипа Новый чат.</div>';
  }

  function renderCruises() {
    const box = document.getElementById('cruiseList'); if (!box) return;
    const cruises = read(STORE.cruises, []).filter(x=>x.isPublic);
    box.innerHTML = cruises.length ? cruises.map(c=>`<div class="content-row"><strong>${escapeHtml(c.title||'Cruise')}</strong><div class="meta">@${escapeHtml(c.nickname||'anonymous')} · ${formatDuration(c.duration||0)} · ♥ ${Number(c.saves||0)} · play time ${formatDuration(c.totalTime||0)}</div><div class="timeline">${(c.timeline||[]).slice(0,20).map((e,i)=>`<i class="bar" style="height:${20 + ((i*17)%68)}px" title="${escapeHtml(e.type||'event')}"></i>`).join('')}</div></div>`).join('') : '<div class="nc-sub" style="padding-top:14px">Пока нет опубликованных Cruise.</div>';
  }

  function renderSignals(derived) {
    const box = document.getElementById('signalCards'); if (!box) return;
    const sorted = derived.slice().sort((a,b)=>b.totalTime-a.totalTime);
    box.innerHTML = sorted.length ? sorted.map(r=>`<div class="content-row"><strong>${escapeHtml(r.title)}</strong><div class="meta">${r.kind} · ♥ ${r.saves} · total ${formatDuration(r.totalTime)} · avg ${formatDuration(r.average)} · repeat ${Math.round(r.repeatRate*100)}%</div><div>${r.signals.map(s=>`<span class="signal">${s}</span>`).join('') || '<span class="signal">INSUFFICIENT_SIGNAL</span>'}</div><div class="semantic">${escapeHtml(r.primary)}${r.secondary ? `<div class="meta" style="margin-top:6px">${escapeHtml(r.secondary)}</div>`:''}</div></div>`).join('') : '<div class="nc-sub">Данных пока нет.</div>';
  }

  function renderSystem() {
    const events = ['save_pattern_config','save_note','save_cruise','comment_note','comment_cruise','play_cruise','replay_cruise','publish_note','publish_cruise'];
    const box = document.getElementById('eventsBox'); if(box) box.innerHTML = events.map(e=>`<span class="signal">${e}</span>`).join('');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function tabs() {
    document.querySelectorAll('.nc-tab').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.nc-tab').forEach(x=>x.classList.toggle('active',x===btn));
      document.querySelectorAll('.nc-view').forEach(v=>v.classList.add('hidden'));
      document.getElementById(`view-${btn.dataset.view}`)?.classList.remove('hidden');
    }));
  }

  function refresh() {
    const derived = deriveSignals(allContent());
    renderOverview(derived); renderNotes(); renderCruises(); renderSignals(derived); renderSystem();
  }

  tabs(); refresh();
  window.addEventListener('storage', refresh);
  window.SETKA_NEW_CHAT_ADMIN = { refresh, deriveSignals, stats };
})();
