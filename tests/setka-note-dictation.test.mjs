import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('standalone-note-dictation-v1.js','utf8');
function harness({withForm=false}={}){
 const el=()=>({dataset:{},children:[],value:'',maxLength:5000,isConnected:true,attrs:{},setAttribute(k,v){this.attrs[k]=v},appendChild(x){this.children.push(x);x.parentNode=this},insertBefore(x){this.appendChild(x)},after(){},closest(){return null},addEventListener(){},dispatchEvent(){},focus(){}});
 const listeners={},instances=[],timers=new Map();let timerId=0,saves=0,savedText=null;
 class Recognition{constructor(){instances.push(this)}start(){this.onstart()}stop(){this.stopped=true}abort(){this.aborted=true}}
 const window={SpeechRecognition:Recognition,confirm:()=>true,addEventListener:(k,v)=>listeners[k]=v};
 const document={createElement:el,getElementById:()=>null,addEventListener(){},hidden:false};
 vm.runInNewContext(source,{window,document,Event:class{},setTimeout:cb=>{timers.set(++timerId,cb);return timerId},clearTimeout:id=>timers.delete(id)});
 const field=el(),save=el(),form=el();el().appendChild(field);
 const capture={},formCapture={};
 save.addEventListener=(k,f)=>capture[k]=f;form.addEventListener=(k,f)=>formCapture[k]=f;
 const event=()=>({blocked:false,preventDefault(){this.blocked=true},stopImmediatePropagation(){this.blocked=true}});
 const commit=()=>{saves++;savedText=field.value};
 const submit=()=>{const ev=event();formCapture.submit?.(ev);if(!ev.blocked)commit()};
 save.click=()=>{if(save.disabled)return;const ev=event();capture.click?.(ev);if(!ev.blocked){if(withForm)submit();else commit()}};
 field.closest=k=>k==="form"&&withForm?form:null;
 window.SetkaNoteDictationV1.attach(field,save);
 return {api:window.SetkaNoteDictationV1,field,save,submit,mic:field.parentNode.children[1],instances,listeners,window,timers,get saves(){return saves},get savedText(){return savedText}};
}
test('dictation appends final speech once and preserves typed text',()=>{
 const h=harness();h.field.value='Моя мысль';h.mic.onclick();const r=h.instances[0];
 assert.equal(r.lang,'ru-RU');assert.equal(h.mic.dataset.phase,'listening');
 const result=(text,final)=>Object.assign([{transcript:text}],{isFinal:final});
 r.onresult({resultIndex:0,results:[result('сегодня',false)]});assert.equal(h.field.value,'Моя мысль');
 r.onresult({resultIndex:0,results:[result('сегодня',true)]});
 r.onresult({resultIndex:0,results:[result('сегодня',true),result('спокойно',true)]});
 assert.equal(h.field.value,'Моя мысль сегодня спокойно');
 h.mic.onclick();assert.equal(r.stopped,true);r.onend();assert.equal(h.mic.dataset.phase,'idle');
});
test('account switch aborts microphone and ignores late results',()=>{
 const h=harness();h.mic.onclick();const r=h.instances[0];h.listeners['setka:account-switch-start']();
 assert.equal(r.aborted,true);r.onresult({results:[Object.assign([{transcript:'late'}],{isFinal:true})]});assert.equal(h.field.value,'');
});
test('unsupported browser and text limit are safe',()=>{
 const h=harness();delete h.window.SpeechRecognition;h.mic.onclick();assert.equal(h.mic.dataset.phase,'idle');
 h.field.value='abc';h.field.maxLength=4;assert.equal(h.api.appendText(h.field,'long'),false);assert.equal(h.field.value,'abc');
});
test('both note composers and both main fronts include dictation',()=>{
 for(const p of ['standalone-core-v34.js','standalone-user-ui-v34.js'])assert.match(fs.readFileSync(p,'utf8'),/SetkaNoteDictationV1\?\.attach\(/);
 for(const p of ['standalone-v34.html','standalone-v34-cycle-logo3d.html'])assert.match(fs.readFileSync(p,'utf8'),/<script\s+src="standalone-note-dictation-v1\.js\?(?:v=3|content=[a-f0-9]{20})"><\/script>/);
});
test('one Save click waits for final speech then saves exactly once in both editors',()=>{
 for(const withForm of [false,true]){
  const h=harness({withForm});h.mic.onclick();const r=h.instances[0];
  h.save.click();assert.equal(r.stopped,true);assert.equal(h.saves,0);assert.equal(h.save.disabled,true);
  h.save.click();
  r.onresult({resultIndex:0,results:[Object.assign([{transcript:'Последние слова'}],{isFinal:true})]});
  r.onend();assert.equal(h.saves,1);assert.equal(h.savedText,'Последние слова');assert.equal(h.save.disabled,false);
  r.onend();assert.equal(h.saves,1);
 }
});
test('save during already stopping mic queues the original handler',()=>{
 const h=harness({withForm:true});h.field.value='готовая заметка';h.mic.onclick();const r=h.instances[0];h.mic.onclick();h.save.click();r.onend();assert.equal(h.saves,1);assert.equal(h.savedText,'готовая заметка');
});
test('timeout saves recognized text once, cancellation never saves another account',()=>{
 const h=harness();h.field.value='готово';h.mic.onclick();const r=h.instances[0];h.save.click();for(const cb of [...h.timers.values()])cb();assert.equal(r.aborted,true);assert.equal(h.saves,1);r.onend();assert.equal(h.saves,1);
 const q=harness();q.field.value='личная';q.mic.onclick();q.save.click();q.listeners['setka:account-switch-start']();q.instances[0].onend();assert.equal(q.saves,0);assert.equal(q.save.disabled,false);
});
test('empty recognition does not create a blank note',()=>{
 const h=harness();h.mic.onclick();h.save.click();h.instances[0].onend();assert.equal(h.saves,0);assert.equal(h.save.disabled,false);
});
test('form submit also queues a single save',()=>{
 const h=harness({withForm:true});h.field.value='текст';h.mic.onclick();h.submit();assert.equal(h.saves,0);h.instances[0].onend();assert.equal(h.saves,1);
});

test('technical audio notice is shown only on first microphone activation',()=>{
 const h=harness();let prompts=0;h.window.confirm=()=>{prompts++;return false};
 h.mic.onclick();assert.equal(prompts,1);assert.equal(h.instances.length,0);
 h.window.confirm=()=>{prompts++;return true};h.mic.onclick();assert.equal(prompts,2);h.instances[0].onend();
 h.mic.onclick();assert.equal(prompts,2);assert.equal(h.instances.length,2);
 assert.equal(source.includes('st-note-mic-notice'),false);
});
