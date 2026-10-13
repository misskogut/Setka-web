import {draw} from './renderer.mjs?v=1.1.2';
// Window dimensions and the app's drawing area differ on desktop. The drawing
// area is explicit recorded evidence; never infer its historical CSS width.
export function canvasGeometry(state={}){
 const r=state.canvasRect;if(!r)return null;
 const values=[r.left,r.top,r.width,r.height];
 if(values.some(v=>v==null||v===''||!Number.isFinite(Number(v))))return null;
 const [left,top,width,height]=values.map(Number);
 if(width<=0||height<=0||width>4096||height>4096||Math.abs(left)>8192||Math.abs(top)>8192)return null;
 return {left,top,width,height};
}
export function drawRecordedCanvas(output,scratch,recipe,state,frame,reset=false){
 const r=canvasGeometry(state);
 if(!r)return draw(output,recipe.config,frame,recipe.renderId,false);
 const width=Math.max(1,Math.round(r.width)),height=Math.max(1,Math.round(r.height));
 if(scratch.width!==width||scratch.height!==height){scratch.width=width;scratch.height=height;reset=true;}
 if(reset)scratch.getContext('2d').clearRect(0,0,width,height);
 if(!draw(scratch,recipe.config,frame,recipe.renderId,false))return false;
 const ctx=output.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,output.width,output.height);
 ctx.drawImage(scratch,r.left,r.top,r.width,r.height);return true;
}
