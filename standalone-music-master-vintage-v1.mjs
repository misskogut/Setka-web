// Clean author-drawn SETKA masters: unique second historical set (26 icons).
// These are deliberate Bézier/shape constructions, not encoded screenshot traces.
import {P,F,C,E,L,ROT,N,polygon} from "./standalone-music-master-utils-v1.mjs";
const V={};

// Solid tapering moon with sharp horns, curved outer/inner edges.
V["vintage-crescent"]=F("M67 9C40 8 24 30 24 53C24 74 42 89 67 91C46 81 39 68 39 51C39 32 50 18 67 9Z");

// Two palms and forearms pressed together.
V["vintage-prayer-hands"]=P("M50 13C47 20 45 33 45 42C45 51 38 60 30 67C25 73 19 78 13 82")
 +P("M50 13C53 20 55 33 55 42C55 51 62 60 70 67C75 73 81 78 87 82")
 +P("M50 13V61M50 61C45 65 42 70 37 74M50 61C55 65 58 70 63 74")
 +P("M45 33C43 29 42 27 41 23M55 33C57 29 58 27 59 23");

// A spiral shell with three clean rounded grooves and pointed spire.
V["vintage-conch"]=P("M24 90C27 76 31 67 26 55C20 43 22 34 29 27C34 18 42 16 49 17C53 12 61 9 67 15C73 20 73 27 72 34C76 40 76 48 72 54C63 57 58 52 52 49C46 47 44 52 41 60C37 73 32 83 24 90Z")
 +P("M32 25C43 38 54 39 73 42M40 18C49 27 60 29 70 30M30 36C42 50 54 51 73 54")
 +P("M30 78C33 68 36 62 41 60");

// Breeze expressed by three smooth winding horizontal gusts.
V["vintage-wind"]=P("M9 46H68C79 46 82 36 77 31C72 26 62 31 64 37")
 +P("M16 57H80C91 57 92 42 83 39C77 37 71 40 71 45")
 +P("M26 68H59C73 68 74 82 65 84C57 85 55 78 58 75")
 +L(9,52,46,52);

// Circular mountains and a winding river.
V["vintage-round-landscape"]=C(50,50,43)
 +P("M11 55L27 47L38 50L57 40L73 47L89 51")
 +P("M18 70C32 61 37 72 48 65C60 59 70 65 82 57")
 +P("M46 91C47 77 54 74 62 68C66 65 73 63 80 63")
 +P("M12 43L34 36L45 43L62 34L80 42");

// A single curled ocean breaker ending in white foam.
V["vintage-sea-wave"]=P("M13 87C13 59 24 26 49 16C67 7 84 18 87 36C89 49 77 62 67 54C63 51 65 43 65 36C58 37 52 47 51 55C50 68 63 73 86 73V87H13Z")
 +P("M37 81C27 65 31 44 44 33C53 24 64 27 66 32")
 +P("M48 81C42 68 45 54 54 47");

// Three solid droplets with elliptical tops and pointed ends.
V["vintage-raindrops"]=F("M29 15C29 19 21 31 21 37C21 43 25 47 30 47C35 47 39 43 39 37C39 31 31 19 29 15Z")
 +F("M68 25C67 30 59 42 59 49C59 55 63 59 68 59C74 59 78 55 78 49C78 42 70 29 68 25Z")
 +F("M42 53C41 60 32 72 32 79C32 86 37 90 43 90C49 90 54 86 54 79C54 72 44 59 42 53Z");

// Pair of trees and deep winding path.
V["vintage-forest-path"]=P("M21 66C10 59 11 46 18 40C13 30 20 21 28 21C39 21 43 32 39 41C50 50 46 64 35 68C30 71 25 69 21 66Z")
 +P("M64 53C54 48 55 37 60 33C57 23 64 13 74 14C83 15 88 25 85 34C94 43 88 54 78 56")
 +P("M28 43V83M28 62L20 54M28 55L36 49M73 32V76M73 52L65 46")
 +P("M48 91C33 84 37 75 49 70C58 66 65 63 62 57C59 52 51 52 47 47")
 +P("M17 84H33");

