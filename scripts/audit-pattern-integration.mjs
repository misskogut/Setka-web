import fs from 'node:fs';
import path from 'node:path';

const issues=[];
const add=(severity,id,code,message,fix)=>issues.push({severity,id,code,message,fix});
const files=fs.readdirSync('.').filter(x=>/^standalone-pattern-[a-z0-9-]+\.js$/.test(x));
const header=/^\/\*\s*SETKA_PATTERN_DESCRIPTOR\s*\n([\s\S]*?)\nEND_SETKA_PATTERN_DESCRIPTOR\s*\*\//;
let count=0;
for(const file of files){
 const source=fs.readFileSync(file,'utf8'),match=source.match(header);
 if(!match)continue;
 let p;
 try{p=JSON.parse(match[1])}catch(e){add('error',file,'INVALID_JSON',e.message,'Исправить JSON дескриптора');continue}
 count++;
 const id=p.id||file;
 if(p.module!==file)add('error',id,'MODULE_PATH','Имя модуля не совпадает с файлом','Указать точный module');
 if(!p.defaults||!Array.isArray(p.controls)){add('error',id,'CONTRACT','Нет defaults или controls','Добавить обязательные поля');continue}
 const names=new Set();
 for(const control of p.controls){
  const [label,key,min,max,step]=control;
  if(names.has(key))add('error',id,'DUPLICATE_CONTROL',String(key),'Убрать дублирующий ползунок');
  names.add(key);
  if(!Number.isFinite(p.defaults[key]))add('error',id,'DEFAULT_MISSING',String(key),'Указать числовое стартовое значение');
  else if(p.defaults[key]<min||p.defaults[key]>max)add('error',id,'DEFAULT_RANGE',String(key),'Привести default к диапазону ползунка');
  if(!(Number.isFinite(min)&&Number.isFinite(max)&&Number.isFinite(step)&&min<max&&step>0))add('error',id,'SLIDER_RANGE',String(key),'Исправить min/max/step');
 }
 if(!source.includes('bindRenderer('))add('error',id,'RENDER_BINDING','Нет привязки рендерера','Вызвать registry.bindRenderer');
 const gesture=source.includes('bindInteraction(');
 if(p.transientFields?.length&&!gesture)add('error',id,'GESTURE_BINDING','Есть transientFields, но нет обработчика','Подключить bindInteraction');
 if(gesture){
  if(!source.includes('phase')||!source.includes('end'))add('warning',id,'GESTURE_LIFECYCLE','Не обнаружена явная обработка завершения жеста','Проверить start/move/end/cancel');
  if(p.transientFields?.some(x=>/fingerActive|pointerActive/.test(x))&&!source.includes('fingerActive:0'))add('warning',id,'POINTER_RELEASE','Не найдена явная очистка состояния пальца','Сбрасывать активность при отпускании и отмене');
 }
 if(!Array.isArray(p.palettes)||!p.palettes.some(c=>Array.isArray(c)&&c.every(v=>v===255)))add('error',id,'WHITE_PALETTE','Нет белой палитры','Добавить белый стартовый режим');
}
const editor=fs.readFileSync('research-v1/pattern-editor.mjs','utf8');
if(!editor.includes('registry.normalize({...config,...changes},id)'))add('error','platform','ADMIN_PATCH','Редактор стартового вида не применяет изменения напрямую','Исправить patch ползунков');
const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
if(!workflow.includes('scripts/build-pattern-manifest.mjs'))add('error','platform','CATALOG_BUILD','Нет сборки общего каталога','Добавить генерацию манифеста в CI');
const report={schema:1,checkedPatterns:count,errors:issues.filter(x=>x.severity==='error').length,warnings:issues.filter(x=>x.severity==='warning').length,issues};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/pattern-integration-report.json',JSON.stringify(report,null,2)+'\n');
const md=['# SETKA · Автоматическая проверка интеграции паттернов','',`Проверено: ${count}. Ошибок: ${report.errors}. Предупреждений: ${report.warnings}.`,'',...issues.map(x=>`- **${x.severity==='error'?'БЛОКИРУЕТ':'ПРОВЕРИТЬ'}** [${x.id}] ${x.code}: ${x.message}. Что сделать: ${x.fix}.`)];
if(!issues.length)md.push('Проверки контракта пройдены. Требуется отдельная визуальная приёмка и проверка опубликованного сайта.');
fs.writeFileSync('artifacts/pattern-integration-report.md',md.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.join('\n')+'\n');
console.log(md.join('\n'));
if(report.errors)process.exitCode=1;
