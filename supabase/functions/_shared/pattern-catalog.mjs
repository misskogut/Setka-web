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
