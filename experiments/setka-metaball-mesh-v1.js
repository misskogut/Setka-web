/* SETKA experimental 3D logo: closed, smooth-min golden honey metaball.
   Geometry is generated once and deformed continuously in the GPU.
   The field is a true signed-distance union, not a radial sphere mesh. */
(function(){
"use strict";
const HOME=[[-.52,.34,.04,.59],[.47,.32,-.18,.57],[-.35,-.48,.12,.57],[.52,-.38,.24,.52],[0,-.06,.05,.37]];
const RADII=Object.freeze(HOME.map(v=>v[3]));
const normalize=v=>{const s=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/s,v[1]/s,v[2]/s];};
const sm=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
function sdf(x,y,z){
 let d=100;
 for(const p of HOME)d=sm(d,Math.hypot(x-p[0],y-p[1],z-p[2])-p[3],.23);
 return d;
}
const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
function create(opts={}){
 const steps=Math.max(12,Math.min(36,Math.round(opts.steps||23)));
 const unitScale=Number.isFinite(opts.scale)?opts.scale:94;
 const zOffset=Number.isFinite(opts.zOffset)?opts.zOffset:110;
 const span=1.48, step=span*2/steps, Q=steps+1;
 const values=new Float32Array(Q*Q*Q);
 const grads=new Float32Array(values.length*3);
 const index=(i,j,k)=>i+Q*(j+Q*k);
 for(let z=0;z<=steps;z++)for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++)
  values[index(x,y,z)]=sdf(-span+x*step,-span+y*step,-span+z*step);
 for(let z=0;z<=steps;z++)for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++){
  const at=index(x,y,z), ix=Math.max(0,x-1),ax=Math.min(steps,x+1),iy=Math.max(0,y-1),ay=Math.min(steps,y+1),iz=Math.max(0,z-1),az=Math.min(steps,z+1);
  const n=normalize([values[index(ax,y,z)]-values[index(ix,y,z)],values[index(x,ay,z)]-values[index(x,iy,z)],values[index(x,y,az)]-values[index(x,y,iz)]]);
  grads.set(n,at*3);
 }
 const vertices=[];
 const boundsMin=[Infinity,Infinity,Infinity],boundsMax=[-Infinity,-Infinity,-Infinity];
 function record(a,b,c){
  for(const v of [a,b,c]){
   const p=[v.p[0]*unitScale,v.p[1]*unitScale,v.p[2]*unitScale+zOffset];
   vertices.push(...p,...v.n);
   for(let i=0;i<3;i++){boundsMin[i]=Math.min(boundsMin[i],p[i]);boundsMax[i]=Math.max(boundsMax[i],p[i]);}
  }
 }
 for(let z=0;z<steps;z++)for(let y=0;y<steps;y++)for(let x=0;x<steps;x++){
  const pts=corners.map(c=>[-span+(x+c[0])*step,-span+(y+c[1])*step,-span+(z+c[2])*step]);
  const vals=corners.map(c=>values[index(x+c[0],y+c[1],z+c[2])]);
  if(vals.every(v=>v>=0)||vals.every(v=>v<0))continue;
  const normals=corners.map(c=>Array.from(grads.slice(index(x+c[0],y+c[1],z+c[2])*3,index(x+c[0],y+c[1],z+c[2])*3+3)));
  function edge(a,b){
   const w=Math.max(0,Math.min(1,vals[a]/(vals[a]-vals[b])));
   return {p:pts[a].map((q,j)=>q+(pts[b][j]-q)*w),n:normalize(normals[a].map((q,j)=>q+(normals[b][j]-q)*w))};
  }
  for(const tet of tets){
   const inside=tet.filter(i=>vals[i]<0),outside=tet.filter(i=>vals[i]>=0);
   if(inside.length===0||outside.length===0)continue;
   if(inside.length===1||outside.length===1){
    const pole=(inside.length===1?inside:outside)[0],others=inside.length===1?outside:inside;
    record(edge(pole,others[0]),edge(pole,others[1]),edge(pole,others[2]));
   }else{
    const a=inside[0],b=inside[1],c=outside[0],d=outside[1];
    const p=edge(a,c),q=edge(a,d),r=edge(b,c),s=edge(b,d);
    record(p,q,r);record(q,s,r);
   }
  }
 }
 return {vertices:new Float32Array(vertices),triangleCount:vertices.length/18,bounds:{min:boundsMin,max:boundsMax},homes:HOME.map(p=>p.slice())};
}
const api=Object.freeze({create,sdf,homes:HOME.map(p=>p.slice()),material:"golden-honey-08",geometry:"marching-tetrahedra-smooth-union"});
if(typeof window!=="undefined")window.SETKA_METABALL_MESH=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();