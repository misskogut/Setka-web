// Runs BEFORE the actual production modules. Local data is namespaced;
// every remote mutation is blocked, including private sync and publication.
(() => {
 'use strict';
 const prefix='setka-isolated-replay-v1.1.1:';
 for(const method of ['getItem','setItem','removeItem']){const native=Storage.prototype[method];Storage.prototype[method]=function(key,...args){return native.call(this,prefix+key,...args)}}
 const open=indexedDB.open.bind(indexedDB);indexedDB.open=(name,version)=>version===undefined?open(prefix+name):open(prefix+name,version);
 const native=window.fetch.bind(window),blocked=[];
 window.fetch=(url,init)=>{
  const address=String(url),body=typeof init?.body==='string'?JSON.parse(init.body):{};
  if(!address.includes('/functions/v1/'))return native(url,init);
  if((address.includes('/setka-community-patterns-v38')||address.includes('/setka-public-notes-v37'))&&['feed','list','stats'].includes(body.action)&&!body.sessionToken&&!body.adminKey)return native(url,init);
  blocked.push({endpoint:address.split('/').at(-1),action:body.action||null});
  return Promise.resolve(new Response(JSON.stringify({error:'isolated_test_remote_write_blocked',ok:false}),{status:403,headers:{'Content-Type':'application/json'}}));
 };
 navigator.sendBeacon=()=>false;
 window.__SETKA_ISOLATED_FRONT_V1__={active:true,blocked:()=>blocked.length};
})();
