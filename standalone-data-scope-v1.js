(() => {
  'use strict';
  // Identity-bound storage, shared by the app, durable archive and cloud adapter.
  // A page keeps one immutable scope until navigation; a token change cannot
  // redirect an already-running save into another person's archive.
  const SESSION='setka-v40:cabinet-session',STATE='setka-v40:cabinet-status',
    MIGRATION='setka-data-scope:legacy-owner:v1';
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
  const session=read(SESSION)||readSession(),cached=read(STATE);
  function readSession(){try{return JSON.parse(sessionStorage.getItem(SESSION)||'null')}catch(_){return null}}
  const account=session?.testerId||(session?.token&&cached?.authenticated?cached.testerId:null);
  const id=account?'tester:'+String(account):'guest';
  const key=base=>base+'::scope:'+encodeURIComponent(id);
  const personalKeys=['setka-standalone:v34','setka-standalone:active:v34','setka-standalone:v33','setka-standalone:active:v33',
    'setka-web:favorites:v1','setka-standalone:favorite-snapshots:v34','setka-web:favorites:fish-wave:v35','setka-web:favorites:breathing-fractal:v1',
    'setka-web:favorites:breathing-fractal-growth:v1','setka-patterns:last-config:v1'];
  let legacyOwner=read(MIGRATION);
  if(!legacyOwner){
    // Copy, never move: rollback can still read every pre-upgrade record.
    // Unowned legacy history is retained as guest data, never uploaded on login.
    const owner=id;
    try{
      for(const base of personalKeys){const value=localStorage.getItem(base);if(value!=null&&localStorage.getItem(key(base))==null)localStorage.setItem(key(base),value)}
      localStorage.setItem(MIGRATION,JSON.stringify(owner));legacyOwner=owner;
    }catch(_){legacyOwner=owner;/* Original keys remain readable, including quota fallback. */}
  }
  const storage={
    getItem(base){const value=localStorage.getItem(key(base));return value==null&&(!legacyOwner||legacyOwner===id)?localStorage.getItem(base):value},
    setItem(base,value){localStorage.setItem(key(base),value)},
    removeItem(base){localStorage.removeItem(key(base))}
  };
  function activate(testerId){
    const target=testerId?'tester:'+String(testerId):'guest';
    if(target===id)return false;
    // Refuse a switch if even its ownership checkpoint cannot be persisted.
    if(!read(MIGRATION))localStorage.setItem(MIGRATION,JSON.stringify(id));
    window.dispatchEvent(new CustomEvent('setka:account-switch-start',{detail:{from:id,to:target}}));
    return true; // Caller commits credentials and reloads; this page retains id.
  }
  window.SetkaDataScopeV1={id,key,storage,activate,legacyOwner:()=>legacyOwner,takeLegacy:legacyOwner===id};
})();
