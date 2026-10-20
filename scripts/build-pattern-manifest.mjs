import fs from "node:fs";
import vm from "node:vm";
// The registry JS is the only manually authored descriptor catalog.
// Generate a public read-only manifest during the SAME GitHub Pages build,
// so the server does not need a separate catalog update for each new pattern.
const source=fs.readFileSync("standalone-pattern-registry-v1.js","utf8");
const context={window:{dispatchEvent(){}},CustomEvent:class{constructor(type,args){this.type=type;this.detail=args?.detail}}};
vm.runInNewContext(source,vm.createContext(context),{timeout:1500});
const raw=context.window.SetkaPatternRegistryV1?.list?.()||[];
const seen=new Set();
const rows=raw.map(p=>{
 if(!/^[a-z][a-z0-9-]{2,79}$/.test(p.id)||seen.has(p.id))throw Error("Invalid/duplicate pattern ID");
 seen.add(p.id);
 return{id:p.id,title:String(p.title||p.id).slice(0,80),version:p.version,controls:p.controls,colorModes:p.colorModes};
});
if(rows.length<8)throw Error("Missing canonical SETKA patterns");
fs.writeFileSync("setka-pattern-manifest-v1.json",JSON.stringify({schema:1,patterns:rows},null,2)+"\n");
console.log("Generated pattern manifest for",rows.map(p=>p.id).join(", "));
