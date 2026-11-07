// Clean author-drawn SETKA masters: first historical set (20 icons).
// Each glyph is a distinct intentional SVG drawing; none is based on sampled raster points.
import {P,F,C,E,L,ROT,N,polygon} from "./standalone-music-master-utils-v1.mjs";
const O={};

// Profile of sitting cat: head, pointed ears, chest, paws, curled tail.
O["old-cat"]=P("M26 78C16 73 13 61 18 52C20 46 25 43 29 42C34 35 43 33 52 34L60 23L65 13L72 21L78 23L85 31L82 38L72 41L70 52C69 61 71 70 75 78H65C61 73 61 65 59 61C57 74 52 78 45 78H26Z")
 +P("M28 43C23 51 22 60 25 68C28 77 39 79 46 78")
 +P("M22 68C10 68 8 53 12 45C14 41 16 41 18 45")
 +P("M59 61C53 56 46 58 44 64C42 72 45 76 50 78")
 +P("M70 77L80 79L76 71M67 32L69 32M77 33L84 31");

// Eight-sided mandala and precise radial petals.
O["old-mandala"]=polygon(Array.from({length:16},(_,i)=>{const a=(i*22.5-90)*Math.PI/180,r=i%2?35:43;return [+(50+Math.cos(a)*r).toFixed(2),+(50+Math.sin(a)*r).toFixed(2)]}))
 +polygon(Array.from({length:16},(_,i)=>{const a=(i*22.5-90)*Math.PI/180,r=i%2?22:28;return [+(50+Math.cos(a)*r).toFixed(2),+(50+Math.sin(a)*r).toFixed(2)]}))
 +N(8,i=>ROT(i*45,P("M50 24C57 29 58 36 50 42C42 36 43 29 50 24Z")))
 +C(50,50,8)+C(50,50,2.2,true);

// Protective hand with upright fingers and almond eye.
O["old-hamsa"]=P("M30 78C22 72 19 65 19 55V43C19 38 25 36 28 41L30 48V22C30 16 38 16 38 22V38V13C38 6 47 6 47 13V37V10C47 4 56 4 56 10V37V17C56 11 65 11 65 17V43L68 39C73 34 81 39 79 46L74 63C71 75 62 81 50 84C42 84 34 82 30 78Z")
 +P("M30 62C42 49 57 49 70 62C59 74 41 74 30 62Z")+C(50,62,5.7,true)
 +P("M31 45L31 57M38 27L38 43M47 28L47 42M56 28L56 42");

// Eight small floral wheel medallions.
O["old-wheel-flowers"]=C(50,50,43)+C(50,50,36)+C(50,50,10)
 +N(8,i=>ROT(i*45,P("M50 18C44 14 38 20 40 27C41 33 46 35 50 36C54 35 59 33 60 27C62 20 56 14 50 18Z")+C(50,25,3)));

// Bonfire, flames inside flames, two crossed wood logs.
O["old-bonfire"]=P("M35 70C24 59 30 47 41 35C44 43 48 44 50 46C52 29 60 21 60 13C70 26 72 38 67 49C76 43 77 38 78 34C88 52 84 64 71 72")
 +P("M49 71C39 65 42 56 50 47C52 54 56 54 59 58C62 55 63 52 63 48C71 62 67 70 61 73")
 +P("M26 79L69 91C73 92 80 88 78 84L32 73C26 72 22 75 26 79ZM75 74L30 90C26 92 20 89 22 84L68 70")
 +P("M24 80L19 84M79 80L84 84");

// Crystal singing bowl on a low pedestal.
O["old-singing-bowl"]=P("M14 65C10 52 12 37 23 26C37 11 61 12 76 26C87 38 88 55 82 67")
 +P("M28 62L72 62C69 70 66 76 60 79H40C34 76 31 70 28 62Z")
 +P("M21 83L79 83L86 90H14L21 83Z")
 +P("M34 62C38 54 44 51 50 51H64C66 54 69 58 70 62")
 +P("M24 62C29 57 32 56 36 55");

// Circle seascape with stylized bird and waves.
O["old-seascape"]=C(50,50,43)
 +P("M14 43C27 37 35 43 44 47C51 50 55 43 60 42C69 39 77 44 86 46")
 +P("M16 57C28 50 34 62 47 57C60 52 64 61 82 55")
 +P("M20 71C31 66 37 75 50 70C62 65 70 73 80 69")
 +P("M37 35L49 39L61 30L61 44L73 47L62 51L51 47L45 43L39 46Z")
 +C(29,28,1.8,true)+C(36,21,1.1,true);

// Prayer beads and tassel.
O["old-mala"]=N(19,i=>{const a=-2.2+i*(Math.PI*2/19);return C(50+Math.cos(a)*22,42+Math.sin(a)*29,2.6,true)})
 +P("M49 71L49 83")+C(49,84,3,true)
 +F("M44 86C40 88 38 92 39 96L59 96C55 91 53 87 53 84Z");

// Two stylized trees with shared ground.
O["old-forest"]=P("M22 70C9 62 11 48 19 41C13 29 20 19 32 19C42 19 48 27 47 36C58 43 54 56 48 64C43 71 32 73 22 70Z")
 +P("M57 69C47 65 46 54 51 47C48 33 57 24 68 25C78 25 85 34 83 44C92 55 84 67 75 69Z")
 +P("M32 42V87M32 61L23 52M32 53L39 46M67 43V87M32 87H19M32 87H46M67 87H54M67 87H83");

