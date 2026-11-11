import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const copy=readFileSync('research-v1/copy-analytics-v6.mjs','utf8');
const app=readFileSync('research-v1/copy-app-v6.mjs','utf8');
const copyHtml=readFileSync('standalone-research-admin-copy-v6.html','utf8');
const stableHtml=readFileSync('standalone-research-admin-v1.html','utf8');
test('V6 additions live in document flow and only on the copy route',()=>{
 assert.match(copy,/location\.pathname\.endsWith\('\/standalone-research-admin-copy-v6\.html'\)/);
 assert.match(copy,/host\.id='setka-copy-inline-v6'/);
 assert.match(copy,/document\.getElementById\('content'\)\?\.before\(host\)/);
 assert.doesNotMatch(copy,/position:fixed/);
 assert.doesNotMatch(copy,/document\.body\.appendChild\((box|extra)\)/);
 assert.match(copy,/host\.hidden=/);
 assert.match(app,/\.main \.topbar/);
 assert.doesNotMatch(app,/position:fixed/);
});
test('original research admin retains its own entrypoint',()=>{
 assert.match(copyHtml,/research-v1\/copy-app-v6\.mjs/);
 assert.match(copyHtml,/research-v1\/copy-analytics-v6\.mjs/);
 assert.match(stableHtml,/research-v1\/app\.mjs/);
 assert.doesNotMatch(stableHtml,/research-v1\/copy-app-v6\.mjs/);
});
