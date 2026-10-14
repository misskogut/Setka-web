// Isolated protocol fixture. No hardware PASS is claimed and no records reach Supabase.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const port=49318,base=`http://127.0.0.1:${port}`,server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
  for(let i=0;i<30;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  browser=await (process.env.SETKA_BROWSER==='webkit'?webkit:chromium).launch({headless:true,args:process.env.SETKA_BROWSER==='webkit'?[]:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,items:[],notes:[],profile:{},metrics:{}})}));
  await page.addInitScript(()=>{
    const characteristic=new EventTarget(),device=new EventTarget();let cancel=false;
    characteristic.startNotifications=async()=>characteristic;characteristic.stopNotifications=async()=>characteristic;
    device.id='isolated-protocol-fixture';device.name='Изолированный тест датчика';device.gatt={connect:async()=>({getPrimaryService:async()=>({getCharacteristic:async()=>characteristic})}),disconnect:()=>{}};
    Object.defineProperty(navigator,'bluetooth',{configurable:true,value:{requestDevice:async options=>{if(cancel){cancel=false;throw new DOMException('fixture cancelled','NotFoundError')}if(options.filters[0].services[0]!=='heart_rate')throw Error('incorrect service');return device}}});
    window.__isolatedPulse={send(bytes){characteristic.value=new DataView(new Uint8Array(bytes).buffer);characteristic.dispatchEvent(new Event('characteristicvaluechanged'))},drop(){device.dispatchEvent(new Event('gattserverdisconnected'))},cancel(){cancel=true}};
  });
  await page.goto(base+'/standalone-v34.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.SetkaStandaloneV34.pulse);
  const tab=key=>page.locator(`#st34Nav button[data-p="${key}"]`),card=page.locator('#st34Layer');
  await page.evaluate(()=>{window.SetkaStandaloneV34.addPhysioSample({id:'isolated-old-demo',metric:'heart_rate',value:67,quality:'simulated',sourceType:'demo_heart_rate',observedAt:new Date().toISOString()})});
  await tab('pulse').click();assert.match(await card.innerText(),/Пока нет показаний датчика/);assert.doesNotMatch(await card.innerText(),/67 уд/);
  await page.getByRole('button',{name:/^Подключить пульсометр/}).click();await page.getByRole('button',{name:/^Отключить пульсометр/}).waitFor();
  assert.match(await card.innerText(),/Ожидаем измерение/);
  await page.evaluate(()=>window.__isolatedPulse.send([16,73,0,4]));assert.match(await card.innerText(),/Показания поступают/);
  const first=await page.evaluate(()=>window.SetkaStandaloneV34.getData().physio.samples.find(x=>x.metric==='heart_rate'&&x.sourceType==='ble_heart_rate'));
  assert.equal(first.value,73);assert.equal(first.payload.patternVisible,false);assert.equal(first.patternId,null);
  await page.evaluate(()=>window.__isolatedPulse.drop());assert.match(await card.innerText(),/Связь с датчиком прервалась/);
  await page.evaluate(()=>window.__isolatedPulse.cancel());await page.getByRole('button',{name:/^Подключить пульсометр/}).click();assert.match(await card.innerText(),/Устройство не выбрано/);
  await page.getByRole('button',{name:/^Подключить пульсометр/}).click();await page.getByRole('button',{name:/^Отключить пульсометр/}).waitFor();
  await tab('today').click();await page.getByRole('button',{name:/^Начать сессию/}).click();await page.getByRole('button',{name:'Расслабиться',exact:true}).click();
  await card.locator('.st-face').nth(2).click();await page.getByRole('button',{name:'5 мин',exact:true}).click();await page.getByRole('button',{name:'Начать',exact:true}).click();await card.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Открыть паттерн RGB Glitch Rings. Удерживай, чтобы сохранить',exact:true}).click();
  await page.waitForFunction(()=>!!window.SetkaStandaloneV34.patternExposure.current());
  await page.evaluate(()=>window.__isolatedPulse.send([16,82,0,4]));
  const sample=await page.evaluate(()=>{const C=window.SetkaStandaloneV34,x=C.getData().physio.samples.filter(x=>x.metric==='heart_rate').at(-1);return {x,session:C.getActiveSession().id,config:window.SetkaApp.getState().configKey}});
  assert.equal(sample.x.sessionId,sample.session);assert.equal(sample.x.patternId,'rgb-glitch-rings');assert.equal(sample.x.configKey,sample.config);assert.ok(sample.x.exposureId);assert.ok(Number.isFinite(sample.x.frame));assert.equal(sample.x.payload.patternVisible,true);
  await tab('pulse').click();await page.evaluate(()=>window.__isolatedPulse.send([0,88]));
  const overlay=await page.evaluate(()=>window.SetkaStandaloneV34.getData().physio.samples.at(-1));assert.equal(overlay.payload.patternVisible,false);assert.equal(overlay.patternId,null);
  await page.getByRole('button',{name:/^Отключить пульсометр/}).click();
  await tab('me').click();assert.equal(await page.locator('#st40DataSettingsButton,#st40PrivacySettings,#stReplaySettings').count(),0);
  const rect=await card.boundingBox();assert.ok(rect.y<=20&&rect.height>720);
  assert.deepEqual(errors,[]);
  console.log('ISOLATED BLUETOOTH PROTOCOL, LIVE UI, DEMO EXCLUSION AND EXACT SESSION/CONFIG LINKS PASS; PHYSICAL SENSOR NOT TESTED');
}finally{await browser?.close();server.kill('SIGTERM')}
