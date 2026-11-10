import fs from 'node:fs';

const roots=['standalone-v34.html','standalone-research-admin-v1.html','research-v1/app.mjs','research-v1/renderer.mjs','research-v1/pattern-editor.mjs','standalone-pattern-registry-v1.js'];
// Audit actual application modules, not only six entrypoint files.
for(const file of fs.readdirSync('.').filter(x=>/^standalone-(?:pattern-|music-|.*v34|.*v40).*\\.(?:js|mjs)$/.test(x)))roots.push(file);
for(const file of fs.readdirSync('research-v1').filter(x=>/\\.mjs$/.test(x)))roots.push('research-v1/'+file);
const scanned=[...new Set(roots)];
const findings=[];
const add=(level,file,line,code,detail,action)=>findings.push({level,file,line,code,detail,action});
for(const file of scanned){
 const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
 lines.forEach((line,index)=>{
  if(/\b(?:TODO|FIXME|HACK|XXX)\b/i.test(line)&&!/(?:test|fixture)/i.test(line))add('review',file,index+1,'TECH_DEBT',line.trim().slice(0,180),'Уточнить назначение и устранить или документировать');
  if(/(?:Math\.random\(\).*?(?:statistics|analytics)|fake(?:Data|Stats)|mock(?:Data|Stats)|demo(?:Data|Stats))/i.test(line))add('review',file,index+1,'POSSIBLE_FAKE_DATA',line.trim().slice(0,180),'Проверить отсутствие декоративных показателей');
 });
}
const front=fs.readFileSync('standalone-v34.html','utf8');
const admin=fs.readFileSync('standalone-research-admin-v1.html','utf8');
const app=fs.readFileSync('research-v1/app.mjs','utf8');
const editor=fs.readFileSync('research-v1/pattern-editor.mjs','utf8');
const renderer=fs.readFileSync('research-v1/renderer.mjs','utf8');
const required=[
 [front.includes('standalone-pattern-registry-v1.js'),'FRONT_REGISTRY','Фронт не загружает общий реестр','standalone-v34.html'],
 [admin.includes('research-v1/app.mjs'),'ADMIN_ENTRY','Нет точки входа админки','standalone-research-admin-v1.html'],
 [app.includes('mountPatternEditor'),'EDITOR_MOUNT','Редактор не подключён к админке','research-v1/app.mjs'],
 [app.includes('registry.applyDefaults('),'ADMIN_DEFAULTS','Админка не применяет общие defaults','research-v1/app.mjs'],
 [app.includes('registry.applyOrder('),'ADMIN_ORDER','Админка не применяет общий порядок','research-v1/app.mjs'],
 [renderer.includes('standalone-pattern-registry-v1.js'),'ADMIN_RENDERER','Рендерер админки не использует общий реестр','research-v1/renderer.mjs'],
 [editor.includes('registry.normalize({...config,...changes},id)'),'ADMIN_SLIDERS','Стартовые ползунки не обновляют config напрямую','research-v1/pattern-editor.mjs']
];
for(const [ok,code,detail,file] of required)if(!ok)add('block',file,0,code,detail,'Восстановить общий механизм фронта и админки');
const report={schema:1,checked:scanned,blocks:findings.filter(x=>x.level==='block').length,reviews:findings.filter(x=>x.level==='review').length,findings};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/setka-architecture-audit.json',JSON.stringify(report,null,2)+'\n');
const md=['# SETKA · Согласованность архитектуры и технический долг','',`Блокирующих: ${report.blocks}; требуют ручного анализа: ${report.reviews}.`,'',...findings.map(f=>`- **${f.level}** ${f.file}:${f.line} [${f.code}] ${f.detail}. Действие: ${f.action}.`)];
if(!findings.length)md.push('По выбранным статическим признакам проблем нет. Это не доказывает отсутствие обходных решений в остальных модулях.');
fs.writeFileSync('artifacts/setka-architecture-audit.md',md.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.join('\n')+'\n');
console.log(md.join('\n'));
if(report.blocks)process.exitCode=1;
