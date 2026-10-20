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
  const scope=window.SetkaDataScopeV1,archiveKey=scope?'owner:'+scope.id:'current';
  async function read(){const db=await open();return new Promise((resolve,reject)=>{
    const tx=db.transaction('archives','readwrite'),store=tx.objectStore('archives'),r=store.get(archiveKey);let result=null;
    r.onsuccess=()=>{result=r.result||null;if(result||!scope?.takeLegacy)return;
      const imported=store.get('legacy-imported');imported.onsuccess=()=>{if(imported.result)return;
        const old=store.get('current');old.onsuccess=()=>{result=old.result||null;if(result)store.put(result,archiveKey);store.put(scope.id,'legacy-imported')};
      };
    };
    tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  })}
  function write(row,merge){
    const next=queue.catch(()=>{}).then(async()=>{
      const db=await open();return new Promise((resolve,reject)=>{
        const tx=db.transaction('archives','readwrite'),store=tx.objectStore('archives'),get=store.get(archiveKey);let saved;
        get.onsuccess=()=>{try{saved=merge(get.result,row);store.put(saved,archiveKey)}catch(e){tx.abort();reject(e)}};
        tx.oncomplete=()=>resolve(saved);tx.onabort=()=>reject(tx.error||new Error('storage_write_failed'));tx.onerror=()=>reject(tx.error);
      });
    });queue=next;return next;
  }
  function clear(){const next=queue.catch(()=>{}).then(async()=>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('archives','readwrite');tx.objectStore('archives').delete(archiveKey);tx.oncomplete=()=>resolve(true);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error)})});queue=next;return next}
  window.SetkaPersonalStorageV1={read,write,clear};
})();
