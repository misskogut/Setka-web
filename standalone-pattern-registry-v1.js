(()=>{
"use strict";
// One public, versioned metadata registry for the SETKA front, research UI,
// guest/community analytics and future plug-in renderers.
// A pattern brings ONE descriptor (id/title/defaults/render/controls): other
// features subscribe to registry events instead of keeping their own ID lists.
if(window.SetkaPatternRegistryV1)return;
const records=new Map();
const safeId=id=>typeof id==="string"&&/^[a-z][a-z0-9-]{2,79}$/.test(id);
const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
function register(raw){
 if(!raw||!safeId(raw.id))throw new Error("invalid_pattern_id");
 if(!Array.isArray(raw.controls))throw new Error("pattern_controls_required");
 const p={id:raw.id,title:String(raw.title||raw.id).slice(0,80),
  version:Math.max(1,Math.min(999,Math.round(Number(raw.version)||1))),
  controls:copy(raw.controls),colorModes:Math.max(1,Math.min(9,Math.round(Number(raw.colorModes)||9))),
  ...raw,defaults:copy(raw.defaults||{})};
 records.set(p.id,p);
 window.dispatchEvent(new CustomEvent("setka:registry-changed",{detail:{patternId:p.id}}));
 return p;
}
const initial=[{"id":"tentacle-orbit","title":"Tentacle Orbit","version":1,"controls":[["Количество щупалец","numTentacles",3,72,1,"Слева ↑↓",1],["Размер кругов","circleSize",0.2,20,0.1,"Справа ↑↓",1],["Толщина линий","lineWeight",0.1,10,0.1,"Сверху ←→",1],["Скорость движения","movementSpeed",0.05,10,0.01,"Снизу ←→",1],["Длина щупалец","tentacleLength",10,800,1,"Слева ↑↓",2],["Плотность кругов","segmentStep",1,20,1,"Справа ↑↓",2],["Скорость цвета","colorSpeed",0.05,10,0.01,"Снизу ←→",2]]},{"id":"dandelion","title":"Одуванчик","version":1,"controls":[["Скорость развития формы","tSpeed",0.001,0.02,0.001,"←→",1],["Количество линий","numShapes",50,1000,1,"↑↓",1],["Скорость вращения","angleSpeed",0.001,0.05,0.001,"←→",2],["Толщина линий","lineWeight",0.1,10,0.1,"↑↓",2],["Масштаб","zoom",0.2,5,0.01,"Пинч",2],["Размер точек","pointSize",0.2,20,0.1,"Ползунок",0]]},{"id":"fish-wave","title":"Носовая волна","version":35,"controls":[["Количество слоёв","numLayers",5,100,1,"Слева ↑↓",1],["Амплитуда волны","waveAmplitude",0,200,0.5,"Справа ↑↓",1],["Толщина линий","strokeW",0.3,8,0.1,"Сверху ←→",1],["Скорость волны","waveSpeed",0.001,0.2,0.001,"Снизу ←→",1],["Расстояние между кольцами","ringSpacing",1,80,0.5,"Ползунок",0]]},{"id":"breathing-fractal","title":"Breathing Fractal","version":1,"controls":[["Количество ветвей","branches",2,60,1,"Слева ↑↓",1],["Глубина ветвления","layers",1,10,1,"Справа ↑↓",1],["Толщина линий","strokeW",0.1,8,0.1,"Сверху ←→",1],["Скорость дыхания","pulseSpd",0.001,0.3,0.001,"Снизу ←→",1],["Сила дыхания","pulseAmp",0.05,2,0.01,"Снизу ←→",2],["Длина ветвей","baseLen",10,180,0.5,"Ползунок",0]]},{"id":"breathing-fractal-growth","title":"Breathing Fractal · Growth","version":1,"controls":[["Количество ветвей","branches",2,60,1,"Слева ↑↓",1],["Глубина роста","maxDepth",1,10,1,"Справа ↑↓",1],["Толщина линий","strokeW",0.1,8,0.1,"Сверху ←→",1],["Скорость полного цикла","pulseSpeed",0.001,0.1,0.001,"Снизу ←→",1],["Масштаб","zoom",0.3,3,0.01,"Пинч",2],["Скорость раскрытия уровней","levelSpeedRatio",0.2,3,0.01,"Снизу ←→",2]]},{"id":"rgb-glitch-rings","title":"RGB Glitch Rings","version":36,"controls":[["Количество колец","numRings",5,100,1,"Слева ↑↓",1],["Амплитуда волны","waveAmplitude",0,200,0.5,"Справа ↑↓",1],["Толщина RGB-линий","strokeW",0.3,8,0.1,"Сверху ←→",1],["Скорость волны","waveSpeed",0.001,0.2,0.001,"Снизу ←→",1],["Расстояние между кольцами","baseSpacing",1,80,0.5,"Ползунок",0]]},{"id":"stereo-dna","title":"Stereo DNA","version":1,"controls":[["Плотность ДНК","spacing",4,30,0.1,"↑↓",1],["Амплитуда спирали","amplitude",10,100,0.5,"←→",1],["Масштаб","zoom",0.3,5,0.01,"Пинч",2],["Стереоугол","stereoAngle",0.01,0.6,0.001,"Вместе ←→",2],["Скорость движения","timeSpeed",0.001,0.1,0.001,"Ползунок",0],["Размер точек","pointSize",1,8,0.1,"Ползунок",0]]},{"id":"breathing-grid","title":"Breathing Grid","version":1,"controls":[["Колонки","cols",6,36,1,"Слева ↑↓",1],["Сила дыхания","amp",0,0.45,0.01,"Справа ↑↓",1],["Толщина линий","lineWidth",0.3,3,0.1,"Сверху ←→",1],["Скорость","speed",0.005,0.08,0.001,"Снизу ←→",1],["Ряды","rows",4,24,1,"Слева ↑↓",2],["Размер прямоугольников","scale",0.3,1.1,0.01,"Справа ↑↓",2],["Волна по горизонтали","phaseX",0,1.2,0.01,"Сверху ←→",2],["Скорость цвета","hueSpeed",0,60,1,"Снизу ←→",2],["Волна по вертикали","phaseY",0,1.2,0.01,"Ползунок",0],["Прозрачность","alpha",0.15,1,0.01,"Ползунок",0]]}];
for(const descriptor of initial)register(descriptor);
const api={
 register,get:id=>records.get(id)||null,
 has:id=>records.has(id),
 ids:()=>[...records.keys()],
 list:()=>[...records.values()].map(p=>({id:p.id,title:p.title,version:p.version,
   controls:copy(p.controls),colorModes:p.colorModes,defaults:copy(p.defaults||{}),module:p.module||null})),
 controls:id=>copy(records.get(id)?.controls||[]),
 attachEngine:S=>{
   for(const p of S?.getPatterns?.()||[]){
     const previous=records.get(p.id)||{};
     register({...previous,...p,controls:previous.controls||[],colorModes:previous.colorModes||9});
   }
 },
 inference:c=>{
  const id=c?.patternId||c?.baseId;
  if(records.has(id))return id;
  // A missing ID is a legacy recovery situation, not an opportunity to map
  // every future unknown renderer to Tentacle Orbit.
  for(const p of records.values()){
   const required=(p.controls||[]).map(x=>x[1]).filter(k=>k!=="colorModeIndex");
   if(required.length>=3&&required.filter(k=>c?.[k]!==undefined).length>=Math.min(3,required.length))
     return p.id;
  }
  return null;
 }
};
window.SetkaPatternRegistryV1=api;
})();