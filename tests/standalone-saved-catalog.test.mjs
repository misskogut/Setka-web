import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalSavedCatalog} from '../supabase/functions/setka-community-patterns-v38/saved-catalog.mjs';
test('historical saved recipes survive metric migration without exposing identities or inventing account counts',()=>{
 const descriptors=[{id:'pattern-a',version:1,schema:{scale:{type:'number'}}}];
 const rows=[1,2,3].map(n=>({device_id:'private-'+n,config_key:'old-key',pattern_id:'pattern-a',config:{patternId:'pattern-a',scale:2,privateNote:'never public'},saved_at:'2026-01-01'}));
 const result=historicalSavedCatalog(rows,descriptors);
 assert.equal(result.length,1);assert.equal(result[0].legacySaveCount,3);assert.equal(result[0].saveCount,0);
 assert.deepEqual(result[0].config,{patternId:'pattern-a',scale:2});
 assert.doesNotMatch(JSON.stringify(result),/private|never public/);
 assert.equal(historicalSavedCatalog([{...rows[0],pattern_id:'unknown'}],descriptors).length,0);
});
