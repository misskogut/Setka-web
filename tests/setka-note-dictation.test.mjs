import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('standalone-note-dictation-v1.js','utf8');
function harness(){
 const el=()=>({dataset:{},children:[],value:'',maxLength:5000,isConnected:true,attrs:{},setAttribute(k,v){this.attrs[k]=v},appendChild(x){this.children.push(x);x.parentNode=this},insertBefore(x){this.appendChild(x)},after(){},closest(){return null},addEventListener(){},dispatchEvent(){},focus(){}});
 const listeners={},instances=[];
 class Recognition{constructor(){instances.push(this)}start(){this.onstart()}stop(){this.stopped=true}abort(){this.aborted=true}}
 const window={SpeechRecognition:Recognition,addEventListener:(k,v)=>listeners[k]=v};
 const document={createElement:el,getElementById:()=>null,addEventListener(){},hidden:false};
 vm.runInNewContext(source,{window,document,Event:class{},setTimeout:()=>1,clearTimeout(){}});
 const field=el();el().appendChild(field);window.SetkaNoteDictationV1.attach(field);
 return {api:window.SetkaNoteDictationV1,field,mic:field.parentNode.children[1],instances,listeners,window};
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
 for(const p of ['standalone-v34.html','standalone-v34-cycle-logo3d.html'])assert.match(fs.readFileSync(p,'utf8'),/<script\s+src="standalone-note-dictation-v1\.js\?(?:v=1|content=[a-f0-9]{20})"><\/script>/);
});