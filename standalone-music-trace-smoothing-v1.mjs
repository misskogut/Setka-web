// SETKA Music — contour smoothing for screenshot-traced symbols.
// Pixel-sampled staircases must not be baked into the final SVG geometry.
// Shared by both historical icon sets; preserves IDs, holes, winding and real corners.
const point=(x,y)=>({x,y});
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pointSegmentDistance=(p,a,b)=>{
 const dx=b.x-a.x,dy=b.y-a.y;
 const l=dx*dx+dy*dy;
 if(l<1e-9)return length(p,a);
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l));
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};
function simplifyLine(points,tolerance){
 const n=points.length;
 if(n<=2)return points.slice();
 const keep=new Uint8Array(n);keep[0]=keep[n-1]=1;
 const stack=[[0,n-1]];
 while(stack.length){
  const [start,end]=stack.pop();
  let max=tolerance,index=-1;
  for(let i=start+1;i<end;i++){
   const d=pointSegmentDistance(points[i],points[start],points[end]);
   if(d>max){max=d;index=i}
  }
  if(index>=0){keep[index]=1;stack.push([start,index],[index,end])}
 }
 return points.filter((_,i)=>keep[i]);
}
function simplifyRing(original,tolerance){
 let pts=original.filter((p,i)=>i===0||p.x!==original[i-1].x||p.y!==original[i-1].y);
 if(pts.length>1&&length(pts[0],pts[pts.length-1])<1e-9)pts.pop();
 if(pts.length<4)return pts;
 // Split at diametrically remote contour points so RDP never straightens an entire closed loop.
 let split=1,best=-1;
 for(let i=1;i<pts.length;i++){
  const d=length(pts[0],pts[i]);
  if(d>best){best=d;split=i}
 }
 const a=simplifyLine(pts.slice(0,split+1),tolerance);
 const b=simplifyLine([...pts.slice(split),pts[0]],tolerance);
 const next=[...a.slice(0,-1),...b.slice(0,-1)];
 return next.length>=3?next:pts;
}
const fmt=n=>{
 const v=Math.round(n*1000)/1000;
 return String(Object.is(v,-0)?0:v);
};
function ringToPath(points){
 const n=points.length;
 if(n<3)return "";
 const tangents=points.map((cur,i)=>{
  const prev=points[(i+n-1)%n],next=points[(i+1)%n];
  const dx1=cur.x-prev.x,dy1=cur.y-prev.y,dx2=next.x-cur.x,dy2=next.y-cur.y;
  const inLength=Math.hypot(dx1,dy1),outLength=Math.hypot(dx2,dy2);
  if(inLength<1e-6||outLength<1e-6)return [0,0,0];
  const cos=Math.max(-1,Math.min(1,(dx1*dx2+dy1*dy2)/(inLength*outLength)));
  const degrees=Math.acos(cos)*180/Math.PI;
  // Preserve large corners (leaf tips, stars, geometric emblems) and
  // round tiny 1–2px sampling steps from raster outlines.
  const limit=Math.min(inLength,outLength)<2.4?105:Math.min(inLength,outLength)<4?55:36;
  if(degrees>=limit)return [0,0,0];
  const vx=dx1/inLength+dx2/outLength,vy=dy1/inLength+dy2/outLength;
  const mag=Math.hypot(vx,vy);
  if(mag<1e-6)return [0,0,0];
  const strength=Math.min(inLength,outLength)*.31;
  return [vx/mag,vy/mag,strength];
 });
 let d="M"+fmt(points[0].x)+" "+fmt(points[0].y);
 for(let i=0;i<n;i++){
  const j=(i+1)%n,a=points[i],b=points[j],ta=tangents[i],tb=tangents[j];
  if(!ta[2]&&!tb[2]){d+="L"+fmt(b.x)+" "+fmt(b.y);continue}
  const chord=length(a,b);
  const fa=Math.min(chord*.45,ta[2]),fb=Math.min(chord*.45,tb[2]);
  d+="C"+fmt(a.x+ta[0]*fa)+" "+fmt(a.y+ta[1]*fa)+" "+
    fmt(b.x-tb[0]*fb)+" "+fmt(b.y-tb[1]*fb)+" "+
    fmt(b.x)+" "+fmt(b.y);
 }
 return d+"Z";
}
export function smoothTracedIcon(encoded,alphabet){
 if(typeof encoded!=="string"||typeof alphabet!=="string"||alphabet.length<90)throw Error("invalid_icon_trace");
 return encoded.split("|").filter(Boolean).map(segment=>{
  if(segment.length<6||segment.length%2)throw Error("invalid_icon_contour");
  const pts=[];
  for(let i=0;i<segment.length;i+=2){
   const x=alphabet.indexOf(segment[i]),y=alphabet.indexOf(segment[i+1]);
   if(x<0||y<0)throw Error("invalid_icon_coordinate");
   pts.push(point(x,y));
  }
  // ~0.9 units on a 90-unit viewBox: drops quantization steps
  // but retains the distinct source shape and its negative spaces.
  return ringToPath(simplifyRing(pts,.88));
 }).join(" ");
}
