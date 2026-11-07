// Canonical renderer for 46 individually redrawn SETKA musical icons.
// Every component is a deliberately authored vector primitive, not a screenshot trace.
import {OLD_MASTER} from "./standalone-music-master-old-v1.mjs?v=1";
import {VINTAGE_MASTER} from "./standalone-music-master-vintage-v1.mjs?v=1";
export const MASTER_DRAWINGS=Object.freeze({...OLD_MASTER,...VINTAGE_MASTER});
export const MASTER_ICON_KEYS=Object.freeze(Object.keys(MASTER_DRAWINGS));
export function masterMusicSVG(iconKey,className=""){
 const contents=Object.prototype.hasOwnProperty.call(MASTER_DRAWINGS,iconKey)?MASTER_DRAWINGS[iconKey]:null;
 if(!contents)return null;
 const cl=String(className).replace(/[^a-z0-9 _-]/gi,"");
 return '<svg class="'+cl+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" shape-rendering="geometricPrecision" aria-hidden="true" fill="none"><g stroke="currentColor" stroke-width="3.75" stroke-linecap="round" stroke-linejoin="round">'+contents+'</g></svg>';
}
