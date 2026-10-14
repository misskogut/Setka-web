import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPulseController} from '../standalone-pulse-v1.mjs';
import {parseHeartRateMeasurement,physioKind,relatePhysio,pulseByConfiguration} from '../research-v1/physiology.mjs';
import {buildData} from '../research-v1/model.mjs';
const packet=bytes=>new DataView(Uint8Array.from(bytes).buffer);
const real=(extra={})=>({id:'m1',participantId:'account:a',sessionId:'account:a::s1',metric:'heart_rate',value:73,unit:'bpm',sourceType:'ble_heart_rate',quality:'ok',observedAt:'2026-10-14T17:10:01Z',...extra});
function fixture({requestError,connectGate}={}){
  const records=[],events=[];let clock=Date.parse('2026-10-14T17:10:01Z'),counter=0,requests=0;
  const characteristic=new EventTarget();characteristic.startNotifications=async()=>characteristic;characteristic.stopNotifications=async()=>characteristic;
  const device=new EventTarget();device.id='fixture-only';device.name='Изолированный датчик';
  device.gatt={connect:async()=>{if(connectGate)await connectGate;return {getPrimaryService:async service=>{assert.equal(service,'heart_rate');return {getCharacteristic:async name=>{assert.equal(name,'heart_rate_measurement');return characteristic}}}}},disconnect:()=>{}};
  const data={physio:{samples:records,sources:[]}};
  const bluetooth={requestDevice:async options=>{requests++;assert.deepEqual(options,{filters:[{services:['heart_rate']}]});if(requestError)throw requestError;return device}};
  const C={id:prefix=>`${prefix}-${++counter}`,getData:()=>data,addPhysioSample:x=>records.push(x),save:()=>{},recordEvent:(...args)=>events.push(args)};
  const controller=createPulseController({C,bluetooth,now:()=>clock,context:()=>({sessionId:'s1',visitId:'v1',exposureId:'e1',patternVisible:true,patternId:'rgb-glitch-rings',configKey:'exact-key',frame:123.5,phase:'measured'})});
  const send=bytes=>{characteristic.value=packet(bytes);characteristic.dispatchEvent(new Event('characteristicvaluechanged'))};
  return {controller,records,events,device,send,setClock:n=>{clock=n},requests:()=>requests};
}
test('standard 8-bit and 16-bit heart rate, energy and multiple RR intervals decode exactly',()=>{
  assert.equal(parseHeartRateMeasurement(packet([0,73])).bpm,73);
  const x=parseHeartRateMeasurement(packet([31,44,1,23,0,0,4,0,2]));
  assert.equal(x.bpm,300);assert.equal(x.energyExpended,23);assert.deepEqual(x.rrMs,[1000,500]);assert.equal(x.contactSupported,true);assert.equal(x.contactDetected,true);
  for(const bytes of [[],[0],[1,40],[8,70,1],[16,70],[16,70,0],[16,70,0,4,1]])assert.equal(parseHeartRateMeasurement(packet(bytes)),null);
});
test('simulation, unverified origin, invalid timestamps and poor contact never become real readings',()=>{
  assert.equal(physioKind(real()),'real');
  for(const x of [real({sourceType:'demo_heart_rate'}),real({payload:{simulated:true}}),real({quality:'simulated'})])assert.equal(physioKind(x),'simulated');
  assert.equal(physioKind(real({sourceType:'unknown'})),'unverified');
  for(const x of [real({value:null}),real({value:0}),real({observedAt:null}),real({payload:{contactSupported:true,contactDetected:false}})])assert.equal(physioKind(x),'invalid');
});
test('connection waits for notifications; measurements keep the exact recorded session, frame and RR links',async()=>{
  const f=fixture();assert.equal(await f.controller.connect(),true);assert.equal(f.controller.state().last,null);
  f.send([16,73,0,4]);assert.equal(f.controller.state().live,true);assert.equal(f.records.length,2);
  assert.equal(f.records[0].sessionId,'s1');assert.equal(f.records[0].configKey,'exact-key');assert.equal(f.records[0].frame,123.5);assert.equal(f.records[0].payload.exposureId,'e1');assert.equal(f.records[1].payload.measurementId,f.records[0].payload.measurementId);
  assert.equal(f.records[1].value,1000);f.send([16,73,1]);assert.equal(f.records.length,2);assert.equal(f.controller.state().live,false);
});
test('poor sensor contact is retained for diagnosis and excluded from display and analysis',async()=>{
  const f=fixture();await f.controller.connect();f.send([4,73]);assert.equal(f.records[0].quality,'no_contact');assert.equal(f.controller.state().live,false);assert.match(f.controller.state().error,/контакт/);
});
test('stale readings and dropped connections are not shown as a live pulse',async()=>{
  const f=fixture();await f.controller.connect();f.send([0,73]);f.setClock(Date.parse(f.records[0].observedAt)+16000);assert.equal(f.controller.state().live,false);
  f.device.dispatchEvent(new Event('gattserverdisconnected'));assert.equal(f.controller.state().status,'disconnected');const count=f.records.length;f.send([0,90]);assert.equal(f.records.length,count);
});
test('cancelled chooser and connection failures are visible, never replaced by a demo',async()=>{
  for(const name of ['NotFoundError','NetworkError','NotAllowedError']){const f=fixture({requestError:Object.assign(new Error('fixture'),{name})});assert.equal(await f.controller.connect(),false);assert.ok(f.controller.state().error);assert.equal(f.records.length,0)}
});
test('disconnect during an unfinished connection cannot resurrect the sensor',async()=>{
  let resolve;const gate=new Promise(r=>{resolve=r}),f=fixture({connectGate:gate});const connecting=f.controller.connect();await Promise.resolve();await Promise.resolve();
  f.controller.disconnect();resolve();assert.equal(await connecting,false);assert.equal(f.controller.state().status,'idle');assert.equal(f.records.length,0);
});
test('double connection clicks do not create two sensor streams',async()=>{
  const f=fixture();const first=f.controller.connect();assert.equal(await f.controller.connect(),false);assert.equal(await first,true);assert.equal(f.requests(),1);
});
test('pulse matches an exact exposure for one participant, respects boundaries and does not invent overlay viewing',()=>{
  const exposure={id:'account:a::e1',exposureId:'e1',participantId:'account:a',sessionId:'account:a::s1',patternId:'rgb-glitch-rings',configKey:'exact',startedAt:'2026-10-14T17:10:00Z',endedAt:'2026-10-14T17:10:02Z'};
  const rows=[real({exposureId:'e1',configKey:'exact'}),real({id:'m2',participantId:'account:b'}),real({id:'m3',observedAt:exposure.endedAt}),real({id:'m4',payload:{patternVisible:false}})];
  const linked=relatePhysio(rows,[exposure]);assert.equal(linked[0].matchedExposure,exposure);assert.equal(linked[1].matchedExposure,null);assert.equal(linked[2].matchedExposure,null);assert.equal(linked[3].linkStatus,'outside-pattern');
  assert.equal(relatePhysio([real()],[exposure,{...exposure,id:'duplicate'}])[0].linkStatus,'ambiguous');
  const groups=pulseByConfiguration(rows,[exposure]);assert.equal(groups.length,1);assert.equal(groups[0].samples,1);assert.equal(groups[0].participants,1);assert.equal(groups[0].mean,73);
});
test('server contract qualifies local session identity and quarantines stored simulations',()=>{
  const out=buildData({accounts:[{tester_id:'a'}],archives:[{tester_id:'a',device_id:'d',payload:{sessions:[{id:'s1',startedAt:'2026-10-14T17:10:00Z'}],physio:{samples:[real({sessionId:'s1'}),real({id:'demo',sourceType:'demo_heart_rate',quality:'simulated'})]}}}],sources:[]});
  assert.equal(out.physio.length,1);assert.equal(out.physio[0].sessionId,'account:a::s1');assert.equal(out.excludedSimulatedPhysio,1);
});

test('removing the settings card keeps guests off, uses existing research consent and honors explicit refusal',()=>{
  const source=readFileSync(new URL('../standalone-replay-capture-v1.js',import.meta.url),'utf8');
  const start=source.indexOf('const enabled=()=>'),end=source.indexOf('  const viewport=',start),code=source.slice(start,end)+'enabled();';
  const check=(settings,account)=>vm.runInNewContext(code,{C:{getData:()=>({settings})},window:{__SETKA_TESTER_CABINET_V40__:{state:()=>account}}});
  assert.equal(check({},null),false);assert.equal(check({}, {authenticated:true,consented:false}),false);
  assert.equal(check({}, {authenticated:true,consented:true}),true);
  assert.equal(check({replayDetailsEnabled:false}, {authenticated:true,consented:true}),false);
});
