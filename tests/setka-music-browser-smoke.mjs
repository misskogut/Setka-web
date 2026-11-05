import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdir} from "node:fs/promises";
import {chromium,webkit} from "playwright";
import {installPublicationCatalog} from "./publication-fixture.mjs";
import {buildData} from "../research-v1/model.mjs";
const port=49417,base="http://127.0.0.1:"+port,server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const browserType=process.env.SETKA_BROWSER==="webkit"?webkit:chromium;
function wav(){
 const count=22050,b=Buffer.alloc(44+count*2);
 b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);b.write("fmt ",12);b.writeUInt32LE(16,16);
 b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(22050,24);b.writeUInt32LE(44100,28);
 b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(count*2,40);
 return "data:audio/wav;base64,"+b.toString("base64");
}
const audio=wav(),cats=["hand","eye","sleep","8d"].map((id,i)=>({id,title:id,visible:true,sort_order:i}));
const tracks=[
 {id:"00000000-0000-4000-8000-000000000001",title:"Кошка",audio_url:audio,icon_key:"cat",category_ids:["hand"],published:true,loop:true},
 {id:"00000000-0000-4000-8000-000000000002",title:"Дождь",audio_url:audio,icon_key:"rain",category_ids:["sleep"],published:true,loop:true},
 {id:"00000000-0000-4000-8000-000000000003",title:"Ветер",audio_url:audio,icon_key:"wind",category_ids:["eye"],published:true,loop:true}
];
let browser;
let uiStub=[{slot:"motion-counter",icon_path:"icons/00000000-0000-4000-8000-000000000999.png"}];
try{
 for(let i=0;i<45;i++){try{if((await fetch(base+"/standalone-v34.html")).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 browser=await browserType.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.resolve()}});
 await page.route("**/functions/v1/**",route=>route.fulfill({status:200,contentType:"application/json",
  headers:{"access-control-allow-origin":"*"},body:JSON.stringify({ok:true,items:[],notes:[],sessions:[],metrics:{},profile:{}})}));
 await page.route("**/functions/v1/setka-music-v1",route=>route.fulfill({status:200,contentType:"application/json",
  headers:{"access-control-allow-origin":"*"},body:JSON.stringify({ok:true,categories:cats,tracks,ui_icons:uiStub})}));
 await installPublicationCatalog(page);
 await page.goto(base+"/standalone-v34.html?music=1",{waitUntil:"domcontentloaded"});
 await page.locator("#allPatternsPanel .pattern-tile").first().waitFor();
 await page.locator("#setkaMusicPagerButton").click();
 await page.locator(".sm-track").first().waitFor();
 assert.equal(await page.locator(".library-pager .pager-button").count(),4);
 assert.equal(await page.locator(".sm-categories .sm-category").count(),5);
 assert.equal(await page.locator("#libraryTitle").textContent(),"Музыка");
 assert.equal(await page.locator(".sm-track").count(),3);
 assert.equal(await page.locator("#libraryScreen").evaluate(el=>el.classList.contains("setka-music-open")),true,"music view must retain active note");
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector("#setkaMusicPagerButton")).opacity)>.98,{timeout:2500});
 await mkdir("tests/visual-smoke",{recursive:true});
 await page.screenshot({path:"tests/visual-smoke/music-catalog-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
 assert.equal(await page.locator(".sm-dots").count(),0,"off must have zero dots");
 const cat=page.locator(".sm-track").first();
 await cat.click();assert.equal(await page.locator(".sm-track.active .sm-dots i").count(),1);
 await cat.click();assert.equal(await page.locator(".sm-track.active .sm-dots i").count(),2);
 await cat.click();assert.equal(await page.locator(".sm-track.active .sm-dots i").count(),3);
 await cat.click();assert.equal(await page.locator(".sm-dots").count(),0,"fourth tap turns track off and removes all dots");
 await page.locator(".sm-track").nth(0).click();await page.locator(".sm-track").nth(1).click();
 await page.locator(".sm-category").last().click();
 assert.equal(await page.locator(".sm-source").count(),2,"two active tracks appear on orbits");
 assert.equal(await page.locator(".sm-motion").nth(3).locator(".sm-asset-icon").count(),1,"server-supplied transparent icon skin displayed as mask");
 await page.screenshot({path:"tests/visual-smoke/music-orbits-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
 await page.locator(".sm-motion").nth(1).click();
 let state=await page.evaluate(()=>window.SetkaMusicV1.state());
 assert.equal(state.mode,"cw");
 await page.locator(".sm-speed input").evaluate(el=>{el.value="80";el.dispatchEvent(new Event("input",{bubbles:true}))});
 state=await page.evaluate(()=>window.SetkaMusicV1.state());assert.equal(state.speed,80);
 const node=page.locator(".sm-source").first(),box=await node.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+40,box.y+box.height/2+20,{steps:6});await page.mouse.up();
 assert.equal((await page.evaluate(()=>window.SetkaMusicV1.state())).active.length,2);
 await page.locator(".sm-power").click();
 state=await page.evaluate(()=>window.SetkaMusicV1.state());assert.equal(state.active.length,0);
 assert.equal(await page.locator(".sm-source").count(),0);
 await page.locator("#libraryPagerButton").click();
 assert.equal(await page.locator("#setkaMusicPage").isVisible(),false);
 assert.equal(await page.locator("#allPatternsPanel .pattern-tile").count()>0,true);
 await mkdir("tests/visual-smoke",{recursive:true});
 await page.screenshot({path:"tests/visual-smoke/music-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
 const admin=await browser.newPage({viewport:{width:980,height:900}});
 await admin.route("**/functions/v1/**",async route=>{
  if(route.request().method()==="OPTIONS")return route.fulfill({status:204,headers:{"access-control-allow-origin":"*","access-control-allow-headers":"content-type,apikey,authorization","access-control-allow-methods":"POST,OPTIONS"}});
  let body={};try{body=route.request().postDataJSON()}catch(_){}
  let out={ok:true};
  if(body.action==="manage")out={ok:true,categories:cats,tracks:[],ui_icons:uiStub};
  else if(body.action==="reset-ui-icon"){uiStub=uiStub.filter(x=>x.slot!==body.slot);out={ok:true}}
  else if(body.action==="manage-catalog")out={ok:true,items:[],defaults:[],publication:[]};
  else if(body.action==="overview")out={ok:true,data:buildData({},[])};
  return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(out)});
 });
 await admin.goto(base+"/standalone-research-admin-v1.html");
 await admin.locator("#key").fill("SKA-"+"x".repeat(43));
 await admin.locator("#login-button").click();
 await admin.locator("#workspace").waitFor();
 await admin.locator('.nav[data-page="music"]').click();
 await admin.locator(".sm-admin").waitFor();
 assert.equal(await admin.locator(".sm-admin-section").count(),3,"system icons, music categories and tracks have separate admin editors");
 assert.equal(await admin.locator(".sm-admin-glyph-card").count(),14,"all system icons have replaceable image upload");
 assert.equal(await admin.locator(".sm-admin input[type=file]").count(),17,"14 system icons plus category icon, track audio and track icon can be uploaded");
 assert.equal(await admin.locator(".sm-admin-glyph-card").nth(3).locator(".sm-asset-icon").count(),0,"stock icon is still vector");
 await admin.getByRole("button",{name:"Вернуть исходный"}).click();
 await admin.locator(".sm-admin-glyph-card").first().waitFor();
 assert.equal(await admin.getByRole("button",{name:"Вернуть исходный"}).count(),0,"server reset restored stock glyph");
 assert.equal(await admin.getByText("Опубликовать на фронте",{exact:true}).count(),1);
 await admin.close();
 assert.deepEqual(errors.filter(e=>/setka-music/i.test(e)),[]);
 console.log("SETKA music browser smoke PASS",process.env.SETKA_BROWSER||"chromium");
}finally{await browser?.close();server.kill()}
