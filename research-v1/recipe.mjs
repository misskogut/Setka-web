// Versioned configuration-code contract from app-v7-multipattern.js.
// A historical RGB v35 used today's fish-wave renderer under the old RGB ID.
// Recorded identity is retained; only the renderer is mapped. No default recipe.
import '../standalone-pattern-registry-v1.js';
const registry=globalThis.SetkaPatternRegistryV1;
export const CONFIG_FIELDS=new Proxy({}, {get:(_,id)=>{const p=registry.get(id);return p&&(p.keyFields||Object.keys(p.schema))}});
const VERSIONS=new Proxy({}, {get:(_,id)=>registry.get(id)?.version});
const BOOL=new Set(['glitchEnabled','invertDirection']);
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
export function resolveRecipe(state={}){
 const recordedId=state.patternId||state.config?.patternId||null;
 const fail=(reason,extra={})=>({ok:false,reason,recordedId,...extra});
 if(!CONFIG_FIELDS[recordedId])return fail('unknown_pattern');
 const version=state.patternVersion==null?null:Number(state.patternVersion);
 if(version!==null&&!Number.isFinite(version))return fail('unsupported_version');
 const renderId=recordedId==='rgb-glitch-rings'&&version===35?'fish-wave':recordedId;
 const alias=renderId!==recordedId||recordedId==='rgb-glitch-rings'&&version===1;
 if(version!==null&&version!==VERSIONS[renderId]&&!alias)return fail('unsupported_version');
 let fields=CONFIG_FIELDS[renderId];const original=state.config&&typeof state.config==='object'?state.config:{};
 let values=String(state.configKey||state.configHash||'').split('|'),decoded=null;
 if(values[0]===recordedId)values=values.slice(1);
 else if(recordedId!=='tentacle-orbit')values=[];
 const oldDna=renderId==='stereo-dna'&&values.length===fields.length-1;
 if(oldDna)fields=fields.filter(k=>k!=='colorModeIndex');
 if(values.length===fields.length&&values.every(finite)){
   decoded={};for(let i=0;i<fields.length;i++){
    const k=fields[i],v=Number(values[i]);
    if(BOOL.has(k)&&v!==0&&v!==1)return fail('invalid_configuration_code');
    decoded[k]=BOOL.has(k)?v===1:v;
   }
 }
 // Historical RGB 1 is only recognized by its recorded ring recipe.
 if(alias&&!decoded&&!fields.every(k=>k in original))return fail('incomplete_configuration');
 const config={...decoded,...original,patternId:renderId};
 for(const k of fields){
   const rule=registry.get(renderId)?.schema?.[k];
   const value=config[k],valid=rule?.type==='boolean'?typeof value==='boolean':rule?.type==='string'?typeof value==='string':rule?.type==='array'?Array.isArray(value):finite(value);
   if(!valid)return fail('incomplete_configuration',{missing:fields.filter(k=>!(k in config))});
   if(decoded&&k in original){
    const matches=BOOL.has(k)?original[k]===decoded[k]:Math.abs(Number(original[k])-Number(decoded[k]))<=.000011;
    if(!matches)return fail('configuration_conflict');
   }
 }
 // These constants were renderer law, never mutable settings in these versions.
 if(renderId==='stereo-dna'&&config.colorModeIndex==null&&oldDna)config.colorModeIndex=0;
 if(renderId==='breathing-fractal-growth')config.firstLevelFactor=2;
 if(!registry.validate(config,renderId).ok)return fail('invalid_configuration');
 return {ok:true,recordedId,renderId,recordedVersion:version,renderVersion:VERSIONS[renderId],config,
  compatibility:alias?'historical-alias':'current',configurationSource:fields.every(k=>k in original)?'snapshot':'configuration-code'};
}