// Multi-spoked wheel rolling over two horizontal speed lines.
V["vintage-rolling-wheel"]=C(66,52,31)+C(66,52,25)+C(66,52,5)
 +N(12,i=>ROT(i*30,L(66,27,66,46),66,52))
 +P("M8 83H70M21 89H62M14 73H41");

// Crescent with soft star sparkles.
V["vintage-moon-stars"]=P("M65 13C81 32 82 52 70 69C57 87 34 90 16 79C38 83 61 63 61 39C61 29 62 21 65 13Z")
 +P("M30 22L34 29L42 33L34 37L30 44L26 37L18 33L26 29Z")
 +P("M44 39L47 44L53 47L47 50L44 56L41 50L35 47L41 44Z")
 +P("M16 55L19 60L24 62L19 65L16 70L13 65L8 62L13 60Z");

// Rising sun under an arched window with radiating divisions.
V["vintage-sun-arch"]=P("M17 88V53C17 33 32 16 50 16C69 16 83 33 83 53V88H17Z")
 +P("M26 88V55C26 42 36 32 49 32C60 32 70 42 70 55V88")
 +C(49,47,10)
 +N(7,i=>ROT(-90+i*25,L(49,16,49,30),49,47))
 +P("M60 55L80 78M74 42L81 40");

// Eye with lashes and tears, Egyptian-style arched brow.
V["vintage-teary-eye"]=P("M13 41C27 23 44 19 50 19C69 19 82 29 89 41")
 +P("M12 57C27 40 39 37 50 37C64 37 78 44 89 57C78 70 64 76 50 76C36 76 22 70 12 57Z")
 +C(50,57,10)
 +N(7,i=>{const x=18+i*10.5;return L(+x.toFixed(1),43,+((x-3)*1).toFixed(1),36-((i+1)%2)*3)})
 +N(5,i=>{const x=26+i*12;return P("M"+x+" 80C"+(x-4)+" 85 "+(x-2)+" 88 "+x+" 91")});

// Birds over four parallel water waves.
V["vintage-birds-and-sea"]=P("M23 26C28 22 31 24 35 28C38 24 42 22 47 25M57 34C62 30 65 32 69 36C72 32 76 31 82 34")
 +N(4,i=>P("M12 "+(54+i*10)+"C21 "+(48+i*10)+" 29 "+(60+i*10)+" 38 "+(54+i*10)+"S55 "+(60+i*10)+" 64 "+(54+i*10)+"S81 "+(60+i*10)+" 90 "+(54+i*10)));

// Stylized whale with tail to right and ocean arc above.
V["vintage-whale"]=P("M20 62C13 48 22 34 36 29C49 25 60 28 66 38C71 46 77 44 86 39C87 51 80 56 73 55C68 71 55 78 40 78C30 78 23 73 20 62Z")
 +P("M22 44C35 24 51 21 63 30C72 36 75 45 76 47")
 +P("M21 52C31 47 38 46 46 52C53 58 60 60 69 56")
 +P("M26 72C22 82 18 83 16 74")+C(58,44,1.8,true);

// Side-profile head with centered atom-orbit neuron.
V["vintage-atom-head"]=P("M71 91C70 79 68 71 69 60C74 46 75 32 65 22C54 11 36 13 26 20C16 28 15 41 17 50L11 63L20 65L21 75H31V91")
 +E(47,46,17,7)+ROT(60,E(47,46,17,7),47,46)+ROT(120,E(47,46,17,7),47,46)
 +C(47,46,4,true);

// Four orbit ellipses, vertical drops above and below.
V["vintage-orbit-drops"]=E(50,52,37,11)+E(50,52,24,6)+C(50,52,4.2,true)
 +P("M50 13C50 20 43 25 43 29C43 34 46 37 50 37C54 37 57 34 57 29C57 25 50 20 50 13Z")
 +P("M50 89C50 82 43 77 43 73C43 68 46 65 50 65C54 65 57 68 57 73C57 77 50 82 50 89Z")
 +C(50,41,2.1,true)+C(50,61,2.1,true);

