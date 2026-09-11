(() => {
  const STORAGE_KEY = 'setka.front.b26.workspace.v1';
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const readSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; } };
  const writeSaved = (saved) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {} };

  document.documentElement.dataset.setkaFrontPatch = 'B2.6.1';

  function metricKey(el, i=0) {
    return `metric:${el.querySelector('[id]')?.id || i}`;
  }

  function fullyClamp(left, top, width, height, margin=8) {
    const w = Math.max(56, Number(width) || 96);
    const h = Math.max(28, Number(height) || 44);
    return {
      left: Math.min(Math.max(margin, innerWidth - w - margin), Math.max(margin, Number(left) || margin)),
      top: Math.min(Math.max(margin, innerHeight - h - margin), Math.max(margin, Number(top) || margin))
    };
  }

  function recoverMetric(el, key, pos, index) {
    if (!el || !pos?.free) return false;
    const rect = el.getBoundingClientRect();
    const width = Math.max(72, Number(pos.width) || rect.width || 96);
    const height = Math.max(34, Number(pos.height) || rect.height || 44);
    const fallbackLeft = 16 + (index % 4) * 108;
    const fallbackTop = Math.max(16, innerHeight - 96 - Math.floor(index / 4) * 54);
    const rawLeft = Number.isFinite(Number(pos.left)) ? Number(pos.left) : fallbackLeft;
    const rawTop = Number.isFinite(Number(pos.top)) ? Number(pos.top) : fallbackTop;
    const p = fullyClamp(rawLeft, rawTop, width, height);

    if (el.parentElement !== document.body) document.body.appendChild(el);
    el.dataset.setkaMoveKey = key;
    el.dataset.setkaLayoutBound = '1';
    el.classList.add('setka-layout-free', 'setka-layout-floating-control', 'setka-critical-sensor');
    Object.assign(el.style, {
      position:'fixed',
      left:`${p.left}px`,
      top:`${p.top}px`,
      right:'auto',
      bottom:'auto',
      transform:'none',
      margin:'0',
      width:`${width}px`,
      height:`${height}px`,
      zIndex:String(Math.max(96, Number(pos.z) || 96)),
      display:'block',
      visibility:'visible',
      opacity:'1'
    });

    pos.left = p.left;
    pos.top = p.top;
    pos.width = width;
    pos.height = height;
    pos.z = Math.max(96, Number(pos.z) || 96);
    return true;
  }

  function recoverStatsBlock(saved) {
    const block = qs('.graph-stats');
    const pos = saved['major:graph-stats'];
    if (!block || !pos?.free) return false;
    const rect = block.getBoundingClientRect();
    const width = Math.max(120, Number(pos.width) || rect.width || 420);
    const height = Math.max(40, Number(pos.height) || rect.height || 70);
    const p = fullyClamp(pos.left, pos.top, width, height);
    block.classList.add('setka-layout-free');
    Object.assign(block.style, {
      position:'fixed', left:`${p.left}px`, top:`${p.top}px`, right:'auto', bottom:'auto', transform:'none',
      width:`${width}px`, height:`${height}px`, zIndex:String(Math.max(92, Number(pos.z) || 92)),
      display:'flex', visibility:'visible', opacity:'1'
    });
    pos.left=p.left; pos.top=p.top; pos.width=width; pos.height=height; pos.z=Math.max(92, Number(pos.z)||92);
    return true;
  }

  function recover() {
    const saved = readSaved();
    let changed = recoverStatsBlock(saved);
    const metrics = qsa('.metric');
    metrics.forEach((el, i) => {
      const key = metricKey(el, i);
      if (recoverMetric(el, key, saved[key], i)) changed = true;
    });
    if (changed) writeSaved(saved);
    return { metrics: metrics.length, changed };
  }

  const style = document.createElement('style');
  style.textContent = `
    .setka-critical-sensor{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}
  `;
  document.head.appendChild(style);

  requestAnimationFrame(() => requestAnimationFrame(recover));
  window.addEventListener('resize', () => requestAnimationFrame(recover));

  window.SETKA_SENSOR_RECOVERY = Object.freeze({
    version:'B2.6.1',
    recover,
    storageKey:STORAGE_KEY,
    canonMutation:false,
    runtimeMutation:false
  });
})();