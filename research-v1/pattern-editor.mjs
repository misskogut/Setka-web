import '../standalone-pattern-registry-v1.js';
const registry=globalThis.SetkaPatternRegistryV1;
// Mounted inside the existing research pattern card; it reuses its scheduler.
export async function mountPatternEditor(root,{id,api,onChange=()=>{}}){
 const p=registry.get(id);if(!root||!p)return;
 if(p.capabilities.settings===false){root.textContent="У этого паттерна нет изменяемых настроек.";return}
 root.innerHTML='<h2>Стартовые настройки паттерна</h2><p class="muted small">Изменения применяются к следующим открытиям. Личные настройки и прежние снимки заметок сохраняются.</p>';
 let saved=null;
 try{const out=await api('catalog');saved=(out.defaults||[]).find(x=>x.pattern_id===id);registry.applyDefaults(out.defaults||[])}catch(_){/* Editing remains a draft until the server confirms saving. */}
 if(!root.isConnected)return;
 let config=registry.defaults(id);
 const canvas=document.createElement('canvas');canvas.width=280;canvas.height=280;canvas.dataset.preview='';canvas.dataset.pattern=id;canvas.dataset.frame='44';canvas.setAttribute('aria-label','Превью стартовых настроек');canvas.style.maxWidth='280px';root.append(canvas);
 const form=document.createElement('form');form.className='pattern-settings-form';root.append(form);
 const go=document.createElement('button');go.type='submit';go.className='primary';go.textContent='Сохранить стартовые настройки';
 const message=document.createElement('p');message.className='small';message.setAttribute('role','status');
 const paint=()=>{canvas.dataset.config=JSON.stringify(config);go.disabled=false;onChange()};
 for(const [label,key,min,max,step] of p.controls){
  const row=document.createElement('label');row.style.marginTop='14px';row.textContent=label+' ';
  const value=document.createElement('output');value.textContent=config[key];
  const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=config[key];input.setAttribute('aria-label',label);
  input.oninput=()=>{config=registry.normalize({...config,[key]:Number(input.value)},id);value.textContent=config[key];paint()};row.append(value,input);form.append(row);
 }
 for(const [key,rule] of Object.entries(p.schema))if(rule.type==='boolean'){
  const row=document.createElement('label');row.className='checkbox';const input=document.createElement('input');input.type='checkbox';input.checked=config[key];input.onchange=()=>{config=registry.normalize({...config,[key]:input.checked},id);paint()};
  row.append(input,document.createTextNode(rule.label||({glitchEnabled:'Цветовое смещение',invertDirection:'Обратное направление'})[key]||'Дополнительный режим'));form.append(row);
 }
 const color=document.createElement('label');color.textContent='Цветовой режим';const palette=document.createElement('select');palette.setAttribute('aria-label','Цветовой режим');
 for(let i=0;i<p.colorModes;i++){const option=document.createElement('option');option.value=i;option.textContent=String(i+1);palette.append(option)}palette.value=config.colorModeIndex;
 palette.onchange=()=>{config=registry.normalize({...config,colorModeIndex:Number(palette.value)},id);paint()};color.append(palette);form.append(color,go,message);
 go.style.marginTop='18px';
 form.onsubmit=async event=>{
  event.preventDefault();go.disabled=true;message.textContent='Сохраняем…';
  try{const result=await api('save-pattern-defaults',{patternId:id,patternVersion:p.version,schemaVersion:p.schemaVersion,config,expectedRevision:saved?.revision||0});
   if(!result.ok||!result.item)throw Error('not_confirmed');saved=result.item;registry.applyDefaults([saved]);message.textContent='Настройки сохранены. Фронт получит их при обновлении каталога.';
  }catch(error){message.textContent=error.message==='revision_conflict'?'Настройки уже изменились. Откройте карточку заново.':'Сохранение не подтверждено. Изменения остаются в редакторе.';go.disabled=false}
 };
 paint();
}
