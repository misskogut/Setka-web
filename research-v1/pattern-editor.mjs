import '../standalone-pattern-registry-v1.js';
const registry=globalThis.SetkaPatternRegistryV1;
// Mounted inside the existing research pattern card; it reuses its scheduler.
export async function mountPatternEditor(root,{id,api,onChange=()=>{},draftOnly=false}){
 const p=registry.get(id);if(!root||!p)return;
 if(p.capabilities.settings===false){root.textContent="У этого паттерна нет изменяемых настроек.";return}
 root.innerHTML=draftOnly?'<h2>Тестовая область</h2><p class="muted small">Тот же рендерер и параметры, что в приложении. Изменения здесь остаются пробой: не публикуются, не меняют стартовые настройки и не записываются в статистику участников.</p>':'<h2>Стартовые настройки паттерна</h2><p class="muted small">Изменения применяются к следующим открытиям. Личные настройки и прежние снимки заметок сохраняются.</p>';
 let saved=null;
 try{const out=await api('manage-catalog');saved=(out.defaults||[]).find(x=>x.pattern_id===id);registry.applyDefaults(out.defaults||[])}catch(_){/* Editing remains a draft until the server confirms saving. */}
 if(!root.isConnected)return;
 let config=registry.defaults(id),saving=false;
 const canvas=document.createElement('canvas');canvas.width=420;canvas.height=420;canvas.dataset.preview='';canvas.dataset.pattern=id;canvas.dataset.frame='0';canvas.dataset.editorClock=String(performance.now());canvas.style.touchAction='none';canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',draftOnly?'Тестовый паттерн':'Превью стартовых настроек');canvas.style.maxWidth='280px';root.append(canvas);
 const help=document.createElement('p');help.className='muted small';help.textContent='Касайтесь рисунка и используйте жесты паттерна. Сохранится выбранный вид вместе с запущенным движением.';root.append(help);
 const form=document.createElement('form');form.className='pattern-settings-form';root.append(form);
 const go=document.createElement('button');go.type='submit';go.className='primary';go.textContent='Сохранить стартовые настройки';
 const message=document.createElement('p');message.className='small';message.setAttribute('role','status');
 const controls=[];
 const frame=()=>Math.max(0,(performance.now()-Number(canvas.dataset.editorClock))/16.6667);
 const paint=()=>{canvas.dataset.config=JSON.stringify(config);for(const sync of controls)sync();go.disabled=false;onChange()};
 const apply=event=>{if(saving)return;const next=registry.interact(id,config,{...event,frame:frame()});if(next)config=next;paint()};
 const patch=changes=>{if(saving)return;config=registry.interact(id,config,{type:'patch',patch:changes,frame:frame()})||registry.normalize({...config,...changes},id);paint()};
 bindEditorGestures(canvas,{id,apply,patch,getConfig:()=>config});
 for(const [label,key,min,max,step] of p.controls){
  const row=document.createElement('label');row.style.marginTop='14px';row.textContent=label+' ';
  const value=document.createElement('output');value.textContent=config[key];
  const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=config[key];input.setAttribute('aria-label',label);
  controls.push(()=>{input.value=config[key];value.textContent=config[key]});input.oninput=()=>patch({[key]:Number(input.value)});row.append(value,input);form.append(row);
 }
 for(const [key,rule] of Object.entries(p.schema))if(rule.type==='boolean'){
  const row=document.createElement('label');row.className='checkbox';const input=document.createElement('input');input.type='checkbox';input.checked=config[key];controls.push(()=>{input.checked=config[key]});input.onchange=()=>patch({[key]:input.checked});
  row.append(input,document.createTextNode(rule.label||({glitchEnabled:'Цветовое смещение',invertDirection:'Обратное направление'})[key]||'Дополнительный режим'));form.append(row);
 }
 const color=document.createElement('label');color.textContent='Цветовой режим';const palette=document.createElement('select');palette.setAttribute('aria-label','Цветовой режим');
 for(let i=0;i<p.colorModes;i++){const option=document.createElement('option');option.value=i;option.textContent=String(i+1);palette.append(option)}palette.value=config.colorModeIndex;
 controls.push(()=>{palette.value=config.colorModeIndex});palette.onchange=()=>patch({colorModeIndex:Number(palette.value)});color.append(palette);form.append(color);if(!draftOnly)form.append(go,message);
 const undo=document.createElement('button');undo.type='button';undo.textContent='Вернуть сохранённые настройки';undo.onclick=()=>{config=registry.defaults(id);canvas.dataset.editorClock=String(performance.now());paint()};form.append(undo);
 go.style.marginTop='18px';
 form.onsubmit=async event=>{
  event.preventDefault();if(draftOnly||saving)return;saving=true;form.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);canvas.setAttribute('aria-disabled','true');message.textContent='Сохраняем…';
  try{const requested=registry.normalize({...config,_startFrame:(Number(config._startFrame)||0)+frame()},id);
  const result=await api('save-pattern-defaults',{patternId:id,patternVersion:p.version,schemaVersion:p.schemaVersion,config:requested,expectedRevision:saved?.revision||0});
   if(!result.ok||!result.item)throw Error('not_confirmed');
   const confirmed=await api('manage-catalog'),row=confirmed.defaults?.find(x=>x.pattern_id===id);
   if(!row||row.revision!==result.item.revision||registry.configKey(row.config,id)!==registry.configKey(requested,id))throw Error('readback_not_confirmed');
   saved=row;config=registry.normalize(row.config,id);canvas.dataset.editorClock=String(performance.now());paint();go.disabled=true;registry.applyDefaults([saved]);message.textContent='Настройки сохранены. Фронт получит их при обновлении каталога.';
  }catch(error){message.textContent=error.message==='revision_conflict'?'Настройки уже изменились. Откройте карточку заново.':'Сохранение не подтверждено. Изменения остаются в редакторе.';go.disabled=false}finally{saving=false;canvas.removeAttribute('aria-disabled');form.querySelectorAll('input,select,button').forEach(el=>{if(el!==go)el.disabled=false})}
 };
 paint();
}

