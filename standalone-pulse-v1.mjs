import {parseHeartRateMeasurement,realHeartRates,isRealPhysio} from './research-v1/physiology.mjs?v=1.3.0';

export function createPulseController({C,bluetooth,context=()=>({}),now=()=>Date.now(),changed=()=>{},samplesReceived=()=>{}}){
  let device=null,characteristic=null,generation=0,status='idle',last=null,error='',listener=null,disconnectListener=null;
  const emit=()=>changed(state());
  const state=()=>({status,error,deviceName:device?.name||null,last,live:status==='connected'&&!error&&last&&now()-Date.parse(last.observedAt)<=15000&&isRealPhysio(last)});
  function cleanup(){
    if(characteristic&&listener)characteristic.removeEventListener('characteristicvaluechanged',listener);
    if(device&&disconnectListener)device.removeEventListener('gattserverdisconnected',disconnectListener);
    try{Promise.resolve(characteristic?.stopNotifications?.()).catch(()=>{})}catch(_){}
    try{device?.gatt?.disconnect?.()}catch(_){}
    characteristic=null;listener=null;disconnectListener=null;
  }
  function receive(event){
    const parsed=parseHeartRateMeasurement(event.target?.value);if(!parsed){error='Датчик прислал неполное измерение. Ожидаем следующее.';emit();return}
    const at=new Date(now()).toISOString(),ctx=context(),measurementId=C.id('measurement');
    const quality=parsed.contactSupported&&!parsed.contactDetected?'no_contact':parsed.bpm>0?'ok':'invalid';
    const common={observedAt:at,sourceType:'ble_heart_rate',sourceId:device?.id||null,deviceName:device?.name||'Пульсометр',quality,
      sessionId:ctx.sessionId||null,phase:ctx.phase||'free',visitId:ctx.visitId||null,exposureId:ctx.exposureId||null,
      patternId:ctx.patternId||null,patternVersion:ctx.patternVersion??null,configKey:ctx.configKey||null,frame:ctx.frame??null,
      payload:{...ctx,measurementId,transport:'bluetooth-gatt',service:'heart_rate',characteristic:'heart_rate_measurement',captureVersion:1,
        contactSupported:parsed.contactSupported,contactDetected:parsed.contactDetected}};
    const sample={...common,id:C.id('phy'),metric:'heart_rate',value:parsed.bpm,unit:'bpm'};C.addPhysioSample(sample);
    const ids=[sample.id];for(const rr of parsed.rrMs){const row={...common,id:C.id('phy'),metric:'rr_interval',value:rr,unit:'ms'};C.addPhysioSample(row);ids.push(row.id)}
    last=sample;error=quality==='no_contact'?'Датчик не чувствует контакт с телом. Поправь его положение.':quality==='invalid'?'Датчик ещё не передал пригодное измерение.':'';
    samplesReceived({sampleIds:ids,measurementId,observedAt:at,sessionId:common.sessionId});emit();
  }
  async function connect(){
    if(status==='selecting'||status==='connecting'||status==='connected')return false;
    if(typeof bluetooth?.requestDevice!=='function'){error='Этот браузер не умеет подключать Bluetooth-пульсометр.';emit();return false}
    cleanup();device=null;last=null;error='';status='selecting';const own=++generation;emit();
    try{
      // Invoke the real browser chooser directly within the user's click gesture.
      const chosen=await bluetooth.requestDevice({filters:[{services:['heart_rate']}]});
      if(own!==generation)return false;device=chosen;status='connecting';emit();
      disconnectListener=()=>{if(own!==generation)return;generation++;cleanup();status='disconnected';error='Связь с датчиком прервалась. Подключи его снова.';C.recordEvent('sensor_disconnected',{sourceType:'ble_heart_rate',reason:'connection-lost'},false);emit()};
      device.addEventListener('gattserverdisconnected',disconnectListener);
      const server=await chosen.gatt.connect();if(own!==generation){chosen.gatt?.disconnect?.();return false}
      const service=await server.getPrimaryService('heart_rate');if(own!==generation)return false;
      const selected=await service.getCharacteristic('heart_rate_measurement');if(own!==generation)return false;characteristic=selected;
      listener=event=>{if(own===generation)receive(event)};characteristic.addEventListener('characteristicvaluechanged',listener);
      await selected.startNotifications();if(own!==generation){try{await selected.stopNotifications()}catch(_){}return false}
      status='connected';const d=C.getData();d.physio=d.physio||{samples:[],sources:[]};
      if(!d.physio.sources.some(s=>s.sourceId===device.id))d.physio.sources.push({id:C.id('source'),sourceType:'ble_heart_rate',sourceId:device.id,deviceName:device.name||'Пульсометр',firstSeenAt:new Date(now()).toISOString()});
      C.save();C.recordEvent('sensor_connected',{sourceType:'ble_heart_rate',deviceName:device.name||null},false);emit();return true;
    }catch(e){
      if(own!==generation)return false;cleanup();status='idle';
      error=({NotFoundError:'Устройство не выбрано или не найдено. Можно попробовать снова.',NotAllowedError:'Браузер не разрешил подключение. Проверь разрешение Bluetooth.',SecurityError:'Проверь разрешение Bluetooth и открой SETKA по защищённой ссылке.',NetworkError:'Нет связи с датчиком. Приблизь его и отключи от других приложений.',NotSupportedError:'Этот датчик не передаёт пульс стандартным способом.'})[e?.name]||'Не удалось подключить пульсометр. Включи его и попробуй снова.';emit();return false;
    }
  }
  function disconnect(){generation++;cleanup();device=null;last=null;status='idle';error='';C.save();C.recordEvent('sensor_disconnected',{sourceType:'ble_heart_rate',reason:'user'},false);emit()}
  return {connect,disconnect,state,refresh:emit};
}

