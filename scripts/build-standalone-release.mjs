#!/usr/bin/env node
// Build-only release metadata for ONE permanent public SETKA URL.
// The public URL never contains a version number. Pages generates matching
// document and manifest revisions for each successful deployment.
import {readFileSync,writeFileSync,existsSync,readdirSync} from "node:fs";

const build=(process.env.GITHUB_SHA||"").trim().toLowerCase();
if(!/^[a-f0-9]{40}$/.test(build)){
  throw new Error("Expected 40-digit GITHUB_SHA for atomic GitHub Pages release");
}
const documentPath="standalone-v34.html";
const html=readFileSync(documentPath,"utf8");
const marker=/<meta name="setka-release-build" content="[^"]*"\s*\/>/;
if(!marker.test(html))throw new Error("Canonical SETKA page is missing the release-build meta");
const patched=html.replace(marker,`<meta name="setka-release-build" content="${build}" />`);
writeFileSync(documentPath,patched);
// Every current surface loads the same immutable deployment revision. Historical
// checkpoint pages keep their pinned sources and are deliberately excluded.
for(const path of [documentPath,"standalone-admin-v34.html","standalone-renderer-v40.html","standalone-research-admin-v1.html"]){
  if(!existsSync(path))continue;
  let source=readFileSync(path,"utf8");
  if(marker.test(source))source=source.replace(marker,`<meta name="setka-release-build" content="${build}" />`);
  source=source.replace(/\b(src|href)="((?!https?:|\/\/)[^"?]+\.(?:js|mjs|css))(?:\?[^" ]*)?"/g,
    (_match,attribute,asset)=>`${attribute}="${asset}?build=${build}"`);
  writeFileSync(path,source);
}
if(existsSync("research-v1"))for(const name of readdirSync("research-v1")){
  if(!name.endsWith(".mjs"))continue;
  const path="research-v1/"+name,source=readFileSync(path,"utf8");
  writeFileSync(path,source.replace(/((?:from\s*|import\s*)["'])(\.{1,2}\/[^"'?]+\.(?:mjs|js))(?:\?[^"']*)?(["'])/g,
    (_match,prefix,asset,quote)=>`${prefix}${asset}?build=${build}${quote}`));
}
writeFileSync("standalone-release.json",JSON.stringify({build,entry:"standalone-v34.html"})+"\n");
console.log("SETKA ONE-LINK RELEASE",build,documentPath);