// The editor forwards the same module-owned reducer events as gameplay.
// Nothing here opens participant gameplay or writes usage telemetry.
export function bindEditorGestures(canvas,{id,apply,patch,getConfig}){
 const p=registry.get(id),pointers=new Map();let gesture=null,taps=[];
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,width:r.width,height:r.height,pointerType:e.pointerType||'touch'}};
 const center=()=>{const a=[...pointers.values()];return {x:a.reduce((n,v)=>n+v.x,0)/a.length,y:a.reduce((n,v)=>n+v.y,0)/a.length,distance:a.length>1?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0}};
 const send=(phase,extra={})=>{if(!gesture)return;apply({type:'gesture',phase,zone:'center',...gesture,...extra})};
 canvas.onpointerdown=e=>{
  if(e.button!==0&&e.pointerType!=='touch')return;e.preventDefault();const pos=point(e);
  if(gesture)send('end',{cancelled:true});pointers.set(e.pointerId,pos);canvas.setPointerCapture(e.pointerId);
  const c=center();gesture={...pos,...c,startX:c.x,startY:c.y,fingers:pointers.size,dx:0,dy:0,pinch:null,startedAt:performance.now(),moved:false,multi:pointers.size>1};
  if(gesture.multi)taps=[];send('start');
 };
 canvas.onpointermove=e=>{
  if(!pointers.has(e.pointerId)||!gesture||gesture.multi&&pointers.size<2)return;e.preventDefault();const before=center();pointers.set(e.pointerId,point(e));const c=center();
  gesture.moved=gesture.moved||Math.hypot(c.x-gesture.startX,c.y-gesture.startY)>6;
  send('move',{x:c.x,y:c.y,dx:c.x-before.x,dy:c.y-before.y,pinch:before.distance&&c.distance?c.distance/before.distance:null});
 };
 const end=(e,cancelled=false)=>{
  if(!pointers.has(e.pointerId)||!gesture)return;const last={...gesture,...point(e)};send('end',{x:last.x,y:last.y,cancelled:cancelled||last.multi});pointers.delete(e.pointerId);
  if(!cancelled&&!last.moved&&!last.multi&&performance.now()-last.startedAt<450){
   if(e.pointerType==='mouse')apply({type:'click',...last});
   const now=performance.now();taps=taps.filter(t=>now-t<450);taps.push(now);
   if(p.tapColorCycle!==false&&taps.length>=3){patch({colorModeIndex:((getConfig().colorModeIndex||0)+1)%p.colorModes});taps=[]}
  }else taps=[];
  // Remaining fingers cannot turn into a new single-finger command.
  if(pointers.size){gesture={...last,fingers:pointers.size,multi:true,moved:true};return}
  gesture=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 };
 canvas.onpointerup=e=>end(e);canvas.onpointercancel=e=>end(e,true);canvas.onlostpointercapture=e=>end(e,true);
 canvas.onwheel=e=>{e.preventDefault();apply({type:'wheel',delta:e.deltaY,deltaY:e.deltaY,...point(e)})};
 canvas.onkeydown=e=>{if(e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();const r=canvas.getBoundingClientRect(),pos={x:r.width/2,y:r.height/2,width:r.width,height:r.height,startX:r.width/2,startY:r.height/2,fingers:1,pointerType:'touch'};apply({type:'gesture',phase:'start',...pos});apply({type:'gesture',phase:'end',...pos})};
 canvas.oncontextmenu=e=>e.preventDefault();
}