// Triad of teardrop-shaped leaves.
O["old-triple-drop"]=ROT(0,P("M50 11C55 22 63 30 63 38C63 45 57 50 50 50C43 50 37 45 37 38C37 30 45 22 50 11Z")+C(50,36,2,true))
 +ROT(120,P("M50 11C55 22 63 30 63 38C63 45 57 50 50 50C43 50 37 45 37 38C37 30 45 22 50 11Z")+C(50,36,2,true))
 +ROT(240,P("M50 11C55 22 63 30 63 38C63 45 57 50 50 50C43 50 37 45 37 38C37 30 45 22 50 11Z")+C(50,36,2,true));

// Planetary rings and four satellite points.
O["old-planet-orbit"]=C(50,50,40)+C(50,50,33)+C(50,50,23)+C(50,50,9)
 +N(4,i=>ROT(i*90,C(50,17,4.1)+C(50,83,2.2,true)))
 +P("M19 34C26 28 32 25 38 23M62 77C70 73 75 68 79 62");

// Tibetan bowl, striker and three musical notes.
O["old-sound-bowl"]=P("M36 64H86V72C86 83 75 89 61 89C47 89 36 83 36 72Z")
 +P("M32 65L16 54L32 27L43 33L32 65Z")
 +P("M19 49L35 32M41 59C47 57 52 59 56 57")
 +P("M56 48V35L65 32V43M65 32L65 25")+E(54,48,3.5,2.5)+E(63,44,3,2)
 +P("M71 43V31L81 28V38")+E(69,43,3,2)+E(79,39,3,2);

// Storm cloud and rain, electrical bolt.
O["old-storm"]=P("M26 67C14 67 9 58 13 48C16 40 22 38 29 39C31 25 43 20 55 25C62 18 76 24 78 35C91 37 95 50 89 59C86 65 81 67 75 67H26Z")
 +P("M55 40L43 57H55L46 74L72 50H58L66 40")
 +N(5,i=>L(23+i*13,77,23+i*13,84+(i%2)*4));

// Eight-point sparkle with long directional rays.
O["old-spark"]=polygon([[50,7],[56,40],[84,23],[64,48],[93,51],[64,55],[79,76],[55,61],[50,93],[45,61],[22,77],[37,55],[7,50],[38,45],[24,23],[45,39]])
 +C(50,51,3.6,true)
 +N(4,i=>ROT(i*90,C(87,13,1.2,true)));

// Meditating figure with rays above low platform.
O["old-meditation-sun"]=C(50,26,8)+P("M42 42C36 43 35 48 34 54H22V64H43V49H57V64H78V54H66C65 48 64 43 58 42")
 +P("M34 62H66M22 71H78C84 71 85 80 78 80H22C15 80 16 71 22 71Z")
 +N(5,i=>ROT((i-2)*36,L(50,7,50,2),50,26));

// Ornate eight-spoke dharma wheel, clean radial curves.
O["old-dharma-wheel"]=C(50,50,44)+C(50,50,36)+C(50,50,11)+C(50,50,4,true)
 +N(8,i=>ROT(i*45,P("M44 13L44 27C44 33 47 35 50 39C53 35 56 33 56 27V13")
 +P("M43 37L32 28M57 37L68 28")));

// Heart with round lobes and gently pointed tip.
O["old-heart"]=P("M50 87C45 81 20 59 16 49C11 37 16 23 28 21C38 19 45 24 50 31C55 24 62 19 72 21C84 23 89 37 84 49C80 59 55 81 50 87Z");

// Eternal Tibetan knot drawn with true geometry instead of jagged sampled edges.
O["old-endless-knot"]=P("M50 10L61 21L50 32L39 21Z")
 +P("M50 90L39 79L50 68L61 79Z")
 +P("M10 50L21 39L32 50L21 61Z")
 +P("M90 50L79 39L68 50L79 61Z")
 +P("M39 21L21 39L31 49L50 30L69 49L79 39L61 21")
 +P("M21 61L39 79L50 68L61 79L79 61L69 51L50 70L31 51Z")
 +P("M39 21L61 43L79 61M61 21L39 43L21 61M39 79L61 57L79 39M61 79L39 57L21 39")
 +C(50,50,3.1);

// Candle with irregular wax and thin teardrop flame.
O["old-candle"]=P("M35 46H65V88H35Z")
 +P("M35 56C41 48 46 56 50 50C55 45 60 55 65 49")
 +P("M50 42C42 37 43 28 50 20C52 28 59 34 55 40C54 42 52 43 50 42Z")
 +P("M50 34C47 38 50 39 52 38");

// Lotus flower with overlapping 5 symmetrical leaves.
O["old-lotus"]=P("M50 77C38 66 37 50 50 30C63 50 62 66 50 77Z")
 +P("M48 75C34 70 25 62 27 43C43 49 50 58 50 75")
 +P("M52 75C66 70 75 62 73 43C57 49 50 58 50 75")
 +P("M44 78C30 80 18 74 14 62C27 59 37 64 44 78Z")
 +P("M56 78C70 80 82 74 86 62C73 59 63 64 56 78Z")
 +P("M14 78C35 88 65 88 86 78");

export const OLD_MASTER=Object.freeze(O);
