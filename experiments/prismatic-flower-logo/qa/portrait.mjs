import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const name=process.env.FLOWER_BROWSER||'webkit';
const out=new URL('./output/'+name+'/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await (name==='webkit'?webkit:chromium).launch({headless:true,args:name==='chromium'?['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[],env:{...process.env,LIBGL_ALWAYS_SOFTWARE:'1'}});
try{
 const page=await browser.newPage({viewport:{width:600,height:700},deviceScaleFactor:1});
 page.setDefaultTimeout(90000);page.setDefaultNavigationTimeout(90000);
 await page.goto((process.env.FLOWER_URL||'http://127.0.0.1:4173/')+'?capture=1');
 await page.waitForFunction(()=>window.SETKA_FLOWER_DIAGNOSTICS?.frames>2,{},{timeout:90000});
 await page.screenshot({path:new URL('portrait.png',out).pathname,timeout:90000});
 await writeFile(new URL('portrait.json',out),JSON.stringify(await page.evaluate(()=>window.SETKA_FLOWER_DIAGNOSTICS),null,2));
}finally{await browser.close()}
