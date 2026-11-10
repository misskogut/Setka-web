#!/usr/bin/env node
// Verify the public Pages release rather than assuming successful upload means visible.
import fs from 'node:fs';
const base=(process.env.SETKA_PUBLIC_BASE||'https://misskogut.github.io/Setka-web/').replace(/\/?$/,'/');
const sha=(process.env.GITHUB_SHA||'').toLowerCase();
const checks=[
 {path:'standalone-v34.html',label:'Фронт'},
 {path:'standalone-research-admin-v1.html',label:'Исследовательская админка'},
 {path:'standalone-pattern-registry-v1.js',label:'Реестр паттернов'},
 {path:'setka-pattern-manifest-v1.json',label:'Манифест паттернов'}
];
const results=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(const check of checks){
 let result={...check,ok:false,attempts:0,reason:'Не удалось получить опубликованный ресурс'};
 for(let attempt=1;attempt<=8;attempt++){
  result.attempts=attempt;
  try{
   const url=new URL(check.path,base);url.searchParams.set('setka_smoke',sha||Date.now().toString());
   const response=await fetch(url,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const body=await response.text();
   if(body.length<100)throw Error('Пустой или неполный ответ');
   if(check.path.endsWith('.html')&&sha&&!body.includes(sha))throw Error('Сайт ещё отдаёт предыдущую сборку');
   if(check.path.endsWith('.json')){
    const data=JSON.parse(body);
    if(!Array.isArray(data.patterns))throw Error('Нет списка patterns');
   }
   if(check.path.includes('registry')&&!body.includes('SETKA_AUTO_DISCOVERY'))throw Error('Не найден реестр');
   result={...result,ok:true,reason:'Опубликовано'};break;
  }catch(error){result.reason=String(error.message||error);if(attempt<8)await wait(6000)}
 }
 results.push(result);
}
const report={schema:1,revision:sha,base,checkedAt:new Date().toISOString(),ok:results.every(x=>x.ok),results};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/setka-live-smoke.json',JSON.stringify(report,null,2)+'\n');
const md=['# SETKA · Проверка опубликованной версии','',...results.map(x=>`- ${x.ok?'PASS':'FAIL'} · ${x.label}: ${x.reason} (${x.attempts} попыток)`),'',report.ok?'Все публичные ресурсы доступны. Это не заменяет тестирования поведения и визуальную приёмку.':'Публичная версия не подтверждена. Проверить Pages, сборку и CDN-кеш.'];
fs.writeFileSync('artifacts/setka-live-smoke.md',md.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.join('\n')+'\n');
console.log(md.join('\n'));
if(!report.ok)process.exitCode=1;
