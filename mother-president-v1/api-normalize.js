(()=>{
'use strict';
const rawFetch=window.fetch.bind(window);
const TARGET='/functions/v1/setka-mother-president-v1';
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
window.fetch=async function(input,init){const url=typeof input==='string'?input:String(input?.url||'');let action='';try{if(url.includes(TARGET)&&init?.body){action=JSON.parse(init.body)?.action||''}}catch{}
 const res=await rawFetch(input,init);if(!url.includes(TARGET)||!res.ok||!action)return res;
 try{const data=normalize(await res.clone().json(),action);const headers=new Headers(res.headers);headers.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(data),{status:res.status,statusText:res.statusText,headers})}catch{return res}
};
})();