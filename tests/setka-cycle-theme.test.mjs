import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const css=read('experiments/alma-cycle-source/dist/cycle-history.css');
const js=read('experiments/alma-cycle-source/dist/cycle-history.js');
test('cycle history, statistics and controls use inherited lotus palette',()=>{
 for(const token of ['--ach-surface','--ach-deep','--ach-accent','--ach-border','--ach-muted'])assert.match(css,new RegExp(token+':color-mix\\(in srgb,var\\(--cycle-insights-color\\)'));
 assert.match(css,/\.ach-chart-path\{stroke:var\(--ach-accent\)/);
 assert.match(css,/\.alma-cycle-sync-panel\{[^}]*background:var\(--ach-deep\)/);
 assert.match(css,/\.ach-save\{[^}]*background:var\(--ach-selected\)/);
 assert.doesNotMatch(css,/#ae88d2|#cda8ed|rgba\(32,21,43|rgba\(195,158,211/);
 assert.match(css,/\.ach-dot\.is-period\{background:#ff567c\}/);
 assert.match(css,/\.ach-dot\.is-fertile\{background:#67bfc7\}/);
 assert.match(css,/\.ach-dot\.is-ovulation\{background:#b975ec\}/);
});
test('lotus theme follows actual hero changes immediately, even in edit mode',()=>{
 const code=js.slice(js.indexOf('function colorSync(){'),js.indexOf('function lineDots('));
 let current='#39cf8b',lastObserver,values=[];
 const hero={},scene={querySelector:()=>hero,style:{setProperty:(k,v)=>values.push([k,v])}};
 class Observer{constructor(cb){lastObserver=this;this.cb=cb}observe(el,opts){assert.equal(el,hero);assert.deepEqual(opts.attributeFilter,['style','class'])}disconnect(){}}
 const run=new Function('scene','getComputedStyle','MutationObserver','let themeHero=null,themeObserver=null,themeScene=null,lastHeroColor="";'+code+';return colorSync;')(scene,()=>({getPropertyValue:()=>current}),Observer);
 run();current='#ff435f';lastObserver.cb();current='#9a6af0';lastObserver.cb();
 assert.deepEqual(values,[['--cycle-insights-color','#39cf8b'],['--cycle-insights-color','#ff435f'],['--cycle-insights-color','#9a6af0']]);
 assert.match(js,/colorSync\(\); \/\/ Theme changes must not wait for the editor to close/);
});
