import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";

const port=49482,root="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  for(let i=0;i<35;i++){try{if((await fetch(root+"/standalone-v34.html")).ok)break}catch{}await sleep(110)}
  browser=await (process.env.SETKA_BROWSER==="webkit"?webkit:chromium).launch({
    headless:true,args:process.env.SETKA_BROWSER==="webkit"?[]:["--no-sandbox"]
  });
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const s={token:"synthetic-browser-test-token",expiresAt:"2099-01-01T00:00:00Z"};
    localStorage.setItem("setka-v40:cabinet-session",JSON.stringify(s));
    localStorage.setItem("setka-v40:cabinet-status",JSON.stringify({
      testerId:"T-SYNTHETIC",authenticated:true,claimed:true,hasPassword:true,consented:true
    }));
  });
  let mode="slow",listCalls=0;
  const testInvite={tester_id:"T-EXISTING",invite_label:"Сохранённое приглашение",
    active:true,password_set_at:null,consumed_at:null,created_at:"2026-10-01T11:30:00Z"};
  await page.route("**/functions/v1/**",async route=>{
    const request=route.request();
    const action=request.postDataJSON?.()?.action||"";
    const isAccount=request.url().includes("setka-tester-account-v40");
    const common={status:200,contentType:"application/json",
      headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify({ok:true,items:[],metrics:{},notes:[],sessions:[],profile:{}})};
    if(isAccount&&action==="status"){
      common.body=JSON.stringify({ok:true,claimed:true,authenticated:true,
        testerId:"T-SYNTHETIC",hasPassword:true,consented:true});
    }
    if(isAccount&&action==="my-invites"){
      listCalls++;
      if(mode==="slow"){
        await sleep(3200);
        common.body=JSON.stringify({ok:true,items:[testInvite]});
      }else if(listCalls===2){
        common.status=503;common.body=JSON.stringify({error:"temporary_unavailable"});
      }else{
        common.body=JSON.stringify({ok:true,items:[testInvite]});
      }
    }
    try{await route.fulfill(common)}catch(_){/* aborted read is expected after back */}
  });
  await page.goto(root+"/standalone-v34.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.__SETKA_TESTER_CABINET_V40__?.state?.()?.authenticated===true);
  await page.evaluate(()=>window.__SETKA_TESTER_CABINET_V40__.show());
  await page.getByText("Аккаунт SETKA",{exact:true}).first().waitFor();
  assert.equal(await page.getByRole("button",{name:/Синхронизировать сейчас/}).count(),0,
    "Manual Sync button must be removed; syncing already runs in background");
  await page.getByRole("button",{name:/Пригласить в SETKA/}).click();
  await page.getByText("Приглашения",{exact:true}).first().waitFor();
  await page.waitForFunction(()=>!!document.getElementById("st40InviteList"));
  await page.waitForFunction(()=>document.getElementById("st40InviteLoadState")?.textContent?.includes("Загружаем"));
  const start=Date.now();
  await page.locator("#st34Layer .st-back").click();
  await page.getByText("Аккаунт SETKA",{exact:true}).first().waitFor({timeout:1200});
  assert.ok(Date.now()-start<1200,"back to account must NOT await a server response");
  assert.equal(await page.getByRole("button",{name:/Синхронизировать сейчас/}).count(),0);
  mode="retry";
  await page.getByRole("button",{name:/Пригласить в SETKA/}).click();
  await page.getByText("Приглашения",{exact:true}).first().waitFor();
  await page.getByText("Список временно недоступен.",{exact:false}).waitFor({timeout:3000});
  await page.getByText("T-EXISTING",{exact:true}).waitFor({timeout:6500});
  assert.ok(listCalls>=3,"Failed invite read must retry automatically without user tap");
  assert.equal(await page.getByText("Сохранённое приглашение",{exact:true}).count(),1);
  assert.deepEqual(errors,[],"No uncaught UI errors");
  console.log("ACCOUNT AUTO-SYNC UI / ABORTED INVITE READ / INSTANT BACK / AUTO RETRY PASS",
    JSON.stringify({listCalls,backMs:Date.now()-start}));
}finally{await browser?.close();server.kill("SIGTERM")}
