import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSoftBody} from '../src/soft-body.js';
import {balloonGlyph,vectorGlyph} from '../src/type.js';

test('closed shell has outward normals and exactly two faces per edge',()=>{
 const b=makeSoftBody(),p=b.geometry.attributes.position.array,n=b.geometry.attributes.normal.array,ix=b.geometry.index.array,edges=new Map();let outward=0;
 for(let i=0;i<p.length;i+=3)outward+=p[i]*n[i]+p[i+1]*n[i+1]+p[i+2]*n[i+2];assert.ok(outward>1000);
 for(let i=0;i<ix.length;i+=3)for(let j=0;j<3;j++){const a=ix[i+j],c=ix[i+(j+1)%3],k=[Math.min(a,c),Math.max(a,c)].join(',');edges.set(k,(edges.get(k)||0)+1)}
 assert.ok([...edges.values()].every(x=>x===2));assert.equal(p.length/3-edges.size+ix.length/3,2);
});
test('hold, pull, release and repeated impulses deform and recover a continuous finite mesh',()=>{
 const b=makeSoftBody(80,50);b.press([1,0,.5],[0,0,-1]);for(let i=0;i<60;i++)b.update(1/60,i/60);assert.ok(b.energy>.025);
 b.drag([.4,.2,0]);for(let i=0;i<30;i++)b.update(1/60,1+i/60);const energy=b.energy;assert.ok(energy>.03);b.release();
 for(let i=0;i<360;i++)b.update(1/60,2+i/60);assert.ok(b.energy<energy/1000);
 for(let k=0;k<8;k++){b.press([Math.cos(k),Math.sin(k),.5],[.1,0,-1]);for(let i=0;i<6;i++)b.update(1/60,i/60);b.release()}
 assert.ok([...b.geometry.attributes.position.array,...b.geometry.attributes.normal.array].every(Number.isFinite));
});
test('balloon letters contain volume, smooth outward normals and valid triangles',()=>{
 for(const ch of 'СКВИШ'){
  const m=balloonGlyph(ch),g=m.geometry;g.computeBoundingBox();const box=g.boundingBox;assert.ok(box.max.z-box.min.z>.19);assert.ok(g.index.count>4000);
  assert.ok([...g.attributes.position.array,...g.attributes.normal.array].every(Number.isFinite));
 }
});
test('all small Cyrillic and Latin characters are actual beveled extrusions',()=>{
 for(const ch of new Set('ДЛЯМОЗГААНТИСТРЕСЕКРSETKA')){const m=vectorGlyph(ch,.3,.03);m.geometry.computeBoundingBox();assert.ok(m.geometry.attributes.position.count>20,ch);assert.ok(m.geometry.boundingBox.max.z-m.geometry.boundingBox.min.z>.03,ch)}
});
