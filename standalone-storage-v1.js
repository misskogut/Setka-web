(() => {
  'use strict';
  // Personal history is durable data, separate from the disposable visual cache.
  const name='setka-personal-history-v1';let opening=null,queue=Promise.resolve();
  function open(){
    if(opening)return opening;
    opening=new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(new Error('storage_unavailable'));return}
      const request=indexedDB.open(name,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('archives');
      request.onerror=()=>reject(request.error||new Error('storage_unavailable'));
      request.onblocked=()=>reject(new Error('storage_blocked'));
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null};resolve(db)};
    });
    opening.catch(()=>{opening=null});return opening;
  }
  async function read(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('archives','readonly'),r=tx.objectStore('archives').get('current');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error)})}
  function write(row,merge){
    const next=queue.catch(()=>{}).then(async()=>{
      const db=await open();return new Promise((resolve,reject)=>{
        const tx=db.transaction('archives','readwrite'),store=tx.objectStore('archives'),get=store.get('current');let saved;
        get.onsuccess=()=>{try{saved=merge(get.result,row);store.put(saved,'current')}catch(e){tx.abort();reject(e)}};
        tx.oncomplete=()=>resolve(saved);tx.onabort=()=>reject(tx.error||new Error('storage_write_failed'));tx.onerror=()=>reject(tx.error);
      });
    });queue=next;return next;
  }
  function clear(){const next=queue.catch(()=>{}).then(async()=>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('archives','readwrite');tx.objectStore('archives').delete('current');tx.oncomplete=()=>resolve(true);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error)})});queue=next;return next}
  window.SetkaPersonalStorageV1={read,write,clear};
})();
