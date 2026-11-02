import fs from 'node:fs';
const installed=new WeakSet();
// Existing UI regressions use a fully published installed catalog. Lifecycle
// regressions provide their own stateful server and do not install this helper.
export async function installPublicationCatalog(page){
 if(installed.has(page))return;installed.add(page);
 await page.route('**/functions/v1/setka-research-admin-v1',async route=>{
  const req=route.request();let body={};try{body=req.postDataJSON()||{};}catch{}
  if(req.method()!=='OPTIONS'&&body.action!=='catalog')return route.fallback();
  const headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true','access-control-allow-headers':'content-type,apikey,authorization,x-client-info','access-control-allow-methods':'POST,OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const manifest=JSON.parse(fs.readFileSync('setka-pattern-manifest-v1.json','utf8'));
  return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({ok:true,registryAvailable:true,registryRevision:manifest.registryRevision,publicationRevision:1,items:manifest.patterns.map(p=>({pattern_id:p.id,title:p.title,revision:1})),defaults:[]})});
 });
}
