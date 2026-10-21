import fs from "node:fs";
import vm from "node:vm";

// A new SETKA pattern is one renderer file with a declarative header:
// standalone-pattern-<id>.js. No changes to the registry, front or research
// admin are needed for subsequent patterns. This build discovers such files,
// validates descriptors against the canonical registry, and produces one
// consistent runtime registry + server manifest.
const REGISTRY="standalone-pattern-registry-v1.js";
const BEGIN="  // SETKA_AUTO_DISCOVERY_BEGIN";
const END="  // SETKA_AUTO_DISCOVERY_END";
const HEADER=/^\/\*\s*SETKA_PATTERN_DESCRIPTOR\s*\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR\s*\*\//;
const source=fs.readFileSync(REGISTRY,"utf8");
const start=source.indexOf(BEGIN),finish=source.indexOf(END);
if(start<0||finish<start||source.indexOf(BEGIN,start+1)!==-1||source.indexOf(END,finish+1)!==-1){
  throw Error("SETKA registry auto-discovery boundary missing or duplicated");
}
const discovered=[];
const seen=new Set();
for(const entry of fs.readdirSync(".",{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  if(!entry.isFile()||!/^standalone-pattern-[a-z0-9-]+\.js$/.test(entry.name))continue;
  const moduleSource=fs.readFileSync(entry.name,"utf8");
  const marker=moduleSource.match(HEADER);
  if(!marker)continue; // legacy platform helpers are not pattern packages
  let descriptor;
  try{descriptor=JSON.parse(marker[1]);}catch(e){throw Error("Invalid pattern descriptor in "+entry.name+": "+e.message)}
  if(!descriptor||typeof descriptor!=="object"||Array.isArray(descriptor)
    ||!/^[a-z][a-z0-9-]{2,79}$/.test(descriptor.id)
    ||descriptor.module!==entry.name
    ||seen.has(descriptor.id)){
    throw Error("Invalid/duplicate pattern package: "+entry.name);
  }
  // Mandatory new-pattern invariant: first launch is black background and
  // white (RGB 255/255/255) artwork. Palette is reused by the renderer.
  const initialPalette=descriptor.palettes?.[descriptor.defaults?.colorModeIndex??0];
  if(!Array.isArray(descriptor.palettes)||
      descriptor.palettes.length!==descriptor.colorModes||
      !Array.isArray(initialPalette)||
      initialPalette.length!==3||initialPalette.some(v=>v!==255)){
    throw Error("SETKA black-white initial palette required: "+entry.name);
  }
  seen.add(descriptor.id);
  discovered.push(descriptor);
}
const generated=source.slice(0,start+BEGIN.length)+"\n  const discovered="+JSON.stringify(discovered,null,2).replace(/\n/g,"\n  ")+";\n  "+source.slice(finish);
const context={window:{dispatchEvent(){}},CustomEvent:class{constructor(type,args){this.type=type;this.detail=args?.detail}}};
vm.runInNewContext(generated,vm.createContext(context),{timeout:1500});
const registry=context.window.SetkaPatternRegistryV1;
const rows=registry?.list?.()||[];
const unique=new Set();
for(const p of rows){
  if(!/^[a-z][a-z0-9-]{2,79}$/.test(p.id)||unique.has(p.id))throw Error("Invalid/duplicate pattern ID");
  unique.add(p.id);
  const validation=registry.validate(p.defaults,p.id);
  if(!validation.ok)throw Error("Invalid default config: "+p.id);
}
if(rows.length<8)throw Error("Missing canonical SETKA patterns");
// Only write after all packages pass validation. The output registry and
// manifest are built from the exact same descriptor set.
fs.writeFileSync(REGISTRY,generated);
fs.writeFileSync("setka-pattern-manifest-v1.json",JSON.stringify({
  schema:1,configSchemaVersion:2,registryRevision:registry.revision(),patterns:rows
},null,2)+"\n");
console.log("SETKA patterns (auto-discovered):",discovered.map(p=>p.id).join(", ")||"none");
console.log("Generated pattern manifest for",rows.map(p=>p.id).join(", "));
