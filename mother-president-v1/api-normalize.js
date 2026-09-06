(()=>{
'use strict';
const rawFetch=window.fetch.bind(window);
const V1='/functions/v1/setka-mother-president-v1';
const V2='/functions/v1/setka-mother-president-v2';
function normalizeAction(x){if(!x||typeof x!=='object')return x;return {...x,title:x.prompt||x.label||x.title||x.commandCode||x.command_code||'Действие'};}
function normalize(data,action){if(!data||typeof data!=='object')return data;if(action==='bootstrap'){
  const q=data.quickActions;
  const arr=Array.isArray(q)?q:Array.isArray(q?.actions)?q.actions:Array.isArray(q?.items)?q.items:[];
  data.quickActions=arr.map(normalizeAction);
  const inbox=data.eventInbox;
  if(inbox&&!Array.isArray(inbox)&&Array.isArray(inbox.events))data.eventInbox=inbox.events;
}
if(action==='quick_actions'){
  const q=data.items;
  const arr=Array.isArray(q)?q:Array.isArray(q?.actions)?q.actions:Array.isArray(q?.items)?q.items:[];
  data.items=arr.map(normalizeAction);
}
return data}
window.fetch=async function(input,init){const original=typeof input==='string'?input:String(input?.url||'');const matched=original.includes(V1);const url=matched?original.replace(V1,V2):original;let action='';try{if(matched&&init?.body)action=JSON.parse(init.body)?.action||''}catch{}
 const forwarded=matched&&typeof input==='string'?url:(matched?new Request(url,input):input);
 const res=await rawFetch(forwarded,init);if(!matched||!res.ok||!action)return res;
 try{const data=normalize(await res.clone().json(),action);const headers=new Headers(res.headers);headers.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(data),{status:res.status,statusText:res.statusText,headers})}catch{return res}
};
})();