// A closed, sculpted four-chamber body. No noise-displaced sphere and no image assets.
// Shared pole/seam vertices keep the shell watertight under all deformations.
import {BufferGeometry,Float32BufferAttribute} from 'three';
// Landmark silhouette traced as geometric measurements, never sampled as image pixels.
const outline=[[1.32,.06],[1.63,.83],[1.22,1.54],[.58,1.69],[-.03,1.36],[-.64,1.71],[-1.35,1.50],[-1.70,.82],[-1.41,-.06],[-1.80,-.89],[-1.47,-1.62],[-.72,-1.77],[.02,-1.45],[.70,-1.73],[1.48,-1.57],[1.83,-.86]];
function contourPoint(theta){
 const t=((theta/(Math.PI*2))%1+1)%1*outline.length,i=Math.floor(t),u=t-i;
 const p=n=>outline[(n+outline.length)%outline.length];
 return [0,1].map(k=>.5*((2*p(i)[k])+(-p(i-1)[k]+p(i+1)[k])*u+(2*p(i-1)[k]-5*p(i)[k]+4*p(i+1)[k]-p(i+2)[k])*u*u+(-p(i-1)[k]+3*p(i)[k]-3*p(i+1)[k]+p(i+2)[k])*u*u*u));
}
export function sculptedPoint(phi,theta){
  const r=Math.sin(phi),c=Math.cos(phi),front=Math.max(0,c);
  const a=theta+.22*(1-r),xy=contourPoint(a);
  const fold=.35*Math.sin(4*a+5.3*r-.7)*Math.pow(r,1.2)*Math.pow(front,1.1);
  return [r*xy[0],r*xy[1],
    .84*c+fold-.39*Math.exp(-r*r/.13)*front+.035*Math.sin(3*a)*r*r];
}
export function makeSoftBody(segments=104,rings=64){
  const points=[sculptedPoint(0,0)],idx=[];
  for(let j=1;j<rings;j++)for(let i=0;i<segments;i++)points.push(sculptedPoint(j/rings*Math.PI,i/segments*Math.PI*2));
  const bottom=points.length;points.push(sculptedPoint(Math.PI,0));
  const at=(j,i)=>1+(j-1)*segments+(i+segments)%segments;
  for(let i=0;i<segments;i++){
    idx.push(0,at(1,i),at(1,i+1));
    for(let j=1;j<rings-1;j++)idx.push(at(j,i),at(j+1,i),at(j,i+1),at(j,i+1),at(j+1,i),at(j+1,i+1));
    idx.push(at(rings-1,i),bottom,at(rings-1,i+1));
  }
  // Counterclockwise triangles point outwards on both hemispheres.
  const rest=new Float32Array(points.flat()),n=points.length,d=new Float32Array(n*3),v=new Float32Array(n*3);
  const graph=Array.from({length:n},()=>new Set());
  for(let i=0;i<idx.length;i+=3){const [a,b,c]=idx.slice(i,i+3);graph[a].add(b).add(c);graph[b].add(a).add(c);graph[c].add(a).add(b)}
  const neighbors=graph.map(s=>Array.from(s));
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(rest.slice(),3));geometry.setIndex(idx);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const weights=new Float32Array(n);let contact=null,impulses=[],energy=0,interiorAnchor=-1,interiorWeight=0;
  function press(point,direction){
    contact={point:point.slice(),direction:direction.slice(),drag:[0,0,0]};
    let best=-1;
    for(let i=0;i<n;i++){const k=i*3;weights[i]=Math.exp(-((rest[k]-point[0])**2+(rest[k+1]-point[1])**2+(rest[k+2]-point[2])**2)/.24);if(weights[i]>best){best=weights[i];interiorAnchor=i}}
    interiorWeight=Math.exp(-(point[0]*point[0]+point[1]*point[1])/1.8);
    impulses.push({point:point.slice(),age:0});
  }
  function drag(delta){if(contact)contact.drag=delta.map(x=>Math.max(-.65,Math.min(.65,x)))}
  function release(){contact=null}
  function update(dt,time,elasticity=65){
    dt=Math.min(dt,1/30);const spring=70+elasticity*1.35,damping=9.5,coupling=95;
    impulses.forEach(p=>p.age+=dt);impulses=impulses.filter(p=>p.age<2.2);
    energy=0;
    for(let i=0;i<n;i++){
      const k=i*3,ns=neighbors[i],len=ns.length;
      for(let axis=0;axis<3;axis++){
        let lap=0;for(const j of ns)lap+=d[j*3+axis];lap=lap/len-d[k+axis];
        let force=-spring*d[k+axis]+coupling*lap-damping*v[k+axis];
        if(contact)force+=weights[i]*(contact.direction[axis]*.40+contact.drag[axis]*.68)*spring;
        v[k+axis]+=force*dt;
      }
    }
    const pos=geometry.attributes.position.array;
    for(let i=0;i<n;i++){
      const k=i*3;const pulse=1+.009*Math.sin(time*1.18+rest[k+1]*.8)+.004*Math.sin(time*.72+rest[k]*1.4);
      let wave=0;
      for(const p of impulses){const dist=Math.hypot(rest[k]-p.point[0],rest[k+1]-p.point[1],rest[k+2]-p.point[2]);wave+=.065*Math.sin(11*dist-p.age*16)*Math.exp(-p.age*2.4)*Math.exp(-((dist-p.age*1.8)**2)/.24)}
      for(let a=0;a<3;a++){d[k+a]=Math.max(-.65,Math.min(.65,d[k+a]+v[k+a]*dt));pos[k+a]=rest[k+a]*pulse+d[k+a]+rest[k+a]*wave*.4;energy+=d[k+a]*d[k+a]}
    }
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();
    return Math.sqrt(energy/n);
  }
  return {geometry,rest,press,drag,release,update,get energy(){return Math.sqrt(energy/n)},get pressed(){return !!contact},get vertexCount(){return n},get interiorOffset(){return interiorAnchor<0?[0,0,0]:[0,1,2].map(a=>d[interiorAnchor*3+a]*interiorWeight)},neighbors};
}
