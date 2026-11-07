// Visual review sheet for all 46 hand-authored SETKA music master SVGs.
// Run in Chromium and WebKit CI; no server, auth or live track writes required.
import {mkdir} from "node:fs/promises";
import {chromium,webkit} from "playwright";
import {MASTER_ICON_KEYS,masterMusicSVG} from "../standalone-music-master-icons-v1.mjs";
const name=process.env.SETKA_BROWSER==="webkit"?"webkit":"chromium";
const engine=name==="webkit"?webkit:chromium;
const browser=await engine.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1176,height:900},deviceScaleFactor:2});
 const cards=MASTER_ICON_KEYS.map((key,i)=>'<div class="card"><div class="icon">'+masterMusicSVG(key)+'</div><div class="key">'+String(i+1).padStart(2,"0")+' · '+key+'</div></div>').join("");
 await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{background:#050505;color:#ddd;margin:0;font-family:system-ui,sans-serif}.heading{text-align:center;font-size:20px;padding:20px;color:#eee}.gallery{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:14px;padding:16px 20px 32px}.card{display:flex;flex-direction:column;align-items:center;background:#101010;border:1px solid #292929;border-radius:12px;min-height:156px;padding:14px 4px 8px}.icon{width:106px;height:106px;display:grid;place-items:center;color:#e5e5e5}.icon svg{width:100%;height:100%;display:block}.key{font-size:10px;color:#aaa;margin-top:8px;text-align:center;overflow-wrap:anywhere;line-height:1.25;padding:0 3px}</style></head><body><div class="heading">SETKA · 46 independently redrawn music SVGs</div><main class="gallery">'+cards+'</main></body></html>');
 const rendered=await page.locator(".icon svg").count();
 if(rendered!==46)throw Error("Not all 46 hand-drawn masters render: "+rendered);
 await mkdir("tests/visual-smoke",{recursive:true});
 await page.screenshot({path:"tests/visual-smoke/music-master-"+name+".png",fullPage:true,animations:"disabled"});
 console.log("Visual sheet created for "+rendered+" icons in "+name);
}finally{await browser.close()}
