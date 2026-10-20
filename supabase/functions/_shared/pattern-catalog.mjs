// Schema and algorithm versions come from the generated code manifest.
// Database revisions describe editorial changes, never renderer versions.
export function parseManifest(value){
  if(value?.schema!==1||!Array.isArray(value.patterns)||!value.patterns.length||value.patterns.length>500)throw Error('invalid_catalog');
  const ids=new Set();
  for(const p of value.patterns){
    if(!/^[a-z][a-z0-9-]{2,79}$/.test(p.id)||ids.has(p.id)||!Number.isInteger(p.version)||p.version<1||typeof p.title!=='string'||!p.title.trim()||p.title.length>80)throw Error('invalid_catalog');
    ids.add(p.id);
  }
  return value;
}
export async function loadManifest(fetcher=fetch){
  const res=await fetcher('https://misskogut.github.io/Setka-web/setka-pattern-manifest-v1.json',{
    cache:'no-store',signal:AbortSignal.timeout(6000),headers:{accept:'application/json'}});
  if(!res.ok)throw Error('catalog_unavailable');return parseManifest(await res.json());
}
export function assertConfiguration(descriptor,config){
  if(!descriptor?.schema||!config||typeof config!=='object'||Array.isArray(config)||config.patternId!==descriptor.id)throw Error('invalid_configuration');
  if(Object.keys(config).some(k=>k!=='patternId'&&!Object.hasOwn(descriptor.schema,k)))throw Error('unknown_parameter');
  for(const [key,r] of Object.entries(descriptor.schema)){
    const v=config[key];
    const valid=r.type==='number'?typeof v==='number'&&Number.isFinite(v)&&v>=r.min&&v<=r.max&&(!r.integer||Number.isInteger(v)):
      r.type==='boolean'?typeof v==='boolean':r.type==='array'?Array.isArray(v)&&v.length<=(r.maxItems||64)&&v.every(Number.isFinite):
      r.type==='string'?typeof v==='string'&&v.length<=(r.maxLength||200):false;
    if(!valid||r.const!==undefined&&v!==r.const)throw Error('invalid_parameter:'+key);
  }
  return config;
}
export function catalogRows(manifest,rows){
  const names=new Map(rows.map(x=>[x.pattern_id,x]));
  return manifest.patterns.map(p=>({...names.get(p.id),pattern_id:p.id,title:names.get(p.id)?.title||p.title,
    revision:names.get(p.id)?.revision||1,pattern_version:p.version,config_schema_version:p.schemaVersion||1}));
}

// Bounded transport for recorded research recipes, including historical data.
// New scalar/array parameters need no separate server-side key registration.
export function researchConfig(raw){
 const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},out={};
 const id=source.patternId||source.baseId;if(typeof id==='string'&&/^[a-z][a-z0-9-]{2,79}$/.test(id))out.patternId=id;
 for(const [key,value] of Object.entries(source).slice(0,128)){
  if(key==='patternId'||key==='baseId'||!/^[_a-zA-Z][_a-zA-Z0-9]{0,63}$/.test(key)||['__proto__','prototype','constructor'].includes(key))continue;
  if(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e8)out[key]=value;
  else if(typeof value==='string'&&value.length<=200)out[key]=value;
  else if(Array.isArray(value))out[key]=value.filter(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e8).slice(-64);
 }
 return out;
}