// Four radial petals, each with an inner vein.
V["vintage-four-petals"]=N(4,i=>ROT(i*90,P("M50 50C41 42 40 31 50 14C60 31 59 42 50 50Z")+P("M50 50V27")))
 +C(50,50,4.2);

// Simple open sun, eight neatly separated rays.
V["vintage-sun-rays"]=C(50,50,18)
 +N(8,i=>ROT(i*45,L(50,8,50,21)));

// Manta ray flying with decorative central tail.
V["vintage-stingray"]=P("M50 23C38 35 32 36 18 39C13 44 9 51 8 57C21 51 32 49 39 58C43 62 44 70 46 76")
 +P("M50 23C62 35 68 36 82 39C87 44 91 51 92 57C79 51 68 49 61 58C57 62 56 70 54 76")
 +P("M50 23C43 31 44 37 50 45C56 37 57 31 50 23Z")
 +P("M50 45C44 51 44 56 50 61C56 56 56 51 50 45Z")
 +P("M50 61C49 76 52 87 44 92C41 94 37 92 35 89");

// Solid monochrome orb.
V["vintage-solid-circle"]=C(50,50,36,true);

// Teardrop holding a pine tree on a small landscape.
V["vintage-tree-droplet"]=P("M50 10C38 29 24 45 22 61C21 77 33 89 50 90C67 89 79 77 78 61C76 45 62 29 50 10Z")
 +P("M50 34L37 54H43L35 66H65L57 54H63Z")
 +P("M50 60V73M26 75C42 69 56 80 74 73");

// Six-bladed elegant radial pinwheel.
V["vintage-pinwheel"]=N(6,i=>ROT(i*60,P("M50 51C47 35 49 20 58 10C60 27 65 37 50 51Z")))
 +C(50,51,4.3);

// Lighthouse with beams and rolling sea.
V["vintage-lighthouse"]=P("M39 84L43 46H57L61 84M36 46H64L60 37H40Z")
 +P("M43 36V25L50 17L57 25V36M44 30H56")
 +N(5,i=>ROT((i-2)*32,L(50,12,50,5),50,32))
 +P("M13 68C25 61 32 68 43 62M57 62C68 68 75 61 87 68")
 +P("M10 80C26 72 35 81 45 75M55 75C66 81 76 72 90 80")
 +L(37,88,63,88);

// Two nested flowing curls within circular composition.
V["vintage-yin-waves"]=C(50,50,42)
 +P("M18 35C29 20 44 16 57 20C70 24 80 30 83 38C72 33 64 33 55 41C45 50 31 48 20 43")
 +P("M17 53C26 43 37 45 50 52C63 59 70 60 82 55")
 +P("M18 65C31 56 42 64 52 68C63 72 70 67 80 62")
 +P("M24 75C37 69 48 78 60 78C69 78 75 73 80 68");

// Infinity symbol, equal harmonious loops.
V["vintage-infinity"]=P("M50 50C37 33 28 27 17 34C6 41 7 60 19 66C31 73 41 61 50 50C59 39 69 27 81 34C93 40 94 59 82 66C70 73 61 61 50 50Z");

// Three overlapping meditators with open shoulders and legs.
V["vintage-meditation-group"]=C(27,32,7)+C(72,31,7)+C(50,49,8)
 +P("M16 48C9 53 10 62 7 69L27 69L41 60L32 54M37 59L26 64L14 60")
 +P("M82 47C91 52 89 63 93 69H74L59 60L69 54M64 59L75 64L86 60")
 +P("M39 63C31 68 29 76 24 85H76C71 76 69 68 61 63")
 +P("M34 83L49 73L66 83M23 85L50 88L77 85");

export const VINTAGE_MASTER=Object.freeze(V);
