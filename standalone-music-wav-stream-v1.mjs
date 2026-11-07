// Stream original RIFF/PCM in bounded blocks. Each block is played by the
// browser's native AudioBufferSource resampler at its original sample rate.
const HEADER_BYTES=64*1024, BLOCK_SECONDS=3, LOOKAHEAD_SECONDS=9, MAX_REQUESTS=3;
const START_LEAD=.075;
const PCM_GUID_SUFFIX=[0,0,16,0,128,0,0,170,0,56,155,113];

export function readOrbitWavHeader(bytes,total){
 const view=new DataView(bytes);
 const tag=at=>String.fromCharCode(...new Uint8Array(bytes,at,4));
 if(view.byteLength<12||tag(0)!=="RIFF"||tag(8)!=="WAVE")throw Error("wav_container");
 const end=view.getUint32(4,true)+8;
 if(end>total)throw Error("wav_truncated");
 let format;
 for(let at=12;at+8<=Math.min(end,view.byteLength);){
  const type=tag(at),length=view.getUint32(at+4,true),start=at+8;
  if(start+length>end)throw Error("wav_truncated_chunk");
  if(type==="data"&&format){
   if(length<format.align||length%format.align)throw Error("wav_data_alignment");
   return {...format,start,frames:length/format.align};
  }
  if(type==="fmt "&&length>=16&&start+length<=view.byteLength){
   let encoding=view.getUint16(start,true);
   const channels=view.getUint16(start+2,true),rate=view.getUint32(start+4,true);
   const align=view.getUint16(start+12,true),bits=view.getUint16(start+14,true);
   if(encoding===0xfffe&&length>=40&&view.getUint16(start+16,true)>=22&&
      PCM_GUID_SUFFIX.every((byte,i)=>view.getUint8(start+28+i)===byte)){
    encoding=view.getUint32(start+24,true);
   }
   const integer=encoding===1&&[8,16,24,32].includes(bits);
   if((!integer&&(encoding!==3||bits!==32))||![1,2].includes(channels)||
      rate<8000||rate>192000||align!==channels*bits/8)throw Error("wav_format");
   format={encoding,channels,rate,align,bits};
  }
  at=start+length+(length%2);
 }
 throw Error("wav_header");
}

export function decodeOrbitWavBlock(ctx,bytes,format){
 const {channels,rate,align,bits,encoding}=format, frames=bytes.byteLength/align;
 const output=ctx.createBuffer(channels,frames,rate),view=new DataView(bytes);
 const sample=encoding===3?i=>view.getFloat32(i,true):
  bits===32?i=>view.getInt32(i,true)/2147483648:
  bits===24?i=>(view.getUint8(i)+256*view.getUint8(i+1)+65536*view.getInt8(i+2))/8388608:
  bits===16?i=>view.getInt16(i,true)/32768:i=>(view.getUint8(i)-128)/128;
 for(let c=0;c<channels;c++){
  const data=output.getChannelData(c);
  for(let i=0,at=c*bits/8;i<frames;i++,at+=align){
   const value=sample(at);data[i]=Number.isFinite(value)?value:0;
  }
 }
 return output;
}

async function requestRange(url,first,last,signal,knownTotal){
 const response=await fetch(url,{
  headers:{Range:"bytes="+first+"-"+last},signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])
 });
 const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get("Content-Range")||"");
 const total=Number(range?.[3]);
 if(response.status!==206||!range||Number(range[1])!==first||Number(range[2])!==last||
    !Number.isSafeInteger(total)||total<=last||(knownTotal&&knownTotal!==total)){
  await response.body?.cancel();
  throw Error("wav_range");
 }
 // Limit actual bytes even if an upstream proxy lies about Content-Range.
 const bytes=new Uint8Array(last-first+1),reader=response.body.getReader();
 let offset=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   if(offset+value.byteLength>bytes.length)throw Error("wav_range_size");
   bytes.set(value,offset);offset+=value.byteLength;
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 if(offset!==bytes.length)throw Error("wav_range_size");
 return {bytes:bytes.buffer,total};
}

export function createOrbitWavStream(ctx,destination,track,failed){
 const controller=new AbortController(),{signal}=controller;
 const sources=new Set(),queue=[];
 let format,total,frame=0,nextAt=0,headerPending=false,headerFailures=0;
 const stream={startedAt:Infinity,completedAt:Infinity,underruns:0,closed:false};
 stream.stop=()=>{
  if(stream.closed)return;
  stream.closed=true;controller.abort();queue.length=0;
  for(const source of sources){source.stop();source.disconnect()}
  sources.clear();
 };
 function fail(error){
  if(signal.aborted)return;
  stream.stop();failed(error);
 }
 async function loadHeader(){
  headerPending=true;
  try{
   const head=await requestRange(track.audio_url,0,HEADER_BYTES-1,signal);
   format=readOrbitWavHeader(head.bytes,head.total);total=head.total;
  }catch(error){if(++headerFailures>=2)fail(error)}
  finally{headerPending=false}
 }
 async function loadBlock(block){
  block.pending=true;
  try{
   const first=format.start+block.frame*format.align;
   const {bytes}=await requestRange(track.audio_url,first,first+block.count*format.align-1,signal,total);
   if(!signal.aborted)block.bytes=bytes;
  }catch(error){if(++block.failures>=2)fail(error)}
  finally{block.pending=false}
 }
 function scheduleBlock(block,now){
  const source=ctx.createBufferSource();
  source.buffer=decodeOrbitWavBlock(ctx,block.bytes,format);
  if(!nextAt||nextAt<now){
   if(nextAt)stream.underruns++;
   nextAt=now+START_LEAD;
  }
  source.connect(destination);sources.add(source);
  source.onended=()=>{source.disconnect();sources.delete(source)};
  source.start(nextAt);
  stream.startedAt=Math.min(stream.startedAt,nextAt);
  if(block.frame<format.frames*.95&&block.frame+block.count>=format.frames*.95)
   stream.completedAt=Math.min(stream.completedAt,nextAt+(format.frames*.95-block.frame)/format.rate);
  nextAt+=block.count/format.rate;
 }
 stream.pump=()=>{
  if(signal.aborted||ctx.state!=="running")return;
  if(!format){if(!headerPending)loadHeader();return}
  const now=ctx.currentTime;
  try{
   while(queue[0]?.bytes&&nextAt<now+LOOKAHEAD_SECONDS)scheduleBlock(queue.shift(),now);
  }catch(error){fail(error);return}
  for(const block of queue)if(!block.bytes&&!block.pending)loadBlock(block);
  if(nextAt>now+LOOKAHEAD_SECONDS)return;
  while(queue.length<MAX_REQUESTS&&frame<format.frames){
   const count=Math.min(format.rate*BLOCK_SECONDS,format.frames-frame);
   const block={frame,count,failures:0};
   queue.push(block);loadBlock(block);
   frame+=count;
   if(frame===format.frames&&track.loop!==false)frame=0;
  }
 };
 return stream;
}
