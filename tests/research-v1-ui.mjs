import {mountReplay} from '../research-v1/replay.mjs';
import {patterns} from '../research-v1/renderer.mjs';
// Isolated UI-only fixture. Never included in the main application or product API.
const p=patterns.find(p=>p.id==='dandelion');
const data={coverage:'partial',durationMs:15000,events:[{id:'isolated-start',type:'session_start',tMs:0,payload:{}},{id:'isolated-pattern',type:'pattern_open',tMs:1000,payload:{}},{id:'isolated-color',type:'color',tMs:7000,payload:{}},{id:'isolated-end',type:'session_end',tMs:15000,payload:{}}],states:[{tMs:1000,state:{view:'game',patternId:p.id,patternVersion:p.version,config:p.defaults,frame:0},source:'isolated-fixture'},{tMs:7000,state:{view:'game',patternId:p.id,patternVersion:p.version,config:{...p.defaults,colorModeIndex:1},frame:360},source:'isolated-fixture'}]};
mountReplay(document.getElementById('test-player'),data,{title:'Синтетическая проверка · Одуванчик'});
document.getElementById('test-result').textContent='Интерфейс загружен. У начальной точки нет слепка — стартовый паттерн не подставляется.';
