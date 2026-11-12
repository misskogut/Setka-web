// SETKA lossless, bounded-memory PCM WAV -> WebAudio streaming for large Safari assets.
// Requests verified byte ranges; never decodes the whole original into memory.
const id4=(u,p)=>String.fromCharCode(u[p],u[p+1],u[p+2],u[p+3]);
const u16=(u,p)=>u[p]|u[p+1]<<8;
const u32=(u,p)=>(u[p]|u[p+1]<<8|u[p+2]<<16|u[p+3]<<24)>>>0;
const put16=(u,p,v)=>{u[p]=v&255;u[p+1]=v>>>8&255};
const put32=(u,p,v)=>{for(let i=0;i<4;i++)u[p+i]=v>>>i*8&255};
const tag=(u,p,s)=>{for(let i=0;i<4;i++)u[p+i]=s.charCodeAt(i)};
export function parseWavHeader(bytes,fileSize){
 const u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(u.length<44||id4(u,0)!=="RIFF"||id4(u,8)!=="WAVE")return null;
 let p=12,fmt=null,stream=null;
 while(p+8<=u.length){
  const name=id4(u,p),size=u32(u,p+4),start=p+8;
  if(name==="fmt "){
   if(size<16||size>128||start+size>u.length)return null;
   fmt=u.slice(start,start+size);
  }else if(name==="data"){
   if(!fmt||size<1||start>=fileSize)return null;
   stream={offset:start,dataLength:Math.min(size,fileSize-start)};
   break;
  }
  const next=start+size+(size&1);
  if(next<=p||next>fileSize)return null;
  if(next>u.length)return null;
  p=next;
 }
 if(!fmt||!stream)return null;
 const format=u16(fmt,0),channels=u16(fmt,2),rate=u32(fmt,4),alignment=u16(fmt,12),depth=u16(fmt,14);
 const extensible=format===65534&&fmt.length>=40&&[1,3].includes(u16(fmt,24))&&fmt[26]===0&&fmt[27]===0;
 if(![1,3].includes(format)&&!extensible)return null;
 if(channels<1||channels>2||rate<8000||rate>192000||![16,24,32].includes(depth))return null;
 if((format===3||extensible&&u16(fmt,24)===3)&&depth!==32)return null;
 if(alignment!==channels*depth/8)return null;
 return {format,channels,sampleRate:rate,blockAlign:alignment,bitsPerSample:depth,
  fmt,offset:stream.offset,dataLength:stream.dataLength,totalFrames:Math.floor(stream.dataLength/alignment)};
}
export function wavChunk(info,pcm){
 const src=pcm instanceof Uint8Array?pcm:new Uint8Array(pcm);
 if(!info||!info.fmt||!src.length||src.length%info.blockAlign)throw Error("invalid_pcm_chunk");
 const padFmt=info.fmt.length&1,padData=src.length&1;
 const out=new Uint8Array(12+8+info.fmt.length+padFmt+8+src.length+padData);
 tag(out,0,"RIFF");put32(out,4,out.length-8);tag(out,8,"WAVE");
 tag(out,12,"fmt ");put32(out,16,info.fmt.length);out.set(info.fmt,20);
 const pos=20+info.fmt.length+padFmt;tag(out,pos,"data");put32(out,pos+4,src.length);
 out.set(src,pos+8);return out.buffer;
}
async function range(url,start,end,total,signal){
 const res=await fetch(url,{headers:{Range:"bytes="+start+"-"+end},signal,cache:"no-store"});
 if(res.status!==206)throw Error("range_required");
 const header=res.headers.get("content-range")||"";
 if(header!==`bytes ${start}-${end}/${total}`)throw Error("range_mismatch");
 const out=new Uint8Array(await res.arrayBuffer());
 if(out.length!==end-start+1)throw Error("range_size_mismatch");
 return out;
}
export async function inspectWavSource(url,total,signal){
 if(!/^https:\/\//.test(String(url))||!Number.isSafeInteger(total)||total<44)return null;
 const end=Math.min(total-1,65535);
 try{
  const bytes=await range(url,0,end,total,signal);
  return parseWavHeader(bytes,total);
 }catch(_){return null}
}
// Same source samples as uploaded original. The browser's native decoder handles
// device-rate conversion per small PCM packet (as for an ordinary WAV stream).
export class SetkaChunkedWavDeck {
 constructor({url,total,info,ctx,output,loop=true}){
  this.url=url;this.total=total;this.info=info;this.ctx=ctx;this.output=output;
  this.loop=loop;this.duration=info.totalFrames/info.sampleRate;
  this.paused=true;this.closed=false;this.playing=false;this.cursor=0;
  this.at=0;this.startedAt=0;this.busy=false;this.buffers=new Set();
  this.listeners=new Map();this.abort=new AbortController();
  // < 3 MB PCM chunks, versus up to 500 MB originals. Keep ~6 s ahead.
  this.framesPerChunk=Math.max(4096,Math.floor(info.sampleRate*2));
 }
 addEventListener(name,callback){
  const list=this.listeners.get(name)||[];list.push(callback);this.listeners.set(name,list);
 }
 emit(name){for(const f of this.listeners.get(name)||[])try{f({type:name})}catch(_){}}
 get currentTime(){
  if(!this.startedAt)return 0;
  const t=Math.max(0,this.ctx.currentTime-this.startedAt);
  return this.loop&&this.duration>0?t%this.duration:Math.min(t,this.duration);
 }
 async play(){
  if(this.closed)throw Error("closed");
  this.paused=false;
  await this.pump(true);
  if(!this.playing)throw Error("stream_not_started");
 }
 async pump(initial=false){
  if(this.closed||this.paused||this.busy)return;
  this.busy=true;
  try{
   const ctx=this.ctx,info=this.info;
   const schedule=(decoded,first,final)=>{
    const source=ctx.createBufferSource();
    source.buffer=decoded;source.connect(this.output);
    const when=this.playing?Math.max(this.at,ctx.currentTime+.04):ctx.currentTime+.14;
    if(!this.playing)this.startedAt=when-first/info.sampleRate;
    source.start(when);this.buffers.add(source);
    source.onended=()=>{this.buffers.delete(source);try{source.disconnect()}catch(_){}};
    this.at=when+decoded.duration;
    if(!this.playing){this.playing=true;this.emit("playing")}
    this.emit("timeupdate");
    if(final){
     const old=source.onended;
     source.onended=()=>{old?.();if(!this.closed)this.emit("ended")};
    }
   };
   if(initial){
    // Prebuffer three independent two-second packets in parallel. They are
    // scheduled only after all three decodes complete: no startup gap when
    // the origin takes longer than one audio packet to respond.
    let cursor=this.cursor;
    const wanted=[];
    for(let i=0;i<3;i++){
     if(cursor>=info.totalFrames){if(!this.loop)break;cursor=0}
     const first=cursor,frames=Math.min(this.framesPerChunk,info.totalFrames-first);
     if(frames<=0)break;
     const start=info.offset+first*info.blockAlign,end=start+frames*info.blockAlign-1;
     wanted.push({first,frames,start,end,final:!this.loop&&first+frames>=info.totalFrames});
     cursor+=frames;
    }
    const packets=await Promise.all(wanted.map(async q=>({
     ...q,decoded:await ctx.decodeAudioData(wavChunk(info,
      await range(this.url,q.start,q.end,this.total,this.abort.signal)))
    })));
    if(this.closed||this.paused)return;
    this.cursor=cursor;
    for(const packet of packets)schedule(packet.decoded,packet.first,packet.final);
    return;
   }
   for(let tries=0;tries<3;tries++){
    if(this.closed||this.paused||this.at-ctx.currentTime>5.0)break;
    if(this.cursor>=info.totalFrames){
     if(!this.loop)break;
     this.cursor=0;
    }
    const first=this.cursor,frames=Math.min(this.framesPerChunk,info.totalFrames-first);
    if(frames<=0)break;
    const start=info.offset+first*info.blockAlign,end=start+frames*info.blockAlign-1;
    const pcm=await range(this.url,start,end,this.total,this.abort.signal);
    if(this.closed||this.paused)break;
    const decoded=await ctx.decodeAudioData(wavChunk(info,pcm));
    if(this.closed||this.paused)break;
    this.cursor+=frames;
    schedule(decoded,first,!this.loop&&this.cursor>=info.totalFrames);
    if(!this.loop&&this.cursor>=info.totalFrames)break;
   }
  }finally{this.busy=false}
 }
 pause(){
  this.paused=true;this.closed=true;this.abort.abort();
  for(const source of this.buffers)try{source.stop();source.disconnect()}catch(_){}
  this.buffers.clear();
 }
 removeAttribute(){}
 load(){}
 disconnect(){this.pause()}
}
