(()=>{
'use strict';
const BUILD='018-transcript-search2';
const frame=document.getElementById('appFrame');
if(!frame)return;
const proto=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'src');
if(!proto?.set||!proto?.get)return;
Object.defineProperty(frame,'src',{
  configurable:true,
  enumerable:true,
  get(){return proto.get.call(frame)},
  set(value){
    try{
      const u=new URL(String(value||''),location.href);
      u.searchParams.set('_foundation_build',BUILD);
      proto.set.call(frame,u.toString());
    }catch{
      proto.set.call(frame,value);
    }
  }
});
window.FoundationBuildV018={build:BUILD};
})();
