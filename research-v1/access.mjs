// Existing SETKA admin credentials only. Issuance and validation remain server-side.
export const ADMIN_STORAGE='setka-research:admin-key:v1';
export function accessLink(href){
  const url=new URL(href),hash=new URLSearchParams(url.hash.slice(1));
  const rawTicket=url.searchParams.get('owner_ticket')||'',rawKey=hash.get('access')||'';
  const ticket=/^SETKA1-[A-Za-z0-9_-]{64}$/.test(rawTicket)?rawTicket:'';
  const key=/^SKA-[A-Za-z0-9_-]{40,}$/.test(rawKey)?rawKey:'';
  const consumed=url.searchParams.has('owner_ticket')||hash.has('access');
  url.searchParams.delete('owner_ticket');
  if(hash.has('access')){hash.delete('access');url.hash=hash.toString();}
  return {ticket,key:ticket?'':key,consumed,path:url.pathname+url.search+url.hash};
}
export function accessStorage(getStore=name=>globalThis[name]){
  const get=name=>{try{return getStore(name)?.getItem(ADMIN_STORAGE)||'';}catch(_){return '';}};
  const remove=name=>{try{getStore(name)?.removeItem(ADMIN_STORAGE);}catch(_){}};
  return {
    load(){const session=get('sessionStorage');return {key:session||get('localStorage'),remember:!session&&!!get('localStorage')};},
    save(key,remember){
      remove('sessionStorage');remove('localStorage');
      try{const store=getStore(remember?'localStorage':'sessionStorage');if(!store)return false;store.setItem(ADMIN_STORAGE,key);return store.getItem(ADMIN_STORAGE)===key;}catch(_){return false;}
    },
    clear(key){for(const name of ['sessionStorage','localStorage'])if(!key||get(name)===key)remove(name);}
  };
}
export function accessError(e){
  if(e?.message==='invalid_admin_key')return 'Сервер не подтвердил этот ключ. Используйте действующий доступ владельца.';
  if(e?.message==='owner_link_expired_or_revoked')return 'Ссылка уже использована или срок её действия закончился. Нужна новая ссылка восстановления владельца.';
  if(e?.message==='owner_access_revoked')return 'Этот доступ владельца отключён. Восстановление по этой ссылке недоступно.';
  if(e?.message==='invalid_link')return 'Ссылка восстановления неполная. Откройте её целиком.';
  if(e?.message==='origin_not_allowed')return 'Этот адрес не разрешён для входа. Откройте админку на misskogut.github.io.';
  if(e?.name==='TimeoutError')return 'Сервер отвечает слишком долго. Попробуйте ещё раз.';
  return null;
}
