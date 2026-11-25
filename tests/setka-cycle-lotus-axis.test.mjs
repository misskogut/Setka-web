import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("standalone-v34-cycle-logo3d.html","utf8");
const original=fs.readFileSync("experiments/alma-cycle-source/index.html","utf8");
const logo=fs.readFileSync("experiments/standalone-vertical-logo-v1.js","utf8");
const src=fs.readFileSync("experiments/standalone-cycle-lotus-gpu-volume-v20.js","utf8");

test("original ALMA cycle lotus is kept in its identity-linked calendar iframe",()=>{
 assert.match(html,/<aside class="setka-cycle-overlay" id="setkaCycleBack" hidden/);
 assert.match(html,/<iframe title="Оригинальный календарь цикла ALMA" src="\.\/experiments\/alma-cycle-source\/index\.html\?v=20261125-cycle-linked-v1&amp;setka_link=1" loading="eager"><\/iframe>/);
 assert.match(original,/<div id="alma-cycle-root"[^>]*><\/div>/);
 assert.match(original,/dist\/cycle\.js/);
 assert.doesNotMatch(html,/<script[^>]+(?:lotus-gpu-volume|lotus-direct|lotus-axis-v1)\.js/);
 assert.doesNotMatch(html,/<link[^>]+standalone-cycle-lotus-axis-v1\.css/);
 assert.doesNotMatch(html,/SETKA_CYCLE_LOTUS_AXIS|setkaCycleLotusTurn|setkaCycleLotusDirectPortal/);
});

test("the card itself still turns and is the only rotation affecting the lotus",()=>{
 assert.match(html,/back\.style\.transform="perspective\(1450px\) rotateY\("/);
 assert.match(html,/app\.style\.transform="perspective\(1450px\) rotateY\("/);
 assert.match(html,/window\.SETKA_CYCLE_DOCK_ROTATION\?\.render\(angle\)/);
 assert.match(html,/window\.SETKA_CYCLE_DOCK_ROTATION\?\.rest\(inCycle\)/);
 assert.doesNotMatch(html,/lotus.*(?:cloneNode|rotateY|scaleX)|SETKA_CYCLE_LOTUS_AXIS/i);
 assert.ok(src.includes("canvas.id=\"setkaCycleLotusTurn\""),"legacy experiment remains archived, but not loaded");
 assert.ok(logo.length>100);
});
