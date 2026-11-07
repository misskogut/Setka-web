import {LEGACY_MUSIC_ICON_NAMES,legacyMusicSVG} from "./standalone-music-legacy-icons-v1.mjs?v=4-restored-pre-master-20261107";
import {VINTAGE_SOUND_ICON_KEYS,vintageSoundSVG} from "./standalone-music-vintage-icons-v2.mjs?v=5-restored-pre-master-20261107";
// Shared, immutable SETKA Music vector symbol dictionary.
// Vector data is local code, not user-supplied SVG markup.
export const ICONS=Object.freeze({
  hand:'<path d="M7 20c-2.5-1.1-3.8-3.3-3.8-6.2v-2.3a1.1 1.1 0 0 1 2.2 0V8.1a1.1 1.1 0 0 1 2.2 0V5.6a1.1 1.1 0 0 1 2.2 0V4.3a1.1 1.1 0 0 1 2.2 0v6.5a1.1 1.1 0 0 1 2.2 0v2l2.1-1.7a1.2 1.2 0 0 1 1.7 1.7l-3.6 5.4a5.3 5.3 0 0 1-4.7 2.1H7Z"/><path d="M6.8 16.6c1.2-1.4 2.3-1.9 3.7-1.9s2.5.5 3.7 1.9c-1.2 1.3-2.3 1.8-3.7 1.8s-2.5-.5-3.7-1.8Z"/><circle cx="10.5" cy="16.6" r=".85"/>',
  eye:'<path d="M2 12c3.2-4.4 6.5-6.4 10-6.4S18.8 7.6 22 12c-3.2 4.4-6.5 6.4-10 6.4S5.2 16.4 2 12Z"/><circle cx="12" cy="12" r="3.5"/>',
  sleep:'<path d="M2.5 9.2C7.5 15.3 16.5 15.3 21.5 9.2M6.3 12.4l-1.8 3.1m6.2-1.3-.4 3.2m5.1-3.3.5 3.1m4-4.6 1.6 2.9"/>',
  "8d":'<path d="M4 13.2V11a8 8 0 0 1 16 0v2.2M3.1 13h3.7v6H3.1zm14.1 0h3.7v6h-3.7z"/><text x="12" y="15.5" stroke="none" fill="currentColor" font-size="6.1" font-family="Arial,sans-serif" text-anchor="middle">8D</text>',
  orbits:'<circle cx="12" cy="12" r="5.3"/><ellipse cx="12" cy="12" rx="10.5" ry="4.2" transform="rotate(-28 12 12)"/>',
  cat:'<path d="M6 19a6 6 0 0 1-2-5.3L5 8l2.5-2 2.5 2a6.5 6.5 0 0 1 7 6.5V19H6Z"/><path d="M6 18.5c-5 3.5-7-4-3-6M8 11h.1M12 11h.1M10 13l1 1-1 1M15 19v-4"/>',
  bird:'<path d="M3 16c2-2 4-3 6-3 1-4 5-6 8-3l4 1-4 2c0 4-3 6-7 6H8L5 21M10 19l-1 2M15 11h.1M5 13l5 1"/>',
  wave:'<path d="M2 17c2-6 4-8 8-8 1-4 4-5 7-3-2 0-4 3-3 5 4 0 6 2 8 6-4-3-6-2-9 0-4 3-7 3-11 0Z"/>',
  rain:'<path d="M7 16h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 8a4 4 0 0 0 0 8ZM7 19l-1 2m6-2-1 2m6-2-1 2"/>',
  fire:'<path d="M12 2c2 5-2 5 2 9 0-3 2-4 2-4 5 7 3 13-4 13S4 15 6 11c.3 4 2 4 2 4-1-6 0-9 4-13Z"/><path d="M12 13c2 2 3 5 0 6-3-1-2-4 0-6ZM3 22h18"/>',
  forest:'<path d="m6 3-4 7h3l-4 6h10L7 10h3L6 3Zm12-1-4 8h3l-4 7h10l-4-7h3l-4-8ZM6 16v6m12-5v5"/>',
  wind:'<path d="M2 9h12a3 3 0 1 0-3-3M2 13h18a2.5 2.5 0 1 1-2 4M2 17h9a2 2 0 1 1-2 3"/>',
  drop:'<path d="M12 2C8 8 5 12 5 16a7 7 0 0 0 14 0c0-4-3-8-7-14ZM2 21c3-2 5-2 7 0m6 0c3-2 5-2 7 0"/>',
  crystal:'<path d="m12 2 7 7v10l-7 3-7-3V9l7-7ZM5 9h14M12 2v20M5 9l7 5 7-5"/>',
  bowl:'<path d="M3 12h18c0 5-3 8-9 8s-9-3-9-8ZM7 22h10M17 11l4-8M4 7l3 3"/>',
  chime:'<path d="M3 4h18M6 4v10m4-10v14m4-14v8m4-8v17M5 14h2m2 4h2m2-6h2m2 9h2"/>',
  lotus:'<path d="M12 20c-3-4-4-8 0-15 4 7 3 11 0 15Zm0 0c-7-1-9-6-9-10 7 1 9 4 9 10Zm0 0c7-1 9-6 9-10-7 1-9 4-9 10ZM3 21h18"/>',
  thunder:'<path d="M7 15h9a4 4 0 0 0 1-8A5 5 0 0 0 7 8a4 4 0 0 0 0 7ZM13 13l-4 6h4l-2 4 6-8h-4"/>',
  moon:'<path d="M17 3a9 9 0 1 0 4 13A8 8 0 0 1 17 3ZM18 4v4m-2-2h4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M19 5l-3 3M8 16l-3 3"/>',
  galaxy:'<ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)"/><ellipse cx="12" cy="12" rx="6" ry="2" transform="rotate(-25 12 12)"/><circle cx="12" cy="12" r="1"/>',
  heart:'<path d="M20 6a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z"/>',
  mandala:'<circle cx="12" cy="12" r="2"/><path d="M12 2c3 4 3 6 0 10-3-4-3-6 0-10Zm0 20c-3-4-3-6 0-10 3 4 3 6 0 10ZM2 12c4-3 6-3 10 0-4 3-6 3-10 0Zm20 0c-4 3-6 3-10 0 4-3 6-3 10 0Z"/><path d="M5 5c4 0 6 2 7 7-5-1-7-3-7-7Zm14 14c-4 0-6-2-7-7 5 1 7 3 7 7Zm0-14c0 4-2 6-7 7 1-5 3-7 7-7ZM5 19c0-4 2-6 7-7-1 5-3 7-7 7Z"/>',
  candle:'<path d="M7 10h10v12H7V10ZM9 10c-2-4 3-5 3-8 4 4 5 6 3 8M7 16c2-2 3 2 5 0s3 2 5 0"/>',
  wheel:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v7m0 6v7M2 12h7m6 0h7M5 5l5 5m4 4 5 5M19 5l-5 5m-4 4-5 5"/>',
  meditation:'<circle cx="12" cy="5" r="2.5"/><path d="M8 10c1 2 2 3 4 3s3-1 4-3M8 11l-2 6-4 2h20l-4-2-2-6M7 16l5 3 5-3"/>',
  star:'<path d="m12 1 2 9 9 2-9 2-2 9-2-9-9-2 9-2z"/>',
  mountain:'<path d="m2 20 7-12 4 6 3-4 6 10H2ZM3 20h18"/>',
  beads:'<path d="M12 2c-10 3-8 11-3 14l3 2 3-2c5-3 7-11-3-14ZM12 18v4M7 5h.1M16 5h.1M5 9h.1M19 9h.1M7 13h.1M17 13h.1"/>',
  music:'<path d="M9 17.8V5.4L20.5 3v12.5M9 7.3l11.5-2.4"/><ellipse cx="6.1" cy="18.2" rx="3.1" ry="2.1"/><ellipse cx="17.6" cy="16" rx="3.1" ry="2.1"/>'
});
export const ICON_NAMES=Object.freeze([...Object.keys(ICONS),...LEGACY_MUSIC_ICON_NAMES,...VINTAGE_SOUND_ICON_KEYS]);
const LEGACY_ICON_KEYS=new Set(LEGACY_MUSIC_ICON_NAMES);
const VINTAGE_ICON_KEYS=new Set(VINTAGE_SOUND_ICON_KEYS);
export function iconSvg(name,className=""){
  if(LEGACY_ICON_KEYS.has(name))return legacyMusicSVG(name,className);
  if(VINTAGE_ICON_KEYS.has(name))return vintageSoundSVG(name,className);
  const key=Object.prototype.hasOwnProperty.call(ICONS,name)?name:"music";
  const cl=String(className).replace(/[^a-z0-9 _-]/gi,"");
  return '<svg class="'+cl+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none" aria-hidden="true"><g transform="translate(8 8) scale(4.666667)" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">'+ICONS[key]+'</g></svg>';
}
