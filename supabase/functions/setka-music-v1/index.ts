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

const YANDEX_SOURCE="https://disk.yandex.ru/d/gmjwIQoHo6VxtQ";
const YANDEX_FOLDERS=["8D","актив","пассив","звуки природы"];
const validYandexAudioURL=value=>{
 try{const url=new URL(value);return url.protocol==="https:"&&url.hostname==="downloader.disk.yandex.ru"&&url.pathname.startsWith("/disk/")}
 catch(_){return false}
};
const yandexURLExpiry=value=>{
 try{
  const token=new URL(value).pathname.split("/")[3];
  if(!/^[0-9a-f]{8}$/i.test(token))return 0;
  return parseInt(token,16)*1000;
 }catch(_){return 0}
};
// Cache temporary signed Yandex CDN links in a protected database row. Never
// transcode, buffer or downsample audio; native WAV/MP3 remains on its source.
// A short DB-wide lease prevents the app's readers from stampeding Yandex API.
const refreshExternalAudio=async tracks=>{
 const time=Date.now();
 const linked=tracks.filter(t=>t.external_source_path);
 if(!linked.length||linked.every(t=>validYandexAudioURL(t.external_audio_url)&&new Date(t.external_audio_url_expires).getTime()>time+25*60000))return tracks;
 try{
  const cutoff=new Date(time-8*60000).toISOString();
  const leased=await mutate("setka_music_external_refresh_v1","PATCH",{attempted_at:new Date(time).toISOString()},"id=eq.1&attempted_at=lt."+encodeURIComponent(cutoff));
  if(!leased.length)return tracks;
  const known=new Set(linked.map(t=>t.external_source_path));
  const pages=await Promise.allSettled(YANDEX_FOLDERS.map(async folder=>{
   const url="https://cloud-api.yandex.net/v1/disk/public/resources?public_key="+encodeURIComponent(YANDEX_SOURCE)+"&path="+encodeURIComponent("/"+folder)+"&limit=150";
   const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(16000)});
   if(!response.ok)throw Error("yandex_listing_"+response.status);
   const data=await response.json();
   return Array.isArray(data?._embedded?.items)?data._embedded.items:[];
  }));
  const updates=[];
  for(const page of pages){
   if(page.status!=="fulfilled"){console.warn("setka-yandex-refresh",String(page.reason?.message||"unavailable"));continue}
   for(const file of page.value){
    if(file?.type!=="file"||file.media_type!=="audio"||!known.has(file.path)||!validYandexAudioURL(file.file))continue;
    const expiry=yandexURLExpiry(file.file);
    if(expiry<time+30*60000)continue;
    updates.push({path:file.path,url:file.file,expiry:new Date(expiry).toISOString()});
   }
  }
  for(let i=0;i<updates.length;i+=5){
   const results=await Promise.allSettled(updates.slice(i,i+5).map(x=>
    mutate("setka_music_tracks_v1","PATCH",{external_audio_url:x.url,external_audio_url_expires:x.expiry},"external_source_path=eq."+encodeURIComponent(x.path))
   ));
   if(results.some(x=>x.status==="rejected"))console.warn("setka-yandex-cache-partial-failure");
  }
  if(updates.length)return await rowQuery("setka_music_tracks_v1","select=id,title,audio_path,icon_key,icon_path,category_ids,sort_order,published,loop,duration_seconds,revision,updated_at,external_source_path,external_audio_url,external_audio_url_expires&order=sort_order.asc,created_at.asc");
 }catch(error){console.warn("setka-yandex-refresh-error",String(error?.message||"unavailable"))}
 return tracks;
};
// Browser-playable inline WAV/MP3 proxy. Yandex downloader redirects are not
// CORS-playable. IMPORTANT: honor the COMPLETE range, including "bytes=0-":
// WebKit uses the returned Content-Length to infer media duration. Truncating
// the open-ended range to 2 MiB falsely makes 10-500 MB tracks end early.
// Stream the upstream response body without buffering or transcoding it.
const streamExternalTrack=async(request,origin,id)=>{
  if(!/^[a-f0-9-]{36}$/i.test(id||""))return json({error:"bad_track"},400,origin);
  const rows=await rowQuery("setka_music_tracks_v1",
    "select=id,published,external_source_path,external_source_bytes,external_audio_url,external_audio_url_expires&id=eq."+
    encodeURIComponent(id)+"&published=eq.true&limit=1");
  const t=rows[0],size=Number(t?.external_source_bytes);
  if(!t?.external_source_path||!Number.isSafeInteger(size)||size<=0||
     !/^\/(?:8D|актив|пассив|звуки природы)\/.+\.(?:wav|mp3)$/i.test(t.external_source_path))
    return json({error:"not_found"},404,origin);
  const mp3=/\.mp3$/i.test(t.external_source_path);
  const baseHeaders={...cors(origin),"vary":"Origin, Range","access-control-expose-headers":
    "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    "content-type":mp3?"audio/mpeg":"audio/wav",
    "accept-ranges":"bytes",
    "cache-control":"private, no-store",
    "cross-origin-resource-policy":"cross-origin",
    "content-disposition":"inline"};
  if(request.method==="HEAD")return new Response(null,{status:200,headers:{...baseHeaders,"content-length":String(size)}});
  // Preserve HTTP range semantics exactly. A 206 for a shorter-than-requested
  // interval misreports duration to Safari (and can truncate the soundtrack).
  const range=request.headers.get("range");
  let start=0,end=size-1;
  if(range){
    const matched=/^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if(!matched||(!matched[1]&&!matched[2]))
      return new Response(null,{status:416,headers:{...baseHeaders,"content-range":"bytes */"+size}});
    if(matched[1]){
      start=Number(matched[1]);
      if(!Number.isSafeInteger(start)||start>=size)
        return new Response(null,{status:416,headers:{...baseHeaders,"content-range":"bytes */"+size}});
      end=matched[2]?Math.min(size-1,Number(matched[2])):size-1;
      if(!Number.isSafeInteger(end)||end<start)
        return new Response(null,{status:416,headers:{...baseHeaders,"content-range":"bytes */"+size}});

    }else{
      const suffix=Math.max(1,Math.min(size,Number(matched[2])));
      start=size-suffix;end=size-1;
    }
  }
  let file=t.external_audio_url;
  if(!validYandexAudioURL(file)||new Date(t.external_audio_url_expires).getTime()<Date.now()+30000){
    // A fresh metadata lookup is sufficient; never download or decode audio here.
    const api="https://cloud-api.yandex.net/v1/disk/public/resources?public_key="+
      encodeURIComponent(YANDEX_SOURCE)+"&path="+encodeURIComponent(t.external_source_path);
    const response=await fetch(api,{cache:"no-store",signal:AbortSignal.timeout(18000)});
    if(!response.ok)return json({error:"audio_source_unavailable"},502,origin);
    const data=await response.json();
    file=data.file;
    if(!validYandexAudioURL(file))return json({error:"audio_source_unavailable"},502,origin);
    await mutate("setka_music_tracks_v1","PATCH",{external_audio_url:file,
      external_audio_url_expires:new Date(yandexURLExpiry(file)).toISOString()},
      "id=eq."+encodeURIComponent(id));
  }
  const upstream=await fetch(file,{method:"GET",headers:{"range":"bytes="+start+"-"+end},
    redirect:"follow",signal:AbortSignal.timeout(140000)});
  if(upstream.status!==206||!upstream.body){
    await upstream.body?.cancel().catch(()=>{});
    return json({error:"audio_origin_unavailable"},502,origin);
  }
  const contentRange=upstream.headers.get("content-range");
  const match=contentRange&&/^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange);
  if(!match||Number(match[1])!==start||Number(match[2])!==end||Number(match[3])!==size){
    await upstream.body.cancel().catch(()=>{});
    return json({error:"audio_range_mismatch"},502,origin);
  }
  return new Response(upstream.body,{status:range?206:200,headers:{...baseHeaders,
    ...(range?{"content-range":contentRange}:{}),
    "content-length":String(end-start+1)}});
};
const catalogue=async manage=>{
  const cats=await rowQuery("setka_music_categories_v1","select=id,title,icon_path,sort_order,visible,is_system,updated_at"+(manage?"":"&visible=eq.true")+"&order=sort_order.asc,id.asc");
  const icons=await rowQuery("setka_music_ui_icons_v1","select=slot,icon_path,updated_at&order=slot.asc");
  let tracks=await rowQuery("setka_music_tracks_v1","select=id,title,audio_path,icon_key,icon_path,category_ids,sort_order,published,loop,duration_seconds,revision,updated_at,external_source_path,external_audio_url,external_audio_url_expires"+(manage?"":"&published=eq.true")+"&order=sort_order.asc,created_at.asc");
  tracks=await refreshExternalAudio(tracks);
  const hiddenIcons=manage?await rowQuery("setka_music_hidden_icons_v1","select=icon_key&order=icon_key.asc"):[];
  const globalRows=await rowQuery("setka_music_global_order_v1","select=id,track_ids,revision,updated_at&id=eq.1");
  const visible=new Set(tracks.map(t=>t.id));
  const record=globalRows[0]||{id:1,track_ids:[],revision:1};
  const global_order={...record,track_ids:(record.track_ids||[]).filter(id=>visible.has(id))};
  const stats=manage?await rowQuery("setka_music_track_stats_v1","select=track_id,plays,completions,plays_7d,last_activity_at"):[];
  return {ok:true,categories:cats,ui_icons:icons.map(i=>({...i,icon_url:PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+i.icon_path})),tracks:tracks.map(t=>({...t,audio_url:t.external_source_path?PROJECT+"/functions/v1/setka-music-v1?stream="+encodeURIComponent(t.id):PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+t.audio_path,icon_url:t.icon_path?PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+t.icon_path:null})),global_order,stats,hidden_icon_keys:hiddenIcons.map(x=>x.icon_key)};
};
const ensureObject=async path=>{
  const response=await fetch(PROJECT+"/storage/v1/object/info/"+BUCKET+"/"+path,{headers:adminHeaders});
  if(!response.ok)throw Error("uploaded_file_missing");
};
const fail=e=>e?.message==="uploaded_file_missing"?"uploaded_file_missing":e?.message==="bad_request"?"bad_request":e?.message==="write_rejected"?"write_rejected":"service_unavailable";
Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{...cors(origin),"access-control-allow-headers":"content-type,apikey,authorization,range","access-control-allow-methods":"GET,HEAD,POST,OPTIONS","access-control-max-age":"3600","vary":"Origin"}});
  if(!PROJECT||!SECRET)return json({error:"service_unavailable"},503,origin);
  try{
    if(request.method==="GET"||request.method==="HEAD"){
      const id=new URL(request.url).searchParams.get("stream");
      if(id!==null)return streamExternalTrack(request,origin,id);
      if(request.method==="HEAD")return new Response(null,{status:200,headers:cors(origin)});
      return json(await catalogue(false),200,origin);
    }
    if(request.method!=="POST")return json({error:"method_not_allowed"},405,origin);
    const b=await request.json();
    if(b?.action==="catalog")return json(await catalogue(false),200,origin);
    // Anonymous aggregate-only listener telemetry: no device, IP, email or profile stored.
    // Only real playback starts and 95%-complete signals are submitted by the app.
    if(b?.action==="track-event"){
      const track_id=String(b.track_id||""),event_type=String(b.event_type||""),id=String(b.event_id||"");
      if(!/^[a-f0-9-]{36}$/.test(track_id)||!/^[a-f0-9-]{36}$/.test(id)||!["play","complete"].includes(event_type))
        return json({error:"bad_request"},400,origin);
      const existing=await rowQuery("setka_music_tracks_v1","select=id&id=eq."+encodeURIComponent(track_id)+"&published=eq.true&limit=1");
      if(existing.length!==1)return json({error:"not_found"},404,origin);
      const response=await fetch(url("setka_music_listen_events_v1","on_conflict=id"),{
        method:"POST",headers:{...adminHeaders,prefer:"resolution=ignore-duplicates,return=minimal"},
        body:JSON.stringify({id,track_id,event_type})});
      if(!response.ok)throw Error("write_rejected");
      return json({ok:true},200,origin);
    }
    if(!await authorized(b?.adminKey))return json({error:"invalid_admin_key"},403,origin);
    if(b.action==="manage")return json(await catalogue(true),200,origin);
    if(b.action==="save-global-order"){
      const allTracks=await rowQuery("setka_music_tracks_v1","select=id");
      const allowed=new Set(allTracks.map(t=>t.id));
      const requested=b.track_ids;
      if(!Array.isArray(requested)||requested.length!==allowed.size||
         requested.some(x=>typeof x!=="string"||!/^[a-f0-9-]{36}$/.test(x))||
         new Set(requested).size!==requested.length||
         requested.some(x=>!allowed.has(x)))
         return json({error:"order_mismatch_refresh"},409,origin);
      const rows=await rowQuery("setka_music_global_order_v1","select=revision&id=eq.1&limit=1");
      const prior=rows[0]?.revision;
      if(!prior||b.expected_revision!==prior)return json({error:"order_changed_refresh"},409,origin);
      const saved=await mutate("setka_music_global_order_v1","PATCH",{
        track_ids:requested,revision:prior+1,updated_at:new Date().toISOString()
      },"id=eq.1&revision=eq."+prior);
      if(saved.length!==1)return json({error:"order_changed_refresh"},409,origin);
      return json({ok:true,global_order:saved[0]},200,origin);
    }
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
    if(b.action==="hide-icon"||b.action==="restore-icon"){
      const key=String(b.icon_key||"");
      if(!/^[a-z0-9_-]{1,40}$/.test(key)||key==="music")return json({error:"bad_icon_key"},400,origin);
      if(b.action==="hide-icon"){
        await mutate("setka_music_hidden_icons_v1","POST",{icon_key:key,hidden_at:new Date().toISOString()},"on_conflict=icon_key");
      }else{
        await mutate("setka_music_hidden_icons_v1","DELETE",null,"icon_key=eq."+encodeURIComponent(key));
      }
      return json({ok:true,icon_key:key,hidden:b.action==="hide-icon"},200,origin);
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
      const previous=await rowQuery("setka_music_tracks_v1","select=revision,audio_path,external_source_path&id=eq."+encodeURIComponent(id)+"&limit=1");
      const keepRemote=!!previous[0]?.external_source_path&&previous[0].audio_path===audio;
      if(!keepRemote)await ensureObject(audio);
      if(icon)await ensureObject(icon);
      const cats=await rowQuery("setka_music_categories_v1","select=id");
      const allowed=new Set(cats.map(x=>x.id));
      const ids=Array.isArray(b.category_ids)?[...new Set(b.category_ids.filter(x=>typeof x==="string"&&allowed.has(x)))]:[];
      const row={id,title,audio_path:audio,icon_path:icon,icon_key:iconKey,category_ids:ids,sort_order:Number.isInteger(b.sort_order)?b.sort_order:0,published:b.published===true,loop:b.loop!==false,duration_seconds:Number.isFinite(b.duration_seconds)?Math.max(0,b.duration_seconds):null,updated_at:new Date().toISOString(),revision:(previous[0]?.revision||0)+1};
      if(previous[0]?.external_source_path&&!keepRemote)Object.assign(row,{external_source_path:null,external_source_hash:null,external_source_bytes:null,external_audio_url:null,external_audio_url_expires:null});
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