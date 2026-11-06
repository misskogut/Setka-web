import {selectedMusicCategorySVG} from "./standalone-music-approved-icons-v1.mjs?v=sleep-align-20261106";
// SETKA Music · mono vector controls v2. A single 24x24 stroke grammar.
// The glow belongs to UI state, never to the image: uploaded transparent art
// is used as an alpha mask and inherits currentColor (white/gray).
export const UI_ICON_SLOTS=Object.freeze([
  {id:"nav-note",label:"Нота · вход в музыку"},
  {id:"orbit-tab",label:"Пятая категория · орбиты"},
  {id:"listener",label:"Центр · слушатель"},
  {id:"motion-static",label:"Движение · статично"},
  {id:"motion-cw",label:"Движение · по часовой"},
  {id:"motion-ccw",label:"Движение · против часовой"},
  {id:"motion-counter",label:"Движение · встречное"},
  {id:"motion-eight",label:"Движение · восьмёрка"},
  {id:"motion-chaos",label:"Движение · перемешивание"},
  {id:"motion-spiral",label:"Движение · спираль"},
  {id:"motion-breath",label:"Движение · дыхание"},
  {id:"speed-slow",label:"Скорость · черепаха"},
  {id:"speed-fast",label:"Скорость · заяц"},
  {id:"power",label:"Остановить все звуки"}
]);
export const UI_ICON_IDS=Object.freeze(UI_ICON_SLOTS.map(x=>x.id));
const DRAW=Object.freeze({
 "nav-note":'<path d="M9 17.8V5.4L20.5 3v12.5M9 7.3l11.5-2.4"/><ellipse cx="6.1" cy="18.2" rx="3.1" ry="2.1"/><ellipse cx="17.6" cy="16" rx="3.1" ry="2.1"/>',
 "orbit-tab":'<circle cx="12" cy="12" r="5.1"/><ellipse cx="12" cy="12" rx="10.3" ry="4.1" transform="rotate(-28 12 12)"/><circle cx="20.3" cy="5.1" r=".75" fill="currentColor" stroke="none"/>',
 "listener":'<circle cx="12" cy="10" r="4"/><path d="M5 21c.8-3.9 3.3-5.8 7-5.8s6.2 1.9 7 5.8M5.2 10v-2a6.8 6.8 0 0 1 13.6 0v2M3.7 10h2.6v4.5H3.7zm14 0h2.6v4.5h-2.6z"/>',
 "motion-static":'<circle cx="12" cy="12" r="2.65" fill="currentColor" stroke="none"/>',
 "motion-cw":'<path d="M20.1 8.2A8.6 8.6 0 1 0 20 16M20 3.6v4.7h-4.7"/>',
 "motion-ccw":'<path d="M3.9 8.2A8.6 8.6 0 1 1 4 16M4 3.6v4.7h4.7"/>',
 "motion-counter":'<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
 "motion-eight":'<path d="M12 12c-2.8-4.5-5-5.5-7.1-4.2-4.4 2.7-.7 10.5 3.3 8.3 2-1.1 3-2.7 3.8-4.1 2.8-4.5 5-5.5 7.1-4.2 4.4 2.7.7 10.5-3.3 8.3-2-1.1-3-2.7-3.8-4.1Z"/>',
 "motion-chaos":'<path d="m3 19 17-15m-5 .1h5V9m-17-4 17 15m-5 0h5v-5"/>',
 "motion-spiral":'<path d="M12 12c0-2 3.1-2 3.1.1.1 4.7-8.1 5.5-8.5-.8-.6-9.2 14.1-10.7 14.6-.4.6 14.7-19.8 15.9-20.2 1.2"/>',
 "motion-breath":'<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="6.3"/><circle cx="12" cy="12" r="10"/>',
 "speed-slow":'<path d="M2.1 16.7c1-4.5 4.4-7.4 8.7-7.4 4.2 0 7.3 2.9 8.3 7.4"/><path d="M2.1 16.7c1.6-1.2 3.2-1.7 4.9-.7 1.6 1 3.2 2 5.3 1.6 1.7-.3 2.5-2.3 4.7-2.2 1 0 1.8.2 2.9.7"/><path d="M18.7 14.2c1.1-1.1 2.1-1.7 3-1.5 1.1.2 1.5 1 1.4 1.9-.1 1-1.3 1.7-3.4 2"/><path d="M5.7 16.3c-2.1.1-3.8 2.2-3.8 3.7 1.8.5 4.4-1.4 5.5-3.2M16.3 16.7c1 1.5 2.5 3.2 4.1 3.1.5-1.3-.5-3.2-1.5-3.6"/><circle cx="21.3" cy="14.1" r=".4" fill="currentColor" stroke="none"/>',
 "speed-fast":'<path d="M16.8 9.9c-1.1-1.7-3.9-3.4-4.7-5.8 2.6-.2 6.6 1.7 8.2 4.8"/><path d="M19.9 9.3c1.8.3 3.1 1.8 3.3 3.5.2 1.3-1 2.3-3.1 2.5l1.5 3.6c-2.6-1-4.3-2.8-7.3-2.4-3 .3-5.4 2-9.4 4l4.1-5.2c1.5-1.9 2.9-3.6 4.4-4.7 1.8-1.2 3.7-1.7 6-1.3Z"/><path d="M9.1 15.6c-1.6 1.1-3.5 2.4-6.5 3.2M18.1 10.6c-1.2.6-1.9 1.8-2.2 2.6"/><circle cx="21.5" cy="12.5" r=".4" fill="currentColor" stroke="none"/>',
 "power":'<path d="M12 2.5v10.4M6.2 5.4a9 9 0 1 0 11.6 0"/>'
});
function safeSlot(slot){return Object.prototype.hasOwnProperty.call(DRAW,slot)?slot:"motion-static"}
export function defaultIconSVG(slot,extraClass=""){
 const key=safeSlot(slot),cl=String(extraClass).replace(/[^a-z0-9 _-]/gi,"");
 return '<svg class="'+cl+'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+DRAW[key]+'</svg>';
}
const ASSET_BASE="https://gfchgaphzhxufwdhrcis.supabase.co/storage/v1/object/public/setka-music/";
export function assetIconMask(path,additionalClass=""){
 if(typeof path!=="string"||!/^icons\/[0-9a-f-]{36}\.(?:png|webp|svg)$/.test(path))return null;
 const className=String(additionalClass).replace(/[^a-z0-9 _-]/gi,"");
 // Fixed origin and strict filename prevent CSS injection. Masks pick alpha only.
 return '<span class="sm-asset-icon '+className+'" aria-hidden="true" style="--sm-icon-image:url('+ASSET_BASE+path+')"></span>';
}
export function uiIconHTML(slot,overrides={},extraClass=""){
 const override=overrides?.[slot];
 // For system icons use raster-only uploads, no arbitrary public SVG.
 const image=(typeof override==="string"&&/\.((?:png|webp))$/.test(override))?assetIconMask(override,extraClass):null;
 return image||(slot==="orbit-tab"?selectedMusicCategorySVG("orbits"):null)||defaultIconSVG(slot,extraClass);
}
