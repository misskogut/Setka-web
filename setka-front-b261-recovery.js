(() => {
  const STORAGE_KEY = 'setka.front.b26.workspace.v1';
  const SENSOR_IDS = ['nodes-count', 'edges-count', 'event-tip', 'graph-bound'];
  const qs = (s, r=document) => r.querySelector(s);

  const readSaved = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  };
  const writeSaved = (saved) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }
    catch {}
  };

  document.documentElement.dataset.setkaFrontPatch = 'B2.6.1-R2';

  const style = document.createElement('style');
  style.textContent = `
    #graph-stats.setka-sensors-restored{
      display:flex!important;
      visibility:visible!important;
      opacity:1!important;
    }
    #graph-stats.setka-sensors-restored>.metric{
      display:block!important;
      visibility:visible!important;
      opacity:1!important;
      position:relative!important;
      left:auto!important;
      top:auto!important;
      right:auto!important;
      bottom:auto!important;
      transform:none!important;
      margin:0!important;
      z-index:auto!important;
    }
  `;
  document.head.appendChild(style);

  function fullyClamp(left, top, width, height, margin=8) {
    const w = Math.max(56, Math.min(Number(width) || 96, Math.max(56, innerWidth - margin * 2)));
    const h = Math.max(28, Math.min(Number(height) || 44, Math.max(28, innerHeight - margin * 2)));
    const maxLeft = Math.max(margin, innerWidth - w - margin);
    const maxTop = Math.max(margin, innerHeight - h - margin);
    return {
      left: Math.min(maxLeft, Math.max(margin, Number(left) || margin)),
      top: Math.min(maxTop, Math.max(margin, Number(top) || margin))
    };
  }

  function clearDetachedMetricPresentation(metric) {
    metric.classList.remove('setka-layout-free', 'setka-layout-floating-control', 'setka-critical-sensor');
    metric.removeAttribute('data-setka-move-key');
    metric.removeAttribute('data-setka-direct-drag');
    // Keep this marker so B2.6's MutationObserver does not bind the metric as
    // an individually detachable control again.
    metric.dataset.setkaLayoutBound = '1';
    [
      'position','left','top','right','bottom','transform','margin','width','height',
      'z-index','display','visibility','opacity','pointer-events'
    ].forEach((name) => metric.style.removeProperty(name));
  }

  function repairSensors() {
    const stats = qs('#graph-stats');
    if (!stats) return { ok:false, state:'GRAPH_STATS_MISSING', restored:0 };

    const saved = readSaved();
    let storageChanged = false;
    let restored = 0;

    // The four sensors are live DOM nodes owned by the base front. B2.6 used
    // to detach them from #graph-stats and persist absolute positions. Rehome
    // those same nodes (do not clone them) so the base runtime keeps updating
    // the original <b id=...> references.
    SENSOR_IDS.forEach((id) => {
      const valueNode = document.getElementById(id);
      const metric = valueNode?.closest('.metric');
      if (!metric) return;

      if (metric.parentElement !== stats) stats.appendChild(metric);
      clearDetachedMetricPresentation(metric);
      restored += 1;

      const key = `metric:${id}`;
      if (Object.prototype.hasOwnProperty.call(saved, key)) {
        delete saved[key];
        storageChanged = true;
      }
    });

    stats.classList.add('setka-sensors-restored');

    // If the whole sensor cluster itself was moved, preserve that user choice,
    // but force the cluster fully back inside the current viewport.
    const groupKey = 'major:graph-stats';
    const groupPos = saved[groupKey];
    if (groupPos?.free) {
      const rect = stats.getBoundingClientRect();
      const width = Math.max(120, Number(groupPos.width) || rect.width || 420);
      const height = Math.max(40, Number(groupPos.height) || rect.height || 70);
      const p = fullyClamp(groupPos.left, groupPos.top, width, height);
      Object.assign(stats.style, {
        position:'fixed',
        left:`${p.left}px`,
        top:`${p.top}px`,
        right:'auto',
        bottom:'auto',
        transform:'none',
        width:`${Math.min(width, Math.max(120, innerWidth - 16))}px`,
        height:`${Math.min(height, Math.max(40, innerHeight - 16))}px`,
        zIndex:String(Math.max(92, Number(groupPos.z) || 92))
      });
      groupPos.left = p.left;
      groupPos.top = p.top;
      groupPos.width = Math.min(width, Math.max(120, innerWidth - 16));
      groupPos.height = Math.min(height, Math.max(40, innerHeight - 16));
      groupPos.z = Math.max(92, Number(groupPos.z) || 92);
      storageChanged = true;
    }

    if (storageChanged) writeSaved(saved);
    return {
      ok: restored === SENSOR_IDS.length,
      state: restored === SENSOR_IDS.length ? 'ALL_GRAPH_SENSORS_REHOMED' : 'GRAPH_SENSORS_PARTIAL',
      restored,
      expected: SENSOR_IDS.length,
      individualMetricDetachmentRetired: true
    };
  }

  // B2.6 already attached pointer handlers to these exact DOM nodes before
  // this patch runs. Stop those old handlers in capture phase while layout
  // mode is active, so a sensor can never be detached again. The sensor group
  // itself remains movable through B2.6's normal graph-stats handle.
  document.addEventListener('pointerdown', (event) => {
    if (!document.documentElement.classList.contains('setka-layout-editing')) return;
    const metric = event.target.closest?.('#graph-stats > .metric');
    if (!metric) return;
    event.stopImmediatePropagation();
  }, true);

  requestAnimationFrame(() => requestAnimationFrame(repairSensors));
  window.addEventListener('resize', () => requestAnimationFrame(repairSensors));

  window.SETKA_SENSOR_RECOVERY = Object.freeze({
    version:'B2.6.1-R2',
    recover:repairSensors,
    sensors:[...SENSOR_IDS],
    storageKey:STORAGE_KEY,
    individualMetricDetachmentRetired:true,
    canonMutation:false,
    runtimeMutation:false
  });
})();