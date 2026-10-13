// Versioned configuration-code contract from app-v7-multipattern.js.
// A historical RGB v35 used today's fish-wave renderer under the old RGB ID.
// Recorded identity is retained; only the renderer is mapped. No default recipe.
export const CONFIG_FIELDS={
 'tentacle-orbit':['numTentacles','tentacleLength','baseRadius','movementSpeed','colorSpeed','circleSize','lineWeight','segmentStep','colorModeIndex'],
 dandelion:['v1','numShapes','angleSpeed','tSpeed','backgroundAlpha','lineWeight','pointSize','zoom','colorModeIndex'],
 'fish-wave':['numLayers','baseRadius','ringSpacing','waveSpeed','waveAmplitude','glitchEnabled','glitchOffset','ringAlpha','strokeW','colorModeIndex'],
 'breathing-fractal':['baseLen','pulseSpd','pulseAmp','strokeW','branches','layers','colorModeIndex','hueRate'],
 'breathing-fractal-growth':['baseLen','pulseSpeed','strokeW','branches','maxDepth','colorModeIndex','hueRate','zoom','levelSpeedRatio'],
 'rgb-glitch-rings':['numRings','baseSpacing','waveSpeed','waveAmplitude','glitchEnabled','glitchOffset','ringAlpha','invertDirection','strokeW','colorModeIndex'],
 'stereo-dna':['angleStep','spacing','numPoints','amplitude','eyeSeparation','stereoAngle','zoom','glowStrength','timeSpeed','pointSize']
};
const VERSIONS={'tentacle-orbit':1,dandelion:1,'fish-wave':35,'breathing-fractal':1,'breathing-fractal-growth':1,'rgb-glitch-rings':36,'stereo-dna':1};
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
 const fields=CONFIG_FIELDS[renderId],original=state.config&&typeof state.config==='object'?state.config:{};
 let values=String(state.configKey||state.configHash||'').split('|'),decoded=null;
 if(values[0]===recordedId)values=values.slice(1);
 else if(recordedId!=='tentacle-orbit')values=[];
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
   if(BOOL.has(k)?typeof config[k]!=='boolean':!finite(config[k]))return fail('incomplete_configuration',{missing:fields.filter(k=>!(k in config))});
   if(decoded&&k in original){
    const matches=BOOL.has(k)?original[k]===decoded[k]:Math.abs(Number(original[k])-Number(decoded[k]))<=.000011;
    if(!matches)return fail('configuration_conflict');
   }
 }
 // These constants were renderer law, never mutable settings in these versions.
 if(renderId==='stereo-dna')config.colorModeIndex=0;
 if(renderId==='breathing-fractal-growth')config.firstLevelFactor=2;
 return {ok:true,recordedId,renderId,recordedVersion:version,renderVersion:VERSIONS[renderId],config,
  compatibility:alias?'historical-alias':'current',configurationSource:fields.every(k=>k in original)?'snapshot':'configuration-code'};
}