if(typeof window!=='undefined'&&window.SetkaStandaloneV34){
  const C=window.SetkaStandaloneV34,S=window.SetkaApp,esc=C.esc;
  const context=()=>{
    const session=C.getActiveSession(),exposure=C.patternExposure?.current?.(),st=S.getState?.(),protectedScreen=window.__SETKA_REPLAY_CAPTURE_V1__?.restricted?.();
    const shown=!!exposure&&st?.view==='game'&&!document.hidden;
    return {sessionId:session?.id||null,phase:session?.phase||'free',sessionElapsedMs:session?Math.max(0,Date.now()-Date.parse(session.startedAt)):null,
      visitId:C.patternExposure?.visitId||null,exposureId:shown?exposure.exposureId:null,patternVisible:shown,
      patternId:shown?exposure.patternId:null,patternVersion:shown?S.getPatterns?.().find(p=>p.id===exposure.patternId)?.version??null:null,
      configKey:shown?exposure.configKey:null,frame:shown&&Number.isFinite(st.frame)?st.frame:null,
      view:protectedScreen?'protected':document.hidden?'background':!document.getElementById('st34Layer').classList.contains('hidden')?'overlay':st?.view||null};
  };
  const controller=createPulseController({C,bluetooth:navigator.bluetooth,context,changed:()=>render(),samplesReceived:detail=>window.dispatchEvent(new CustomEvent('setka:physio-sample',{detail}))});
  const supported=typeof navigator.bluetooth?.requestDevice==='function'&&window.isSecureContext;
  function render(){
    const state=controller.state(),hr=document.getElementById('st34HrPill');
    if(hr){hr.textContent=state.live?`♥ ${state.last.value} уд/мин`:'';hr.classList.toggle('show',!!state.live&&S.getState()?.view==='game')}
    const root=document.getElementById('stPulseReal');if(!root||document.querySelector('#st34Layer .st-title')?.textContent!=='Пульс')return;
    const helpOpen=root.querySelector("details")?.open===true;
    const history=realHeartRates(C.getData().physio?.samples),average=history.length?Math.round(history.reduce((n,x)=>n+Number(x.value),0)/history.length):null;
    const label={idle:'Датчик не подключён',selecting:'Выбери пульсометр в окне Bluetooth',connecting:'Подключаем датчик…',connected:state.live?'Показания поступают':'Ожидаем измерение от датчика',disconnected:'Связь с датчиком прервалась'}[state.status];
    root.innerHTML=`<article class="st-card"><div class="st-muted">${esc(label)}</div>${state.deviceName?`<b>${esc(state.deviceName)}</b>`:''}<div style="font-size:48px;font-weight:650;margin:12px 0">${state.live?esc(state.last.value):'—'} <span style="font-size:15px;font-weight:400">уд/мин</span></div><div class="st-muted">${state.live?'Измерено датчиком сейчас':state.error?esc(state.error):'Значение появится после настоящего измерения.'}</div></article>`;
    if(supported){
      const action=document.createElement('button');action.className='st-action';const busy=['selecting','connecting'].includes(state.status);
      action.innerHTML=`<b>${state.status==='connected'?'Отключить пульсометр':'Подключить пульсометр'}</b><span>${busy?'Подождём подключения':'Bluetooth-датчик со стандартной передачей пульса'}</span>`;
      action.disabled=busy;action.onclick=()=>state.status==='connected'?controller.disconnect():controller.connect();root.appendChild(action);
    }else{
      const card=document.createElement('article');card.className='st-card';card.innerHTML='<b>Подключение на этом устройстве</b><p class="st-muted">Этот браузер не поддерживает подключение пульсометра. На iPhone можно открыть SETKA в Bluefy — браузере с доступом к Bluetooth. На Android и компьютере подойдёт Chrome с такой поддержкой.</p><a class="st-secondary" style="display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:13px" href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055" target="_blank" rel="noopener noreferrer">Bluefy для iPhone</a>';root.appendChild(card);
    }
    const help=document.createElement('details');help.className='st-card';help.open=helpOpen;help.innerHTML='<summary>Как подключить датчик</summary><p class="st-muted">1. Надень и включи пульсометр.<br>2. Разреши браузеру Bluetooth.<br>3. Нажми «Подключить пульсометр» и выбери устройство.<br>4. Сверни эту карточку и открой паттерн. Измерения сохранят время, сессию и просматриваемую конфигурацию.</p><p class="st-muted">Нужен датчик, передающий пульс по стандартному Bluetooth-протоколу. Apple Watch и браслеты с закрытым протоколом напрямую к этой веб-версии не подключаются.</p>';root.appendChild(help);
    const summary=document.createElement('article');summary.className='st-card';summary.innerHTML=history.length?`<b>Сохранённые измерения датчика</b><p class="st-muted">${history.length} измерений · среднее ${average} уд/мин.<br>Последнее: ${esc(history.at(-1).value)} уд/мин · ${esc(C.dt(history.at(-1).observedAt))}.</p>`:'<b>Пока нет показаний датчика</b><p class="st-muted">Здесь появятся только настоящие измерения. SETKA работает и без пульсометра.</p>';root.appendChild(summary);
    if(history.length){
      const measured=history.filter(x=>x.sessionId===C.getActiveSession()?.id).length;
      const card=document.createElement('article');card.className='st-card';card.innerHTML=`<b>Связь с использованием SETKA</b><p class="st-muted">${C.getActiveSession()?`${measured} измерений в текущей сессии.`:'Во время следующей сессии измерения будут связаны с её историей.'} Время измерения позволяет сопоставить пульс с реально открытым паттерном и его настройками. Это наблюдение, без автоматического вывода о причине изменения.</p>`;root.appendChild(card);
    }
  }
  C.pulse={...controller,supported,render,realHeartRates};
  for(const event of ['setka:view','setka:v40-private-corpus-restored','setka:v40-account'])window.addEventListener(event,render);
  setInterval(()=>controller.refresh(),5000);
  window.addEventListener('pagehide',()=>C.save());
  window.dispatchEvent(new Event('setka:pulse-ready'));
}
