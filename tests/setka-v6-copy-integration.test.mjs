import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const copy=readFileSync('research-v1/copy-analytics-v6.mjs','utf8');
const app=readFileSync('research-v1/copy-app-v6.mjs','utf8');
const copyHtml=readFileSync('standalone-research-admin-copy-v6.html','utf8');
const stableHtml=readFileSync('standalone-research-admin-v1.html','utf8');
const css=readFileSync('research-v1/copy-v6.css','utf8');

test('V6 extends the original white home dashboard without floating panels or extra source tabs',()=>{
 assert.match(copy,/export function createV6Analytics/);
 assert.match(copy,/const SOURCES=\['unified_v2','guest_v40','account_v41'\]/);
 assert.match(copy,/className='card v6-overview'/);
 assert.match(copy,/content\.prepend\(wrapper\)/);
 assert.match(copy,/function showPatternDetail/);
 assert.match(copy,/data-v6-pattern/);
 assert.match(copy,/openPattern\(button\.dataset\.v6Pattern\)/);
 assert.doesNotMatch(copy,/setka-v6-lab-source|setka-copy-source|data-v6-view|position:fixed|background:#161616/);
 assert.match(css,/background:#fff/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('stable admin is isolated and source picker is hidden only in V6 copy',()=>{
 assert.match(app,/import \{createV6Analytics\} from '\.\/copy-analytics-v6\.mjs(?:\?[^']*)?'/);
 assert.match(app,/v6\.render\(page,/);
 assert.match(app,/v6\.showPatternDetail\(id,/);
 assert.match(app,/let filters=\{scope:'all'/);
 assert.match(copyHtml,/<label hidden>Источники<select id="scope">/);
 assert.match(copyHtml,/research-v1\/copy-v6\.css/);
 assert.match(copyHtml,/research-v1\/copy-app-v6\.mjs/);
 assert.match(stableHtml,/research-v1\/app\.mjs/);
 assert.doesNotMatch(stableHtml,/<script[^>]+src=["'][^"']*copy-app-v6\.mjs/);
 // Stable may load the shared export-only helper; it never mounts a V6 dashboard.
 assert.doesNotMatch(stableHtml,/<link[^>]+href=["'][^"']*copy-v6\.css/);
});
test('source-level counts are never summed into a synthetic unique user total',()=>{
 assert.match(copy,/guestDevices/);
 assert.match(copy,/distinctIdentities/);
 assert.match(copy,/Повторы между V2, V40 и V41 пока не объединяются/);
 assert.match(copy,/V40 —/);
 assert.match(copy,/V41 —/);
 assert.match(copy,/Последний вход в аккаунт/,'copy separates account login freshness from V2 delivery');
 assert.ok(copy.includes('Europe/Saratov'),'research timestamps are presented in Saratov time');
 assert.match(readFileSync('supabase/functions/setka-admin-v6-metrics/index.ts','utf8'),/lastAccountLoginAt/);
 assert.doesNotMatch(copy,/getRecord\(result,'guest_v40'\)\.distinctIdentities\s*\+/);
});
