// Front, note previews and research event replay share the same algorithms.
// This entry initializes no UI, personal storage or telemetry.
import '../standalone-pattern-registry-v1.js?v=1.2.0-spiral-snakes-20261021';
import '../standalone-pattern-renderers-v1.js';
import '../standalone-pattern-plugins-v1.js';
const registry=globalThis.SetkaPatternRegistryV1;
if(typeof document==='object')await globalThis.SetkaPatternPluginsV1?.ready?.();
export const rendererVersion='setka-pattern-contract-2';
const current=()=>registry.list().map(p=>({...p,title:registry.title(p.id),defaults:registry.defaults(p.id)}));
export const patterns=new Proxy([], {get:(_target,key)=>{const list=current(),value=list[key];return typeof value==='function'?value.bind(list):value}});
export const exactPattern=id=>{const p=registry.get(id);return p?{...p,title:registry.title(id),defaults:registry.defaults(id)}:null};
export const cloneConfig=(c,id)=>registry.normalize(c,id);
export const configKey=(c,id)=>registry.configKey(c,id);
export function draw(canvas,config,frame,id,preview=false){
 if(!registry.has(id)||!config||!Number.isFinite(Number(frame)))return false;
 const ctx=canvas.getContext('2d');if(!ctx)return false;
 try{ctx.setTransform(1,0,0,1,0,0);registry.render(ctx,canvas.width,canvas.height,config,Number(frame),preview,id);return true}
 catch(_){return false}
}
