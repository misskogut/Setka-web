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
 "speed-slow":'<path fill-rule="evenodd" d="M185 148 L185 145 L184 144 L184 142 L182 138 L175 130 L170 130 L172 132 L172 133 L177 138 L180 144 L179 147 L177 149 L165 149 L159 146 L155 142 L154 142 L150 137 L150 136 L147 133 L145 134 L145 137 L147 141 L150 144 L150 145 L153 148 L154 148 L156 150 L160 152 L162 152 L166 154 L179 154 L181 153 Z M86 131 L84 130 L75 140 L74 140 L70 144 L69 144 L65 147 L63 147 L59 149 L47 149 L45 147 L45 144 L46 142 L60 128 L55 129 L51 131 L49 133 L48 133 L43 138 L40 144 L40 148 L44 153 L46 153 L47 154 L58 154 L59 153 L63 153 L64 152 L66 152 L70 149 L76 146 L81 141 L81 140 L84 137 Z M36 125 L38 125 L42 122 L48 119 L53 118 L54 117 L59 117 L60 116 L63 116 L64 117 L71 117 L72 118 L75 118 L76 119 L78 119 L84 122 L86 124 L87 126 L87 128 L92 133 L98 136 L101 136 L102 137 L108 137 L109 138 L120 138 L121 137 L127 137 L128 136 L131 136 L132 135 L134 135 L136 134 L138 132 L138 129 L139 128 L139 126 L140 124 L144 120 L146 119 L148 119 L149 118 L151 118 L152 117 L157 117 L158 116 L164 116 L165 117 L170 117 L171 118 L173 118 L174 119 L176 119 L177 120 L182 121 L187 124 L192 124 L192 117 L194 115 L196 114 L205 114 L206 113 L213 113 L214 112 L216 112 L217 111 L222 110 L227 106 L229 102 L229 99 L227 95 L221 88 L213 84 L205 84 L204 85 L201 85 L195 88 L187 95 L184 92 L183 89 L181 87 L179 83 L168 72 L167 72 L161 67 L153 63 L148 62 L142 59 L139 59 L138 58 L134 58 L133 57 L124 57 L123 56 L108 57 L107 58 L102 58 L101 59 L98 59 L97 60 L95 60 L94 61 L89 62 L86 64 L84 64 L80 66 L72 72 L71 72 L65 78 L64 78 L58 84 L58 85 L54 89 L54 90 L50 95 L44 107 L44 109 L42 112 L42 114 L39 120 L37 122 Z M223 100 L222 102 L217 106 L215 106 L214 107 L211 107 L210 108 L206 108 L205 109 L200 109 L199 110 L195 110 L194 111 L191 108 L191 106 L189 104 L189 101 L195 95 L196 95 L199 92 L203 90 L205 90 L206 89 L211 89 L215 91 L222 98 Z M209 94 L207 95 L206 97 L207 99 L209 100 L211 99 L212 97 L211 95 Z M46 112 L49 106 L51 104 L51 103 L53 101 L55 97 L59 93 L59 92 L74 77 L75 77 L80 73 L92 67 L94 67 L98 65 L101 65 L102 64 L105 64 L106 63 L115 63 L116 62 L121 62 L122 63 L133 63 L137 65 L141 65 L142 66 L147 67 L157 72 L159 74 L163 76 L166 79 L167 79 L178 92 L182 100 L182 102 L185 107 L185 109 L188 115 L188 117 L186 119 L184 119 L178 116 L176 116 L169 112 L166 112 L165 111 L154 111 L153 112 L148 112 L138 117 L135 121 L135 124 L134 126 L129 130 L126 130 L125 131 L121 131 L120 132 L105 132 L104 131 L100 131 L99 130 L97 130 L95 129 L93 127 L93 122 L92 120 L90 118 L84 115 L82 115 L81 114 L79 114 L75 112 L59 112 L58 113 L55 113 L54 114 L52 114 L51 115 L49 115 L47 116 L46 115 Z"/>',
 "speed-fast":'<path fill-rule="evenodd" d="M222 93 L216 81 L214 79 L214 78 L204 68 L203 68 L196 63 L194 63 L193 62 L190 62 L188 61 L186 59 L184 55 L180 51 L180 50 L171 41 L170 41 L167 38 L162 36 L160 34 L158 34 L157 33 L155 33 L151 31 L148 31 L147 30 L136 30 L133 33 L129 33 L128 34 L123 34 L122 35 L120 35 L118 37 L118 39 L119 41 L121 43 L121 44 L129 52 L130 52 L133 55 L134 55 L139 59 L151 65 L153 65 L154 66 L156 66 L157 67 L162 68 L164 70 L161 74 L161 75 L157 79 L149 79 L148 78 L122 78 L121 79 L113 79 L112 80 L109 80 L108 81 L104 81 L103 82 L100 82 L97 84 L95 84 L87 88 L85 88 L81 90 L79 92 L76 93 L70 98 L67 98 L66 97 L63 97 L62 96 L56 96 L55 97 L52 97 L48 100 L47 100 L45 104 L45 107 L48 113 L52 115 L54 117 L54 119 L56 119 L69 105 L73 103 L76 100 L79 99 L81 97 L93 91 L95 91 L98 89 L101 89 L102 88 L104 88 L108 86 L111 86 L112 85 L119 85 L120 84 L124 84 L125 83 L144 83 L145 84 L151 84 L152 85 L161 85 L161 84 L165 79 L166 76 L170 72 L170 69 L169 69 L164 65 L142 54 L133 46 L132 46 L127 41 L127 40 L130 38 L144 38 L145 39 L150 39 L151 40 L156 41 L159 43 L161 43 L163 45 L167 47 L177 56 L177 57 L180 60 L180 61 L184 66 L186 66 L192 69 L194 69 L196 71 L199 72 L202 75 L203 75 L206 78 L206 79 L209 82 L209 83 L213 88 L213 90 L215 93 L215 96 L211 100 L209 101 L197 101 L196 102 L188 102 L184 104 L179 111 L179 113 L178 114 L179 115 L179 117 L181 121 L183 123 L183 124 L185 126 L185 127 L190 134 L189 135 L186 135 L181 132 L179 132 L175 130 L172 130 L171 129 L169 129 L165 127 L162 127 L161 126 L156 126 L155 125 L149 125 L148 124 L116 124 L115 125 L101 125 L100 124 L100 120 L99 118 L96 118 L93 122 L93 123 L89 127 L89 128 L87 129 L82 134 L81 134 L76 138 L72 140 L70 140 L69 141 L67 141 L66 142 L64 142 L60 144 L57 144 L51 147 L49 147 L39 152 L37 154 L33 156 L31 154 L31 153 L38 146 L38 145 L40 143 L40 142 L38 142 L35 145 L34 145 L25 154 L25 155 L17 163 L16 165 L17 167 L20 168 L54 151 L56 151 L60 149 L63 149 L64 148 L66 148 L67 147 L69 147 L70 146 L75 145 L83 141 L86 138 L87 138 L97 128 L100 128 L101 129 L113 129 L117 127 L126 126 L127 127 L134 127 L135 128 L143 128 L144 129 L148 129 L149 130 L154 130 L158 132 L163 132 L167 134 L170 134 L171 135 L173 135 L176 137 L178 137 L184 140 L186 140 L198 147 L200 147 L202 145 L202 141 L200 137 L198 135 L194 127 L183 115 L183 114 L189 107 L200 107 L201 106 L210 106 L211 105 L214 105 L218 103 L218 102 L220 100 L222 96 Z M61 102 L62 103 L62 105 L58 110 L55 111 L52 109 L51 107 L51 105 L53 103 L55 103 L56 102 Z"/>',
 "power":'<path d="M12 2.5v10.4M6.2 5.4a9 9 0 1 0 11.6 0"/>'
});
function safeSlot(slot){return Object.prototype.hasOwnProperty.call(DRAW,slot)?slot:"motion-static"}
export function defaultIconSVG(slot,extraClass=""){
 const key=safeSlot(slot),cl=String(extraClass).replace(/[^a-z0-9 _-]/gi,"");
 const approvedSpeed=key==="speed-slow"||key==="speed-fast";
 const viewBox=key==="speed-slow"?"25 46 212 116":key==="speed-fast"?"9 22 222 153":"0 0 24 24";
 return '<svg class="'+cl+'" viewBox="'+viewBox+'" xmlns="http://www.w3.org/2000/svg" fill="'+(approvedSpeed?"currentColor":"none")+'" stroke="'+(approvedSpeed?"none":"currentColor")+'" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+DRAW[key]+'</svg>';
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
 // These two silhouettes are explicitly approved by the founder and must not be overridden by stale admin icon uploads.
 if(slot==="speed-slow"||slot==="speed-fast")return defaultIconSVG(slot,extraClass);
 return image||(slot==="orbit-tab"?selectedMusicCategorySVG("orbits"):null)||defaultIconSVG(slot,extraClass);
}
