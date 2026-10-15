#!/usr/bin/env node
// Build-only release metadata for ONE permanent public SETKA URL.
// The public URL never contains a version number. Pages generates matching
// document and manifest revisions for each successful deployment.
import {readFileSync,writeFileSync} from "node:fs";

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
writeFileSync("standalone-release.json",JSON.stringify({build,entry:"standalone-v34.html"})+"\n");
console.log("SETKA ONE-LINK RELEASE",build,documentPath);
