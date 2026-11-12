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

// Immutable audio attached to this SETKA repository's GitHub release.
const GITHUB_AUDIO_RELEASE="https://github.com/misskogut/Setka-web/releases/download/setka-original-music-20261107/";
const githubOriginalAsset=track=>{
 const hash=String(track?.external_source_hash||"").toLowerCase();
 const name=String(track?.external_source_path||"");
 if(!/^[a-f0-9]{64}$/.test(hash)||!/\.(?:wav|mp3)$/i.test(name))return null;
 return GITHUB_AUDIO_RELEASE+"setka-original-"+hash.slice(0,24)+(name.toLowerCase().endsWith(".mp3")?".mp3":".wav");
};
// Release assets are verified by immutable sha256 and byte size, not just presence.
// An absent/corrupt source must not leave a clickable silent icon in the public catalog.
let musicReleaseAssetCache=null,musicReleaseAssetCacheAt=0;
const musicReleaseAssets=async()=>{
 const now=Date.now();
 if(musicReleaseAssetCache&&now-musicReleaseAssetCacheAt<120000)return musicReleaseAssetCache;
 try{
  const response=await fetch("https://api.github.com/repos/misskogut/Setka-web/releases/tags/setka-original-music-20261107",{
   headers:{accept:"application/vnd.github+json"},signal:AbortSignal.timeout(12000),cache:"no-store"});
  if(!response.ok)throw Error("github_release_metadata_unavailable");
  const data=await response.json(),assets=new Map();
  for(const item of Array.isArray(data?.assets)?data.assets:[]){
   if(typeof item.name==="string"&&Number.isSafeInteger(item.size)&&item.size>0)
    assets.set(item.name,{size:item.size,digest:item.digest||null});
  }
  musicReleaseAssetCache=assets;musicReleaseAssetCacheAt=now;return assets;
 }catch(_){return musicReleaseAssetCache}
};
const isOnGitHub=(t,assets)=>{
 if(!t.external_source_path)return true;
 if(!assets)return true; // A temporary GitHub API failure must not erase existing music.
 const assetURL=githubOriginalAsset(t),name=assetURL?.split("/").pop();
 const a=name&&assets.get(name);
 const sha="sha256:"+String(t.external_source_hash||"").toLowerCase();
 return !!a&&a.size===Number(t.external_source_bytes)&&(!a.digest||a.digest.toLowerCase()===sha);
};
const streamExternalTrack=async(request,origin,id)=>{
  if(!/^[a-f0-9-]{36}$/i.test(id||""))return json({error:"bad_track"},400,origin);
  const rows=await rowQuery("setka_music_tracks_v1",
    "select=id,published,external_source_path,external_source_hash,external_source_bytes&id=eq."+
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
    "content-disposition":"inline","x-setka-audio-origin":"github-release"};
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
  const file=githubOriginalAsset(t);
  if(!file)return json({error:"audio_release_missing"},503,origin);
  // The client sees the complete original file range (accurate Safari duration).
  // Internally fetch only 2 MiB original GitHub ranges at a time.
  // Forward byte-for-byte, never buffer the whole file or transcode audio.
  const segmentSize=2*1024*1024;
  // Retry only transient upstream failures; never accept a mismatched byte range.
  const source=async(first,last)=>{
    let lastError;
    for(let attempt=0;attempt<3;attempt++){
      if(attempt)await new Promise(done=>setTimeout(done,250*attempt*attempt));
      try{
        const res=await fetch(file,{method:"GET",headers:{"range":"bytes="+first+"-"+last},
          redirect:"follow",signal:AbortSignal.timeout(16000)});
        if(res.status===206&&res.body){
          const header=res.headers.get("content-range");
          const m=header&&/^bytes (\d+)-(\d+)\/(\d+)$/.exec(header);
          if(!m||Number(m[1])!==first||Number(m[2])!==last||Number(m[3])!==size){
            await res.body.cancel().catch(()=>{});
            throw Error("audio_range_mismatch");
          }
          return res.body.getReader();
        }
        await res.body?.cancel().catch(()=>{});
        if(![429,500,502,503,504].includes(res.status))
          throw Error("audio_github_release_unavailable");
        lastError=Error("audio_github_release_unavailable");
      }catch(error){
        if(String(error?.message||error)==="audio_range_mismatch")throw error;
        lastError=error;
      }
    }
    throw lastError||Error("audio_github_release_unavailable");
  };
  let cursor=start,sectionEnd=Math.min(end,start+segmentSize-1),reader;
  try{reader=await source(cursor,sectionEnd)}
  catch(_){return json({error:"audio_origin_unavailable"},502,origin)}
  let recoveryCount=0;
  const closeReader=async()=>{
    try{await reader?.cancel()}catch(_){}
    try{reader?.releaseLock()}catch(_){}
  };
  // The upstream can fail *after* returning 206 and some audio bytes. Resume
  // from the next un-emitted byte, never repeating or skipping PCM/MP3 samples.
  const resumeRemainder=async()=>{
    if(++recoveryCount>3)throw Error("audio_upstream_stream_exhausted");
    await closeReader();
    reader=await source(cursor,sectionEnd);
  };
  const audio=new ReadableStream({
    async pull(controller){
      try{
        while(true){
          let next;
          try{next=await reader.read()}
          catch(_){await resumeRemainder();continue}
          if(!next.done){
            const bytes=next.value?.byteLength||0;
            if(cursor+bytes>sectionEnd+1)throw Error("audio_range_overrun");
            if(!bytes)continue;
            cursor+=bytes;
            recoveryCount=0;
            controller.enqueue(next.value);
            return;
          }
          try{reader.releaseLock()}catch(_){}
          if(cursor<=sectionEnd){await resumeRemainder();continue}
          if(cursor>end){controller.close();return}
          sectionEnd=Math.min(end,cursor+segmentSize-1);
          reader=await source(cursor,sectionEnd);
          recoveryCount=0;
        }
      }catch(error){
        console.error("audio_stream_unavailable",String(error?.message||error));
        controller.error(error);
      }
    },
    cancel(){reader?.cancel().catch(()=>{})}
  });
  return new Response(audio,{status:range?206:200,headers:{...baseHeaders,
    ...(range?{"content-range":"bytes "+start+"-"+end+"/"+size}:{}),
    "content-length":String(end-start+1)}});
};
const catalogue=async manage=>{
  // Independent reads run together; serial REST calls followed by a GitHub
  // metadata wait could exceed the browser's 15-second catalog deadline.
  const [cats,icons,sourceTracks,availableAssets,hiddenIcons,globalRows,stats]=await Promise.all([
    rowQuery("setka_music_categories_v1","select=id,title,icon_path,sort_order,visible,is_system,updated_at"+(manage?"":"&visible=eq.true")+"&order=sort_order.asc,id.asc"),
    rowQuery("setka_music_ui_icons_v1","select=slot,icon_path,updated_at&order=slot.asc"),
    rowQuery("setka_music_tracks_v1","select=id,title,audio_path,icon_key,icon_path,category_ids,sort_order,published,loop,duration_seconds,revision,updated_at,external_source_path,external_source_hash,external_source_bytes"+(manage?"":"&published=eq.true")+"&order=sort_order.asc,created_at.asc"),
    musicReleaseAssets(),
    manage?rowQuery("setka_music_hidden_icons_v1","select=icon_key&order=icon_key.asc"):Promise.resolve([]),
    rowQuery("setka_music_global_order_v1","select=id,track_ids,revision,updated_at&id=eq.1"),
    manage?rowQuery("setka_music_track_stats_v1","select=track_id,plays,completions,plays_7d,last_activity_at"):Promise.resolve([])
  ]);
  let tracks=sourceTracks;
  if(!manage&&availableAssets)tracks=tracks.filter(t=>isOnGitHub(t,availableAssets));
  const visible=new Set(tracks.map(t=>t.id));
  const record=globalRows[0]||{id:1,track_ids:[],revision:1};
  const global_order={...record,track_ids:(record.track_ids||[]).filter(id=>visible.has(id))};

  return {ok:true,categories:cats,ui_icons:icons.map(i=>({...i,icon_url:PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+i.icon_path})),tracks:tracks.map(t=>({...t,release_uploaded:isOnGitHub(t,availableAssets),audio_url:t.external_source_path?PROJECT+"/functions/v1/setka-music-v1?stream="+encodeURIComponent(t.id):PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+t.audio_path,icon_url:t.icon_path?PROJECT+"/storage/v1/object/public/"+BUCKET+"/"+t.icon_path:null})),global_order,stats,hidden_icon_keys:hiddenIcons.map(x=>x.icon_key)};
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