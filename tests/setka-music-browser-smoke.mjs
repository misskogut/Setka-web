import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdir} from "node:fs/promises";
import {deflateSync} from "node:zlib";
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
function pngIcon(){
 const n=128,rgba=Buffer.alloc(n*(1+n*4));
 for(let y=24;y<108;y++)for(let x=58;x<70;x++){
  const at=y*(1+n*4)+1+x*4;
  rgba[at]=rgba[at+1]=rgba[at+2]=rgba[at+3]=255;
 }
 const chunk=(name,data)=>{
  const label=Buffer.from(name),r=Buffer.alloc(12+data.length);
  r.writeUInt32BE(data.length,0);label.copy(r,4);data.copy(r,8);
  let v=0xffffffff;for(const byte of Buffer.concat([label,data])){v^=byte;for(let i=0;i<8;i++)v=(v>>>1)^((v&1)?0xedb88320:0)}
  r.writeUInt32BE((v^0xffffffff)>>>0,8+data.length);return r;
 };
 const header=Buffer.alloc(13);header.writeUInt32BE(n,0);header.writeUInt32BE(n,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(rgba)),chunk("IEND",Buffer.alloc(0))]);
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
 await page.goto(base+"/standalone-v34.html",{waitUntil:"domcontentloaded"});
 await page.locator("#allPatternsPanel .pattern-tile").first().waitFor();
 const topNavBefore=await page.locator("#libraryScreen .library-pager").boundingBox();
 assert.equal(await page.locator("#setkaMusicPagerButton").count(),1,"the music tab must exist on the default URL, no ?music=1");
 assert.equal(await page.locator("#setkaMusicPagerButton").isVisible(),true,"visible fourth tab on the normal SETKA home");
 assert.equal(await page.locator(".library-pager .pager-button").count(),4,"four permanent upper tabs");
 await page.locator("#setkaMusicPagerButton").click();
 await page.locator(".sm-track").first().waitFor();
 const topGlow=await page.evaluate(()=>{
  const note=document.querySelector("#setkaMusicPagerButton");
  const adjacent=document.querySelector("#libraryPagerButton");
  const icon=note.querySelector("svg,.sm-asset-icon");
  return {note:getComputedStyle(note).filter,adjacent:getComputedStyle(adjacent).filter,
   icon:getComputedStyle(icon).filter};
 });
 assert.equal(topGlow.note,topGlow.adjacent,"active music tab uses the same no-extra-glow treatment as the other tabs");
 assert.equal(topGlow.icon,"none","note icon does not get a second glow");
 const topNavMusic=await page.locator("#libraryScreen .library-pager").boundingBox();
 assert.ok(Math.abs(topNavMusic.y-topNavBefore.y)<1,
  "four shared top tabs must not jump when selecting the music note");
 assert.equal(await page.locator(".library-pager .pager-button").count(),4);
 assert.equal(await page.locator(".sm-categories .sm-category").count(),5);
 assert.equal(await page.locator(".sm-categories .sm-category").first().locator("svg").getAttribute("viewBox"),"54 14 232 232","first category preserves option 7 at balanced smaller scale");
 assert.equal(await page.locator(".sm-categories svg.sm-approved-category-icon").count(),5,"five selected first-row glyphs render in music navigation");
 assert.equal(await page.locator("#libraryTitle").isVisible(),false,"pattern title must not appear on music screen, even if async library state updates its text");
 assert.equal(await page.locator(".sm-track").count(),3);
 const geometry=await page.evaluate(()=>{
  const strip=document.querySelector(".sm-categories");
  const tab=strip.querySelector(".sm-category");
  const note=document.querySelector("#setkaMusicPagerButton svg");
  const pager=document.querySelector("#libraryScreen .library-pager");
  const categoryRect=tab.querySelector("svg,.sm-asset-icon")?.getBoundingClientRect();
  const trackRect=document.querySelector(".sm-track-icon svg,.sm-track-icon .sm-asset-icon")?.getBoundingClientRect();
  return {scrollWidth:strip.scrollWidth,clientWidth:strip.clientWidth,tabSize:categoryRect?.width,
   trackSize:trackRect?.width,noteSize:note?.getBoundingClientRect().width,
   pagerTop:getComputedStyle(pager).top,
   appTouch:getComputedStyle(document.querySelector("#app")).touchAction,
   stripTouch:getComputedStyle(strip).touchAction};
 });
 assert.ok(geometry.scrollWidth>geometry.clientWidth+45,"music category strip overflows horizontally");
 const categoryPeek=await page.locator(".sm-categories").evaluate(el=>{
  const outer=el.getBoundingClientRect(),last=el.lastElementChild.getBoundingClientRect();
  return {visible:last.left<outer.right-4,partlyHidden:last.right>outer.right+12};
 });
 assert.ok(categoryPeek.visible&&categoryPeek.partlyHidden,"the clipped fifth icon signals that the filters swipe horizontally");
 assert.ok(geometry.tabSize>=64,"category symbols are clearly larger than tracks");
 assert.ok(geometry.tabSize>=geometry.trackSize+12,"large filters remain visually distinct from sound icons");
 assert.ok(geometry.noteSize<=26,"note is optically smaller and matches neighboring top icons");
 assert.equal(geometry.pagerTop,"-9px","top pager uses the exact same vertical position across all library tabs");
 assert.match(geometry.stripTouch,/pan-x/,"finger may swipe music categories horizontally");
 assert.match(geometry.appTouch,/pan-x/,"top-level touch contract must allow horizontal swipes");
 // Opening the offscreen orbit tab must keep the user's horizontal scroll position.
 await page.locator(".sm-category").last().click();
 assert.equal(await page.locator(".sm-orbits").isVisible(),true);
 const geometryOf=async()=>page.evaluate(()=>{
  const box=q=>{const r=document.querySelector(q)?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}:null};
  return {categories:box(".sm-categories"),stage:box(".sm-stage"),
   rings:[...document.querySelectorAll(".sm-ring")].map(r=>{
     const a=r.getBoundingClientRect();return {width:a.width,height:a.height};
   }),
   modes:box(".sm-motion-row"),speed:box(".sm-speed"),power:box(".sm-power"),
   dock:box("#st34Nav"),pager:box(".library-pager")};
 });
 const assertAir=(g,small=false)=>{
  const min=small?5:12;
  assert.ok(Math.abs((g.stage.right-g.stage.left)-g.stage.height)<1,
   "orbit interaction stage must remain exactly square, never flattened: "+JSON.stringify(g));
  assert.equal(g.rings.length,3,"three orbital rings must remain visible");
  for(const ring of g.rings)assert.ok(Math.abs(ring.width-ring.height)<1,
   "all orbit rings must be circles rather than ovals: "+JSON.stringify(g));
  assert.ok(g.stage.top-g.categories.bottom>=min,
    "room between music categories and orbits: "+JSON.stringify(g));
  assert.ok(g.modes.top-g.stage.bottom>=min,
    "room between orbits and movement controls: "+JSON.stringify(g));
  assert.ok(g.speed.top-g.modes.bottom>=min,
    "room between movement modes and speed: "+JSON.stringify(g));
  assert.ok(g.power.top-g.speed.bottom>=min,
    "room between speed and power: "+JSON.stringify(g));
  assert.ok(g.dock.top-g.power.bottom>=8,
    "power button must never collide with bottom navigation: "+JSON.stringify(g));
 };
 const wideOrbit=await geometryOf();
 assertAir(wideOrbit);
 assert.ok(wideOrbit.stage.height>=350,"tall phone gets an expanded orbit workspace");
 assert.ok(wideOrbit.rings[2].width>=wideOrbit.stage.height*.95,"outer orbit fills the new workspace");
 // Compact iPhone layout must retain every touch target and preserve the same
 // top-to-bottom ordering instead of clipping slider/power under the dock.
 await page.setViewportSize({width:360,height:700});
 const compactOrbit=await geometryOf();
 assertAir(compactOrbit,true);
 assert.ok(compactOrbit.stage.height>=245,"compact phone also expands its orbit without collisions");
 await page.setViewportSize({width:390,height:844});

 const scrollAtOrbit=await page.locator(".sm-categories").evaluate(el=>el.scrollLeft);
 assert.ok(scrollAtOrbit>25,"rightmost tab is reached by horizontal scrolling");
 await page.locator(".sm-category").last().click();
 assert.equal(await page.locator(".sm-catalog").isVisible(),true);
 const scrollAfter=await page.locator(".sm-categories").evaluate(el=>el.scrollLeft);
 assert.ok(scrollAfter>20,"category strip must not reset on rerender");
 await page.locator(".sm-categories").evaluate(el=>el.scrollLeft=0);
 assert.equal(await page.locator("#libraryScreen").evaluate(el=>el.classList.contains("setka-music-open")),true,"music view must retain active note");
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector("#setkaMusicPagerButton")).opacity)>.98,{timeout:2500});
 await mkdir("tests/visual-smoke",{recursive:true});
 await page.screenshot({path:"tests/visual-smoke/music-catalog-"+(process.env.SETKA_BROWSER||"chromium")+".png"});
 assert.equal(await page.locator(".sm-dots").count(),0,"off must have zero dots");
 const cat=page.locator(".sm-track").first();
 await cat.click();assert.equal(await page.locator(".sm-track.active .sm-dots i").count(),1);
 await cat.click();assert.equal(await page.locator(".sm-track.active .sm-dots i").count(),2);
 await cat.click();assert.equal(await page.locator(".sm-track.active .sm-dots i").count(),3);
 const trackDots=await cat.evaluate(el=>{
  const icon=el.querySelector(".sm-track-icon").getBoundingClientRect();
  const dots=el.querySelector(".sm-dots").getBoundingClientRect();
  return {gap:icon.top-dots.bottom,alignment:Math.abs((dots.left+dots.right-icon.left-icon.right)/2),
   dotShadow:getComputedStyle(el.querySelector(".sm-dots i")).boxShadow};
 });
 assert.ok(trackDots.gap>=4,"volume dots stay above the sound icon");
 assert.ok(trackDots.alignment<1,"volume dots are centered above their own icon");
 assert.equal(trackDots.dotShadow,"none","volume dots do not add a second shadow to the active icon glow");

 await cat.click();assert.equal(await page.locator(".sm-dots").count(),0,"fourth tap turns track off and removes all dots");
 await page.locator(".sm-track").nth(0).click();await page.locator(".sm-track").nth(1).click();
 await page.locator(".sm-category").last().click();
 assert.equal(await page.locator(".sm-source").count(),2,"two active tracks appear on orbits");
 const sourceSkin=await page.locator(".sm-source").first().evaluate(el=>{
  const c=getComputedStyle(el),size=el.getBoundingClientRect();
  return {background:c.backgroundColor,border:c.borderTopWidth,shadow:c.boxShadow,
   radius:c.borderTopLeftRadius,width:size.width,height:size.height,icon:el.querySelector(".sm-source-icon").getBoundingClientRect().width};
 });
 assert.match(sourceSkin.background,/^(transparent|rgba\(0, 0, 0, 0\))$/,"no background disc behind orbit source");
 assert.equal(sourceSkin.border,"0px","no visible source ring border");
 assert.equal(sourceSkin.radius,"0px","no circular hit-target silhouette");
 assert.equal(sourceSkin.shadow,"none","no circular glow backdrop");
 assert.ok(sourceSkin.width>=44&&sourceSkin.height>=44,"borderless source keeps an accessible drag target");
 assert.ok(sourceSkin.icon>=40,"source glyph remains visible without its former disc");
 const orbitDots=await page.locator(".sm-source").first().evaluate(el=>{
  const icon=el.querySelector(".sm-source-icon").getBoundingClientRect();
  const dots=el.querySelector(".sm-dots").getBoundingClientRect();
  return {gap:icon.top-dots.bottom,alignment:Math.abs((dots.left+dots.right-icon.left-icon.right)/2),
   dotShadow:getComputedStyle(el.querySelector(".sm-dots i")).boxShadow};
 });
 assert.ok(orbitDots.gap>=4,"orbital dots stay above the source icon");
 assert.ok(orbitDots.alignment<1,"orbital dots are centered over their sound icon");
 assert.equal(orbitDots.dotShadow,"none","orbital dots inherit the source icon glow");

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
 await admin.route("**/storage/v1/object/upload/sign/**",async route=>route.fulfill({status:200,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"PUT,OPTIONS","access-control-allow-headers":"x-upsert,content-type"},body:JSON.stringify({ok:true})}));
 await admin.route("**/functions/v1/**",async route=>{
  if(route.request().method()==="OPTIONS")return route.fulfill({status:204,headers:{"access-control-allow-origin":"*","access-control-allow-headers":"content-type,apikey,authorization","access-control-allow-methods":"POST,OPTIONS"}});
  let body={};try{body=route.request().postDataJSON()}catch(_){}
  let out={ok:true};
  if(body.action==="manage")out={ok:true,categories:cats,tracks:[],ui_icons:uiStub};
  else if(body.action==="reset-ui-icon"){uiStub=uiStub.filter(x=>x.slot!==body.slot);out={ok:true}}
  else if(body.action==="upload-intent")out={ok:true,path:"icons/00000000-0000-4000-8000-000000000123.png",upload_url:"https://gfchgaphzhxufwdhrcis.supabase.co/storage/v1/object/upload/sign/setka-music/icons/00000000-0000-4000-8000-000000000123.png?token=fixture"};
  else if(body.action==="save-ui-icon"){uiStub=[...uiStub.filter(x=>x.slot!==body.slot),{slot:body.slot,icon_path:body.icon_path}];out={ok:true}}
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
 await admin.getByRole("button",{name:"Вернуть исходный"}).waitFor({state:"detached"});
 assert.equal(await admin.getByRole("button",{name:"Вернуть исходный"}).count(),0,"server reset restored stock glyph");
 const first=admin.locator(".sm-admin-glyph-card").first();
 await first.locator('input[type="file"]').setInputFiles({name:"note.png",mimeType:"image/png",buffer:pngIcon()});
 await first.getByRole("button",{name:"Заменить"}).click();
 await first.locator(".sm-asset-icon").waitFor();
 assert.equal(uiStub.length,1,"admin saved a new valid image for the top note");
 await page.locator("#setkaMusicPagerButton").click();
 await page.evaluate(()=>window.SetkaMusicV1.reload());
 await page.locator("#setkaMusicPagerButton .sm-asset-icon").waitFor();

 assert.equal(await admin.getByText("Опубликовать на фронте",{exact:true}).count(),1);
 await admin.close();
 assert.deepEqual(errors.filter(e=>/setka-music/i.test(e)),[]);
 console.log("SETKA music browser smoke PASS",process.env.SETKA_BROWSER||"chromium");
}finally{await browser?.close();server.kill()}
