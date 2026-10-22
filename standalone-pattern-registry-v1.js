(() => {
  "use strict";
  const root=typeof window==="object"?window:globalThis;
  if(root.SetkaPatternRegistryV1)return;
  const SCHEMA=2, records=new Map(),renderers=new Map(),titles=new Map(),overrides=new Map();
  const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const freeze=v=>{if(v&&typeof v==="object"){Object.values(v).forEach(freeze);Object.freeze(v)}return v};
  const safeId=id=>typeof id==="string"&&/^[a-z][a-z0-9-]{2,79}$/.test(id);
  const emit=(type,detail)=>{if(typeof root.dispatchEvent==="function"&&typeof CustomEvent==="function")root.dispatchEvent(new CustomEvent(type,{detail}))};
  const error=(code,id)=>Object.assign(new Error(code+":"+String(id||"")),{code,patternId:id});
  const standard={animated:true,settings:true,favorites:true,notes:true,states:true,sessions:true,statistics:true,audio:true};
  function get(id){return records.get(id)||null}
  function requirePattern(id){const p=get(id);if(!p)throw error("unknown_pattern",id);return p}
  function register(raw){
    if(!raw||!safeId(raw.id)||records.has(raw.id))throw error("invalid_or_duplicate_pattern",raw?.id);
    if(!raw.defaults||!Array.isArray(raw.controls))throw error("pattern_contract_required",raw.id);
    if(!Number.isInteger(raw.version)||raw.version<1)throw error("invalid_pattern_version",raw.id);
    const colorModes=raw.colorModes??9;
    if(!Number.isInteger(colorModes)||colorModes<1||colorModes>9)throw error("invalid_palette_count",raw.id);
    // A newly packaged algorithm declares actual RGB palettes in the shared
    // contract. The chosen initial mode must render white on black.
    if(raw.palettes!==undefined){
      if(!Array.isArray(raw.palettes)||raw.palettes.length!==colorModes||
         raw.palettes.some(rgb=>!Array.isArray(rgb)||rgb.length!==3||
           rgb.some(v=>!Number.isInteger(v)||v<0||v>255)))throw error("invalid_palette_contract",raw.id);
      const initial=raw.palettes[raw.defaults.colorModeIndex??0];
      if(!initial||initial.some(v=>v!==255))throw error("initial_palette_must_be_monochrome",raw.id);
    }
    const defaults=copy({...raw.defaults,patternId:raw.id,colorModeIndex:raw.defaults.colorModeIndex??0});
    const schema=copy(raw.schema||{});
    for(const [key,value] of Object.entries(defaults)){
      if(key==="patternId")continue;
      if(!schema[key]){
        const control=raw.controls.find(c=>c[1]===key);
        schema[key]=typeof value==="number"?{type:"number",min:control?.[2]??-100000,max:control?.[3]??100000,integer:control?.[4]===1}:
          typeof value==="boolean"?{type:"boolean"}:Array.isArray(value)?{type:"array",maxItems:64}:{type:"string",maxLength:200};
      }
    }
    schema.colorModeIndex={type:"number",min:0,max:colorModes-1,integer:true};
    for(const [label,key,min,max,step,gesture,fingers] of raw.controls){
      // New modules must describe a real gesture: 0=slider only,
      // 1=one finger/tap, 2=two fingers/pinch. Never use a speed factor here.
      if(raw.module&&(!Number.isInteger(fingers)||fingers<0||fingers>2||
          typeof gesture!=="string"||
          (fingers===0&&!["Ползунок","Бегунок"].includes(gesture))||
          (fingers>0&&["Ползунок","Бегунок"].includes(gesture))||
          (gesture==="Пинч"&&fingers!==2)||
          (gesture==="Тап"&&fingers!==1)||
          (fingers>0&&gesture!=="Тап"&&gesture!=="Пинч"&&!/[↑↓←→]/.test(gesture))))
        throw error("invalid_gesture_contract",raw.id+"/"+key);
      const rule=schema[key];
      if(!label||!rule||rule.type!=="number"||![min,max,step].every(Number.isFinite)||min>max||step<=0||rule.min!==min||rule.max!==max)
        throw error("invalid_control_schema",raw.id+"/"+key);
    }
    for(const [key,rule] of Object.entries(schema)){
      if(!Object.hasOwn(defaults,key)||!["number","boolean","string","array"].includes(rule.type))throw error("invalid_parameter_schema",raw.id+"/"+key);
      const value=defaults[key];
      if(rule.type==="number"&&(!Number.isFinite(value)||!Number.isFinite(rule.min)||!Number.isFinite(rule.max)||rule.min>rule.max||value<rule.min||value>rule.max||rule.integer&&!Number.isInteger(value)))throw error("invalid_parameter_default",raw.id+"/"+key);
    }
    const p=freeze({id:raw.id,title:String(raw.title||raw.id).trim().slice(0,80),version:raw.version,schemaVersion:raw.schemaVersion||1,
      defaults,schema,controls:copy(raw.controls),colorModes,capabilities:{...standard,...copy(raw.capabilities||{})},
      aliases:copy(raw.aliases||{}),keyFields:copy(raw.keyFields||null),legacyVersions:copy(raw.legacyVersions||[]),
      ...(raw.palettes?{palettes:copy(raw.palettes)}:{}),
      module:raw.module||null});
    records.set(p.id,p);
    if(typeof raw.render==="function")renderers.set(p.id,raw.render);
    emit("setka:registry-changed",{patternId:p.id,revision:revision()});return p;
  }
  function inference(c){
    // An explicit ID is evidence. Never reinterpret an unavailable algorithm.
    const id=c?.patternId||c?.baseId;if(id)return records.has(id)?id:null;
    const hits=[];
    for(const p of records.values()){
      const keys=Object.keys(p.defaults).filter(k=>k!=="patternId"&&k!=="colorModeIndex");
      const n=keys.filter(k=>Object.hasOwn(c||{},k)).length;
      if(n>=Math.min(3,keys.length)&&n>0)hits.push({id:p.id,n});
    }
    hits.sort((a,b)=>b.n-a.n);
    return hits.length&&(!hits[1]||hits[0].n>hits[1].n)?hits[0].id:null;
  }
  function resolve(c={},hint=null){
    if(hint&&c?.patternId&&hint!==c.patternId&&!(c.patternId==="rgb-glitch-rings"&&hint==="fish-wave"&&c.numLayers!=null))throw error("pattern_identity_conflict",hint);
    const id=hint||c?.patternId||c?.baseId||inference(c);
    // Documented RGB v35 compatibility: the old name used the Fish algorithm.
    if(id==="rgb-glitch-rings"&&(c.numLayers!=null||c.ringSpacing!=null)&&c.numRings==null&&c.baseSpacing==null)return "fish-wave";
    requirePattern(id);return id;
  }
  function normalize(c={},hint=null){
    if(!c||typeof c!=="object"||Array.isArray(c))throw error("invalid_configuration",hint);
    const id=resolve(c,hint),p=requirePattern(id),out={patternId:id};
    for(const [key,rule] of Object.entries(p.schema)){
      let v=c[key];if(v==null)for(const alias of p.aliases[key]||[])if(c[alias]!=null){v=c[alias];break}
      const fallback=p.defaults[key];
      if(rule.const!==undefined){out[key]=copy(rule.const);continue}
      if(rule.type==="number"){
        const n=(typeof v==="number"||typeof v==="string"&&v.trim()!=="")?Number(v):NaN;
        const value=Number.isFinite(n)?Math.min(rule.max,Math.max(rule.min,n)):fallback;
        out[key]=rule.integer?Math.round(value):value;
      }else if(rule.type==="boolean")out[key]=typeof v==="boolean"?v:fallback;
      else if(rule.type==="array")out[key]=Array.isArray(v)?v.filter(x=>typeof x==="number"&&Number.isFinite(x)).slice(-(rule.maxItems||64)):copy(fallback);
      else out[key]=typeof v==="string"?v.slice(0,rule.maxLength||200):fallback;
    }
    return out;
  }
  function validate(c,hint=null){
    try{const config=normalize(c,hint),p=requirePattern(config.patternId),issues=[];
      for(const k of Object.keys(p.schema))if(Object.hasOwn(c,k)&&JSON.stringify(c[k])!==JSON.stringify(config[k]))issues.push(k);
      return {ok:!issues.length,config,issues};
    }catch(e){return {ok:false,config:null,issues:[e.code||e.message]}}
  }
  function configKey(c,hint=null){const x=normalize(c,hint),p=requirePattern(x.patternId);
    if(p.keyFields)return [p.id,...p.keyFields.map(k=>typeof x[k]==="boolean"?(x[k]?1:0):Math.round(Number(x[k])*100000)/100000)].join("|");
    return p.id+"|"+Object.keys(x).sort().map(k=>k+":"+JSON.stringify(x[k])).join("|");
  }
  function revision(){let h=2166136261;for(const ch of JSON.stringify([...records.values()]))h=Math.imul(h^ch.charCodeAt(0),16777619);return "registry-2-"+(h>>>0).toString(16)}
  function snapshot(state){
    const id=resolve(state?.config,state?.patternId),p=requirePattern(id);
    return freeze({version:3,schemaVersion:SCHEMA,configSchemaVersion:p.schemaVersion,registryRevision:revision(),patternId:id,patternVersion:p.version,
      capturedAt:state.capturedAt||new Date().toISOString(),frame:Number.isFinite(state.frame)?state.frame:0,
      seed:state.seed??state.config?.seed??null,audio:copy(state.audio||null),configHash:configKey(state.config,id),config:normalize(state.config,id)});
  }
  function restore(raw){
    const p=get(raw?.patternId);if(!p)return {ok:false,reason:"unknown_pattern",snapshot:copy(raw)};
    if((raw.schemaVersion||1)>SCHEMA||(raw.configSchemaVersion||1)>p.schemaVersion)return {ok:false,reason:"unsupported_schema",snapshot:copy(raw)};
    if(raw.patternVersion!=null&&raw.patternVersion!==p.version&&!p.legacyVersions.includes(raw.patternVersion))return {ok:false,reason:"unsupported_version",snapshot:copy(raw)};
    try{
      const checked=validate(raw.config,raw.patternId);
      if(raw.version>=3&&(!checked.ok||Object.keys(p.schema).some(k=>!Object.hasOwn(raw.config||{},k))))return {ok:false,reason:"invalid_configuration",snapshot:copy(raw)};
      return {ok:true,snapshot:freeze({...copy(raw),config:normalize(raw.config,raw.patternId)})};
    }catch(e){return {ok:false,reason:e.code||"invalid_configuration",snapshot:copy(raw)}}
  }
  function bindRenderer(id,render){requirePattern(id);if(typeof render!=="function")throw error("invalid_renderer",id);renderers.set(id,render);emit("setka:renderer-ready",{patternId:id})}
  function applyDefaults(rows=[]){
    let changed=false;
    for(const row of rows){const p=get(row.pattern_id||row.patternId);if(!p||row.pattern_version!==p.version||row.schema_version!==p.schemaVersion)continue;
      const result=validate(row.config,p.id);if(!result.ok||Object.keys(p.schema).some(k=>!Object.hasOwn(row.config,k)))continue;
      const old=overrides.get(p.id);if(old&&old.revision>=row.revision)continue;
      overrides.set(p.id,{revision:row.revision,config:freeze(result.config)});changed=true;
    }
    if(changed)emit("setka:catalog-updated",{});return changed;
  }
  function render(ctx,w,h,c,frame,preview=false,id=null){const pid=resolve(c,id),renderer=renderers.get(pid);if(!renderer)throw error("renderer_unavailable",pid);return renderer(ctx,w,h,normalize(c,pid),frame,preview)}
  function setTitles(rows=[]){let changed=false;for(const row of rows){const id=row.pattern_id||row.patternId||row.id,title=String(row.title||"").trim();if(get(id)&&title&&title.length<=80&&(titles.get(id)?.revision||0)>Number(row.revision||0)){continue}if(get(id)&&title&&title.length<=80){titles.set(id,{title,revision:Number(row.revision||0)});changed=true}}if(changed)emit("setka:pattern-names",{});return changed}
  // Canonical active-catalog projection for every public/runtime consumer.
  // Archive objects are never mutated; a missing renderer is NOT grounds for
  // destroying old notes/favorites. Only an absent descriptor hides active UI.
  function identityOf(item){
    if(typeof item==="string")return item;
    if(!item||typeof item!=="object")return null;
    return item.replaySnapshot?.patternId||item.pattern_id||item.patternId||
      item.baseId||item.config?.patternId||null;
  }
  function isActive(item){const id=identityOf(item);return typeof id==="string"&&records.has(id)}
  function activeItems(rows){return Array.isArray(rows)?rows.filter(isActive):[]}
  const api={schemaVersion:SCHEMA,register,get,has:id=>records.has(id),isActive,activeItems,identityOf,ids:()=>[...records.keys()],list:()=>[...records.values()].map(copy),
    controls:id=>copy(get(id)?.controls||[]),inference,resolve,normalize,validate,configKey,snapshot,restore,revision,bindRenderer,render,
    ready:id=>renderers.has(id),supports:(id,feature)=>get(id)?.capabilities?.[feature]===true,
    title:id=>titles.get(id)?.title||get(id)?.title||id||"Неизвестный паттерн",setTitles,
    defaults:id=>copy(overrides.get(id)?.config||get(id)?.defaults||null),applyDefaults,
    // Compatibility with earlier callers; descriptors are never inferred from UI state.
    attachEngine:()=>{}};
  root.SetkaPatternRegistryV1=api;
  // Canonical legacy built-ins. New standalone-pattern-*.js packages are
  // discovered at build time; do not append new descriptors here.
  const builtins=[
  {
    "id": "tentacle-orbit",
    "title": "Tentacle Orbit",
    "version": 1,
    "controls": [
      [
        "Количество щупалец",
        "numTentacles",
        3,
        72,
        1,
        "Слева ↑↓",
        1
      ],
      [
        "Размер кругов",
        "circleSize",
        0.2,
        20,
        0.1,
        "Справа ↑↓",
        1
      ],
      [
        "Толщина линий",
        "lineWeight",
        0.1,
        10,
        0.1,
        "Сверху ←→",
        1
      ],
      [
        "Скорость движения",
        "movementSpeed",
        0.05,
        10,
        0.01,
        "Снизу ←→",
        1
      ],
      [
        "Длина щупалец",
        "tentacleLength",
        10,
        800,
        1,
        "Слева ↑↓",
        2
      ],
      [
        "Плотность кругов",
        "segmentStep",
        1,
        20,
        1,
        "Справа ↑↓",
        2
      ],
      [
        "Скорость цвета",
        "colorSpeed",
        0.05,
        10,
        0.01,
        "Снизу ←→",
        2
      ]
    ],
    "colorModes": 9,
    "defaults": {
      "patternId": "tentacle-orbit",
      "numTentacles": 24,
      "tentacleLength": 100,
      "baseRadius": 10,
      "movementSpeed": 1,
      "colorSpeed": 1,
      "circleSize": 1,
      "lineWeight": 1,
      "segmentStep": 2,
      "colorModeIndex": 0
    },
    "module": null,
    "schemaVersion": 1,
    "schema": {
      "numTentacles": {
        "type": "number",
        "min": 3,
        "max": 72,
        "integer": true
      },
      "tentacleLength": {
        "type": "number",
        "min": 10,
        "max": 800,
        "integer": true
      },
      "baseRadius": {
        "type": "number",
        "min": 0,
        "max": 100,
        "integer": false
      },
      "movementSpeed": {
        "type": "number",
        "min": 0.05,
        "max": 10,
        "integer": false
      },
      "colorSpeed": {
        "type": "number",
        "min": 0.05,
        "max": 10,
        "integer": false
      },
      "circleSize": {
        "type": "number",
        "min": 0.2,
        "max": 20,
        "integer": false
      },
      "lineWeight": {
        "type": "number",
        "min": 0.1,
        "max": 10,
        "integer": false
      },
      "segmentStep": {
        "type": "number",
        "min": 1,
        "max": 20,
        "integer": true
      },
      "colorModeIndex": {
        "type": "number",
        "min": 0,
        "max": 8,
        "integer": true
      }
    },
    "aliases": {},
    "keyFields": [
      "numTentacles",
      "tentacleLength",
      "baseRadius",
      "movementSpeed",
      "colorSpeed",
      "circleSize",
      "lineWeight",
      "segmentStep",
      "colorModeIndex"
    ],
    "capabilities": {
      "animated": true,
      "settings": true,
      "favorites": true,
      "notes": true,
      "states": true,
      "sessions": true,
      "statistics": true,
      "audio": true
    }
  },
  {
    "id": "dandelion",
    "title": "Одуванчик",
    "version": 1,
    "controls": [
      [
        "Скорость развития формы",
        "tSpeed",
        0.001,
        0.02,
        0.001,
        "←→",
        1
      ],
      [
        "Количество линий",
        "numShapes",
        50,
        1000,
        1,
        "↑↓",
        1
      ],
      [
        "Скорость вращения",
        "angleSpeed",
        0.001,
        0.05,
        0.001,
        "←→",
        2
      ],
      [
        "Толщина линий",
        "lineWeight",
        0.1,
        10,
        0.1,
        "↑↓",
        2
      ],
      [
        "Масштаб",
        "zoom",
        0.2,
        5,
        0.01,
        "Пинч",
        2
      ],
      [
        "Размер точек",
        "pointSize",
        0.2,
        20,
        0.1,
        "Ползунок",
        0
      ]
    ],
    "colorModes": 9,
    "defaults": {
      "patternId": "dandelion",
      "v1": 0.473,
      "numShapes": 380,
      "angleSpeed": 0.01,
      "tSpeed": 0.005,
      "backgroundAlpha": 255,
      "lineWeight": 1.2,
      "pointSize": 4,
      "zoom": 1,
      "colorModeIndex": 0,
      "v1History": []
    },
    "module": null,
    "schemaVersion": 1,
    "schema": {
      "v1": {
        "type": "number",
        "min": 0.02,
        "max": 2,
        "integer": false
      },
      "numShapes": {
        "type": "number",
        "min": 50,
        "max": 1000,
        "integer": true
      },
      "angleSpeed": {
        "type": "number",
        "min": 0.001,
        "max": 0.05,
        "integer": false
      },
      "tSpeed": {
        "type": "number",
        "min": 0.001,
        "max": 0.02,
        "integer": false
      },
      "backgroundAlpha": {
        "type": "number",
        "min": 0,
        "max": 255,
        "integer": true
      },
      "lineWeight": {
        "type": "number",
        "min": 0.1,
        "max": 10,
        "integer": false
      },
      "pointSize": {
        "type": "number",
        "min": 0.2,
        "max": 20,
        "integer": false
      },
      "zoom": {
        "type": "number",
        "min": 0.2,
        "max": 5,
        "integer": false
      },
      "colorModeIndex": {
        "type": "number",
        "min": 0,
        "max": 8,
        "integer": true
      },
      "v1History": {
        "type": "array",
        "maxItems": 64
      }
    },
    "aliases": {
      "numShapes": [
        "NUM_SHAPES"
      ]
    },
    "keyFields": [
      "v1",
      "numShapes",
      "angleSpeed",
      "tSpeed",
      "backgroundAlpha",
      "lineWeight",
      "pointSize",
      "zoom",
      "colorModeIndex"
    ],
    "capabilities": {
      "animated": true,
      "settings": true,
      "favorites": true,
      "notes": true,
      "states": true,
      "sessions": true,
      "statistics": true,
      "audio": true
    }
  },
  {
    "id": "fish-wave",
    "title": "Носовая волна",
    "version": 35,
    "controls": [
      [
        "Количество слоёв",
        "numLayers",
        5,
        100,
        1,
        "Слева ↑↓",
        1
      ],
      [
        "Амплитуда волны",
        "waveAmplitude",
        0,
        200,
        0.5,
        "Справа ↑↓",
        1
      ],
      [
        "Толщина линий",
        "strokeW",
        0.3,
        8,
        0.1,
        "Сверху ←→",
        1
      ],
      [
        "Скорость волны",
        "waveSpeed",
        0.001,
        0.2,
        0.001,
        "Снизу ←→",
        1
      ],
      [
        "Расстояние между кольцами",
        "ringSpacing",
        1,
        80,
        0.5,
        "Ползунок",
        0
      ]
    ],
    "colorModes": 3,
    "defaults": {
      "patternId": "fish-wave",
      "numLayers": 40,
      "baseRadius": 10,
      "ringSpacing": 9,
      "waveSpeed": 0.08,
      "waveAmplitude": 5,
      "glitchEnabled": true,
      "glitchOffset": 0.5,
      "ringAlpha": 180,
      "strokeW": 1,
      "colorModeIndex": 0
    },
    "module": null,
    "schemaVersion": 1,
    "schema": {
      "numLayers": {
        "type": "number",
        "min": 5,
        "max": 100,
        "integer": true
      },
      "baseRadius": {
        "type": "number",
        "min": 1,
        "max": 100,
        "integer": false
      },
      "ringSpacing": {
        "type": "number",
        "min": 1,
        "max": 80,
        "integer": false
      },
      "waveSpeed": {
        "type": "number",
        "min": 0.001,
        "max": 0.2,
        "integer": false
      },
      "waveAmplitude": {
        "type": "number",
        "min": 0,
        "max": 200,
        "integer": false
      },
      "glitchEnabled": {
        "type": "boolean"
      },
      "glitchOffset": {
        "type": "number",
        "min": 0,
        "max": 20,
        "integer": false
      },
      "ringAlpha": {
        "type": "number",
        "min": 0,
        "max": 255,
        "integer": false
      },
      "strokeW": {
        "type": "number",
        "min": 0.3,
        "max": 8,
        "integer": false
      },
      "colorModeIndex": {
        "type": "number",
        "min": 0,
        "max": 2,
        "integer": true
      }
    },
    "aliases": {},
    "keyFields": [
      "numLayers",
      "baseRadius",
      "ringSpacing",
      "waveSpeed",
      "waveAmplitude",
      "glitchEnabled",
      "glitchOffset",
      "ringAlpha",
      "strokeW",
      "colorModeIndex"
    ],
    "capabilities": {
      "animated": true,
      "settings": true,
      "favorites": true,
      "notes": true,
      "states": true,
      "sessions": true,
      "statistics": true,
      "audio": true
    }
  },
  {
    "id": "breathing-fractal",
    "title": "Breathing Fractal",
    "version": 1,
    "controls": [
      [
        "Количество ветвей",
        "branches",
        2,
        60,
        1,
        "Слева ↑↓",
        1
      ],
      [
        "Глубина ветвления",
        "layers",
        1,
        10,
        1,
        "Справа ↑↓",
        1
      ],
      [
        "Толщина линий",
        "strokeW",
        0.1,
        8,
        0.1,
        "Сверху ←→",
        1
      ],
      [
        "Скорость дыхания",
        "pulseSpd",
        0.001,
        0.3,
        0.001,
        "Снизу ←→",
        1
      ],
      [
        "Сила дыхания",
        "pulseAmp",
        0.05,
        2,
        0.01,
        "Снизу ←→",
        2
      ],
      [
        "Длина ветвей",
        "baseLen",
        10,
        180,
        0.5,
        "Ползунок",
        0
      ]
    ],
    "colorModes": 3,
    "defaults": {
      "patternId": "breathing-fractal",
      "baseLen": 70,
      "pulseSpd": 0.02,
      "pulseAmp": 0.3,
      "strokeW": 1.5,
      "branches": 8,
      "layers": 4,
      "colorModeIndex": 0,
      "hueRate": 0.004
    },
    "module": null,
    "schemaVersion": 1,
    "schema": {
      "baseLen": {
        "type": "number",
        "min": 10,
        "max": 180,
        "integer": false
      },
      "pulseSpd": {
        "type": "number",
        "min": 0.001,
        "max": 0.3,
        "integer": false
      },
      "pulseAmp": {
        "type": "number",
        "min": 0.05,
        "max": 2,
        "integer": false
      },
      "strokeW": {
        "type": "number",
        "min": 0.1,
        "max": 8,
        "integer": false
      },
      "branches": {
        "type": "number",
        "min": 2,
        "max": 60,
        "integer": true
      },
      "layers": {
        "type": "number",
        "min": 1,
        "max": 10,
        "integer": true
      },
      "colorModeIndex": {
        "type": "number",
        "min": 0,
        "max": 2,
        "integer": true
      },
      "hueRate": {
        "type": "number",
        "min": 0.0001,
        "max": 0.05,
        "integer": false
      }
    },
    "aliases": {
      "colorModeIndex": [
        "clrMode"
      ]
    },
    "keyFields": [
      "baseLen",
      "pulseSpd",
      "pulseAmp",
      "strokeW",
      "branches",
      "layers",
      "colorModeIndex",
      "hueRate"
    ],
    "capabilities": {
      "animated": true,
      "settings": true,
      "favorites": true,
      "notes": true,
      "states": true,
      "sessions": true,
      "statistics": true,
      "audio": true
    }
  },
  {
    "id": "breathing-fractal-growth",
    "title": "Breathing Fractal · Growth",
    "version": 1,
    "controls": [
      [
        "Количество ветвей",
        "branches",
        2,
        60,
        1,
        "Слева ↑↓",
        1
      ],
      [
        "Глубина роста",
        "maxDepth",
        1,
        10,
        1,
        "Справа ↑↓",
        1
      ],
      [
        "Толщина линий",
        "strokeW",
        0.1,
        8,
        0.1,
        "Сверху ←→",
        1
      ],
      [
        "Скорость полного цикла",
        "pulseSpeed",
        0.001,
        0.1,
        0.001,
        "Снизу ←→",
        1
      ],
      [
        "Масштаб",
        "zoom",
        0.3,
        3,
        0.01,
        "Пинч",
        2
      ],
      [
        "Скорость раскрытия уровней",
        "levelSpeedRatio",
        0.2,
        3,
        0.01,
        "Снизу ←→",
        2
      ]
    ],
    "colorModes": 3,
    "defaults": {
      "patternId": "breathing-fractal-growth",
      "baseLen": 70,
      "pulseSpeed": 0.02,
      "strokeW": 1.5,
      "branches": 8,
      "maxDepth": 4,
      "colorModeIndex": 0,
      "hueRate": 0.004,
      "zoom": 1,
      "levelSpeedRatio": 1,
      "firstLevelFactor": 2
    },
    "module": null,
    "schemaVersion": 1,
    "schema": {
      "baseLen": {
        "type": "number",
        "min": 10,
        "max": 180,
        "integer": false
      },
      "pulseSpeed": {
        "type": "number",
        "min": 0.001,
        "max": 0.1,
        "integer": false
      },
      "strokeW": {
        "type": "number",
        "min": 0.1,
        "max": 8,
        "integer": false
      },
      "branches": {
        "type": "number",
        "min": 2,
        "max": 60,
        "integer": true
      },
      "maxDepth": {
        "type": "number",
        "min": 1,
        "max": 10,
        "integer": true
      },
      "colorModeIndex": {
        "type": "number",
        "min": 0,
        "max": 2,
        "integer": true
      },
      "hueRate": {
        "type": "number",
        "min": 0.0001,
        "max": 0.05,
        "integer": false
      },
      "zoom": {
        "type": "number",
        "min": 0.3,
        "max": 3,
        "integer": false
      },
      "levelSpeedRatio": {
        "type": "number",
        "min": 0.2,
        "max": 3,
        "integer": false
      },
      "firstLevelFactor": {
        "type": "number",
        "min": 2,
        "max": 2,
        "integer": false,
        "const": 2
      }
    },
    "aliases": {
      "pulseSpeed": [
        "pulseSpd"
      ],
      "maxDepth": [
        "layers"
      ],
      "colorModeIndex": [
        "clrMode"
      ]
    },
    "keyFields": [
      "baseLen",
      "pulseSpeed",
      "strokeW",
      "branches",
      "maxDepth",
      "colorModeIndex",
      "hueRate",
      "zoom",
      "levelSpeedRatio"
    ],
    "capabilities": {
      "animated": true,
      "settings": true,
      "favorites": true,
      "notes": true,
      "states": true,
      "sessions": true,
      "statistics": true,
      "audio": true
    }
  },
  {
    "id": "rgb-glitch-rings",
    "title": "RGB Glitch Rings",
    "version": 36,
    "controls": [
      [
        "Количество колец",
        "numRings",
        5,
        100,
        1,
        "Слева ↑↓",
        1
      ],
      [
        "Амплитуда волны",
        "waveAmplitude",
        0,
        200,
        0.5,
        "Справа ↑↓",
        1
      ],
      [
        "Толщина RGB-линий",
        "strokeW",
        0.3,
        8,
        0.1,
        "Сверху ←→",
        1
      ],
      [
        "Скорость волны",
        "waveSpeed",
        0.001,
        0.2,
        0.001,
        "Снизу ←→",
        1
      ],
      [
        "Расстояние между кольцами",
        "baseSpacing",
        1,
        80,
        0.5,
        "Ползунок",
        0
      ]
    ],
    "colorModes": 3,
    "defaults": {
      "patternId": "rgb-glitch-rings",
      "numRings": 20,
      "baseSpacing": 20,
      "waveSpeed": 0.03,
      "waveAmplitude": 38,
      "glitchEnabled": true,
      "glitchOffset": 1,
      "ringAlpha": 180,
      "invertDirection": true,
      "strokeW": 1,
      "colorModeIndex": 0
    },
    "module": null,
    "schemaVersion": 1,
    "schema": {
      "numRings": {
        "type": "number",
        "min": 5,
        "max": 100,
        "integer": true
      },
      "baseSpacing": {
        "type": "number",
        "min": 1,
        "max": 80,
        "integer": false
      },
      "waveSpeed": {
        "type": "number",
        "min": 0.001,
        "max": 0.2,
        "integer": false
      },
      "waveAmplitude": {
        "type": "number",
        "min": 0,
        "max": 200,
        "integer": false
      },
      "glitchEnabled": {
        "type": "boolean"
      },
      "glitchOffset": {
        "type": "number",
        "min": 0,
        "max": 20,
        "integer": false
      },
      "ringAlpha": {
        "type": "number",
        "min": 0,
        "max": 255,
        "integer": false
      },
      "invertDirection": {
        "type": "boolean"
      },
      "strokeW": {
        "type": "number",
        "min": 0.3,
        "max": 8,
        "integer": false
      },
      "colorModeIndex": {
        "type": "number",
        "min": 0,
        "max": 2,
        "integer": true
      }
    },
    "aliases": {},
    "keyFields": [
      "numRings",
      "baseSpacing",
      "waveSpeed",
      "waveAmplitude",
      "glitchEnabled",
      "glitchOffset",
      "ringAlpha",
      "invertDirection",
      "strokeW",
      "colorModeIndex"
    ],
    "capabilities": {
      "animated": true,
      "settings": true,
      "favorites": true,
      "notes": true,
      "states": true,
      "sessions": true,
      "statistics": true,
      "audio": true
    },
    "legacyVersions": [
      1
    ]
  },
  {
    "id": "stereo-dna",
    "title": "Stereo DNA",
    "version": 1,
    "controls": [
      [
        "Плотность ДНК",
        "spacing",
        4,
        30,
        0.1,
        "↑↓",
        1
      ],
      [
        "Амплитуда спирали",
        "amplitude",
        10,
        100,
        0.5,
        "←→",
        1
      ],
      [
        "Масштаб",
        "zoom",
        0.3,
        5,
        0.01,
        "Пинч",
        2
      ],
      [
        "Стереоугол",
        "stereoAngle",
        0.01,
        0.6,
        0.001,
        "Вместе ←→",
        2
      ],
      [
        "Скорость движения",
        "timeSpeed",
        0.001,
        0.1,
        0.001,
        "Ползунок",
        0
      ],
      [
        "Размер точек",
        "pointSize",
        1,
        8,
        0.1,
        "Ползунок",
        0
      ]
    ],
    "colorModes": 9,
    "defaults": {
      "patternId": "stereo-dna",
      "angleStep": 0.25,
      "spacing": 10,
      "numPoints": 300,
      "amplitude": 55,
      "eyeSeparation": 150,
      "stereoAngle": 0.42,
      "zoom": 1,
      "glowStrength": 150,
      "timeSpeed": 0.02,
      "pointSize": 3,
      "colorModeIndex": 0
    },
    "module": null,
    "schemaVersion": 1,
    "schema": {
      "angleStep": {
        "type": "number",
        "min": 0.02,
        "max": 1.2,
        "integer": false
      },
      "spacing": {
        "type": "number",
        "min": 4,
        "max": 30,
        "integer": false
      },
      "numPoints": {
        "type": "number",
        "min": 40,
        "max": 600,
        "integer": true
      },
      "amplitude": {
        "type": "number",
        "min": 10,
        "max": 100,
        "integer": false
      },
      "eyeSeparation": {
        "type": "number",
        "min": 20,
        "max": 320,
        "integer": false
      },
      "stereoAngle": {
        "type": "number",
        "min": 0.01,
        "max": 0.6,
        "integer": false
      },
      "zoom": {
        "type": "number",
        "min": 0.3,
        "max": 5,
        "integer": false
      },
      "glowStrength": {
        "type": "number",
        "min": 20,
        "max": 255,
        "integer": false
      },
      "timeSpeed": {
        "type": "number",
        "min": 0.001,
        "max": 0.1,
        "integer": false
      },
      "pointSize": {
        "type": "number",
        "min": 1,
        "max": 8,
        "integer": false
      },
      "colorModeIndex": {
        "type": "number",
        "min": 0,
        "max": 8,
        "integer": true
      }
    },
    "aliases": {},
    "keyFields": [
      "angleStep",
      "spacing",
      "numPoints",
      "amplitude",
      "eyeSeparation",
      "stereoAngle",
      "zoom",
      "glowStrength",
      "timeSpeed",
      "pointSize",
      "colorModeIndex"
    ],
    "capabilities": {
      "animated": true,
      "settings": true,
      "favorites": true,
      "notes": true,
      "states": true,
      "sessions": true,
      "statistics": true,
      "audio": true
    }
  },
  {
    "id": "breathing-grid",
    "title": "Breathing Grid",
    "version": 1,
    "controls": [
      [
        "Колонки",
        "cols",
        6,
        36,
        1,
        "Слева ↑↓",
        1
      ],
      [
        "Сила дыхания",
        "amp",
        0,
        0.45,
        0.01,
        "Справа ↑↓",
        1
      ],
      [
        "Толщина линий",
        "lineWidth",
        0.3,
        3,
        0.1,
        "Сверху ←→",
        1
      ],
      [
        "Скорость",
        "speed",
        0.005,
        0.08,
        0.001,
        "Снизу ←→",
        1
      ],
      [
        "Ряды",
        "rows",
        4,
        24,
        1,
        "Слева ↑↓",
        2
      ],
      [
        "Размер прямоугольников",
        "scale",
        0.3,
        1.1,
        0.01,
        "Справа ↑↓",
        2
      ],
      [
        "Волна по горизонтали",
        "phaseX",
        0,
        1.2,
        0.01,
        "Сверху ←→",
        2
      ],
      [
        "Скорость цвета",
        "hueSpeed",
        0,
        60,
        1,
        "Снизу ←→",
        2
      ],
      [
        "Волна по вертикали",
        "phaseY",
        0,
        1.2,
        0.01,
        "Ползунок",
        0
      ],
      [
        "Прозрачность",
        "alpha",
        0.15,
        1,
        0.01,
        "Ползунок",
        0
      ]
    ],
    "colorModes": 9,
    "defaults": {
      "patternId": "breathing-grid",
      "cols": 20,
      "rows": 12,
      "amp": 0.2,
      "speed": 0.03,
      "scale": 0.8,
      "lineWidth": 1.2,
      "hueSpeed": 20,
      "phaseX": 0.2,
      "phaseY": 0.3,
      "alpha": 0.7,
      "colorModeIndex": 0
    },
    "module": null,
    "schemaVersion": 1,
    "schema": {
      "cols": {
        "type": "number",
        "min": 6,
        "max": 36,
        "integer": true
      },
      "rows": {
        "type": "number",
        "min": 4,
        "max": 24,
        "integer": true
      },
      "amp": {
        "type": "number",
        "min": 0,
        "max": 0.45,
        "integer": false
      },
      "speed": {
        "type": "number",
        "min": 0.005,
        "max": 0.08,
        "integer": false
      },
      "scale": {
        "type": "number",
        "min": 0.3,
        "max": 1.1,
        "integer": false
      },
      "lineWidth": {
        "type": "number",
        "min": 0.3,
        "max": 3,
        "integer": false
      },
      "hueSpeed": {
        "type": "number",
        "min": 0,
        "max": 60,
        "integer": true
      },
      "phaseX": {
        "type": "number",
        "min": 0,
        "max": 1.2,
        "integer": false
      },
      "phaseY": {
        "type": "number",
        "min": 0,
        "max": 1.2,
        "integer": false
      },
      "alpha": {
        "type": "number",
        "min": 0.15,
        "max": 1,
        "integer": false
      },
      "colorModeIndex": {
        "type": "number",
        "min": 0,
        "max": 8,
        "integer": true
      }
    },
    "aliases": {},
    "keyFields": [
      "cols",
      "rows",
      "amp",
      "speed",
      "scale",
      "lineWidth",
      "hueSpeed",
      "phaseX",
      "phaseY",
      "alpha",
      "colorModeIndex"
    ],
    "capabilities": {
      "animated": true,
      "settings": true,
      "favorites": true,
      "notes": true,
      "states": true,
      "sessions": true,
      "statistics": true,
      "audio": true
    }
  },
  {
    "id": "spiral-snakes-3d",
    "title": "Spiral Snakes 3D",
    "version": 1,
    "schemaVersion": 1,
    "colorModes": 9,
    "module": "standalone-pattern-spiral-snakes-3d.js",
    "defaults": {
      "patternId": "spiral-snakes-3d",
      "numSnakes": 60,
      "baseHistory": 1000,
      "waveFreq": 3,
      "waveSpeed": 0.02,
      "zoom": 1,
      "pointSize": 1.2,
      "colorModeIndex": 0
    },
    "controls": [
      ["Частота волны","waveFreq",1,12,0.1,"Сверху ←→",1],
      ["Скорость волны","waveSpeed",0.005,0.08,0.001,"Снизу ↑↓",1],
      ["Масштаб","zoom",0.2,3,0.01,"Пинч",2],
      ["Количество змей","numSnakes",8,120,1,"Ползунок",0],
      ["Длина следа","baseHistory",100,1200,20,"Ползунок",0],
      ["Толщина точек","pointSize",0.5,3,0.1,"Ползунок",0]
    ],
    "keyFields": ["numSnakes","baseHistory","waveFreq","waveSpeed","zoom","pointSize","colorModeIndex"]
  }
];
  // SETKA_AUTO_DISCOVERY_BEGIN
  const discovered=[]; // generated at build time from standalone-pattern-*.js descriptors
  // SETKA_AUTO_DISCOVERY_END
  for(const p of [...builtins,...discovered])register(p);
})();
