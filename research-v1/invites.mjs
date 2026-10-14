// Shared issuer contract. One-time codes are returned once; only hashes are stored.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomPart=(n,crypto)=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return [...a].map(x=>ALPH[x%ALPH.length]).join('')};
export function inviteRequest(b){
 const label=String(b.label||'').trim(),count=Number(b.count),requestedCount=Number(b.requestedCount??count);
 if(!label||label.length>120||/[\u0000-\u001f]/.test(label))throw Error('invalid_label');
 if(!Number.isInteger(count)||count<1||count>100||!Number.isInteger(requestedCount)||requestedCount<count||requestedCount>2147483647)throw Error('invalid_count');
 if(!UUID.test(b.requestId||'')||b.batchId&&!UUID.test(b.batchId))throw Error('invalid_request');
 return {label,count,requestedCount,batchId:b.batchId||null,requestId:b.requestId};
}
export async function issueInvites(b,owner,rpc,crypto=globalThis.crypto){
 const request=inviteRequest(b),items=[];
 for(let i=0;i<request.count;i++){
  const code=`SETKA-${randomPart(4,crypto)}-${randomPart(4,crypto)}-${randomPart(4,crypto)}`,testerId=`T-${randomPart(8,crypto)}`;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
  items.push({testerId,code,claimHash:[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')});
 }
 const result=await rpc('setka_research_v1_issue_invites',{p_batch_id:request.batchId,p_request_id:request.requestId,
 p_label:request.label,p_requested_count:request.requestedCount,p_issuer_tester_id:owner.testerId||null,p_admin_key_id:owner.adminId||null,
 p_items:items.map(({testerId,claimHash})=>({testerId,claimHash}))});
 return {ok:true,...result,items:items.map(({testerId,code})=>({testerId,code}))};
}
export const inviteState=x=>!x.active?'Отключён':x.password_set_at?'Аккаунт создан':x.consumed_at?'Приглашение принято':'Ожидает активации';
