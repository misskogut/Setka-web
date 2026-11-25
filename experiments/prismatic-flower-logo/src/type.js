import * as T from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {mergeVertices,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import font from './glyphs.json' with {type:'json'};

function line(points){return points}
function curve(commands){const p=new T.Path();for(const c of commands)p[c[0]](...c.slice(1));return p.getPoints(50).map(v=>[v.x,v.y])}
const strokes={
 'С':[curve([['moveTo',.24,.32],['bezierCurveTo',-.20,.62,-.57,.09,-.25,-.33],['bezierCurveTo',-.09,-.54,.24,-.40,.31,-.18]])],
 'К':[line([[-.26,-.42],[-.26,.42]]),curve([['moveTo',.27,.43],['quadraticCurveTo',.10,.05,-.22,-.02],['quadraticCurveTo',.11,-.12,.32,-.42]])],
 'В':[line([[-.28,-.43],[-.28,.43]]),curve([['moveTo',-.28,.43],['bezierCurveTo',.34,.58,.53,.09,-.21,.02],['bezierCurveTo',.57,.14,.55,-.56,-.28,-.43]])],
 'И':[curve([['moveTo',-.27,.43],['lineTo',-.27,-.34],['quadraticCurveTo',-.28,-.54,-.12,-.28],['lineTo',.27,.42],['lineTo',.27,-.43]])],
 'Ш':[curve([['moveTo',-.42,.43],['lineTo',-.42,-.27],['quadraticCurveTo',-.42,-.45,-.22,-.45],['lineTo',.23,-.45],['quadraticCurveTo',.43,-.45,.43,-.24],['lineTo',.43,.43]]),line([[0,.42],[0,-.42]])]
};
function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=T.MathUtils.clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)}
// Isosurfaces of swept rounded strokes, with welded intersections and genuinely inflated faces.
export function balloonGlyph(ch,material){
 const res=50,mc=new MarchingCubes(res,material,false,false,30000);mc.isolation=0;
 const segs=[];for(const path of strokes[ch])for(let i=0;i<path.length-1;i++)segs.push([path[i],path[i+1]]);
 for(let y=0;y<res;y++)for(let x=0;x<res;x++){
  const px=(x/(res-1)*2-1)*.8,py=(y/(res-1)*2-1)*.8;
  let d=Infinity;for(const [a,b] of segs)d=Math.min(d,segmentDistance(px,py,a,b));
  for(let z=0;z<res;z++){const pz=(z/(res-1)*2-1)*.8;mc.field[x+y*res+z*res*res]=.164-Math.sqrt(d*d+pz*pz*.55)}
 }
 mc.update();let geo=mc.geometry.clone();geo.setDrawRange(0,mc.count);
 // Remove MarchingCubes' spare capacity before welding/smoothing normals.
 const cut=new T.BufferGeometry();cut.setAttribute('position',new T.Float32BufferAttribute(geo.attributes.position.array.slice(0,mc.count*3),3));
 geo=mergeVertices(cut,1e-5);geo.scale(.8,.8,.8);geo.computeVertexNormals();geo.computeBoundingBox();
 return new T.Mesh(geo,material);
}
function paths(ch){
 const g=font.glyphs[ch];if(!g)return [];
 let p=null;const shape=new T.ShapePath();
 for(const [op,args] of g.commands){
  if(op==='moveTo'){shape.moveTo(...args[0]);p=shape.currentPath}
  if(op==='lineTo')for(const a of args)p.lineTo(...a);
  if(op==='curveTo')p.bezierCurveTo(...args.flat());
  if(op==='qCurveTo'){
   let pp=args.filter(a=>a!==null);
   for(let i=0;i<pp.length-1;i++){const last=i===pp.length-2,end=last?pp[i+1]:[(pp[i][0]+pp[i+1][0])/2,(pp[i][1]+pp[i+1][1])/2];p.quadraticCurveTo(...pp[i],...end)}
  }
  if(op==='closePath')p.closePath();
 }
 return shape.toShapes(false);
}
export function vectorGlyph(ch,height,depth,material){
 const scale=height/1493,shape=paths(ch),geo=new T.ExtrudeGeometry(shape,{depth:depth/scale,bevelEnabled:true,bevelSegments:3,steps:1,curveSegments:12,bevelSize:Math.min(height*.012,depth*.25)/scale,bevelThickness:depth*.2/scale});
 geo.scale(scale,scale,scale);geo.computeBoundingBox();const box=geo.boundingBox;geo.translate(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,0);geo.computeVertexNormals();
 return new T.Mesh(geo,material);
}
export function placeText(text,{height=.12,spacing=.06,depth=.025,material}={}){
 material??=new T.MeshStandardMaterial();
 const group=new T.Group();const chars=[];let cursor=0;
 for(const ch of text){if(ch===' '){cursor+=height*.6+spacing;continue}const mesh=vectorGlyph(ch,height,depth,material);mesh.geometry.computeBoundingBox();const w=mesh.geometry.boundingBox.max.x-mesh.geometry.boundingBox.min.x;mesh.position.x=cursor+w/2;cursor+=w+spacing;chars.push(mesh);group.add(mesh)}
 for(const m of chars)m.position.x-=(cursor-spacing)/2;
 fuseStaticType(group);
 return group;
}
export function fuseStaticType(group){
 const parts=group.children.filter(m=>m.isMesh);if(parts.length<2)return;
 const material=parts[0].material;if(parts.some(m=>m.material!==material))throw Error('Typography batch requires a shared material');
 const geometries=parts.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix)});
 const merged=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();for(const p of parts)p.geometry.dispose();
 group.clear();const mesh=new T.Mesh(merged,material);mesh.name='batched-solid-type';group.add(mesh);
}
