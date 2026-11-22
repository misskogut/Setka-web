import assert from "node:assert/strict";
import {readFileSync,mkdirSync} from "node:fs";
import {chromium,webkit} from "playwright";

const type=process.env.SETKA_BROWSER==="webkit"?webkit:chromium;
const browser=await type.launch({headless:true,
  args:type===chromium?["--no-sandbox","--enable-webgl","--enable-unsafe-swiftshader"]:[]});
const keys=["today","notes","pulse","symptoms","me"];
const names=["Сегодня","Заметки","Пульс","Состояния","Я"];
const shapes=[
 '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
 '<path d="M12 5v14M5 12h14"/>',
 '<path d="M20 5.8a5 5 0 0 0-8 1 5 5 0 0 0-8-1C1 9.6 6 14.9 12 19c6-4.1 11-9.4 8-13.2Z"/>',
 '<path d="m12 3 8 9-8 9-8-9Z"/>',
 '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'
];
const tabs=keys.map((key,i)=>
 '<button data-p="'+key+'" type="button"><span class="st-dock-icon"><svg viewBox="0 0 24 24">'+
 shapes[i]+'</svg></span><span class="st-dock-label">'+names[i]+'</span></button>').join("");
const css=[
 'html,body{height:100%;margin:0;background:#020105;color:#ece9f5;font:12px system-ui}',
 '#st34Nav{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);width:min(calc(100% - 22px),480px);height:64px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid #7775;border-radius:32px;box-sizing:border-box;background:#08070c}',
 '#st34Nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:transparent;border:0;color:inherit;min-height:54px;padding:3px 0;cursor:pointer}',
 '#st34Nav .st-dock-icon{width:22px;height:22px;line-height:0}',
 '#st34Nav svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}',
 '#st34Nav .st-dock-label{font-size:9px;line-height:12px}'
].join("\n");
let page;
try{
 page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];
 page.on("pageerror",err=>errors.push(err.message));
 await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><nav id="st34Nav">'+tabs+'</nav></body></html>');
 await page.addStyleTag({content:css+readFileSync("experiments/standalone-cycle-dock-rotation-v1.css","utf8")});
 await page.addScriptTag({content:readFileSync("experiments/standalone-cycle-dock-objects-v2.js","utf8")});
 await page.addScriptTag({content:readFileSync("experiments/standalone-cycle-dock-rotation-v1.js","utf8")});
 const info=await page.evaluate(()=>window.SETKA_CYCLE_3D_MODELS?.getInfo());
 assert.ok(info&&info.models.length===5);
 assert.equal(info.lineOnly,true);
 assert.equal(info.nativeSizePx,22);
 assert.equal(info.strokeColor,"white");
 const original=await page.locator("#st34Nav").boundingBox();
 assert.ok(original?.height>=60);
 assert.deepEqual(await page.locator(".st-dock-label").allTextContents(),names);
 if(info.live){
   for(const angle of [0,-45,-90,-135,-180,0]){
     const result=await page.evaluate(angle=>{
       window.SETKA_CYCLE_DOCK_ROTATION.render(angle);
       const svg=document.querySelector("#st34Nav .st-dock-icon>svg");
       const canvas=document.getElementById("setkaCycle3DObjects");
       const opacitySvg=Number(getComputedStyle(svg).opacity);
       const opacity3D=Number(getComputedStyle(canvas).opacity);
       const gl=canvas?.getContext("webgl");
       const rgba=new Uint8Array(canvas.width*canvas.height*4);
       gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
       let solid=0;
       for(let i=3;i<rgba.length;i+=4)if(rgba[i]>0)solid++;
       return{angle:window.SETKA_CYCLE_DOCK_ROTATION.getAngle(),
         solid,error:gl.getError(),opacitySvg,opacity3D,
         lineVertices:window.SETKA_CYCLE_3D_MODELS.getInfo().lastLineVertices};
     },angle);
     assert.equal(result.angle,angle);
     assert.equal(result.error,0,"WebGL error");
     assert.ok(result.solid>20,"invisible 3D wire contour at "+angle);
     assert.ok(result.lineVertices.every(n=>n>0&&n<=120),
       "messy wireframe regression: "+result.lineVertices.join(",")+" at "+angle);
     if(Math.abs(angle)%180===0){
       assert.ok(result.opacitySvg>.99,"rest must preserve original SVG at "+angle);
       assert.ok(result.opacity3D<.01,"rest must not show a new 3D icon at "+angle);
     }
     if(Math.abs(angle)===90){
       assert.ok(result.opacitySvg<.01,"middle of turn hides original SVG");
       assert.ok(result.opacity3D>.99,"middle of turn shows only white 3D contour");
     }
   }
   mkdirSync("tests/visual-smoke",{recursive:true});
   for(const angle of [0,45,90]){
     await page.evaluate(a=>window.SETKA_CYCLE_DOCK_ROTATION.render(a),angle);
     await page.screenshot({path:"tests/visual-smoke/setka-3d-dock-"+angle+"-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
   }
 }else{
   console.log("SETKA WebGL unavailable in this headless browser; SVG fallback retained");
   assert.equal(await page.locator("#st34Nav .setka-cycle-icon-front").count(),5);
 }
 const after=await page.locator("#st34Nav").boundingBox();
 assert.deepEqual(after,original,"dock must remain stationary");
 assert.deepEqual(await page.locator(".st-dock-label").allTextContents(),names);
 assert.deepEqual(errors,[]);
 console.log("SETKA REAL 3D DOCK BROWSER PASS",process.env.SETKA_BROWSER||"chromium",info.live?"WebGL":"SVG fallback");
}finally{
 await page?.close();
 await browser.close();
}
