(()=>{
'use strict';
const BUILD='018-yandex-unfreeze1';
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
if(!document.querySelector('script[data-foundation-pin-address="1"]')){
  const s=document.createElement('script');
  s.src='foundation-control-pin-address-v018.js?build='+encodeURIComponent(BUILD);
  s.dataset.foundationPinAddress='1';
  document.head.appendChild(s);
}
window.FoundationBuildV018={build:BUILD};
})();