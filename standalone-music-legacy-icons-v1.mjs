// Stable legacy icon keys, now rendered from newly authored vector masters.
// Historical raster traces were removed from the rendering pipeline.
import {OLD_MASTER} from "./standalone-music-master-old-v1.mjs?v=1";
import {masterMusicSVG} from "./standalone-music-master-icons-v1.mjs?v=1";
export const LEGACY_MUSIC_ICON_NAMES=Object.freeze(Object.keys(OLD_MASTER));
export function legacyMusicSVG(name,className=""){
 return Object.prototype.hasOwnProperty.call(OLD_MASTER,name)?masterMusicSVG(name,className):null;
}
