// SETKA music v1 — public read / admin-key authenticated writes.
// All catalog writes are server-side; never expose a service-role credential to the client.
const PROJECT = Deno.env.get("SUPABASE_URL") || "";
const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BUCKET = "setka-music";
const ALLOWED_ORIGIN = new Set(["https://misskogut.github.io","http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173","http://127.0.0.1:5173"]);
const mimeExt = {"audio/mpeg":"mp3","audio/mp4":"m4a","audio/x-m4a":"m4a","audio/wav":"wav","audio/x-wav":"wav","audio/ogg":"ogg","image/svg+xml":"svg","image/png":"png","image/webp":"webp"};
const json = (object,status=200,origin="") => new Response(JSON.stringify(object),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin",...(ALLOWED_ORIGIN.has(origin)?{"access-control-allow-origin":origin}:{})}});
const cors = origin => (ALLOWED_ORIGIN.has(origin)?{"access-control-allow-origin":origin}:{});
const adminHeaders = {"apikey":SECRET,"authorization":"Bearer "+SECRET,"content-type":"application/json"};
const url = (table,qs="") => PROJECT+"/rest/v1/"+table+(qs?"?"+qs:"");
const rowQuery = async (table,qs) => {
  const r=await fetch(url(table,qs),{headers:adminHeaders,cache:"no-store"});
  if(!r.ok)throw Error("catalog_unavailable");
  return r.json();
};
const mutate = async (table,method,payload,qs="") => {
  const r=await fetch(url(table,qs),{method,headers:{...adminHeaders,"prefer":"return=representation,resolution=merge-duplicates"},body:payload==null?undefined:JSON.stringify(payload)});
  if(!r.ok)throw Error("write_rejected");
  return r.json();
};
const cleanText=(value,max)=>typeof value==="string"?value.trim().slice(0,max):"";
const pathOK=(path,prefix)=>typeof path==="string"&&new RegExp("^"+prefix+"/[a-f0-9-]{36}\\.(?:mp3|m4a|wav|ogg|svg|png|webp)$").test(path);
const sha=async raw=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const authorized=async key=>{
  if(typeof key!=="string"||!key.trim()||key.length>300)return false;
  const rows=await rowQuery("admin_keys","select=id&active=eq.true&key_hash=eq."+await sha(key.trim())+"&limit=2");
  return rows.length===1;
};
const UI_SLOTS = new Set(["nav-note","orbit-tab","listener","motion-static","motion-cw","motion-ccw","motion-counter","motion-eight","motion-chaos","motion-spiral","motion-breath","speed-slow","speed-fast","power"]);
const iconFile = path => typeof path==="string" && /^icons\/[a-f0-9-]{36}\.(png|webp)$/.test(path);
const catalogue=async manage=>{
  const cats=await rowQuery("setka_music_categories_v1","select=id,title,icon_path,sort_order,visible,is_system,updated_at"+(manage?"":"&visible=eq.true")+"&order=sort_order.asc,id.asc");
  const icons=await rowQuery("setka_music_ui_icons_v1","select=slot,icon_path,updated_at&order=slot.asc");
  const tracks=await rowQuery("setka_music_tracks_v1","select=id,title,audio_path,icon_key,icon_path,category_ids,sort_order,published,loop,duration_seconds,revision,updated_at"+(manage?"":"&published=eq.true")+"&order=sort_order.asc,created_at.asc");
  return {ok:true,categories:cats,ui_icons:icons.map(i=>({...i,icon_url:PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+i.icon_path})),tracks:tracks.map(t=>({...t,audio_url:PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+t.audio_path,icon_url:t.icon_path?PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+t.icon_path:null}))};
};
const ensureObject=async path=>{
  const response=await fetch(PROJECT+"/storage/v1/object/info/"+BUCKET+"/"+path,{headers:adminHeaders});
  if(!response.ok)throw Error("uploaded_file_missing");
};
const fail=e=>e?.message==="uploaded_file_missing"?"uploaded_file_missing":e?.message==="bad_request"?"bad_request":e?.message==="write_rejected"?"write_rejected":"service_unavailable";
Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{...cors(origin),"access-control-allow-headers":"content-type,apikey,authorization","access-control-allow-methods":"GET,POST,OPTIONS","access-control-max-age":"3600","vary":"Origin"}});
  if(!PROJECT||!SECRET)return json({error:"service_unavailable"},503,origin);
  try{
    if(request.method==="GET")return json(await catalogue(false),200,origin);
    if(request.method!=="POST")return json({error:"method_not_allowed"},405,origin);
    const b=await request.json();
    if(b?.action==="catalog")return json(await catalogue(false),200,origin);
    if(!await authorized(b?.adminKey))return json({error:"invalid_admin_key"},403,origin);
    if(b.action==="manage")return json(await catalogue(true),200,origin);
    if(b.action==="save-ui-icon"){
      const slot=String(b.slot||""),path=b.icon_path;
      if(!UI_SLOTS.has(slot)||!iconFile(path))return json({error:"bad_request"},400,origin);
      await ensureObject(path);
      const saved=await mutate("setka_music_ui_icons_v1","POST",{slot,icon_path:path,updated_at:new Date().toISOString()},"on_conflict=slot");
      return json({ok:true,icon:saved[0]},200,origin);
    }
    if(b.action==="reset-ui-icon"){
      const slot=String(b.slot||"");
      if(!UI_SLOTS.has(slot))return json({error:"bad_request"},400,origin);
      await mutate("setka_music_ui_icons_v1","DELETE",null,"slot=eq."+encodeURIComponent(slot));
      return json({ok:true},200,origin);
    }
    if(b.action==="upload-intent"){
      const mime=String(b.mime||"").toLowerCase(),ext=mimeExt[mime],size=Number(b.size);
      const prefix=mime.startsWith("audio/")?"audio":"icons";
      if(!ext||!Number.isFinite(size)||size<1||size>(prefix==="audio"?20000000:2000000))return json({error:"invalid_upload"},400,origin);
      const path=prefix+"/"+crypto.randomUUID()+"."+ext;
      const r=await fetch(PROJECT+"/storage/v1/object/upload/sign/"+BUCKET+"/"+path,{method:"POST",headers:adminHeaders,body:JSON.stringify({})});
      const v=await r.json().catch(()=>({}));
      if(!r.ok||!v.token)throw Error("sign_failed");
      return json({ok:true,path,upload_url:PROJECT+"/storage/v1/object/upload/sign/"+BUCKET+"/"+path+"?token="+encodeURIComponent(v.token)},200,origin);
    }
    if(b.action==="save-category"){
      const id=cleanText(b.id,40),title=cleanText(b.title,100),icon=b.icon_path||null;
      if(!/^[a-z0-9_-]{2,40}$/.test(id)||!title||icon&&!pathOK(icon,"icons"))return json({error:"bad_request"},400,origin);
      if(icon)await ensureObject(icon);
      const existing=await rowQuery("setka_music_categories_v1","select=is_system&id=eq."+encodeURIComponent(id)+"&limit=1");
      const category={id,title,icon_path:icon,sort_order:Number.isInteger(b.sort_order)?b.sort_order:0,visible:b.visible!==false,is_system:existing[0]?.is_system===true,updated_at:new Date().toISOString()};
      const saved=await mutate("setka_music_categories_v1","POST",category,"on_conflict=id");
      return json({ok:true,category:saved[0]},200,origin);
    }
    if(b.action==="save-track"){
      const id=typeof b.id==="string"&&/^[a-f0-9-]{36}$/.test(b.id)?b.id:crypto.randomUUID();
      const title=cleanText(b.title,120),audio=b.audio_path,icon=b.icon_path||null;
      const iconKey=/^[a-z0-9_-]{1,40}$/.test(b.icon_key||"")?b.icon_key:"music";
      if(!title||!pathOK(audio,"audio")||icon&&!pathOK(icon,"icons"))return json({error:"bad_request"},400,origin);
      await ensureObject(audio);if(icon)await ensureObject(icon);
      const cats=await rowQuery("setka_music_categories_v1","select=id");
      const allowed=new Set(cats.map(x=>x.id));
      const ids=Array.isArray(b.category_ids)?[...new Set(b.category_ids.filter(x=>typeof x==="string"&&allowed.has(x)))]:[];
      const previous=await rowQuery("setka_music_tracks_v1","select=revision&id=eq."+encodeURIComponent(id)+"&limit=1");
      const row={id,title,audio_path:audio,icon_path:icon,icon_key:iconKey,category_ids:ids,sort_order:Number.isInteger(b.sort_order)?b.sort_order:0,published:b.published===true,loop:b.loop!==false,duration_seconds:Number.isFinite(b.duration_seconds)?Math.max(0,b.duration_seconds):null,updated_at:new Date().toISOString(),revision:(previous[0]?.revision||0)+1};
      const saved=await mutate("setka_music_tracks_v1","POST",row,"on_conflict=id");
      return json({ok:true,track:saved[0]},200,origin);
    }
    if(b.action==="delete-track"){
      const id=String(b.id||"");
      if(!/^[a-f0-9-]{36}$/.test(id))return json({error:"bad_request"},400,origin);
      await mutate("setka_music_tracks_v1","DELETE",null,"id=eq."+encodeURIComponent(id));
      return json({ok:true},200,origin);
    }
    if(b.action==="delete-category"){
      const id=String(b.id||"");
      if(!/^[a-z0-9_-]{2,40}$/.test(id))return json({error:"bad_request"},400,origin);
      const found=await rowQuery("setka_music_categories_v1","select=is_system&id=eq."+encodeURIComponent(id)+"&limit=1");
      if(found[0]?.is_system)return json({error:"system_category"},409,origin);
      const used=await rowQuery("setka_music_tracks_v1","select=id&category_ids=cs."+encodeURIComponent("{"+id+"}")+"&limit=1");
      if(used.length)return json({error:"category_in_use"},409,origin);
      await mutate("setka_music_categories_v1","DELETE",null,"id=eq."+encodeURIComponent(id));
      return json({ok:true},200,origin);
    }
    return json({error:"unknown_action"},400,origin);
  }catch(error){
    console.error("music-api",error?.message||"unknown");
    return json({error:fail(error)},503,origin);
  }
});