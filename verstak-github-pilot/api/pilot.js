import{createHash,createHmac,timingSafeEqual,randomUUID}from"node:crypto";
// SETKA VERSTAK pilot: GitHub is a PRIVATE inbox; CANON is the ONLY graph author.
// No identities are issued or graph relations inferred here.
const REPO=process.env.VERSTAK_GITHUB_REPO||"",TOKEN=process.env.VERSTAK_GITHUB_TOKEN||"",SECRET=process.env.VERSTAK_SESSION_SECRET||"",BASE="https://api.github.com";
const ready=()=>/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(REPO)&&TOKEN.length>15&&SECRET.length>=32;
const validId=s=>/^SETKA-H-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(s);
const validShip=s=>/^SHIP-[A-Z0-9-]{3,84}$/.test(s)&&!s.includes("MOTHER")&&!s.includes("CANON");
const sha=s=>createHash("sha256").update(s).digest("hex");
const sign=s=>createHmac("sha256",SECRET).update(s).digest("base64url");
const equal=(a,b)=>{const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&timingSafeEqual(aa,bb)};
function respond(res,status,obj){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");res.end(JSON.stringify(obj))}
function setCookie(res,value,age){res.setHeader("Set-Cookie","setka_pilot_session="+value+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age="+age)}
function mint(a){const p=Buffer.from(JSON.stringify({sub:a.setkaId,ship:a.shipCode,exp:Date.now()+7*86400e3})).toString("base64url");return p+"."+sign(p)}
function session(req){const raw=String(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("setka_pilot_session="))?.split("=")[1]||"";const [p,s,...rest]=raw.split(".");if(!p||!s||rest.length||p.length>900||!equal(sign(p),s))return null;try{const a=JSON.parse(Buffer.from(p,"base64url").toString("utf8"));return validId(a.sub)&&validShip(a.ship)&&a.exp>Date.now()?a:null}catch{return null}}
async function gh(path,method="GET",value){
 const url=BASE+"/repos/"+REPO+"/contents/"+path.split("/").map(encodeURIComponent).join("/");
 const headers={Authorization:"Bearer "+TOKEN,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 let body;if(method==="PUT"){headers["Content-Type"]="application/json";body=JSON.stringify({message:"pilot: append private inbox event",content:Buffer.from(JSON.stringify(value)).toString("base64")})}
 const r=await fetch(url,{method,headers,body,signal:AbortSignal.timeout(12000)});
 if(r.status===404)return{missing:true};if(!r.ok)return{error:"github_failed",status:r.status};
 const d=await r.json();if(Array.isArray(d))return{items:d};if(method==="PUT")return{written:true};
 if(d.type!=="file"||d.size>3000000)return{error:"invalid_file"};try{return{value:JSON.parse(Buffer.from(d.content.replace(/\n/g,""),"base64").toString("utf8"))}}catch{return{error:"invalid_json"}}
}
async function ensurePrivate(){const r=await fetch(BASE+"/repos/"+REPO,{headers:{Authorization:"Bearer "+TOKEN,Accept:"application/vnd.github+json"},signal:AbortSignal.timeout(12000)});return r.ok&&(await r.json()).private===true}
async function identity(id){const a=(await gh("identities/"+id+".json")).value;return a&&a.version==="SETKA_AUTH_BINDING_V1"&&a.setkaId===id&&validShip(a.shipCode)&&a.status==="ACTIVE"&&/^[0-9a-f]{64}$/.test(a.secretHashSha256||"")?a:null}
async function permitted(s){const a=await identity(s.sub);return a&&a.shipCode===s.ship}
async function inbox(ship){const l=await gh("ships/"+ship+"/inbox");if(l.missing)return[];if(!l.items)return null;const rows=l.items.filter(x=>x.type==="file"&&/^[a-f0-9-]{36}\.json$/.test(x.name)).slice(-25).reverse();const out=[];
 for(const row of rows){const x=(await gh("ships/"+ship+"/inbox/"+row.name)).value;if(x&&x.kind==="USER_INBOX"&&x.shipCode===ship)out.push({id:x.id,text:String(x.text||"").slice(0,8000),at:x.at,processing:"AWAITING_CANON"})}return out}
export default async function handler(req,res){
 if(req.method!=="POST")return respond(res,405,{ok:false,error:"method_not_allowed"});
 if(req.headers.origin&&req.headers.origin!=="https://"+req.headers.host)return respond(res,403,{ok:false,error:"origin_mismatch"});
 if(!ready())return respond(res,503,{ok:false,error:"private_github_not_configured"});
 try{if(!await ensurePrivate())return respond(res,503,{ok:false,error:"private_github_required"});
 const b=req.body;if(!b||typeof b!=="object"||Array.isArray(b)||JSON.stringify(b).length>12000)return respond(res,400,{ok:false,error:"invalid_payload"});
 const action=String(b.action||"");
 if(action==="login"){const id=String(b.setkaId||"").toUpperCase().trim(),code=String(b.accessCode||"").trim().toLowerCase();
  if(!validId(id)||!/^[0-9a-f]{64}$/.test(code))return respond(res,401,{ok:false,error:"invalid_credentials"});
  const a=await identity(id);if(!a||!equal(sha(code),a.secretHashSha256))return respond(res,401,{ok:false,error:"invalid_credentials"});
  setCookie(res,mint(a),7*86400);return respond(res,200,{ok:true,id});
 }
 if(action==="logout"){setCookie(res,"",0);return respond(res,200,{ok:true})}
 const s=session(req);if(!s||!await permitted(s))return respond(res,401,{ok:false,error:"not_authenticated"});
 if(action==="bootstrap"){
  const [g,events]=await Promise.all([gh("ships/"+s.ship+"/graph/current.json"),inbox(s.ship)]);
  if(!events)return respond(res,503,{ok:false,error:"inbox_unavailable"});
  const actual=g.value?.origin==="CANON"&&Array.isArray(g.value.nodes)&&Array.isArray(g.value.edges);
  const graph=actual?{nodes:g.value.nodes.slice(0,500).map(n=>({ref:String(n.ref||"").slice(0,180),label:String(n.label||"").slice(0,180),kind:String(n.kind||"").slice(0,80)})),edges:g.value.edges.slice(0,1000).map(e=>({source:String(e.source||"").slice(0,180),target:String(e.target||"").slice(0,180),relation:String(e.relation||"").slice(0,80)})),version:String(g.value.version||"")}:null;
  return respond(res,200,{ok:true,identity:s.sub,hasEngineGraph:actual,graph,inbox:events});
 }
 if(action==="submit"){
  const txt=String(b.text||"").trim();if(txt.length<2||txt.length>8000)return respond(res,400,{ok:false,error:"invalid_text"});
  const id=randomUUID(),record={id,kind:"USER_INBOX",shipCode:s.ship,actorSetkaId:s.sub,text:txt,at:new Date().toISOString(),processing:"AWAITING_CANON",source:"VERSTAK_GITHUB_PILOT"};
  const saved=await gh("ships/"+s.ship+"/inbox/"+id+".json","PUT",record);
  return saved.written?respond(res,201,{ok:true,receipt:id,processing:"AWAITING_CANON"}):respond(res,503,{ok:false,error:"github_write_failed"});
 }
 return respond(res,400,{ok:false,error:"unknown_action"});
 }catch{return respond(res,503,{ok:false,error:"storage_temporarily_unavailable"})}
}