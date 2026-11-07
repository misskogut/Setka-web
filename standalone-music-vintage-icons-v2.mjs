// Stable second collection icon keys; every glyph is individually redrawn.
import {VINTAGE_MASTER} from "./standalone-music-master-vintage-v1.mjs?v=1";
import {masterMusicSVG} from "./standalone-music-master-icons-v1.mjs?v=1";
export const VINTAGE_SOUND_ICON_KEYS=Object.freeze(Object.keys(VINTAGE_MASTER));
export function vintageSoundSVG(name,className=""){
 return Object.prototype.hasOwnProperty.call(VINTAGE_MASTER,name)?masterMusicSVG(name,className):null;
}
